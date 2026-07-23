import { createRequire } from "node:module";
import { createDecipheriv, createHash } from "node:crypto";
import { createReadStream } from "node:fs";
import { cp, copyFile, mkdir, readFile, readdir, rm, stat, writeFile } from "node:fs/promises";
import net from "node:net";
import path from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";

const scriptDir = path.dirname(fileURLToPath(import.meta.url));
const repoRoot = path.resolve(scriptDir, "..");
const restoreRoot = path.join(repoRoot, ".paperclip", "runtime", "restore-drills");
const backupDir = path.join(
  repoRoot,
  ".paperclip",
  "runtime",
  "home",
  "instances",
  "default",
  "data",
  "backups",
);
const reportPath = path.join(repoRoot, "report", "softwarehouse-restore-drill.latest.json");
const canonicalInstanceRoot = path.join(
  repoRoot,
  ".paperclip",
  "runtime",
  "home",
  "instances",
  "default",
);
const canonicalStorageDir = path.join(canonicalInstanceRoot, "data", "storage");
const canonicalSecretsKeyFile = path.join(canonicalInstanceRoot, "secrets", "master.key");
const requestedBackup = process.argv.find((arg) => arg.startsWith("--backup="))?.slice("--backup=".length) ?? null;
const backupStabilityWindowMs = 5 * 60 * 1_000;

function assertInside(candidate, parent, label) {
  const relative = path.relative(parent, candidate);
  if (relative.startsWith("..") || path.isAbsolute(relative)) {
    throw new Error(`${label} must stay inside ${parent}`);
  }
}

async function allocatePort() {
  for (let attempt = 0; attempt < 20; attempt += 1) {
    const port = await new Promise((resolve, reject) => {
      const server = net.createServer();
      server.unref();
      server.once("error", reject);
      server.listen(0, "127.0.0.1", () => {
        const address = server.address();
        if (!address || typeof address === "string") {
          server.close(() => reject(new Error("Failed to allocate restore-drill port")));
          return;
        }
        server.close((error) => error ? reject(error) : resolve(address.port));
      });
    });
    if (port !== 3_200 && port !== 54_329) return port;
  }
  throw new Error("Failed to allocate a restore-drill port outside canonical runtime ports");
}

async function resolveBackupFile() {
  if (requestedBackup) {
    const resolved = path.resolve(requestedBackup);
    await stat(resolved);
    return resolved;
  }
  const candidates = await Promise.all(
    (await readdir(backupDir))
      .filter((name) => name.endsWith(".sql.gz"))
      .map(async (name) => {
        const filePath = path.join(backupDir, name);
        return { filePath, stats: await stat(filePath) };
      }),
  );
  const stabilityCutoff = Date.now() - backupStabilityWindowMs;
  const stableCandidates = candidates
    .filter(({ stats }) => stats.isFile() && stats.size > 0 && stats.mtimeMs <= stabilityCutoff)
    .sort((left, right) => right.stats.mtimeMs - left.stats.mtimeMs);
  if (!stableCandidates[0]) {
    throw new Error(`No completed .sql.gz backups older than the five-minute stability window found in ${backupDir}`);
  }
  return stableCandidates[0].filePath;
}

async function loadRuntimeDependencies() {
  const dbModule = await import(pathToFileURL(path.join(repoRoot, "packages", "db", "dist", "index.js")).href);
  const requireFromDb = createRequire(path.join(repoRoot, "packages", "db", "package.json"));
  const embeddedModule = await import(pathToFileURL(requireFromDb.resolve("embedded-postgres")).href);
  const postgresModule = await import(pathToFileURL(requireFromDb.resolve("postgres")).href);
  return {
    ...dbModule,
    EmbeddedPostgres: embeddedModule.default,
    postgres: postgresModule.default,
  };
}

async function summarizeFiles(root) {
  let fileCount = 0;
  let sizeBytes = 0;
  const pending = [root];
  while (pending.length > 0) {
    const current = pending.pop();
    for (const entry of await readdir(current, { withFileTypes: true })) {
      const entryPath = path.join(current, entry.name);
      if (entry.isDirectory()) pending.push(entryPath);
      if (entry.isFile()) {
        fileCount += 1;
        sizeBytes += (await stat(entryPath)).size;
      }
    }
  }
  return { fileCount, sizeBytes };
}

async function sha256Stream(stream) {
  const hash = createHash("sha256");
  for await (const chunk of stream) hash.update(chunk);
  return hash.digest("hex");
}

function resolveStorageObjectPath(baseDir, objectKey) {
  const normalized = String(objectKey ?? "").replaceAll("\\", "/").trim();
  const parts = normalized.split("/").filter(Boolean);
  if (!normalized || normalized.startsWith("/") || parts.some((part) => part === "." || part === "..")) {
    throw new Error("Restore validation failed: invalid storage object key");
  }
  const resolved = path.resolve(baseDir, ...parts);
  assertInside(resolved, baseDir, "Restored storage object");
  return resolved;
}

