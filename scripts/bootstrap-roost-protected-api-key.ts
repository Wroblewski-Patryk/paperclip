import { readFile } from "node:fs/promises";
import path from "node:path";
import { createDb } from "../packages/db/src/index.js";
import { secretService } from "../server/src/services/secrets.js";

const apiBase = process.env.PAPERCLIP_API_URL ?? "http://127.0.0.1:3200";
const apply = process.argv.includes("--apply");
const companyId = process.env.PAPERCLIP_COMPANY_ID ?? "ae26bb8b-8f5f-4a85-b341-78d4e1985975";
const issueIdentifier = "LUC-450";
const approvalId = "29bbb099-a958-4fac-8682-73ce1c0eae17";
const secretKey = "companycore_api_key";
const sourceAgentName = "09 DRE (Deployment & Reliability Engineer)";
const targetAgentNames = [
  "00 AIA (AI Assistant)",
  "09 CTO (Chief Technology Officer)",
  "09 DRE (Deployment & Reliability Engineer)",
  "09 QVE (QA & Verification Engineer)",
];

type JsonRecord = Record<string, unknown>;

function asRecord(value: unknown): JsonRecord {
  return value && typeof value === "object" && !Array.isArray(value)
    ? value as JsonRecord
    : {};
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
  const configPath = path.resolve(".paperclip/config.json");
  const config = JSON.parse(await readFile(configPath, "utf8"));
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

function secretRef(secretId: string) {
  return { type: "secret_ref", secretId, version: "latest" } as const;
}

async function bindProtectedRefs(agent: JsonRecord, baseUrlSecretId: string, apiKeySecretId: string) {
  if (typeof agent.id !== "string") throw new Error("Protected binding target is missing an agent id");
  const env = {
    ...envRecord(agent),
    COMPANYCORE_BASE_URL: secretRef(baseUrlSecretId),
    COMPANYCORE_API_KEY: secretRef(apiKeySecretId),
  };
  await request("PATCH", `/api/agents/${agent.id}?companyId=${companyId}`, {
    adapterConfig: { env },
  });
  agent.adapterConfig = { ...asRecord(agent.adapterConfig), env };
}

async function main() {
  const [issue, approval, agents, secretMetadata] = await Promise.all([
    request("GET", `/api/issues/${issueIdentifier}`),
    request("GET", `/api/approvals/${approvalId}`),
    request("GET", `/api/companies/${companyId}/agents`),
    request("GET", `/api/companies/${companyId}/secrets`),
  ]);

  if (approval.status !== "approved") {
    throw new Error(`Approval ${approvalId} is not approved`);
  }
  if (issue.companyId !== companyId) {
    throw new Error(`${issueIdentifier} does not belong to the configured company`);
  }

  const agentList = Array.isArray(agents) ? agents as JsonRecord[] : [];
  const sourceAgent = agentList.find((agent) => agent.name === sourceAgentName);
  if (!sourceAgent || typeof sourceAgent.id !== "string") {
    throw new Error(`Source agent not found: ${sourceAgentName}`);
  }
  const targets = targetAgentNames.map((name) => {
    const agent = agentList.find((candidate) => candidate.name === name);
    if (!agent || typeof agent.id !== "string") throw new Error(`Target agent not found: ${name}`);
    return agent;
  });

  const secretList = Array.isArray(secretMetadata) ? secretMetadata as JsonRecord[] : [];
  const baseUrlSecret = secretList.find((secret) => secret.key === "roost_api_base_url");
  if (!baseUrlSecret || typeof baseUrlSecret.id !== "string") {
    throw new Error("Required secret metadata is missing: roost_api_base_url");
  }
  const existingApiKeySecret = secretList.find((secret) => secret.key === secretKey) ?? null;

  const missingSourceBindings = [
    "ROOST_API_BASE_URL",
    "ROOST_PROD_TEST_EMAIL",
    "ROOST_PROD_TEST_PASSWORD",
  ].filter((key) => !(key in envRecord(sourceAgent)));
  if (missingSourceBindings.length > 0) {
    throw new Error(`Source agent is missing required protected bindings: ${missingSourceBindings.join(", ")}`);
  }

  const pendingConfirmation = (await request("GET", `/api/issues/${issue.id}/interactions`))
    .find((interaction: JsonRecord) => interaction.kind === "request_confirmation" && interaction.status === "pending");
  const bindingsCurrent = Boolean(existingApiKeySecret?.id) && targets.every((agent) => {
    const env = envRecord(agent);
    return asRecord(env.COMPANYCORE_API_KEY).secretId === existingApiKeySecret?.id
      && asRecord(env.COMPANYCORE_BASE_URL).secretId === baseUrlSecret.id;
  });

  const plan = {
    mode: apply ? "apply" : "dry-run",
    companyId,
    issue: issueIdentifier,
    approval: { id: approvalId, status: approval.status },
    sourceAgent: sourceAgentName,
    targetAgents: targetAgentNames,
    existingSecret: existingApiKeySecret
      ? { id: existingApiKeySecret.id, key: existingApiKeySecret.key, status: existingApiKeySecret.status }
      : null,
    bindingsCurrent,
    pendingConfirmationId: pendingConfirmation?.id ?? null,
    rawSecretOutput: false,
  };

  if (!apply) {
    console.log(JSON.stringify(plan, null, 2));
    return;
  }
  const runtime = await loadRuntimeConfig();
  const db = createDb(runtime.databaseUrl);
  const svc = secretService(db);
  let createdRoostKeyId: string | null = null;

  try {
    const resolved = await svc.resolveEnvBindings(companyId, envRecord(sourceAgent), {
      consumerType: "agent",
      consumerId: sourceAgent.id,
      actorType: "user",
      actorId: "local-board",
      issueId: issue.id,
    });
    const roostBaseUrl = resolved.env.ROOST_API_BASE_URL?.replace(/\/+$/, "");
    const email = resolved.env.ROOST_PROD_TEST_EMAIL;
    const password = resolved.env.ROOST_PROD_TEST_PASSWORD;
    if (!roostBaseUrl || !email || !password) {
      throw new Error("Protected Roost source bindings did not resolve");
    }

    let protectedSecret = existingApiKeySecret;
    let existingValueIsUsable = false;
    if (protectedSecret && typeof protectedSecret.id === "string") {
      await bindProtectedRefs(sourceAgent, baseUrlSecret.id, protectedSecret.id);
      const existingValue = await svc.resolveSecretValue(companyId, protectedSecret.id, "latest", {
        consumerType: "agent",
        consumerId: sourceAgent.id,
        configPath: "env.COMPANYCORE_API_KEY",
        actorType: "user",
        actorId: "local-board",
        issueId: issue.id,
      });
      existingValueIsUsable = existingValue.startsWith("cc_v1_");
    }

    if (!existingValueIsUsable) {
      const login = await requestRoost(roostBaseUrl, "/auth/login", {
        method: "POST",
        body: JSON.stringify({ email, password }),
      });
      const ownerToken = login?.data?.token;
      if (typeof ownerToken !== "string" || ownerToken.length === 0) {
        throw new Error("Roost smoke-account login did not return an owner token");
      }
      const createdKey = await requestRoost(roostBaseUrl, "/v1/api-keys", {
        method: "POST",
        headers: { Authorization: `Bearer ${ownerToken}` },
        body: JSON.stringify({
          name: `Paperclip protected smoke ${new Date().toISOString().slice(0, 10)}`,
          profileId: "mcp_company_os_reader",
        }),
      });
      const rawKey = createdKey?.data?.key;
      createdRoostKeyId = typeof createdKey?.data?.id === "string" ? createdKey.data.id : null;
      if (typeof rawKey !== "string" || !rawKey.startsWith("cc_v1_")) {
        throw new Error("Roost did not return a valid protected API key");
      }

      protectedSecret = protectedSecret && typeof protectedSecret.id === "string"
        ? await svc.rotate(protectedSecret.id, { value: rawKey }, { userId: "local-board" })
        : await svc.create(companyId, {
            name: "Roost CompanyCore protected smoke API key",
            key: secretKey,
            provider: "local_encrypted",
            managedMode: "paperclip_managed",
            value: rawKey,
            description: "Least-privilege reader key for approved Roost MCP/deeper smoke. Never expose the raw value.",
          }, { userId: "local-board" });
    }
    if (!protectedSecret || typeof protectedSecret.id !== "string") {
      throw new Error("Paperclip protected secret could not be created or resolved");
    }

    for (const agent of targets) {
      await bindProtectedRefs(agent, baseUrlSecret.id, protectedSecret.id);
    }

    if (pendingConfirmation?.id) {
      await request(
        "POST",
        `/api/issues/${issue.id}/interactions/${pendingConfirmation.id}/accept`,
        {},
      );
    }

    console.log(JSON.stringify({
      ...plan,
      result: {
        secretId: protectedSecret.id,
        secretKey,
        createdOrRotated: !existingValueIsUsable,
        boundAgentCount: targets.length,
        confirmationStatus: pendingConfirmation?.id ? "accepted" : "already_resolved",
        rawSecretOutput: false,
      },
    }, null, 2));
  } catch (error) {
    // If the Roost key was created but could not be stored, revoke that orphan
    // in a future board run using its metadata id. Never print the raw key.
    if (createdRoostKeyId) {
      console.error("Roost created a key before bootstrap failed; its metadata id is retained in process memory for cleanup.");
    }
    throw error;
  } finally {
    const client = (db as unknown as { $client?: { end?: (options?: { timeout?: number }) => Promise<void> } }).$client;
    await client?.end?.({ timeout: 5 }).catch(() => undefined);
  }
}

async function requestRoost(baseUrl: string, route: string, init: RequestInit) {
  const response = await fetch(`${baseUrl}${route}`, {
    ...init,
    headers: {
      accept: "application/json",
      "content-type": "application/json",
      ...(init.headers ?? {}),
    },
  });
  const text = await response.text();
  const data = text ? JSON.parse(text) : null;
  if (!response.ok) {
    const code = typeof data?.error === "string" ? data.error : "roost_request_failed";
    throw new Error(`Roost ${route} failed with ${response.status}: ${code}`);
  }
  return data;
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : String(error));
  process.exitCode = 1;
});
