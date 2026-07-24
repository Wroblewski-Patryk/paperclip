import { readFile } from "node:fs/promises";
import { spawn } from "node:child_process";
import path from "node:path";
import { createDb } from "../packages/db/src/index.js";
import { secretService } from "../server/src/services/secrets.js";

const apiBase = process.env.PAPERCLIP_API_URL ?? "http://127.0.0.1:3200";
const companyId = process.env.PAPERCLIP_COMPANY_ID ?? "ae26bb8b-8f5f-4a85-b341-78d4e1985975";
const issueIdentifier = "LUC-1805";
const approvalId = "a15b87e1-08fe-47e3-811c-0489da1bf17e";
const sourceAgentName = "09 DRE (Deployment & Reliability Engineer)";
const targetCommit = "ca712e98b70e157b643db4f57726a02821a140bc";
const apply = process.argv.includes("--apply");

type JsonRecord = Record<string, unknown>;

function asRecord(value: unknown): JsonRecord {
  return value && typeof value === "object" && !Array.isArray(value)
    ? value as JsonRecord
    : {};
}

async function paperclipRequest(route: string) {
  const response = await fetch(`${apiBase}${route}`);
  const text = await response.text();
  const data = text ? JSON.parse(text) : null;
  if (!response.ok) {
    const code = typeof data?.error === "string" ? data.error : "request_failed";
    throw new Error(`GET ${route} failed with ${response.status}: ${code}`);
  }
  return data;
}

async function loadRuntimeConfig() {
  const config = JSON.parse(await readFile(path.resolve(".paperclip/config.json"), "utf8"));
  const port = Number(config?.database?.embeddedPostgresPort);
  const masterKeyFile = String(config?.secrets?.localEncrypted?.keyFilePath ?? "").trim();
  if (!Number.isFinite(port) || port <= 0 || !masterKeyFile) {
    throw new Error("Canonical Paperclip database or local secret-provider configuration is missing");
  }
  process.env.PAPERCLIP_SECRETS_MASTER_KEY_FILE ??= masterKeyFile;
  return {
    databaseUrl: process.env.DATABASE_URL
      ?? `postgres://paperclip:paperclip@127.0.0.1:${Math.trunc(port)}/paperclip`,
  };
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
      reject(new Error(`${command} failed with exit code ${code}; no usable value-free result`));
    });
    child.stdin.end(stdin);
  });
}

function parseRemoteJson(output: string) {
  const candidates = [
    output.trim(),
    ...output.split(/\r?\n/).map((line) => line.trim()).filter(Boolean).reverse(),
  ];
  for (const candidate of candidates) {
    try {
      return JSON.parse(candidate) as JsonRecord;
    } catch {
      // Coolify bootstrap may emit non-sensitive notices before the JSON result.
    }
  }
  throw new Error("Coolify application-model operation returned no valid redacted result");
}

function coolifyPhp(payload: JsonRecord) {
  const encoded = Buffer.from(JSON.stringify(payload), "utf8").toString("base64");
  return `<?php
require '/var/www/html/vendor/autoload.php';
$app = require '/var/www/html/bootstrap/app.php';
$app->make(Illuminate\\Contracts\\Console\\Kernel::class)->bootstrap();
try {
  $p = json_decode(base64_decode('${encoded}'), true, flags: JSON_THROW_ON_ERROR);
  $application = App\\Models\\Application::where('uuid', $p['applicationUuid'])->first();
  if (!$application) { throw new RuntimeException('application_not_found'); }
  if ($application->name !== 'soar-web') { throw new RuntimeException('application_name_mismatch'); }
  $before = trim((string) $application->git_commit_sha);
  if ($p['action'] === 'apply') {
    if ($before !== $p['expectedBefore'] && $before !== $p['targetCommit']) {
      throw new RuntimeException('preflight_value_changed');
    }
    if ($before !== $p['targetCommit']) {
      $application->git_commit_sha = $p['targetCommit'];
      $application->save();
    }
    $after = trim((string) $application->fresh()->git_commit_sha);
    echo json_encode([
      'ok' => $after === $p['targetCommit'],
      'applicationFamily' => 'soar-web',
      'beforeCommit' => $before,
      'afterCommit' => $after,
      'changed' => $before !== $after,
      'deploymentTriggered' => false,
    ], JSON_THROW_ON_ERROR);
    exit;
  }
  if ($p['action'] === 'rollback') {
    if ($before !== $p['targetCommit']) { throw new RuntimeException('rollback_precondition_failed'); }
    $application->git_commit_sha = $p['rollbackCommit'];
    $application->save();
    $after = trim((string) $application->fresh()->git_commit_sha);
    echo json_encode([
      'ok' => $after === $p['rollbackCommit'],
      'applicationFamily' => 'soar-web',
      'rolledBack' => $after === $p['rollbackCommit'],
      'deploymentTriggered' => false,
    ], JSON_THROW_ON_ERROR);
    exit;
  }
  throw new RuntimeException('unknown_action');
} catch (Throwable $error) {
  echo json_encode([
    'ok' => false,
    'errorClass' => get_class($error),
    'errorCode' => $error->getMessage(),
  ], JSON_THROW_ON_ERROR);
}
`;
}

