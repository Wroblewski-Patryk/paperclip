import { readFile } from "node:fs/promises";
import path from "node:path";
import { createDb } from "../packages/db/src/index.js";
import { secretService } from "../server/src/services/secrets.js";

const apiBase = process.env.PAPERCLIP_API_URL ?? "http://127.0.0.1:3200";
const companyId = process.env.PAPERCLIP_COMPANY_ID ?? "ae26bb8b-8f5f-4a85-b341-78d4e1985975";
const issueIdentifier = "LUC-1799";
const sourceAgentName = "09 DRE (Deployment & Reliability Engineer)";
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

async function requestRoost(
  baseUrl: string,
  route: string,
  apiKey?: string,
) {
  const response = await fetch(`${baseUrl.replace(/\/+$/, "")}${route}`, {
    headers: {
      accept: "application/json",
      ...(apiKey ? { "X-API-Key": apiKey } : {}),
    },
  });
  const text = await response.text();
  let data: unknown = null;
  if (text) {
    try {
      data = JSON.parse(text);
    } catch {
      data = null;
    }
  }
  return { status: response.status, ok: response.ok, data };
}

function secretRef(env: JsonRecord, key: string) {
  const binding = asRecord(env[key]);
  if (binding.type !== "secret_ref" || typeof binding.secretId !== "string") {
    throw new Error(`Required protected binding is missing: ${key}`);
  }
  return binding;
}

async function closeDb(db: ReturnType<typeof createDb> | null) {
  const client = (db as unknown as {
    $client?: { end?: (options?: { timeout?: number }) => Promise<void> };
  } | null)?.$client;
  await client?.end?.({ timeout: 5 }).catch(() => undefined);
}

async function main() {
  const [issue, agents] = await Promise.all([
    paperclipRequest(`/api/issues/${issueIdentifier}`),
    paperclipRequest(`/api/companies/${companyId}/agents`),
  ]);
  if (issue.companyId !== companyId) throw new Error(`${issueIdentifier} belongs to another company`);
  if (apply && ["done", "cancelled"].includes(String(issue.status))) {
    throw new Error(`${issueIdentifier} is already terminal`);
  }

  const sourceAgent = (Array.isArray(agents) ? agents : [])
    .find((agent: JsonRecord) => agent.name === sourceAgentName) as JsonRecord | undefined;
  if (!sourceAgent || typeof sourceAgent.id !== "string") {
    throw new Error(`Source agent not found: ${sourceAgentName}`);
  }
  const sourceEnv = asRecord(asRecord(sourceAgent.adapterConfig).env);
  const baseBinding = secretRef(sourceEnv, "COMPANYCORE_BASE_URL");
  const keyBinding = secretRef(sourceEnv, "COMPANYCORE_API_KEY");

  const plan = {
    mode: apply ? "apply-read-only" : "dry-run",
    issue: issueIdentifier,
    sourceAgent: sourceAgentName,
    checks: [
      "X-API-Key GET /v1/connection",
      "X-API-Key GET /v1/mcp/manifest",
      "unauthenticated negative controls",
      "scoped capability and read-only MCP tool verification",
    ],
    productionWrites: false,
    rawSecretOutput: false,
  };
  if (!apply) {
    console.log(JSON.stringify(plan, null, 2));
    return;
  }

  const runtime = await loadRuntimeConfig();
  const db = createDb(runtime.databaseUrl);
  try {
    const svc = secretService(db);
    const resolved = await svc.resolveEnvBindings(
      companyId,
      {
        COMPANYCORE_BASE_URL: baseBinding,
        COMPANYCORE_API_KEY: keyBinding,
      },
      {
        consumerType: "agent",
        consumerId: sourceAgent.id,
        actorType: "user",
        actorId: "local-board",
        issueId: issue.id,
      },
    );
    const roostBaseUrl = resolved.env.COMPANYCORE_BASE_URL;
    const apiKey = resolved.env.COMPANYCORE_API_KEY;
    if (!roostBaseUrl || !apiKey) throw new Error("Protected Roost bindings did not resolve");

    const [connection, manifest, negativeConnection, negativeManifest] = await Promise.all([
      requestRoost(roostBaseUrl, "/v1/connection", apiKey),
      requestRoost(roostBaseUrl, "/v1/mcp/manifest", apiKey),
      requestRoost(roostBaseUrl, "/v1/connection"),
      requestRoost(roostBaseUrl, "/v1/mcp/manifest"),
    ]);
    if (!connection.ok || !manifest.ok) {
      throw new Error(`Protected Roost canary failed with ${connection.status}/${manifest.status}`);
    }
    if (negativeConnection.status !== 401 || negativeManifest.status !== 401) {
      throw new Error("Roost unauthenticated negative controls did not fail closed");
    }

    const connectionData = asRecord(asRecord(connection.data).data);
    const auth = asRecord(connectionData.auth);
    const workspace = asRecord(connectionData.workspace);
    const capabilities = Array.isArray(connectionData.capabilities)
      ? connectionData.capabilities.filter((value): value is string => typeof value === "string")
      : [];
    const manifestData = asRecord(asRecord(manifest.data).data);
    const tools = Array.isArray(manifestData.tools)
      ? manifestData.tools.map(asRecord)
      : [];
    const mutatingCapabilities = capabilities.filter((capability) =>
      /:(write|delete|execute|activate|decide|retry|run|import|reconcile|oauth)$/.test(capability));
    const mutatingTools = tools.filter((tool) => {
      const method = String(tool.method ?? "").toUpperCase();
      return !["GET", "HEAD", "OPTIONS"].includes(method);
    });

    if (auth.type !== "api_key" || connectionData.scopeMode !== "scoped") {
      throw new Error("Roost service-key canary did not resolve as scoped api_key auth");
    }
    if (typeof workspace.id !== "string" || workspace.id.length === 0) {
      throw new Error("Roost service-key canary did not resolve a workspace");
    }
    if (capabilities.length === 0 || tools.length === 0) {
      throw new Error("Roost scoped manifests are unexpectedly empty");
    }
    if (mutatingCapabilities.length > 0 || mutatingTools.length > 0) {
      throw new Error("Roost service key is not read-only");
    }

    console.log(JSON.stringify({
      ...plan,
      result: {
        connectionStatus: connection.status,
        manifestStatus: manifest.status,
        authenticationType: auth.type,
        scopeMode: connectionData.scopeMode,
        workspaceResolved: true,
        capabilityCount: capabilities.length,
        mcpToolCount: tools.length,
        mutatingCapabilityCount: 0,
        mutatingToolCount: 0,
        unauthenticatedConnectionStatus: negativeConnection.status,
        unauthenticatedManifestStatus: negativeManifest.status,
        productionWrites: false,
        rawSecretOutput: false,
      },
    }, null, 2));
  } finally {
    await closeDb(db);
  }
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : String(error));
  process.exitCode = 1;
});
