import { randomBytes } from "node:crypto";
import { readFile } from "node:fs/promises";
import { spawn } from "node:child_process";
import path from "node:path";
import { createDb } from "../packages/db/src/index.js";
import { secretService } from "../server/src/services/secrets.js";

const API_BASE = process.env.PAPERCLIP_API_URL ?? "http://127.0.0.1:3200";
const COMPANY_ID = process.env.PAPERCLIP_COMPANY_ID ?? "ae26bb8b-8f5f-4a85-b341-78d4e1985975";
const ISSUE_IDENTIFIER = "LUC-972";
const APPROVAL_ID = "1f7d1a94-2759-4ffd-81e0-35634c05865a";
const DRE_NAME = "09 DRE (Deployment & Reliability Engineer)";
const APPLY = process.argv.includes("--apply");

const REQUIRED_BINDINGS = [
  "COOLIFY_BASE_URL",
  "COOLIFY_API_TOKEN",
  "COOLIFY_DEPLOY_API_TOKEN",
  "COOLIFY_TEAM_ID",
  "COOLIFY_LOGIN_EMAIL",
  "COOLIFY_LOGIN_PASSWORD",
  "SOAR_PROD_TEST_API_BASE_URL",
  "SOAR_PROD_TEST_EMAIL",
  "SOAR_PROD_TEST_PASSWORD",
  "ROOST_PROD_TEST_API_BASE_URL",
  "ROOST_PROD_TEST_EMAIL",
  "ROOST_PROD_TEST_PASSWORD",
] as const;

type JsonRecord = Record<string, unknown>;
type DbHandle = ReturnType<typeof createDb>;
type AccountCredential = {
  family: string;
  email: string;
  password: string;
  passwordSecretId: string;
};
type AccountGroup = {
  email: string;
  members: AccountCredential[];
  newPassword: string;
  workingOldPassword: string;
};

function asRecord(value: unknown): JsonRecord {
  return value && typeof value === "object" && !Array.isArray(value)
    ? value as JsonRecord
    : {};
}

function normalizedBaseUrl(value: string) {
  return value.replace(/\/+$/, "");
}

function safeDiagnostic(value: unknown) {
  const text = typeof value === "string" || typeof value === "number" ? String(value) : "unspecified";
  return text
    .replace(/[A-Za-z0-9_=-]{24,}/g, "[redacted]")
    .replace(/[^\s@]+@[^\s@]+/g, "[redacted-email]")
    .slice(0, 180);
}

function generatePassword(label: string) {
  return `${label}-${randomBytes(30).toString("base64url")}9a`;
}

async function apiRequest(method: string, route: string, body?: unknown) {
  const response = await fetch(`${API_BASE}${route}`, {
    method,
    headers: { "content-type": "application/json" },
    body: body === undefined ? undefined : JSON.stringify(body),
  });
  const text = await response.text();
  const data = text ? JSON.parse(text) : null;
  if (!response.ok) {
    const code = typeof data?.error === "string" ? data.error : "request_failed";
    throw new Error(`${method} ${route} failed with ${response.status}: ${code}`);
  }
  return data;
}

async function loadRuntimeConfig() {
  const config = JSON.parse(await readFile(path.resolve(".paperclip/config.json"), "utf8"));
  const port = Number(config?.database?.embeddedPostgresPort);
  if (!Number.isFinite(port) || port <= 0) {
    throw new Error("Embedded PostgreSQL port is missing from .paperclip/config.json");
  }
  const masterKeyFile = String(config?.secrets?.localEncrypted?.keyFilePath ?? "").trim();
  if (!masterKeyFile) {
    throw new Error("Local encrypted secrets key file is missing from .paperclip/config.json");
  }
  process.env.PAPERCLIP_SECRETS_MASTER_KEY_FILE ??= masterKeyFile;
  return {
    databaseUrl: process.env.DATABASE_URL
      ?? `postgres://paperclip:paperclip@127.0.0.1:${Math.trunc(port)}/paperclip`,
  };
}

function envRecord(agent: JsonRecord) {
  return asRecord(asRecord(agent.adapterConfig).env);
}

function bindingSecretId(env: JsonRecord, key: string) {
  const id = asRecord(env[key]).secretId;
  if (typeof id !== "string" || id.length === 0) {
    throw new Error(`Protected binding is not a secret_ref: ${key}`);
  }
  return id;
}