async function runCoolifyModel(payload: JsonRecord) {
  const result = await runProcess(
    "ssh",
    ["codex-vps", "docker", "exec", "-i", "coolify", "php"],
    coolifyPhp(payload),
  );
  return parseRemoteJson(result.stdout);
}

async function coolifyGet(baseUrl: string, route: string, token: string) {
  const response = await fetch(`${baseUrl.replace(/\/+$/, "")}${route}`, {
    headers: { accept: "application/json", authorization: `Bearer ${token}` },
  });
  const text = await response.text();
  const data = text ? JSON.parse(text) : null;
  if (!response.ok) throw new Error(`Coolify readback failed with ${response.status}`);
  return data;
}

async function publicBuildInfo(baseUrl: string) {
  const response = await fetch(`${baseUrl.replace(/\/+$/, "")}/api/build-info`, {
    headers: { accept: "application/json" },
  });
  const text = await response.text();
  const data = text ? JSON.parse(text) : null;
  if (!response.ok) throw new Error(`Soar public build-info failed with ${response.status}`);
  return asRecord(data);
}

async function closeDb(db: ReturnType<typeof createDb> | null) {
  const client = (db as unknown as {
    $client?: { end?: (options?: { timeout?: number }) => Promise<void> };
  } | null)?.$client;
  await client?.end?.({ timeout: 5 }).catch(() => undefined);
}