function decodeMasterKey(raw) {
  const trimmed = raw.trim();
  if (/^[A-Fa-f0-9]{64}$/.test(trimmed)) return Buffer.from(trimmed, "hex");
  const base64 = Buffer.from(trimmed, "base64");
  if (base64.length === 32) return base64;
  if (Buffer.byteLength(trimmed, "utf8") === 32) return Buffer.from(trimmed, "utf8");
  throw new Error("Restore validation failed: restored encrypted-secrets key is invalid");
}

function resolveLocalEncryptedMaterial(masterKey, material) {
  if (
    !material ||
    material.scheme !== "local_encrypted_v1" ||
    typeof material.iv !== "string" ||
    typeof material.tag !== "string" ||
    typeof material.ciphertext !== "string"
  ) {
    throw new Error("Restore validation failed: stored local-encrypted material is invalid");
  }
  const decipher = createDecipheriv("aes-256-gcm", masterKey, Buffer.from(material.iv, "base64"));
  decipher.setAuthTag(Buffer.from(material.tag, "base64"));
  return Buffer.concat([
    decipher.update(Buffer.from(material.ciphertext, "base64")),
    decipher.final(),
  ]);
}

const startedAt = new Date();
const backupFile = await resolveBackupFile();
const backupStats = await stat(backupFile);
await mkdir(restoreRoot, { recursive: true });
const drillDir = path.join(restoreRoot, `drill-${startedAt.toISOString().replaceAll(":", "-").replaceAll(".", "-")}`);
assertInside(drillDir, restoreRoot, "Restore drill directory");
await mkdir(drillDir, { recursive: false });
const restoredInstanceRoot = path.join(drillDir, "instance");
const restoredDatabaseDir = path.join(restoredInstanceRoot, "db");
const restoredStorageDir = path.join(restoredInstanceRoot, "data", "storage");
const restoredSecretsKeyFile = path.join(restoredInstanceRoot, "secrets", "master.key");
assertInside(restoredInstanceRoot, drillDir, "Restored instance directory");

let instance = null;
let sql = null;
let port = null;
let cleanupError = null;
let result = null;
const previousMasterKeyFile = process.env.PAPERCLIP_SECRETS_MASTER_KEY_FILE;
const previousMasterKey = process.env.PAPERCLIP_SECRETS_MASTER_KEY;

