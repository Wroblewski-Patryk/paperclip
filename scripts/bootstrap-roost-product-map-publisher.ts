import { readFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { createDb } from "../packages/db/src/index.js";
import { secretService } from "../server/src/services/secrets.js";

const apiBase = process.env.PAPERCLIP_API_URL ?? "http://127.0.0.1:3200";
const companyId = process.env.PAPERCLIP_COMPANY_ID ?? "ae26bb8b-8f5f-4a85-b341-78d4e1985975";
const apply = process.argv.includes("--apply");
const verify = process.argv.includes("--verify");
const secretKey = "roost_product_map_ingest_key";
const systemTargetId = "roost-product-map-publisher";
const bootstrapTargetId = "roost-product-map-publisher-bootstrap";
const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");

async function request(method: string, route: string, body?: unknown) {
  const response = await fetch(`${apiBase}${route}`, {
    method,
    headers: { "content-type": "application/json" },
    body: body === undefined ? undefined : JSON.stringify(body),
  });
  const text = await response.text();
  const data = text ? JSON.parse(text) : null;
  if (!response.ok) throw new Error(`${method} ${route} failed with ${response.status}`);
  return data;
}

async function roostFetch(stage: string, input: string, init?: RequestInit) {
  try {
    return await fetch(input, init);
  } catch {
    throw new Error(`ROOST_${stage}_TRANSPORT_FAILED`);
  }
}

async function runtime() {
  const config = JSON.parse(await readFile(path.join(repoRoot, ".paperclip/config.json"), "utf8"));
  process.env.PAPERCLIP_SECRETS_MASTER_KEY_FILE ??= config.secrets.localEncrypted.keyFilePath;
  return `postgres://paperclip:paperclip@127.0.0.1:${config.database.embeddedPostgresPort}/paperclip`;
}

async function main() {
  const secrets = await request("GET", `/api/companies/${companyId}/secrets`);
  const existing = secrets.find((secret: Record<string, unknown>) => secret.key === secretKey) ?? null;
  if (!apply && !verify) {
    console.log(JSON.stringify({ mode: "dry-run", existingSecretId: existing?.id ?? null, rawSecretOutput: false }, null, 2));
    return;
  }

  const db = createDb(await runtime());
  const svc = secretService(db);
  let createdRoostKeyId: string | null = null;
  let bootstrapBindingsCreated = false;
  try {
    const bootstrapSpecs = [
      ["ROOST_API_BASE_URL", "roost_api_base_url"],
      ["ROOST_PROD_TEST_EMAIL", "roost_prod_test_email"],
      ["ROOST_PROD_TEST_PASSWORD", "roost_prod_test_password"],
    ].map(([envKey, key]) => {
      const secret = secrets.find((candidate: Record<string, unknown>) => candidate.key === key);
      if (!secret?.id) throw new Error(`Required bootstrap secret is missing: ${key}`);
      return { envKey, secretId: String(secret.id) };
    });
    await svc.syncSecretRefsForTarget(
      companyId,
      { targetType: "system", targetId: bootstrapTargetId },
      bootstrapSpecs.map((spec) => ({
        secretId: spec.secretId,
        configPath: `env.${spec.envKey}`,
        versionSelector: "latest",
        required: true,
        label: `Temporary Product Map bootstrap ${spec.envKey}`,
      })),
    );
    bootstrapBindingsCreated = true;
    const resolved = await svc.resolveEnvBindings(companyId, Object.fromEntries(bootstrapSpecs.map((spec) => [spec.envKey, {
      type: "secret_ref",
      secretId: spec.secretId,
      version: "latest",
    }])), {
      consumerType: "system",
      consumerId: bootstrapTargetId,
      actorType: "system",
      actorId: bootstrapTargetId,
    });
    const baseUrl = resolved.env.ROOST_API_BASE_URL?.replace(/\/+$/, "");
    const email = resolved.env.ROOST_PROD_TEST_EMAIL;
    const password = resolved.env.ROOST_PROD_TEST_PASSWORD;
    if (!baseUrl || !email || !password) throw new Error("Protected Roost bootstrap bindings are incomplete");
    const loginResponse = await roostFetch("LOGIN", `${baseUrl}/auth/login`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ email, password }),
    });
    const login = await loginResponse.json();
    const ownerToken = login?.data?.token;
    if (!loginResponse.ok || typeof ownerToken !== "string") throw new Error("Roost owner smoke login failed");
    if (verify) {
      const readResponse = await roostFetch("PROJECTION_READ", `${baseUrl}/v1/product-map/projection`, {
        headers: { authorization: `Bearer ${ownerToken}` },
      });
      const readBody = await readResponse.json();
      if (!readResponse.ok) throw new Error(`Roost Product Map readback failed with ${readResponse.status}`);
      const projection = readBody?.data;
      let lifecycleDefinition: Record<string, unknown> | null = null;
      if (projection?.status === "unavailable") {
        const procedureResponse = await roostFetch("PROCEDURE_READ", `${baseUrl}/v1/company-os/procedures?limit=100`, {
          headers: { authorization: `Bearer ${ownerToken}` },
        });
        if (procedureResponse.ok) {
          const procedures = (await procedureResponse.json())?.data;
          const procedure = Array.isArray(procedures)
            ? procedures.find((item: Record<string, unknown>) => item.name === "PROC-SH-APPLICATION-LIFECYCLE")
            : null;
          lifecycleDefinition = procedure ? {
            present: true,
            status: procedure.status ?? null,
            version: procedure.version ?? null,
            stepCount: Array.isArray(procedure.steps) ? procedure.steps.length : null,
            hasOwnerRole: Boolean(procedure.ownerRole),
            hasProcess: Boolean(procedure.processId),
            hasQualityStandard: Boolean(procedure.qualityStandardId),
          } : { present: false };
        }
      }
      const itemNames = Array.isArray(projection?.packet?.items)
        ? projection.packet.items.map((item: Record<string, unknown>) => String(item.paperclipProjectName ?? "")).filter(Boolean)
        : [];
      console.log(JSON.stringify({
        mode: "verify",
        status: projection?.status ?? null,
        schemaVersion: projection?.packet?.schemaVersion ?? null,
        itemCount: itemNames.length,
        itemNames,
        lifecycleDefinition,
        rawSecretOutput: false,
      }, null, 2));
      return;
    }
    const bindingResponse = await roostFetch("SOURCE_BINDING", `${baseUrl}/v1/product-map/projection/source`, {
      method: "PUT",
      headers: { "content-type": "application/json", authorization: `Bearer ${ownerToken}` },
      body: JSON.stringify({ companyId }),
    });
    if (!bindingResponse.ok) throw new Error("Roost Product Map company binding failed");
    const keyResponse = await roostFetch("KEY_CREATE", `${baseUrl}/v1/api-keys`, {
      method: "POST",
      headers: { "content-type": "application/json", authorization: `Bearer ${ownerToken}` },
      body: JSON.stringify({ name: "Paperclip Product Map publisher", scopes: ["product-map:projection:ingest"] }),
    });
    const keyBody = await keyResponse.json();
    const value = keyBody?.data?.key;
    createdRoostKeyId = keyBody?.data?.id ?? null;
    if (!keyResponse.ok || typeof value !== "string" || !value.startsWith("cc_v1_")) {
      throw new Error("Roost did not create an ingest-only Product Map key");
    }
    const keyProbe = await roostFetch("KEY_PREFLIGHT", `${baseUrl}/v1/product-map/projection/ingest`, {
      method: "POST",
      headers: { "content-type": "application/json", "x-api-key": value },
      body: "{}",
    });
    if (keyProbe.status !== 400) {
      throw new Error(`Roost Product Map ingest key preflight failed with ${keyProbe.status}`);
    }
    const stored = existing
      ? await svc.rotate(existing.id, { value }, { userId: "local-board" })
      : await svc.create(companyId, {
          name: "Roost Product Map ingest API key",
          key: secretKey,
          provider: "local_encrypted",
          managedMode: "paperclip_managed",
          value,
          description: "Exact product-map:projection:ingest credential for the local Paperclip outbox publisher.",
        }, { userId: "local-board" });
    await svc.syncSecretRefsForTarget(companyId, { targetType: "system", targetId: systemTargetId }, [{
      secretId: stored.id,
      configPath: "PRODUCT_MAP_ROOST_INGEST_KEY",
      versionSelector: "latest",
      required: true,
      label: "Roost Product Map ingest",
    }]);
    let retiredPriorKeys = 0;
    const keysResponse = await roostFetch("KEY_LIST", `${baseUrl}/v1/api-keys`, {
      headers: { authorization: `Bearer ${ownerToken}` },
    });
    const keyRecords = keysResponse.ok ? (await keysResponse.json())?.data : [];
    for (const keyRecord of Array.isArray(keyRecords) ? keyRecords : []) {
      if (keyRecord?.id === createdRoostKeyId || keyRecord?.name !== "Paperclip Product Map publisher" || keyRecord?.active !== true) continue;
      const retireResponse = await roostFetch("KEY_RETIRE", `${baseUrl}/v1/api-keys/${keyRecord.id}`, {
        method: "PATCH",
        headers: { "content-type": "application/json", authorization: `Bearer ${ownerToken}` },
        body: JSON.stringify({ active: false }),
      });
      if (!retireResponse.ok) throw new Error("Prior Roost Product Map key retirement failed");
      retiredPriorKeys += 1;
    }
    console.log(JSON.stringify({
      mode: "apply",
      secretId: stored.id,
      createdOrRotated: true,
      roostKeyMetadataIdRecorded: Boolean(createdRoostKeyId),
      systemBinding: systemTargetId,
      retiredPriorKeys,
      rawSecretOutput: false,
    }, null, 2));
  } finally {
    if (bootstrapBindingsCreated) {
      await svc.syncSecretRefsForTarget(companyId, { targetType: "system", targetId: bootstrapTargetId }, []).catch(() => undefined);
    }
    const client = (db as unknown as { $client?: { end?: (options?: { timeout?: number }) => Promise<void> } }).$client;
    await client?.end?.({ timeout: 5 }).catch(() => undefined);
  }
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : String(error));
  process.exitCode = 1;
});