async function main() {
  const [issue, approval, agents] = await Promise.all([
    paperclipRequest(`/api/issues/${issueIdentifier}`),
    paperclipRequest(`/api/approvals/${approvalId}`),
    paperclipRequest(`/api/companies/${companyId}/agents`),
  ]);
  if (issue.companyId !== companyId) throw new Error(`${issueIdentifier} belongs to another company`);
  if (approval.status !== "approved") throw new Error(`Approval ${approvalId} is not approved`);
  if (!String(issue.description ?? "").includes(targetCommit)) {
    throw new Error(`${issueIdentifier} does not name the configured target commit`);
  }
  if (apply && ["done", "cancelled"].includes(String(issue.status))) {
    throw new Error(`${issueIdentifier} is already terminal`);
  }

  const sourceAgent = (Array.isArray(agents) ? agents : [])
    .find((agent: JsonRecord) => agent.name === sourceAgentName) as JsonRecord | undefined;
  if (!sourceAgent || typeof sourceAgent.id !== "string") {
    throw new Error(`Source agent not found: ${sourceAgentName}`);
  }
  const sourceEnv = asRecord(asRecord(sourceAgent.adapterConfig).env);
  const requiredKeys = [
    "COOLIFY_BASE_URL",
    "COOLIFY_API_TOKEN",
    "COOLIFY_SOAR_WEB_APP_ID",
    "SOAR_PROD_TEST_BASE_URL",
  ];
  const selectedEnv: JsonRecord = {};
  for (const key of requiredKeys) {
    if (!(key in sourceEnv)) throw new Error(`Required binding is missing: ${key}`);
    selectedEnv[key] = sourceEnv[key];
  }

  const plan = {
    mode: apply ? "apply-single-field" : "dry-run",
    issue: issueIdentifier,
    approval: { id: approvalId, status: approval.status },
    applicationFamily: "soar-web",
    field: "git_commit_sha",
    targetCommit,
    allowedMutationCount: 1,
    deploymentAllowed: false,
    restartAllowed: false,
    secretMutationAllowed: false,
    rawSecretOutput: false,
  };
  if (!apply) {
    console.log(JSON.stringify(plan, null, 2));
    return;
  }

  const runtime = await loadRuntimeConfig();
  const db = createDb(runtime.databaseUrl);
  let beforeCommit = "";
  let modelChanged = false;
  let resolved: Record<string, string> | null = null;
  try {
    const svc = secretService(db);
    const resolution = await svc.resolveEnvBindings(companyId, selectedEnv, {
      consumerType: "agent",
      consumerId: sourceAgent.id,
      actorType: "user",
      actorId: "local-board",
      issueId: issue.id,
    });
    resolved = resolution.env;
    const coolifyBaseUrl = resolved.COOLIFY_BASE_URL;
    const readToken = resolved.COOLIFY_API_TOKEN;
    const applicationUuid = resolved.COOLIFY_SOAR_WEB_APP_ID;
    const soarBaseUrl = resolved.SOAR_PROD_TEST_BASE_URL;
    if (!coolifyBaseUrl || !readToken || !applicationUuid || !soarBaseUrl) {
      throw new Error("Protected Coolify/Soar bindings did not resolve");
    }

    const [applicationBefore, buildInfoBefore] = await Promise.all([
      coolifyGet(coolifyBaseUrl, `/api/v1/applications/${applicationUuid}`, readToken),
      publicBuildInfo(soarBaseUrl),
    ]);
    const appBefore = asRecord(applicationBefore);
    beforeCommit = String(appBefore.git_commit_sha ?? "").trim();
    if (appBefore.name !== "soar-web") throw new Error("Coolify binding did not resolve soar-web");
    if (!/^[0-9a-f]{40}$/.test(beforeCommit)) {
      throw new Error("Coolify preflight did not return a valid current commit");
    }
    if (buildInfoBefore.gitSha !== targetCommit) {
      throw new Error("Soar public build-info does not report the approved target commit");
    }

    const modelResult = await runCoolifyModel({
      action: "apply",
      applicationUuid,
      expectedBefore: beforeCommit,
      targetCommit,
    });
    if (modelResult.ok !== true || modelResult.afterCommit !== targetCommit) {
      throw new Error("Coolify application-model update did not verify");
    }
    modelChanged = modelResult.changed === true;

    const [applicationAfter, buildInfoAfter] = await Promise.all([
      coolifyGet(coolifyBaseUrl, `/api/v1/applications/${applicationUuid}`, readToken),
      publicBuildInfo(soarBaseUrl),
    ]);
    const appAfter = asRecord(applicationAfter);
    if (appAfter.git_commit_sha !== targetCommit || appAfter.name !== "soar-web") {
      throw new Error("Coolify API readback did not return the approved metadata");
    }
    if (buildInfoAfter.gitSha !== targetCommit) {
      throw new Error("Soar public build-info changed away from the deployed target");
    }

    console.log(JSON.stringify({
      ...plan,
      result: {
        applicationFamily: "soar-web",
        previousCommit: beforeCommit,
        currentCommit: String(appAfter.git_commit_sha),
        metadataChanged: modelChanged,
        coolifyReadback: "passed",
        publicBuildInfoCommit: String(buildInfoAfter.gitSha),
        publicBuildInfoMetadataSource: String(buildInfoAfter.metadataSource ?? "unknown"),
        deploymentTriggered: false,
        restartTriggered: false,
        secretMutation: false,
        rawSecretOutput: false,
      },
    }, null, 2));
  } catch (error) {
    if (modelChanged && resolved?.COOLIFY_SOAR_WEB_APP_ID && beforeCommit) {
      await runCoolifyModel({
        action: "rollback",
        applicationUuid: resolved.COOLIFY_SOAR_WEB_APP_ID,
        targetCommit,
        rollbackCommit: beforeCommit,
      }).catch(() => undefined);
    }
    throw error;
  } finally {
    resolved = null;
    await closeDb(db);
  }
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : String(error));
  process.exitCode = 1;
});
