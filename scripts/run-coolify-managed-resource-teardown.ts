import { readFile } from "node:fs/promises";
import path from "node:path";
import { createDb } from "../packages/db/src/index.js";
import { secretService } from "../server/src/services/secrets.js";
import {
  assertApplicationBoundary,
  assertBoundedResourceRef,
  assertTeardownAuthorization,
  assertUnusedTemporaryApplication,
  coolifyApplicationDeleteRoute,
} from "./lib/managed-resource-lifecycle.mjs";

const API_BASE = process.env.PAPERCLIP_API_URL ?? "http://127.0.0.1:3200";
const COMPANY_ID = process.env.PAPERCLIP_COMPANY_ID ?? "ae26bb8b-8f5f-4a85-b341-78d4e1985975";
const DRE_NAME = "09 DRE (Deployment & Reliability Engineer)";

type JsonRecord = Record<string, unknown>;

function record(value: unknown): JsonRecord {
  return value && typeof value === "object" && !Array.isArray(value) ? value as JsonRecord : {};
}

function arg(name: string, required = true) {
  const prefix = `--${name}=`;
  const value = process.argv.find((item) => item.startsWith(prefix))?.slice(prefix.length).trim() ?? "";
  if (required && !value) throw new Error(`Missing ${prefix}<value>`);
  return value;
}

async function paperclipGet(route: string) {
  const response = await fetch(`${API_BASE}${route}`, { signal: AbortSignal.timeout(15_000) });
  if (!response.ok) throw new Error(`Paperclip read failed with ${response.status}`);
  return response.json();
}

async function loadRuntime() {
  const config = JSON.parse(await readFile(path.resolve(import.meta.dirname, "..", ".paperclip/config.json"), "utf8"));
  const port = Number(config?.database?.embeddedPostgresPort);
  const keyFile = String(config?.secrets?.localEncrypted?.keyFilePath ?? "").trim();
  if (port !== 54329 || !keyFile) throw new Error("Canonical runtime configuration is unavailable");
  process.env.PAPERCLIP_SECRETS_MASTER_KEY_FILE ??= keyFile;
  return `postgres://paperclip:paperclip@127.0.0.1:${port}/paperclip`;
}

async function coolifyRequest(baseUrl: string, token: string, route: string, init: RequestInit = {}) {
  return fetch(`${baseUrl}${route}`, {
    ...init,
    headers: { accept: "application/json", authorization: `Bearer ${token}`, ...(init.headers ?? {}) },
    signal: AbortSignal.timeout(30_000),
  });
}

async function requireJson(response: Response, label: string) {
  if (!response.ok) throw new Error(`${label} failed with ${response.status}`);
  return response.json();
}

async function waitForApplicationDeletion(baseUrl: string, token: string, applicationUuid: string) {
  const attempts = 15;
  for (let attempt = 1; attempt <= attempts; attempt += 1) {
    const response = await coolifyRequest(baseUrl, token, `/api/v1/applications/${applicationUuid}`);
    if (response.status === 404) return;
    if (!response.ok) throw new Error(`Post-delete application read failed with ${response.status}`);
    if (attempt < attempts) await new Promise((resolve) => setTimeout(resolve, 2_000));
  }
  throw new Error("Coolify accepted the deletion, but the application remained visible after the bounded verification window; do not retry deletion automatically");
}

function deploymentItems(value: unknown): unknown[] {
  if (Array.isArray(value)) return value;
  const payload = record(value);
  if (Array.isArray(payload.data)) return payload.data;
  if (Array.isArray(payload.deployments)) return payload.deployments;
  const keys = Object.keys(payload);
  if (keys.every((key) => /^\d+$/.test(key))) return Object.values(payload);
  throw new Error("Deployment-history response is not an inspectable list");
}

function safeDeploymentSummary(value: unknown) {
  const item = record(value);
  return {
    uuid: item.deployment_uuid ?? item.uuid ?? null,
    status: item.status ?? null,
    commit: item.commit ?? item.git_commit_sha ?? null,
    createdAt: item.created_at ?? null,
    applicationId: item.application_id ?? null,
    name: item.application_name ?? item.name ?? null,
  };
}

