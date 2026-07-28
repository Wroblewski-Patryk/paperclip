import { access, readFile } from "node:fs/promises";
import { spawn } from "node:child_process";
import path from "node:path";
import { createDb } from "../packages/db/src/index.js";
import { secretService } from "../server/src/services/secrets.js";

const apiBase = process.env.PAPERCLIP_API_URL ?? "http://127.0.0.1:3200";
const companyId = process.env.PAPERCLIP_COMPANY_ID ?? "ae26bb8b-8f5f-4a85-b341-78d4e1985975";
const apply = process.argv.includes("--apply");
const verify = process.argv.includes("--verify") || apply;
const sourceAgentName = "09 DRE (Deployment & Reliability Engineer)";
const targetAgentNames = [
  "00 AIA (AI Assistant)",
  "04 COO (Chief Operating Officer)",
  "09 CTO (Chief Technology Officer)",
  "09 DRE (Deployment & Reliability Engineer)",
  "09 QVE (QA & Verification Engineer)",
  "11 RPM (Roost Project Manager)",
];
const bridgePath = path.resolve("..", "Roost", "scripts", "companycore-mcp-server.mjs");
const roostConfigPrefix = "mcp_servers.companycore.";

type JsonRecord = Record<string, unknown>;

function asRecord(value: unknown): JsonRecord {
  return value && typeof value === "object" && !Array.isArray(value)
    ? value as JsonRecord
    : {};
}

function asStringArray(value: unknown): string[] {
  return Array.isArray(value) ? value.filter((item): item is string => typeof item === "string") : [];
}