async function runProcess(command: string, args: string[], stdin?: string) {
  return new Promise<{ stdout: string; stderr: string }>((resolve, reject) => {
    const child = spawn(command, args, {
      stdio: ["pipe", "pipe", "pipe"],
      windowsHide: true,
    });
    let stdout = "";
    let stderr = "";
    child.stdout.setEncoding("utf8");
    child.stderr.setEncoding("utf8");
    child.stdout.on("data", (chunk) => { stdout += chunk; });
    child.stderr.on("data", (chunk) => { stderr += chunk; });
    child.on("error", reject);
    child.on("close", (code) => {
      if (code === 0) {
        resolve({ stdout, stderr });
        return;
      }
      reject(new Error(`${command} failed with exit code ${code}; remote operation returned no usable result`));
    });
    child.stdin.end(stdin);
  });
}

async function ssh(args: string[], stdin?: string) {
  return runProcess("ssh", ["codex-vps", ...args], stdin);
}

function parseRemoteJson(output: string, operation: string) {
  const candidates = [
    output.trim(),
    ...output.split(/\r?\n/).map((line) => line.trim()).filter(Boolean).reverse(),
  ];
  for (const candidate of candidates) {
    try {
      return JSON.parse(candidate) as JsonRecord;
    } catch {
      // Some application bootstraps emit non-sensitive notices before JSON.
    }
  }
  throw new Error(`${operation} returned an invalid redacted result`);
}

async function findRoostContainer() {
  const result = await ssh(["docker", "ps", "--format", "{{.Names}}@@{{.Image}}"]);
  const candidates = result.stdout
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter((line) => line.includes("_backend:") && line.startsWith("backend-"))
    .map((line) => line.split("@@")[0])
    .filter(Boolean);
  if (candidates.length !== 1) {
    throw new Error(`Expected one running Roost backend container, found ${candidates.length}`);
  }
  return candidates[0];
}