async function main() {
  const issueIdentifier = arg("issue");
  const applicationUuid = assertBoundedResourceRef(arg("application"), "applicationUuid");
  const projectUuid = assertBoundedResourceRef(arg("project"), "projectUuid");
  const environmentUuid = assertBoundedResourceRef(arg("environment"), "environmentUuid");
  const excludedResourceUuids = process.argv
    .filter((item) => item.startsWith("--exclude-resource="))
    .map((item) => assertBoundedResourceRef(item.slice("--exclude-resource=".length), "excludedResourceUuid"));
  if (excludedResourceUuids.length === 0) throw new Error("At least one production/protected resource exclusion is required");
  const apply = process.argv.includes("--apply");
  const verifyDeleted = process.argv.includes("--verify-deleted");

  const [issue, agents] = await Promise.all([
    paperclipGet(`/api/issues/${encodeURIComponent(issueIdentifier)}`),
    paperclipGet(`/api/companies/${COMPANY_ID}/agents`),
  ]);
  if (issue.companyId !== COMPANY_ID) throw new Error("Issue belongs to a different company");
  assertTeardownAuthorization({ issue, applicationUuid, projectUuid, environmentUuid, excludedResourceUuids });
  const dre = (Array.isArray(agents) ? agents : []).find((agent) => agent.name === DRE_NAME);
  if (!dre) throw new Error("DRE runtime is unavailable");
  const env = record(record(dre.adapterConfig).env);
  const selected = Object.fromEntries(["COOLIFY_BASE_URL", "COOLIFY_DEPLOY_API_TOKEN"].map((key) => {
    if (!(key in env)) throw new Error(`Required binding is missing: ${key}`);
    return [key, env[key]];
  }));

  const db = createDb(await loadRuntime());
  try {
    const resolved = await secretService(db).resolveEnvBindings(COMPANY_ID, selected, {
      consumerType: "agent",
      consumerId: dre.id,
      actorType: "user",
      actorId: "local-board",
      issueId: issue.id,
    });
    const baseUrl = resolved.env.COOLIFY_BASE_URL?.replace(/\/+$/, "");
    const token = resolved.env.COOLIFY_DEPLOY_API_TOKEN;
    if (!baseUrl || !token) throw new Error("Coolify teardown bindings did not resolve");

    if (verifyDeleted) {
      const targetReadback = await coolifyRequest(baseUrl, token, `/api/v1/applications/${applicationUuid}`);
      if (targetReadback.status !== 404) throw new Error(`Deleted application still resolves with ${targetReadback.status}`);
      const protectedReadback = await Promise.all(excludedResourceUuids.map(async (uuid) => {
        const response = await coolifyRequest(baseUrl, token, `/api/v1/applications/${uuid}`);
        const data = await requireJson(response, `Protected application ${uuid} post-delete read`);
        if (String(record(data).uuid ?? "") !== uuid) throw new Error("Protected application identity changed after teardown");
        return { uuid, present: true };
      }));
      console.log(JSON.stringify({ mode: "verify_deleted", target: { uuid: applicationUuid, absent: true }, protectedReadback, secretsReturned: false }, null, 2));
      return;
    }

    const [application, environment, deployments, ...excludedApplications] = await Promise.all([
      coolifyRequest(baseUrl, token, `/api/v1/applications/${applicationUuid}`).then((response) => requireJson(response, "Application read")),
      coolifyRequest(baseUrl, token, `/api/v1/projects/${projectUuid}/${environmentUuid}`).then((response) => requireJson(response, "Environment read")),
      coolifyRequest(baseUrl, token, `/api/v1/deployments/applications/${applicationUuid}?skip=0&take=1`).then((response) => requireJson(response, "Deployment-history read")),
      ...excludedResourceUuids.map((uuid) => coolifyRequest(baseUrl, token, `/api/v1/applications/${uuid}`).then((response) => requireJson(response, `Protected application ${uuid} read`))),
    ]);
    const deploymentHistory = deploymentItems(deployments);
    assertApplicationBoundary({ application, environment, applicationUuid, environmentUuid, excludedResourceUuids });
    try {
      const deploymentHistoryDisposition = String(issue.description ?? "").includes("dataDisposition: disposable_qa_delete_without_backup")
        ? "disposable_qa_delete_without_backup"
        : null;
      assertUnusedTemporaryApplication(
        { ...record(application), deployments: deploymentHistory },
        { deploymentHistoryDisposition },
      );
    } catch (error) {
      console.log(JSON.stringify({
        mode: "preflight_blocked",
        reason: error instanceof Error ? error.message : String(error),
        applicationUuid,
        deploymentCount: deploymentHistory.length,
        deployments: deploymentHistory.slice(0, 10).map(safeDeploymentSummary),
        secretsReturned: false,
      }, null, 2));
      throw error;
    }
    for (let index = 0; index < excludedApplications.length; index += 1) {
      if (String(record(excludedApplications[index]).uuid ?? "") !== excludedResourceUuids[index]) {
        throw new Error("A protected-resource readback did not match its exclusion");
      }
    }

    const before = {
      uuid: record(application).uuid ?? null,
      name: record(application).name ?? null,
      status: record(application).status ?? null,
      fqdnPresent: Boolean(record(application).fqdn),
      environmentUuid,
      deploymentCount: deploymentHistory.length,
      protectedResourcesVerified: excludedResourceUuids.length,
    };
    if (!apply) {
      console.log(JSON.stringify({ mode: "dry_run", authorized: true, deleteRoute: coolifyApplicationDeleteRoute(applicationUuid), before, secretsReturned: false }, null, 2));
      return;
    }

    const deletion = await coolifyRequest(baseUrl, token, coolifyApplicationDeleteRoute(applicationUuid), { method: "DELETE" });
    if (!deletion.ok) throw new Error(`Coolify application deletion failed with ${deletion.status}`);
    await waitForApplicationDeletion(baseUrl, token, applicationUuid);
    const protectedReadback = await Promise.all(excludedResourceUuids.map(async (uuid) => {
      const response = await coolifyRequest(baseUrl, token, `/api/v1/applications/${uuid}`);
      const data = await requireJson(response, `Protected application ${uuid} post-delete read`);
      if (String(record(data).uuid ?? "") !== uuid) throw new Error("Protected application identity changed after teardown");
      return { uuid, present: true };
    }));
    console.log(JSON.stringify({ mode: "apply", deleted: true, before, protectedReadback, secretsReturned: false }, null, 2));
  } finally {
    await (db as unknown as { $client?: { end?: (options?: { timeout?: number }) => Promise<void> } }).$client?.end?.({ timeout: 5 }).catch(() => undefined);
  }
}

await main();