async function request(method: string, route: string, body?: unknown) {
  const response = await fetch(`${apiBase}${route}`, {
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

function secretRef(secretId: string) {
  return { type: "secret_ref", secretId, version: "latest" } as const;
}

function companycoreExtraArgs(current: unknown): string[] {
  const existing = asStringArray(current);
  const preserved: string[] = [];
  for (let index = 0; index < existing.length; index += 1) {
    const currentArg = existing[index];
    if (currentArg === "-c" && existing[index + 1]?.startsWith(roostConfigPrefix)) {
      index += 1;
      continue;
    }
    if (currentArg.startsWith(`-c${roostConfigPrefix}`)) continue;
    preserved.push(currentArg);
  }
  return [
    ...preserved,
    "-c", `mcp_servers.companycore.command=${JSON.stringify(process.execPath)}`,
    "-c", `mcp_servers.companycore.args=[${JSON.stringify(bridgePath)}]`,
    "-c", `${roostConfigPrefix}env.COMPANYCORE_MCP_COMMAND_MODE="read_only"`,
    "-c", `${roostConfigPrefix}env.COMPANYCORE_MCP_MANIFEST_PATH="/v1/mcp/manifest"`,
  ];
}

function configuredAdapter(
  rawConfig: unknown,
  baseUrlSecretId: string,
  apiKeySecretId: string,
) {
  const config = asRecord(rawConfig);
  return {
    ...config,
    env: {
      ...asRecord(config.env),
      COMPANYCORE_BASE_URL: secretRef(baseUrlSecretId),
      COMPANYCORE_API_KEY: secretRef(apiKeySecretId),
    },
    extraArgs: companycoreExtraArgs(config.extraArgs),
  };
}

function adapterIsCurrent(config: JsonRecord, baseUrlSecretId: string, apiKeySecretId: string) {
  const env = asRecord(config.env);
  const args = asStringArray(config.extraArgs);
  return asRecord(env.COMPANYCORE_BASE_URL).secretId === baseUrlSecretId
    && asRecord(env.COMPANYCORE_API_KEY).secretId === apiKeySecretId
    && args.includes(`mcp_servers.companycore.command=${JSON.stringify(process.execPath)}`)
    && args.includes(`mcp_servers.companycore.args=[${JSON.stringify(bridgePath)}]`)
    && args.includes(`${roostConfigPrefix}env.COMPANYCORE_MCP_COMMAND_MODE="read_only"`);
}

async function verifyBridge(baseUrl: string, apiKey: string) {
  const child = spawn(process.execPath, [bridgePath], {
    cwd: path.dirname(bridgePath),
    env: {
      ...process.env,
      COMPANYCORE_BASE_URL: baseUrl,
      COMPANYCORE_API_KEY: apiKey,
      COMPANYCORE_MCP_COMMAND_MODE: "read_only",
      COMPANYCORE_MCP_MANIFEST_PATH: "/v1/mcp/manifest",
    },
    stdio: ["pipe", "pipe", "pipe"],
    windowsHide: true,
  });
  const responses = new Map<number, JsonRecord>();
  let buffer = "";
  child.stdout.setEncoding("utf8");
  child.stdout.on("data", (chunk: string) => {
    buffer += chunk;
    const lines = buffer.split(/\r?\n/);
    buffer = lines.pop() ?? "";
    for (const line of lines) {
      if (!line.trim()) continue;
      const message = JSON.parse(line) as JsonRecord;
      if (typeof message.id === "number") responses.set(message.id, message);
    }
  });
  let stderr = "";
  child.stderr.setEncoding("utf8");
  child.stderr.on("data", (chunk: string) => { stderr += chunk; });

  const waitFor = async (id: number) => {
    const deadline = Date.now() + 30_000;
    while (Date.now() < deadline) {
      const response = responses.get(id);
      if (response) return response;
      await new Promise((resolve) => setTimeout(resolve, 25));
    }
    throw new Error(`Timed out waiting for CompanyCore MCP response ${id}`);
  };

  try {
    child.stdin.write(`${JSON.stringify({ jsonrpc: "2.0", id: 1, method: "initialize", params: {} })}\n`);
    child.stdin.write(`${JSON.stringify({ jsonrpc: "2.0", id: 2, method: "tools/list", params: {} })}\n`);
    child.stdin.write(`${JSON.stringify({
      jsonrpc: "2.0",
      id: 3,
      method: "tools/call",
      params: { name: "companycore_get_company_os", arguments: {} },
    })}\n`);
    const [initialize, toolsList, companyOs] = await Promise.all([waitFor(1), waitFor(2), waitFor(3)]);
    const tools = Array.isArray(asRecord(toolsList.result).tools)
      ? asRecord(toolsList.result).tools as JsonRecord[]
      : [];
    const nonReadOnlyTools = tools.filter((tool) => asRecord(tool.annotations).readOnlyHint !== true);
    if (initialize.error || toolsList.error || companyOs.error) {
      throw new Error("CompanyCore MCP bridge returned a JSON-RPC error");
    }
    if (tools.length === 0 || nonReadOnlyTools.length > 0) {
      throw new Error("CompanyCore MCP bridge exposed an empty or non-read-only tool set");
    }
    if (asRecord(companyOs.result).isError === true) {
      throw new Error("CompanyCore MCP company context read failed");
    }
    return { initialized: true, toolCount: tools.length, nonReadOnlyToolCount: 0, companyOsRead: true };
  } finally {
    child.stdin.end();
    child.kill();
    if (stderr.includes(apiKey)) throw new Error("CompanyCore bridge wrote secret material to stderr");
  }
}

async function main() {
  await access(bridgePath);
  const [agentsResponse, secretsResponse] = await Promise.all([
    request("GET", `/api/companies/${companyId}/agents`),
    request("GET", `/api/companies/${companyId}/secrets`),
  ]);
  const agents = Array.isArray(agentsResponse) ? agentsResponse as JsonRecord[] : [];
  const secrets = Array.isArray(secretsResponse) ? secretsResponse as JsonRecord[] : [];
  const baseUrlSecret = secrets.find((secret) => secret.key === "roost_api_base_url");
  const apiKeySecret = secrets.find((secret) => secret.key === "companycore_api_key");
  if (typeof baseUrlSecret?.id !== "string" || typeof apiKeySecret?.id !== "string") {
    throw new Error("Existing hosted Roost secret metadata is incomplete; run the approved secret bootstrap first");
  }
  const targets = targetAgentNames.map((name) => {
    const agent = agents.find((candidate) => candidate.name === name);
    if (!agent || typeof agent.id !== "string") throw new Error(`Target agent not found: ${name}`);
    if (agent.adapterType !== "codex_local") throw new Error(`Target agent is not codex_local: ${name}`);
    return agent;
  });
  const current = targets.map((agent) => {
    const cheapConfig = asRecord(asRecord(asRecord(agent.runtimeConfig).modelProfiles).cheap);
    return {
      name: agent.name,
      primaryCurrent: adapterIsCurrent(asRecord(agent.adapterConfig), baseUrlSecret.id as string, apiKeySecret.id as string),
      cheapCurrent: adapterIsCurrent(asRecord(cheapConfig.adapterConfig), baseUrlSecret.id as string, apiKeySecret.id as string),
    };
  });
  const plan = {
    mode: apply ? "apply" : verify ? "verify" : "dry-run",
    companyId,
    targetAgents: targetAgentNames,
    bridgePath,
    hostedOnly: true,
    commandMode: "read_only",
    current,
    rawSecretOutput: false,
  };
  if (!apply && !verify) {
    console.log(JSON.stringify(plan, null, 2));
    return;
  }

  if (apply) {
    for (const agent of targets) {
      const runtimeConfig = asRecord(agent.runtimeConfig);
      const modelProfiles = asRecord(runtimeConfig.modelProfiles);
      const cheap = asRecord(modelProfiles.cheap);
      await request("PATCH", `/api/agents/${agent.id}?companyId=${companyId}`, {
        adapterConfig: configuredAdapter(agent.adapterConfig, baseUrlSecret.id, apiKeySecret.id),
        runtimeConfig: {
          ...runtimeConfig,
          modelProfiles: {
            ...modelProfiles,
            cheap: {
              ...cheap,
              adapterConfig: configuredAdapter(cheap.adapterConfig, baseUrlSecret.id, apiKeySecret.id),
            },
          },
        },
      });
    }
  }

  const sourceAgent = targets.find((agent) => agent.name === sourceAgentName);
  if (!sourceAgent || typeof sourceAgent.id !== "string") throw new Error("Source agent is missing");
  const runtime = await loadRuntimeConfig();
  const db = createDb(runtime.databaseUrl);
  try {
    const resolved = await secretService(db).resolveEnvBindings(
      companyId,
      {
        COMPANYCORE_BASE_URL: secretRef(baseUrlSecret.id),
        COMPANYCORE_API_KEY: secretRef(apiKeySecret.id),
      },
      {
        consumerType: "agent",
        consumerId: sourceAgent.id,
        actorType: "user",
        actorId: "local-board",
      },
    );
    const baseUrl = resolved.env.COMPANYCORE_BASE_URL?.replace(/\/+$/, "");
    const apiKey = resolved.env.COMPANYCORE_API_KEY;
    if (!baseUrl || !apiKey) throw new Error("Hosted Roost bindings did not resolve");
    const parsedBaseUrl = new URL(baseUrl);
    if (parsedBaseUrl.protocol !== "https:" || ["localhost", "127.0.0.1", "::1"].includes(parsedBaseUrl.hostname)) {
      throw new Error("COMPANYCORE_BASE_URL must target hosted Roost over HTTPS, never a local Roost service");
    }
    const bridge = await verifyBridge(baseUrl, apiKey);
    const negative = await fetch(`${baseUrl}/v1/mcp/manifest`, { headers: { accept: "application/json" } });
    if (negative.status !== 401) throw new Error("Hosted Roost unauthenticated MCP control did not fail closed");
    console.log(JSON.stringify({
      ...plan,
      result: {
        configuredAgentCount: targets.length,
        bridge,
        unauthenticatedManifestStatus: negative.status,
        hostedHttps: true,
        productionWrites: false,
        rawSecretOutput: false,
      },
    }, null, 2));
  } finally {
    const client = (db as unknown as { $client?: { end?: (options?: { timeout?: number }) => Promise<void> } }).$client;
    await client?.end?.({ timeout: 5 }).catch(() => undefined);
  }
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : String(error));
  process.exitCode = 1;
});