function coolifyPhp(payload: JsonRecord) {
  const encoded = Buffer.from(JSON.stringify(payload), "utf8").toString("base64");
  return `<?php
require '/var/www/html/vendor/autoload.php';
$app = require '/var/www/html/bootstrap/app.php';
$app->make(Illuminate\\Contracts\\Console\\Kernel::class)->bootstrap();
try {
$p = json_decode(base64_decode('${encoded}'), true, flags: JSON_THROW_ON_ERROR);
$tokens = Laravel\\Sanctum\\PersonalAccessToken::query();
$oldRead = Laravel\\Sanctum\\PersonalAccessToken::findToken($p['oldRead']);
$oldDeploy = Laravel\\Sanctum\\PersonalAccessToken::findToken($p['oldDeploy']);
if (!$oldRead || !$oldDeploy) { throw new RuntimeException('old_token_not_found'); }
$user = $oldRead->tokenable;
if (!$user || $oldDeploy->tokenable_id !== $user->id || $oldDeploy->tokenable_type !== get_class($user)) {
  throw new RuntimeException('token_owner_mismatch');
}
if ($p['action'] === 'prepare') {
  $fallbackTeam = App\\Models\\Team::find($p['expectedTeamId']);
  $readTeam = App\\Models\\Team::find($oldRead->team_id) ?? $fallbackTeam;
  $deployTeam = App\\Models\\Team::find($oldDeploy->team_id) ?? $fallbackTeam;
  if (!$readTeam || !$deployTeam) { throw new RuntimeException('token_team_not_found'); }
  // Safe retry after an interrupted prepare: remove only orphan tokens created
  // by this dedicated workflow, while retaining the known old tokens.
  $user->tokens()
    ->where(function ($query) {
      $query->where('name', 'like', 'Paperclip read rotation %')
        ->orWhere('name', 'like', 'Paperclip deploy rotation %');
    })
    ->whereNotIn('id', [$oldRead->id, $oldDeploy->id])
    ->delete();
  session(['currentTeam' => $readTeam]);
  $read = $user->createToken($p['readDescription'], $oldRead->abilities ?? []);
  session(['currentTeam' => $deployTeam]);
  $deploy = $user->createToken($p['deployDescription'], $oldDeploy->abilities ?? []);
  $user->password = Illuminate\\Support\\Facades\\Hash::make($p['newPassword']);
  $user->save();
  $newReadModel = Laravel\\Sanctum\\PersonalAccessToken::findToken($read->plainTextToken);
  $newDeployModel = Laravel\\Sanctum\\PersonalAccessToken::findToken($deploy->plainTextToken);
  if (!$newReadModel || !$newDeployModel || !Illuminate\\Support\\Facades\\Hash::check($p['newPassword'], $user->fresh()->password)) {
    throw new RuntimeException('prepare_verification_failed');
  }
  echo json_encode([
    'ok' => true,
    'newRead' => $read->plainTextToken,
    'newDeploy' => $deploy->plainTextToken,
    'newReadId' => $newReadModel->id,
    'newDeployId' => $newDeployModel->id,
    'readAbilities' => $newReadModel->abilities,
    'deployAbilities' => $newDeployModel->abilities,
  ], JSON_THROW_ON_ERROR);
  exit;
}
if ($p['action'] === 'finalize') {
  if (!Illuminate\\Support\\Facades\\Hash::check($p['expectedPassword'], $user->password)) {
    throw new RuntimeException('new_password_mismatch');
  }
  $newRead = Laravel\\Sanctum\\PersonalAccessToken::findToken($p['newRead']);
  $newDeploy = Laravel\\Sanctum\\PersonalAccessToken::findToken($p['newDeploy']);
  if (!$newRead || !$newDeploy || !Illuminate\\Support\\Facades\\Hash::check($p['expectedPassword'], $user->password)) {
    throw new RuntimeException('new_credential_verification_failed');
  }
  $oldReadId = $oldRead->id;
  $oldDeployId = $oldDeploy->id;
  $oldRead->delete();
  $oldDeploy->delete();
  echo json_encode([
    'ok' => true,
    'oldReadRevoked' => Laravel\\Sanctum\\PersonalAccessToken::find($oldReadId) === null,
    'oldDeployRevoked' => Laravel\\Sanctum\\PersonalAccessToken::find($oldDeployId) === null,
  ], JSON_THROW_ON_ERROR);
  exit;
}
if ($p['action'] === 'rollback') {
  if (!Illuminate\\Support\\Facades\\Hash::check($p['expectedPassword'], $user->password)) {
    throw new RuntimeException('rollback_password_mismatch');
  }
  Laravel\\Sanctum\\PersonalAccessToken::findToken($p['newRead'])?->delete();
  Laravel\\Sanctum\\PersonalAccessToken::findToken($p['newDeploy'])?->delete();
  $user->password = Illuminate\\Support\\Facades\\Hash::make($p['rollbackPassword']);
  $user->save();
  echo json_encode([
    'ok' => Illuminate\\Support\\Facades\\Hash::check($p['rollbackPassword'], $user->fresh()->password),
  ], JSON_THROW_ON_ERROR);
  exit;
}
throw new RuntimeException('unknown_action');
} catch (Throwable $error) {
  echo json_encode([
    'ok' => false,
    'errorClass' => get_class($error),
    'errorCode' => $error->getMessage(),
    'errorLine' => $error->getLine(),
  ], JSON_THROW_ON_ERROR);
}
`;
}

async function runCoolify(payload: JsonRecord) {
  const result = await ssh(["docker", "exec", "-i", "coolify", "php"], coolifyPhp(payload));
  return parseRemoteJson(result.stdout, "Coolify credential operation");
}

function roostScript(payload: JsonRecord) {
  const encoded = Buffer.from(JSON.stringify(payload), "utf8").toString("base64");
  return `import { prisma } from "/app/dist/db/prisma.js";
import { hashPassword, verifyPassword } from "/app/dist/auth/password.js";
const p = JSON.parse(Buffer.from("${encoded}", "base64").toString("utf8"));
try {
  const user = await prisma.user.findUnique({ where: { email: p.email.toLowerCase() } });
  if (!user || !(await verifyPassword(p.expectedPassword, user.passwordHash))) {
    throw new Error("old_password_mismatch");
  }
  const nextPassword = p.action === "rollback" ? p.rollbackPassword : p.newPassword;
  await prisma.user.update({
    where: { id: user.id },
    data: { passwordHash: await hashPassword(nextPassword) },
  });
  const updated = await prisma.user.findUnique({ where: { id: user.id } });
  if (!updated || !(await verifyPassword(nextPassword, updated.passwordHash))) {
    throw new Error("password_update_verification_failed");
  }
  process.stdout.write(JSON.stringify({ ok: true }));
} finally {
  await prisma.$disconnect();
}
`;
}

