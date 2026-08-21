import { readFile } from "node:fs/promises";
import path from "node:path";
import { createDb } from "../packages/db/src/index.js";
import { secretService } from "../server/src/services/secrets.js";

const API_BASE = process.env.PAPERCLIP_API_URL ?? "http://127.0.0.1:3200";
const COMPANY_ID = process.env.PAPERCLIP_COMPANY_ID ?? "ae26bb8b-8f5f-4a85-b341-78d4e1985975";
const ISSUE = "LUC-2469";
const QA_RESOURCE = "xj0ch8j95devlvegx8sa2tqk";
const PRODUCTION_RESOURCE = "rnqqkhl3o3dut4qv56mlxly2";
const DRE_NAME = "09 DRE (Deployment & Reliability Engineer)";

type JsonRecord = Record<string, unknown>;

function record(value: unknown): JsonRecord {
  return value && typeof value === "object" && !Array.isArray(value) ? value as JsonRecord : {};
}

function safeApplicationFacts(value: unknown) {
  const app = record(value);
  const pick = (key: string) => app[key] ?? null;
  return {
    uuid: pick("uuid"),
    name: pick("name"),
    status: pick("status"),
    fqdn: pick("fqdn"),
    gitRepository: pick("git_repository"),
    gitBranch: pick("git_branch"),
    gitCommitSha: pick("git_commit_sha"),
    buildPack: pick("build_pack"),
    healthCheckEnabled: pick("health_check_enabled"),
    healthCheckPath: pick("health_check_path"),
    environmentId: pick("environment_id"),
    destinationId: pick("destination_id"),
    sourceId: pick("source_id"),
    serverId: pick("server_id"),
  };
}

async function paperclipGet(route: string) {
  const response = await fetch(`${API_BASE}${route}`);
  if (!response.ok) throw new Error(`Paperclip read failed with ${response.status}`);
  return response.json();
}

async function loadRuntime() {
  const config = JSON.parse(await readFile(path.resolve(".paperclip/config.json"), "utf8"));
  const port = Number(config?.database?.embeddedPostgresPort);
  const keyFile = String(config?.secrets?.localEncrypted?.keyFilePath ?? "").trim();
  if (!Number.isFinite(port) || port !== 54329 || !keyFile) throw new Error("Canonical runtime configuration is unavailable");
  process.env.PAPERCLIP_SECRETS_MASTER_KEY_FILE ??= keyFile;
  return `postgres://paperclip:paperclip@127.0.0.1:${port}/paperclip`;
}

async function main() {
  const [issue, agents] = await Promise.all([
    paperclipGet(`/api/issues/${ISSUE}`),
    paperclipGet(`/api/companies/${COMPANY_ID}/agents`),
  ]);
  if (issue.companyId !== COMPANY_ID || !String(issue.description ?? "").includes(QA_RESOURCE)) {
    throw new Error("Issue no longer authorizes observation of the configured QA resource");
  }
  if (QA_RESOURCE === PRODUCTION_RESOURCE || String(issue.description ?? "").includes(`only production ${QA_RESOURCE}`)) {
    throw new Error("QA observer resource boundary is invalid");
  }
  const dre = (Array.isArray(agents) ? agents : []).find((agent) => agent.name === DRE_NAME);
  if (!dre) throw new Error("DRE runtime is unavailable");
  const env = record(record(dre.adapterConfig).env);
  const selected = Object.fromEntries(["COOLIFY_BASE_URL", "COOLIFY_API_TOKEN"].map((key) => {
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
    const token = resolved.env.COOLIFY_API_TOKEN;
    if (!baseUrl || !token) throw new Error("Coolify observer bindings did not resolve");
    const response = await fetch(`${baseUrl}/api/v1/applications/${QA_RESOURCE}`, {
      headers: { accept: "application/json", authorization: `Bearer ${token}` },
      signal: AbortSignal.timeout(15_000),
    });
    if (!response.ok) throw new Error(`Coolify QA read failed with ${response.status}`);
    const facts = safeApplicationFacts(await response.json());
    if (facts.uuid !== QA_RESOURCE) throw new Error("Coolify returned a different resource than requested");
    console.log(JSON.stringify({
      observedAt: new Date().toISOString(),
      issue: ISSUE,
      mode: "read_only_allowlisted_facts",
      providerScope: "team_and_permission; Paperclip enforces the issue resource UUID",
      productionResourceAccessed: false,
      secretsReturned: false,
      facts,
    }, null, 2));
  } finally {
    await (db as unknown as { $client?: { end?: (options?: { timeout?: number }) => Promise<void> } }).$client?.end?.({ timeout: 5 }).catch(() => undefined);
  }
}

await main();
