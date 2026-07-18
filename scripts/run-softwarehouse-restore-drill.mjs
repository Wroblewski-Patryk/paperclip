import { createRequire } from "node:module";
import { mkdir, readdir, rm, stat, writeFile } from "node:fs/promises";
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
const requestedBackup = process.argv.find((arg) => arg.startsWith("--backup="))?.slice("--backup=".length) ?? null;

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
  candidates.sort((left, right) => right.stats.mtimeMs - left.stats.mtimeMs);
  if (!candidates[0]) throw new Error(`No .sql.gz backups found in ${backupDir}`);
  return candidates[0].filePath;
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

const startedAt = new Date();
const backupFile = await resolveBackupFile();
const backupStats = await stat(backupFile);
await mkdir(restoreRoot, { recursive: true });
const drillDir = path.join(restoreRoot, `drill-${startedAt.toISOString().replaceAll(":", "-").replaceAll(".", "-")}`);
assertInside(drillDir, restoreRoot, "Restore drill directory");
await mkdir(drillDir, { recursive: false });

let instance = null;
let sql = null;
let port = null;
let cleanupError = null;
let result = null;

try {
  const {
    EmbeddedPostgres,
    ensurePostgresDatabase,
    postgres,
    prepareEmbeddedPostgresNativeRuntime,
    runDatabaseRestore,
  } = await loadRuntimeDependencies();
  await prepareEmbeddedPostgresNativeRuntime();
  port = await allocatePort();
  instance = new EmbeddedPostgres({
    databaseDir: drillDir,
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
    validation: { tableCount, counts: normalizedCounts },
  };
} finally {
  await sql?.end().catch(() => {});
  await instance?.stop().catch((error) => {
    cleanupError = `stop failed: ${error instanceof Error ? error.message : String(error)}`;
  });
  await rm(drillDir, { recursive: true, force: true }).catch((error) => {
    cleanupError = `remove failed: ${error instanceof Error ? error.message : String(error)}`;
  });
}

if (cleanupError) throw new Error(`Restore drill cleanup failed: ${cleanupError}`);
if (!result) throw new Error("Restore drill ended without a validation result");
await mkdir(path.dirname(reportPath), { recursive: true });
await writeFile(reportPath, `${JSON.stringify(result, null, 2)}\n`, "utf8");
console.log(JSON.stringify({ ...result, reportPath }, null, 2));