async function updateRoostPassword(container: string, payload: JsonRecord) {
  const result = await ssh(
    ["docker", "exec", "-i", container, "node", "--input-type=module"],
    roostScript(payload),
  );
  return parseRemoteJson(result.stdout, "Roost password operation");
}

async function loginJson(baseUrl: string, email: string, password: string) {
  const response = await fetch(`${normalizedBaseUrl(baseUrl)}/auth/login`, {
    method: "POST",
    headers: { accept: "application/json", "content-type": "application/json" },
    body: JSON.stringify({ email, password }),
  });
  return response;
}

async function groupWorkingAccounts(
  product: "Soar" | "Roost",
  baseUrl: string,
  credentials: AccountCredential[],
) {
  const grouped = new Map<string, AccountCredential[]>();
  for (const credential of credentials) {
    const email = credential.email.trim().toLowerCase();
    const current = grouped.get(email) ?? [];
    current.push(credential);
    grouped.set(email, current);
  }
  const result: AccountGroup[] = [];
  for (const [email, members] of grouped) {
    let workingOldPassword: string | null = null;
    for (const member of members) {
      const login = await loginJson(baseUrl, email, member.password);
      if (login.ok) {
        workingOldPassword = member.password;
        break;
      }
      if (![400, 401, 403].includes(login.status)) {
        throw new Error(`${product} credential preflight failed with ${login.status}`);
      }
    }
    if (!workingOldPassword) {
      throw new Error(`${product} account credential preflight found no valid protected password`);
    }
    result.push({
      email,
      members,
      newPassword: generatePassword(product),
      workingOldPassword,
    });
  }
  return result;
}

async function changeSoarPassword(
  baseUrl: string,
  email: string,
  currentPassword: string,
  newPassword: string,
) {
  const login = await loginJson(baseUrl, email, currentPassword);
  if (!login.ok) throw new Error(`Soar current credential check failed with ${login.status}`);
  const cookieHeader = login.headers.get("set-cookie");
  const cookie = cookieHeader?.split(";")[0];
  if (!cookie) throw new Error("Soar login did not return a session cookie");
  const response = await fetch(`${normalizedBaseUrl(baseUrl)}/dashboard/profile/security/password`, {
    method: "PATCH",
    headers: {
      accept: "application/json",
      "content-type": "application/json",
      cookie,
    },
    body: JSON.stringify({ currentPassword, newPassword }),
  });
  if (!response.ok) throw new Error(`Soar password rotation failed with ${response.status}`);
}

async function assertLoginState(
  product: "Soar" | "Roost",
  baseUrl: string,
  email: string,
  newPassword: string,
  oldPassword: string,
) {
  const next = await loginJson(baseUrl, email, newPassword);
  if (!next.ok) throw new Error(`${product} new credential smoke failed with ${next.status}`);
  const old = await loginJson(baseUrl, email, oldPassword);
  if (old.ok || ![400, 401, 403].includes(old.status)) {
    throw new Error(`${product} old credential invalidation was not proven`);
  }
}

async function coolifyReadSmoke(baseUrl: string, token: string) {
  const response = await fetch(`${normalizedBaseUrl(baseUrl)}/api/v1/teams`, {
    headers: { accept: "application/json", authorization: `Bearer ${token}` },
  });
  if (!response.ok) throw new Error(`Coolify read-token smoke failed with ${response.status}`);
}

async function coolifyOldReadInvalidated(baseUrl: string, token: string) {
  const response = await fetch(`${normalizedBaseUrl(baseUrl)}/api/v1/teams`, {
    headers: { accept: "application/json", authorization: `Bearer ${token}` },
  });
  if (response.ok || ![401, 403].includes(response.status)) {
    throw new Error("Coolify old read token invalidation was not proven");
  }
}

async function closeDb(db: DbHandle | null) {
  const client = (db as unknown as {
    $client?: { end?: (options?: { timeout?: number }) => Promise<void> };
  } | null)?.$client;
  await client?.end?.({ timeout: 5 }).catch(() => undefined);
}