try {
  const {
    EmbeddedPostgres,
    ensurePostgresDatabase,
    postgres,
    prepareEmbeddedPostgresNativeRuntime,
    runDatabaseRestore,
  } = await loadRuntimeDependencies();
  const canonicalKeyStats = await stat(canonicalSecretsKeyFile);
  if (!canonicalKeyStats.isFile()) throw new Error("Canonical encrypted-secrets master key is not a file");
  await mkdir(path.dirname(restoredSecretsKeyFile), { recursive: true });
  await mkdir(path.dirname(restoredStorageDir), { recursive: true });
  await copyFile(canonicalSecretsKeyFile, restoredSecretsKeyFile);
  await cp(canonicalStorageDir, restoredStorageDir, { recursive: true, force: false, errorOnExist: true });
  const restoredStorageSummary = await summarizeFiles(restoredStorageDir);
  const restoredKeyStats = await stat(restoredSecretsKeyFile);

  process.env.PAPERCLIP_SECRETS_MASTER_KEY_FILE = restoredSecretsKeyFile;
  delete process.env.PAPERCLIP_SECRETS_MASTER_KEY;

  await prepareEmbeddedPostgresNativeRuntime();
  port = await allocatePort();
  instance = new EmbeddedPostgres({
    databaseDir: restoredDatabaseDir,
    user: "paperclip_restore",
    password: "paperclip_restore",
    port,
    persistent: true,
    initdbFlags: ["--encoding=UTF8", "--locale=C", "--lc-messages=C"],
    onLog: () => {},
    onError: () => {},
  });
  await instance.initialise();
  await instance.start();

  const adminConnectionString = `postgres://paperclip_restore:paperclip_restore@127.0.0.1:${port}/postgres`;
  await ensurePostgresDatabase(adminConnectionString, "paperclip_restore");
  const connectionString = `postgres://paperclip_restore:paperclip_restore@127.0.0.1:${port}/paperclip_restore`;
  await runDatabaseRestore({ connectionString, backupFile, connectTimeoutSeconds: 30 });

  sql = postgres(connectionString, { max: 1, connect_timeout: 30, onnotice: () => {} });
  const tableRows = await sql`
    SELECT count(*)::int AS count
    FROM information_schema.tables
    WHERE table_schema NOT IN ('pg_catalog', 'information_schema')
      AND table_type = 'BASE TABLE'
  `;
  const [counts] = await sql`
    SELECT
      (SELECT count(*)::int FROM companies) AS companies,
      (SELECT count(*)::int FROM agents) AS agents,
      (SELECT count(*)::int FROM issues) AS issues,
      (SELECT count(*)::int FROM routines) AS routines,
      (SELECT count(*)::int FROM heartbeat_runs) AS heartbeat_runs,
      (SELECT count(*)::int FROM issue_work_products) AS issue_work_products
  `;
  const assets = await sql`
    SELECT id, company_id, object_key, byte_size, sha256
    FROM assets
    WHERE provider = 'local_disk'
    ORDER BY created_at DESC
  `;
  const [secretVersion] = await sql`
    SELECT csv.material, csv.value_sha256
    FROM company_secret_versions csv
    INNER JOIN company_secrets cs ON cs.id = csv.secret_id
    WHERE cs.provider = 'local_encrypted'
      AND cs.status = 'active'
      AND csv.status = 'current'
    ORDER BY csv.created_at DESC
    LIMIT 1
  `;

  if (assets.length === 0) throw new Error("Restore validation failed: no local-disk asset metadata available for readback");
  if (!secretVersion) throw new Error("Restore validation failed: no current local-encrypted secret version available");

  let matchedAsset = null;
  for (const asset of assets) {
    const restoredObjectPath = resolveStorageObjectPath(restoredStorageDir, asset.object_key);
    const restoredObjectStats = await stat(restoredObjectPath).catch(() => null);
    if (!restoredObjectStats?.isFile() || restoredObjectStats.size !== Number(asset.byte_size)) continue;
    const restoredObjectSha256 = await sha256Stream(createReadStream(restoredObjectPath));
    if (restoredObjectSha256 === asset.sha256) {
      matchedAsset = asset;
      break;
    }
  }
  const assetReadbackMatches = matchedAsset !== null;

  const restoredMasterKey = decodeMasterKey(await readFile(restoredSecretsKeyFile, "utf8"));
  const resolvedSecret = resolveLocalEncryptedMaterial(restoredMasterKey, secretVersion.material);
  const secretResolutionMatches =
    createHash("sha256").update(resolvedSecret).digest("hex") === secretVersion.value_sha256;
  const tableCount = Number(tableRows[0]?.count ?? 0);
  const normalizedCounts = Object.fromEntries(
    Object.entries(counts ?? {}).map(([key, value]) => [key, Number(value)]),
  );
  const requiredPositive = ["companies", "agents", "issues", "routines", "heartbeat_runs"];
  const failedChecks = [
    ...(tableCount < 20 ? [`expected at least 20 restored tables, got ${tableCount}`] : []),
    ...requiredPositive
      .filter((key) => !(normalizedCounts[key] > 0))
      .map((key) => `expected restored ${key} rows`),
    ...(!assetReadbackMatches ? ["restored local-disk artifact readback did not match database metadata"] : []),
    ...(!secretResolutionMatches ? ["restored encrypted secret did not match its stored digest"] : []),
    ...(restoredKeyStats.size !== canonicalKeyStats.size ? ["restored encrypted-secrets key file size differs"] : []),
    ...(restoredStorageSummary.fileCount < 1 ? ["restored storage contains no files"] : []),
  ];
  if (failedChecks.length > 0) throw new Error(`Restore validation failed: ${failedChecks.join("; ")}`);

  result = {
    overall: "pass",
    startedAt: startedAt.toISOString(),
    finishedAt: new Date().toISOString(),
    backup: {
      fileName: path.basename(backupFile),
      sizeBytes: backupStats.size,
      modifiedAt: backupStats.mtime.toISOString(),
    },
    isolation: {
      canonicalPaperclipPortUntouched: 3_200,
      canonicalPostgresPortUntouched: 54_329,
      restorePort: port,
      temporaryDirectoryRemoved: true,
    },
    validation: {
      tableCount,
      counts: normalizedCounts,
      storage: {
        fileCount: restoredStorageSummary.fileCount,
        sizeBytes: restoredStorageSummary.sizeBytes,
        assetMetadataRows: assets.length,
        artifactReadback: "pass",
      },
      encryptedSecrets: {
        restoredKeyBytes: restoredKeyStats.size,
        resolutionDigestMatch: "pass",
      },
    },
  };
} finally {
  await sql?.end().catch(() => {});
  await instance?.stop().catch((error) => {
    cleanupError = `stop failed: ${error instanceof Error ? error.message : String(error)}`;
  });
  await rm(drillDir, { recursive: true, force: true }).catch((error) => {
    cleanupError = `remove failed: ${error instanceof Error ? error.message : String(error)}`;
  });
  if (previousMasterKeyFile === undefined) delete process.env.PAPERCLIP_SECRETS_MASTER_KEY_FILE;
  else process.env.PAPERCLIP_SECRETS_MASTER_KEY_FILE = previousMasterKeyFile;
  if (previousMasterKey === undefined) delete process.env.PAPERCLIP_SECRETS_MASTER_KEY;
  else process.env.PAPERCLIP_SECRETS_MASTER_KEY = previousMasterKey;
}

if (cleanupError) throw new Error(`Restore drill cleanup failed: ${cleanupError}`);
if (!result) throw new Error("Restore drill ended without a validation result");
await mkdir(path.dirname(reportPath), { recursive: true });
await writeFile(reportPath, `${JSON.stringify(result, null, 2)}\n`, "utf8");
console.log(JSON.stringify({ ...result, reportPath }, null, 2));
