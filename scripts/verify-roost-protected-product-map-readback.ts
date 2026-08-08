import { readFile } from "node:fs/promises";
import { createHash } from "node:crypto";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { and, desc, eq } from "../packages/db/node_modules/drizzle-orm/index.js";
import { createDb, roostProductMapOutbox } from "../packages/db/src/index.js";
import { secretService } from "../server/src/services/secrets.js";

const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const apiBase = process.env.PAPERCLIP_API_URL ?? "http://127.0.0.1:3200";
const companyId = process.env.PAPERCLIP_COMPANY_ID ?? "ae26bb8b-8f5f-4a85-b341-78d4e1985975";

async function paperclip(route: string) {
  const response = await fetch(`${apiBase}${route}`);
  if (!response.ok) throw new Error(`Paperclip request failed: ${response.status}`);
  return response.json() as Promise<Array<Record<string, unknown>>>;
}

async function main() {
  const config = JSON.parse(await readFile(path.join(repoRoot, ".paperclip/config.json"), "utf8"));
  process.env.PAPERCLIP_SECRETS_MASTER_KEY_FILE ??= config.secrets.localEncrypted.keyFilePath;
  const db = createDb(`postgres://paperclip:paperclip@127.0.0.1:${config.database.embeddedPostgresPort}/paperclip`);
  const secrets = await paperclip(`/api/companies/${companyId}/secrets`);
  const byKey = (key: string) => {
    const record = secrets.find((candidate) => candidate.key === key);
    if (!record?.id) throw new Error(`Missing protected binding: ${key}`);
    return String(record.id);
  };
  const svc = secretService(db);
  const bindingKeys = ["roost_api_base_url", "roost_prod_test_email", "roost_prod_test_password", "roost_product_map_ingest_key"];
  let bindingsCreated = false;
  await svc.syncSecretRefsForTarget(companyId, { targetType: "system", targetId: "roost-protected-readback" }, bindingKeys.map((key) => ({
    secretId: byKey(key), configPath: key, versionSelector: "latest", required: true, label: `Protected readback ${key}`,
  })));
  bindingsCreated = true;
  const resolve = (key: string) => svc.resolveSecretValue(companyId, byKey(key), "latest", {
    consumerType: "system", consumerId: "roost-protected-readback",
    configPath: key, actorType: "system", actorId: "roost-protected-readback",
  });
  let readKeyId: string | null = null;
  try {
    const [baseUrlRaw, email, password, ingestKey] = await Promise.all([
      resolve("roost_api_base_url"), resolve("roost_prod_test_email"),
      resolve("roost_prod_test_password"), resolve("roost_product_map_ingest_key"),
    ]);
    const baseUrl = baseUrlRaw.replace(/\/+$/, "");
    const expectedDeployedSha = process.env.ROOST_EXPECTED_DEPLOYED_SHA ?? null;
    const healthResponse = await fetch(`${baseUrl}/health`);
    const healthBody = await healthResponse.json().catch(() => null);
    const deployedSha = healthBody?.build?.commit ?? healthBody?.data?.build?.commit ?? null;
    const loginResponse = await fetch(`${baseUrl}/auth/login`, {
      method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ email, password }),
    });
    const ownerToken = (await loginResponse.json())?.data?.token;
    if (!loginResponse.ok || typeof ownerToken !== "string") throw new Error("Protected owner login failed");
    const createResponse = await fetch(`${baseUrl}/v1/api-keys`, {
      method: "POST", headers: { authorization: `Bearer ${ownerToken}`, "content-type": "application/json" },
      body: JSON.stringify({ name: `Product Map readback ${new Date().toISOString()}`, scopes: ["product-map:projection:read"] }),
    });
    const created = (await createResponse.json())?.data;
    if (!createResponse.ok || typeof created?.key !== "string" || typeof created?.id !== "string") throw new Error("Read-only key creation failed");
    readKeyId = created.id;
    const writeDenied = await fetch(`${baseUrl}/v1/product-map/projection/ingest`, {
      method: "POST", headers: { "x-api-key": created.key, "content-type": "application/json" }, body: "{}",
    });
    const published = await db.select().from(roostProductMapOutbox).where(and(
      eq(roostProductMapOutbox.companyId, companyId), eq(roostProductMapOutbox.status, "published"),
    )).orderBy(desc(roostProductMapOutbox.observedAt), desc(roostProductMapOutbox.createdAt)).limit(2);
    const latest = published[0];
    if (!latest) throw new Error("No published outbox row found");
    const duplicateResponse = await fetch(`${baseUrl}/v1/product-map/projection/ingest`, {
      method: "POST", headers: { "x-api-key": ingestKey, "content-type": "application/json", "idempotency-key": latest.idempotencyKey },
      body: JSON.stringify(latest.envelope),
    });
    const duplicateBody = await duplicateResponse.json().catch(() => null);
    const replayProbeEnabled = process.env.PAPERCLIP_VERIFY_ROOST_REPLAY === "1";
    let oldReplay: { skipped?: boolean; status?: number; outcome?: unknown; reason?: string } = {
      skipped: true,
      reason: "Set PAPERCLIP_VERIFY_ROOST_REPLAY=1 to run the mutating quarantine probe.",
    };
    if (replayProbeEnabled && published[1]) {
      const old = published[1];
      const oldEnvelope = old.envelope as Record<string, unknown>;
      const replaySourceSnapshotId = createHash("sha256").update(`out-of-order-proof:${old.id}`).digest("hex");
      const replayIdempotencyKey = createHash("sha256").update(
        `${oldEnvelope.companyId}:${oldEnvelope.schemaVersion}:${replaySourceSnapshotId}:${oldEnvelope.packetDigest}`,
      ).digest("hex");
      const replayEnvelope = { ...oldEnvelope, sourceSnapshotId: replaySourceSnapshotId, idempotencyKey: replayIdempotencyKey };
      const oldResponse = await fetch(`${baseUrl}/v1/product-map/projection/ingest`, {
        method: "POST", headers: { "x-api-key": ingestKey, "content-type": "application/json", "idempotency-key": replayIdempotencyKey },
        body: JSON.stringify(replayEnvelope),
      });
      const oldBody = await oldResponse.json().catch(() => null);
      oldReplay = { status: oldResponse.status, outcome: oldBody?.data?.status ?? oldBody?.error ?? null };
    }
    const readResponse = await fetch(`${baseUrl}/v1/product-map/projection`, { headers: { "x-api-key": created.key } });
    const readBody = await readResponse.json();
    if (!readResponse.ok) throw new Error(`Protected read failed: ${readResponse.status}`);
    const projection = readBody?.data;
    const readSourceSnapshotId = projection?.procedure?.audit?.sourceSnapshotId ?? null;
    const digestMatches = projection?.procedure?.audit?.packetDigestPrefix === latest.packetDigest.slice(0, 12);
    const predicates = {
      exactDeployedSha: typeof expectedDeployedSha === "string" && deployedSha === expectedDeployedSha,
      publicHealth: healthResponse.ok,
      outboxPublished: latest.status === "published" && latest.publishedAt !== null,
      protectedRead: readResponse.status === 200,
      exactSnapshot: readSourceSnapshotId === latest.sourceSnapshotId,
      noConflict: projection?.status !== "conflict" && projection?.packet?.conflictState === "none",
      fresh: projection?.status === "current"
        && projection?.freshness?.status === "current"
        && Number(projection?.freshness?.ageMs) <= Number(projection?.freshness?.ttlMs),
      digestMatches,
      readKeyCannotWrite: writeDenied.status === 403,
      duplicateIsIdempotent: duplicateResponse.ok && duplicateBody?.data?.status === "duplicate",
    };
    const accepted = Object.values(predicates).every(Boolean);
    console.log(JSON.stringify({
      protectedReadStatus: readResponse.status,
      deployment: { healthStatus: healthResponse.status, deployedSha, expectedDeployedSha },
      readKeyScope: "product-map:projection:read",
      writeWithReadKeyStatus: writeDenied.status,
      projectionStatus: projection?.status ?? null,
      conflicts: projection?.procedure?.conflicts ?? projection?.conflicts ?? [],
      sourceControl: projection?.packet?.items?.map((item: Record<string, unknown>) => ({
        offeringId: item.offeringId,
        sourceControl: item.sourceControl,
      })) ?? [],
      freshness: projection?.freshness ?? null,
      outbox: { id: latest.id, status: latest.status, sourceSnapshotId: latest.sourceSnapshotId, publishedAt: latest.publishedAt },
      readSourceSnapshotId,
      sourceSnapshotMatches: readSourceSnapshotId === latest.sourceSnapshotId,
      duplicate: { status: duplicateResponse.status, outcome: duplicateBody?.data?.status ?? duplicateBody?.error ?? null },
      oldReplay,
      predicates,
      acceptanceDecision: accepted ? "accepted" : "rejected",
      rawSecretOutput: false,
    }, null, 2));
    if (!accepted) process.exitCode = 2;
  } finally {
    if (readKeyId) {
      const [baseUrlRaw, email, password] = await Promise.all([
        resolve("roost_api_base_url"), resolve("roost_prod_test_email"), resolve("roost_prod_test_password"),
      ]);
      const baseUrl = baseUrlRaw.replace(/\/+$/, "");
      const login = await fetch(`${baseUrl}/auth/login`, { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ email, password }) });
      const token = (await login.json())?.data?.token;
      if (typeof token === "string") await fetch(`${baseUrl}/v1/api-keys/${readKeyId}`, {
        method: "PATCH", headers: { authorization: `Bearer ${token}`, "content-type": "application/json" }, body: JSON.stringify({ active: false }),
      });
    }
    if (bindingsCreated) await svc.syncSecretRefsForTarget(
      companyId, { targetType: "system", targetId: "roost-protected-readback" }, [],
    ).catch(() => undefined);
    const client = (db as unknown as { $client?: { end?: (options?: { timeout?: number }) => Promise<void> } }).$client;
    await client?.end?.({ timeout: 5 }).catch(() => undefined);
  }
}

main().catch((error) => { console.error(error instanceof Error ? error.message : String(error)); process.exitCode = 1; });