function findSecretMetadataByKey(secretMetadata: unknown, key: string) {
  const list = Array.isArray(secretMetadata) ? secretMetadata as JsonRecord[] : [];
  const secret = list.find((item) => item.key === key);
  if (!secret || typeof secret.id !== "string") {
    throw new Error(`Required secret metadata is missing: ${key}`);
  }
  return secret.id;
}

async function main() {
  const [issue, approval, agents, secretMetadata] = await Promise.all([
    apiRequest("GET", `/api/issues/${ISSUE_IDENTIFIER}`),
    apiRequest("GET", `/api/approvals/${APPROVAL_ID}`),
    apiRequest("GET", `/api/companies/${COMPANY_ID}/agents`),
    apiRequest("GET", `/api/companies/${COMPANY_ID}/secrets`),
  ]);
  if (issue.companyId !== COMPANY_ID) throw new Error("Protected issue belongs to another company");
  if (approval.status !== "approved") throw new Error(`Approval ${APPROVAL_ID} is not approved`);
  if (APPLY && (issue.status === "done" || issue.status === "cancelled")) {
    throw new Error(`${ISSUE_IDENTIFIER} is already in terminal status ${issue.status}`);
  }

  const agentList = Array.isArray(agents) ? agents as JsonRecord[] : [];
  const dre = agentList.find((agent) => agent.name === DRE_NAME);
  if (!dre || typeof dre.id !== "string") throw new Error(`Agent not found: ${DRE_NAME}`);
  const env = envRecord(dre);
  const missing = REQUIRED_BINDINGS.filter((key) => !(key in env));
  if (missing.length > 0) {
    throw new Error(`Required protected bindings are missing: ${missing.join(", ")}`);
  }

  const secretIds = {
    coolifyRead: bindingSecretId(env, "COOLIFY_API_TOKEN"),
    coolifyDeploy: bindingSecretId(env, "COOLIFY_DEPLOY_API_TOKEN"),
    coolifyLoginPassword: bindingSecretId(env, "COOLIFY_LOGIN_PASSWORD"),
    soarPassword: bindingSecretId(env, "SOAR_PROD_TEST_PASSWORD"),
    roostPassword: bindingSecretId(env, "ROOST_PROD_TEST_PASSWORD"),
    soarOwnerEmail: findSecretMetadataByKey(secretMetadata, "soar_owner_prod_email"),
    soarOwnerPassword: findSecretMetadataByKey(secretMetadata, "soar_owner_prod_password"),
    roostOwnerEmail: findSecretMetadataByKey(secretMetadata, "roost_owner_prod_email"),
    roostOwnerPassword: findSecretMetadataByKey(secretMetadata, "roost_owner_prod_password"),
  };
  const passwordIds = [
    secretIds.coolifyRead,
    secretIds.coolifyDeploy,
    secretIds.coolifyLoginPassword,
    secretIds.soarPassword,
    secretIds.roostPassword,
    secretIds.soarOwnerPassword,
    secretIds.roostOwnerPassword,
  ];
  const uniqueIds = new Set(passwordIds);
  if (uniqueIds.size !== passwordIds.length) {
    throw new Error("Credential families unexpectedly share a Paperclip secret");
  }

  const plan = {
    mode: APPLY ? "apply" : "dry-run",
    issue: ISSUE_IDENTIFIER,
    approval: { id: APPROVAL_ID, status: approval.status },
    credentialFamilies: [
      "Coolify read token",
      "Coolify deploy token",
      "Coolify login password",
      "Soar production test account password",
      "Soar production owner account password",
      "Roost production test/owner account password",
      "Roost production integration-owner account password",
    ],
    providerInvalidationRequired: true,
    postRotationSmokeRequired: true,
    rawSecretOutput: false,
  };
  if (!APPLY) {
    console.log(JSON.stringify(plan, null, 2));
    return;
  }

  const runtime = await loadRuntimeConfig();
  const db = createDb(runtime.databaseUrl);
  const svc = secretService(db);
  const newCoolifyPassword = generatePassword("Coolify");
  let resolved: Record<string, string> | null = null;
  let roostContainer = "";
  let coolifyPrepared: JsonRecord | null = null;
  const changedSoarGroups: AccountGroup[] = [];
  const changedRoostGroups: AccountGroup[] = [];
  const locallyRotated: Array<{ id: string; oldValue: string }> = [];

  try {
    const resolution = await svc.resolveEnvBindings(COMPANY_ID, env, {
      consumerType: "agent",
      consumerId: dre.id,
      actorType: "user",
      actorId: "local-board",
      issueId: issue.id,
    });
    resolved = resolution.env;
    for (const key of REQUIRED_BINDINGS) {
      if (!resolved[key]) throw new Error(`Protected binding did not resolve: ${key}`);
    }
    // Owner-integration credentials are deliberately not bound to autonomous
    // agents. This approved local-board workflow resolves them directly and
    // keeps the values in process memory only.
    const resolveDirect = (secretId: string) =>
      svc.resolveSecretValue(COMPANY_ID, secretId, "latest");
    const [
      soarOwnerEmail,
      soarOwnerPassword,
      roostOwnerEmail,
      roostOwnerPassword,
    ] = await Promise.all([
      resolveDirect(secretIds.soarOwnerEmail),
      resolveDirect(secretIds.soarOwnerPassword),
      resolveDirect(secretIds.roostOwnerEmail),
      resolveDirect(secretIds.roostOwnerPassword),
    ]);
    const soarGroups = await groupWorkingAccounts(
      "Soar",
      resolved.SOAR_PROD_TEST_API_BASE_URL,
      [
        {
          family: "SOAR_PROD_TEST_PASSWORD",
          email: resolved.SOAR_PROD_TEST_EMAIL,
          password: resolved.SOAR_PROD_TEST_PASSWORD,
          passwordSecretId: secretIds.soarPassword,
        },
        {
          family: "SOAR_OWNER_PROD_PASSWORD",
          email: soarOwnerEmail,
          password: soarOwnerPassword,
          passwordSecretId: secretIds.soarOwnerPassword,
        },
      ],
    );
    const roostGroups = await groupWorkingAccounts(
      "Roost",
      resolved.ROOST_PROD_TEST_API_BASE_URL,
      [
        {
          family: "ROOST_PROD_TEST_PASSWORD",
          email: resolved.ROOST_PROD_TEST_EMAIL,
          password: resolved.ROOST_PROD_TEST_PASSWORD,
          passwordSecretId: secretIds.roostPassword,
        },
        {
          family: "ROOST_OWNER_PROD_PASSWORD",
          email: roostOwnerEmail,
          password: roostOwnerPassword,
          passwordSecretId: secretIds.roostOwnerPassword,
        },
      ],
    );

    const coolifyPayloadBase = {
      oldRead: resolved.COOLIFY_API_TOKEN,
      oldDeploy: resolved.COOLIFY_DEPLOY_API_TOKEN,
      expectedPassword: resolved.COOLIFY_LOGIN_PASSWORD,
      expectedTeamId: resolved.COOLIFY_TEAM_ID,
    };
    coolifyPrepared = await runCoolify({
      ...coolifyPayloadBase,
      action: "prepare",
      newPassword: newCoolifyPassword,
      readDescription: `Paperclip read rotation ${new Date().toISOString()}`,
      deployDescription: `Paperclip deploy rotation ${new Date().toISOString()}`,
    });
    if (
      coolifyPrepared.ok !== true
      || typeof coolifyPrepared.newRead !== "string"
      || typeof coolifyPrepared.newDeploy !== "string"
    ) {
      throw new Error(
        `Coolify protected rotation failed (${safeDiagnostic(coolifyPrepared.errorClass)} at remote line ${safeDiagnostic(coolifyPrepared.errorLine)}): ${safeDiagnostic(coolifyPrepared.errorCode)}`,
      );
    }
    await coolifyReadSmoke(resolved.COOLIFY_BASE_URL, coolifyPrepared.newRead);

    for (const group of soarGroups) {
      await changeSoarPassword(
        resolved.SOAR_PROD_TEST_API_BASE_URL,
        group.email,
        group.workingOldPassword,
        group.newPassword,
      );
      changedSoarGroups.push(group);
      await assertLoginState(
        "Soar",
        resolved.SOAR_PROD_TEST_API_BASE_URL,
        group.email,
        group.newPassword,
        group.workingOldPassword,
      );
    }

    roostContainer = await findRoostContainer();
    for (const group of roostGroups) {
      const roostUpdate = await updateRoostPassword(roostContainer, {
        action: "rotate",
        email: group.email,
        expectedPassword: group.workingOldPassword,
        newPassword: group.newPassword,
      });
      if (roostUpdate.ok !== true) throw new Error("Roost password update did not verify");
      changedRoostGroups.push(group);
      await assertLoginState(
        "Roost",
        resolved.ROOST_PROD_TEST_API_BASE_URL,
        group.email,
        group.newPassword,
        group.workingOldPassword,
      );
    }

    const rotations = [
      { id: secretIds.coolifyRead, value: coolifyPrepared.newRead, oldValue: resolved.COOLIFY_API_TOKEN },
      { id: secretIds.coolifyDeploy, value: coolifyPrepared.newDeploy, oldValue: resolved.COOLIFY_DEPLOY_API_TOKEN },
      { id: secretIds.coolifyLoginPassword, value: newCoolifyPassword, oldValue: resolved.COOLIFY_LOGIN_PASSWORD },
      ...soarGroups.flatMap((group) => group.members.map((member) => ({
        id: member.passwordSecretId,
        value: group.newPassword,
        oldValue: member.password,
      }))),
      ...roostGroups.flatMap((group) => group.members.map((member) => ({
        id: member.passwordSecretId,
        value: group.newPassword,
        oldValue: member.password,
      }))),
    ];
    for (const rotation of rotations) {
      await svc.rotate(rotation.id, { value: rotation.value }, { userId: "local-board" });
      locallyRotated.push({ id: rotation.id, oldValue: rotation.oldValue });
    }

    const finalized = await runCoolify({
      ...coolifyPayloadBase,
      action: "finalize",
      expectedPassword: newCoolifyPassword,
      newRead: coolifyPrepared.newRead,
      newDeploy: coolifyPrepared.newDeploy,
    });
    if (finalized.oldReadRevoked !== true || finalized.oldDeployRevoked !== true) {
      throw new Error("Coolify old-token invalidation did not verify");
    }
    await coolifyOldReadInvalidated(resolved.COOLIFY_BASE_URL, resolved.COOLIFY_API_TOKEN);

    console.log(JSON.stringify({
      ...plan,
      result: {
        paperclipSecretFamiliesRotated: locallyRotated.length,
        coolify: {
          readTokenSmoke: "passed",
          deployTokenModelVerification: "passed",
          oldReadTokenInvalidated: true,
          oldDeployTokenInvalidated: true,
          loginPasswordModelVerification: "passed",
        },
        soar: {
          accountCount: soarGroups.length,
          secretFamilyCount: soarGroups.reduce((count, group) => count + group.members.length, 0),
          newCredentialSmoke: "passed",
          oldCredentialInvalidated: true,
        },
        roost: {
          accountCount: roostGroups.length,
          secretFamilyCount: roostGroups.reduce((count, group) => count + group.members.length, 0),
          newCredentialSmoke: "passed",
          oldCredentialInvalidated: true,
        },
        rawSecretOutput: false,
      },
    }, null, 2));
  } catch (error) {
    if (resolved) {
      for (const rotation of locallyRotated.reverse()) {
        await svc.rotate(rotation.id, { value: rotation.oldValue }, { userId: "local-board" })
          .catch(() => undefined);
      }
      for (const group of changedRoostGroups.reverse()) {
        if (!roostContainer) break;
        await updateRoostPassword(roostContainer, {
          action: "rollback",
          email: group.email,
          expectedPassword: group.newPassword,
          rollbackPassword: group.workingOldPassword,
        }).catch(() => undefined);
      }
      for (const group of changedSoarGroups.reverse()) {
        await changeSoarPassword(
          resolved.SOAR_PROD_TEST_API_BASE_URL,
          group.email,
          group.newPassword,
          group.workingOldPassword,
        ).catch(() => undefined);
      }
      if (coolifyPrepared?.newRead && coolifyPrepared?.newDeploy) {
        await runCoolify({
          action: "rollback",
          oldRead: resolved.COOLIFY_API_TOKEN,
          oldDeploy: resolved.COOLIFY_DEPLOY_API_TOKEN,
          expectedPassword: newCoolifyPassword,
          newRead: coolifyPrepared.newRead,
          newDeploy: coolifyPrepared.newDeploy,
          rollbackPassword: resolved.COOLIFY_LOGIN_PASSWORD,
        }).catch(() => undefined);
      }
    }
    throw error;
  } finally {
    resolved = null;
    coolifyPrepared = null;
    await closeDb(db);
  }
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : String(error));
  process.exitCode = 1;
});
