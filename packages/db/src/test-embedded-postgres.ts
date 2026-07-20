import { execFile } from "node:child_process";
import fs from "node:fs";
import net from "node:net";
import os from "node:os";
import path from "node:path";
import { setTimeout as delay } from "node:timers/promises";
import { promisify } from "node:util";
import { applyPendingMigrations, ensurePostgresDatabase } from "./client.js";
import { prepareEmbeddedPostgresNativeRuntime } from "./embedded-postgres-native.js";

type EmbeddedPostgresInstance = {
  initialise(): Promise<void>;
  start(): Promise<void>;
  stop(): Promise<void>;
};

type EmbeddedPostgresCtor = new (opts: {
  databaseDir: string;
  user: string;
  password: string;
  port: number;
  persistent: boolean;
  initdbFlags?: string[];
  onLog?: (message: unknown) => void;
  onError?: (message: unknown) => void;
}) => EmbeddedPostgresInstance;

export type EmbeddedPostgresTestSupport = {
  supported: boolean;
  reason?: string;
};

export type EmbeddedPostgresTestDatabase = {
  connectionString: string;
  cleanup(): Promise<void>;
};

let embeddedPostgresSupportPromise: Promise<EmbeddedPostgresTestSupport> | null = null;

const DEFAULT_PAPERCLIP_EMBEDDED_POSTGRES_PORT = 54329;
const execFileAsync = promisify(execFile);

async function getWindowsPostgresPids(): Promise<Set<number>> {
  if (process.platform !== "win32") return new Set();
  const { stdout } = await execFileAsync(
    "powershell.exe",
    [
      "-NoProfile",
      "-NonInteractive",
      "-Command",
      `(Get-CimInstance Win32_Process -Filter \"Name='postgres.exe'\" -ErrorAction SilentlyContinue).ProcessId -join ','`,
    ],
    { windowsHide: true },
  );
  return new Set(
    stdout
      .trim()
      .split(",")
      .map((value) => Number.parseInt(value, 10))
      .filter((value) => Number.isInteger(value) && value > 0),
  );
}

async function getWindowsProcessTreePids(rootPid: number): Promise<number[]> {
  const script = [
    `$pending = [System.Collections.Generic.Queue[int]]::new()`,
    `$seen = [System.Collections.Generic.HashSet[int]]::new()`,
    `$pending.Enqueue(${rootPid})`,
    `while ($pending.Count -gt 0) {`,
    `  $current = $pending.Dequeue()`,
    `  if (-not $seen.Add($current)) { continue }`,
    `  Get-CimInstance Win32_Process -Filter \"ParentProcessId=$current\" -ErrorAction SilentlyContinue | ForEach-Object {`,
    `    $pending.Enqueue([int]$_.ProcessId)`,
    `  }`,
    `}`,
    `$seen -join ','`,
  ].join("\n");
  const { stdout } = await execFileAsync(
    "powershell.exe",
    ["-NoProfile", "-NonInteractive", "-Command", script],
    { windowsHide: true },
  );
  return stdout
    .trim()
    .split(",")
    .map((value) => Number.parseInt(value, 10))
    .filter((value) => Number.isInteger(value) && value > 0);
}

async function getWindowsReservedPostgresPids(): Promise<Set<number>> {
  if (process.platform !== "win32") return new Set();
  const reservedPorts = [...getReservedTestPorts()];
  if (reservedPorts.length === 0) return new Set();
  const script = [
    `$ports = @(${reservedPorts.join(",")})`,
    `$pending = [System.Collections.Generic.Queue[int]]::new()`,
    `$seen = [System.Collections.Generic.HashSet[int]]::new()`,
    `Get-NetTCPConnection -State Listen -ErrorAction SilentlyContinue | Where-Object { $ports -contains [int]$_.LocalPort } | ForEach-Object {`,
    `  if ([int]$_.OwningProcess -gt 0) { $pending.Enqueue([int]$_.OwningProcess) }`,
    `}`,
    `while ($pending.Count -gt 0) {`,
    `  $current = $pending.Dequeue()`,
    `  if (-not $seen.Add($current)) { continue }`,
    `  Get-CimInstance Win32_Process -Filter "ParentProcessId=$current" -ErrorAction SilentlyContinue | ForEach-Object {`,
    `    $pending.Enqueue([int]$_.ProcessId)`,
    `  }`,
    `}`,
    `$seen -join ','`,
  ].join("\n");
  const { stdout } = await execFileAsync(
    "powershell.exe",
    ["-NoProfile", "-NonInteractive", "-Command", script],
    { windowsHide: true },
  );
  return new Set(
    stdout
      .trim()
      .split(",")
      .map((value) => Number.parseInt(value, 10))
      .filter((value) => Number.isInteger(value) && value > 0),
  );
}

async function stopEmbeddedPostgresTestInstance(
  instance: EmbeddedPostgresInstance | null,
  baselineWindowsPostgresPids: Set<number>,
) {
  if (!instance) return;
  const pid = (instance as unknown as { process?: { pid?: number } }).process?.pid;
  if (process.platform === "win32" && pid) {
    // embedded-postgres spawns taskkill but does not await it. The Vitest
    // process can therefore exit after the master stops but before /T has
    // terminated its Postgres children, leaking one process group per test.
    // Await the exact master PID tree ourselves before the temp directory is
    // removed or the test worker exits.
    const ownedPids = await getWindowsProcessTreePids(pid).catch(() => [pid]);
    await execFileAsync("taskkill", ["/pid", String(pid), "/T", "/F"]).catch(() => {});
    if (ownedPids.length > 0) {
      await execFileAsync(
        "taskkill",
        [...ownedPids.flatMap((ownedPid) => ["/pid", String(ownedPid)]), "/F"],
      ).catch(() => {});
    }
    // A Windows io_worker can be reparented just after taskkill returns. Do
    // not declare cleanup complete until several consecutive PID snapshots
    // contain only processes that predated this fixture.
    let stableSnapshots = 0;
    for (let attempt = 0; attempt < 30 && stableSnapshots < 3; attempt += 1) {
      const remainingPids = await getWindowsPostgresPids().catch(() => new Set<number>());
      // The canonical local database may restart while a long test run is in
      // progress (for example when the dev watcher sees generated catalog
      // output). Protect the current process tree listening on every reserved
      // Paperclip port instead of relying only on the PIDs captured when this
      // fixture started.
      const reservedPids = await getWindowsReservedPostgresPids().catch(
        () => new Set<number>(),
      );
      const leakedPids = [...remainingPids].filter(
        (candidatePid) =>
          !baselineWindowsPostgresPids.has(candidatePid) && !reservedPids.has(candidatePid),
      );
      if (leakedPids.length > 0) {
        stableSnapshots = 0;
        await execFileAsync(
          "taskkill",
          [...leakedPids.flatMap((leakedPid) => ["/pid", String(leakedPid)]), "/F"],
        ).catch(() => {});
      } else {
        stableSnapshots += 1;
      }
      if (stableSnapshots < 3) await delay(100);
    }
    return;
  }
  await instance.stop().catch(() => {});
}

function getReservedTestPorts(): Set<number> {
  const configuredPorts = [
    DEFAULT_PAPERCLIP_EMBEDDED_POSTGRES_PORT,
    Number.parseInt(process.env.PAPERCLIP_EMBEDDED_POSTGRES_PORT ?? "", 10),
    ...String(process.env.PAPERCLIP_TEST_POSTGRES_RESERVED_PORTS ?? "")
      .split(",")
      .map((value) => Number.parseInt(value.trim(), 10)),
  ];
  return new Set(configuredPorts.filter((port) => Number.isInteger(port) && port > 0 && port <= 65535));
}

async function getEmbeddedPostgresCtor(): Promise<EmbeddedPostgresCtor> {
  const mod = await import("embedded-postgres");
  await prepareEmbeddedPostgresNativeRuntime();
  return mod.default as EmbeddedPostgresCtor;
}

async function getAvailablePort(): Promise<number> {
  const reservedPorts = getReservedTestPorts();
  for (let attempt = 0; attempt < 20; attempt += 1) {
    const port = await new Promise<number>((resolve, reject) => {
      const server = net.createServer();
      server.unref();
      server.on("error", reject);
      server.listen(0, "127.0.0.1", () => {
        const address = server.address();
        if (!address || typeof address === "string") {
          server.close(() => reject(new Error("Failed to allocate test port")));
          return;
        }
        const { port } = address;
        server.close((error) => {
          if (error) reject(error);
          else resolve(port);
        });
      });
    });

    if (!reservedPorts.has(port)) return port;
  }

  throw new Error(
    `Failed to allocate embedded Postgres test port outside reserved Paperclip ports: ${[
      ...reservedPorts,
    ].join(", ")}`,
  );
}

async function createEmbeddedPostgresTestInstance(tempDirPrefix: string) {
  const baselineWindowsPostgresPids = await getWindowsPostgresPids();
  const dataDir = fs.mkdtempSync(path.join(os.tmpdir(), tempDirPrefix));
  const port = await getAvailablePort();
  const EmbeddedPostgres = await getEmbeddedPostgresCtor();
  const instance = new EmbeddedPostgres({
    databaseDir: dataDir,
    user: "paperclip",
    password: "paperclip",
    port,
    persistent: true,
    initdbFlags: ["--encoding=UTF8", "--locale=C", "--lc-messages=C"],
    onLog: () => {},
    onError: () => {},
  });

  return { dataDir, port, instance, baselineWindowsPostgresPids };
}

async function cleanupEmbeddedPostgresTestDirs(dataDir: string) {
  let lastError: unknown = null;
  const maxAttempts = process.platform === "win32" ? 15 : 5;
  for (let attempt = 0; attempt < maxAttempts; attempt += 1) {
    try {
      fs.rmSync(dataDir, { recursive: true, force: true });
      return;
    } catch (error) {
      lastError = error;
      if (attempt < maxAttempts - 1) {
        await delay(Math.min(1_000, 200 * (attempt + 1)));
      }
    }
  }
  throw lastError;
}

function formatEmbeddedPostgresError(error: unknown): string {
  if (error instanceof Error && error.message.length > 0) return error.message;
  if (typeof error === "string" && error.length > 0) return error;
  return "embedded Postgres startup failed";
}

async function probeEmbeddedPostgresSupport(): Promise<EmbeddedPostgresTestSupport> {
  let dataDir: string | null = null;
  let instance: EmbeddedPostgresInstance | null = null;
  let baselineWindowsPostgresPids = new Set<number>();

  try {
    const created = await createEmbeddedPostgresTestInstance(
      "paperclip-embedded-postgres-probe-",
    );
    dataDir = created.dataDir;
    instance = created.instance;
    baselineWindowsPostgresPids = created.baselineWindowsPostgresPids;
    await instance.initialise();
    await instance.start();
    return { supported: true };
  } catch (error) {
    return {
      supported: false,
      reason: formatEmbeddedPostgresError(error),
    };
  } finally {
    await stopEmbeddedPostgresTestInstance(instance, baselineWindowsPostgresPids);
    if (dataDir) await cleanupEmbeddedPostgresTestDirs(dataDir);
  }
}

export async function getEmbeddedPostgresTestSupport(): Promise<EmbeddedPostgresTestSupport> {
  if (!embeddedPostgresSupportPromise) {
    embeddedPostgresSupportPromise = probeEmbeddedPostgresSupport();
  }
  return await embeddedPostgresSupportPromise;
}

export async function startEmbeddedPostgresTestDatabase(
  tempDirPrefix: string,
): Promise<EmbeddedPostgresTestDatabase> {
  let dataDir: string | null = null;
  let instance: EmbeddedPostgresInstance | null = null;
  let baselineWindowsPostgresPids = new Set<number>();

  try {
    const created = await createEmbeddedPostgresTestInstance(tempDirPrefix);
    dataDir = created.dataDir;
    instance = created.instance;
    baselineWindowsPostgresPids = created.baselineWindowsPostgresPids;
    const { port } = created;
    await instance.initialise();
    await instance.start();

    const adminConnectionString = `postgres://paperclip:paperclip@127.0.0.1:${port}/postgres`;
    await ensurePostgresDatabase(adminConnectionString, "paperclip");
    const connectionString = `postgres://paperclip:paperclip@127.0.0.1:${port}/paperclip`;
    await applyPendingMigrations(connectionString);

    return {
      connectionString,
      cleanup: async () => {
        await stopEmbeddedPostgresTestInstance(instance, baselineWindowsPostgresPids);
        if (dataDir) await cleanupEmbeddedPostgresTestDirs(dataDir);
      },
    };
  } catch (error) {
    await stopEmbeddedPostgresTestInstance(instance, baselineWindowsPostgresPids);
    if (dataDir) await cleanupEmbeddedPostgresTestDirs(dataDir);
    throw new Error(
      `Failed to start embedded PostgreSQL test database: ${formatEmbeddedPostgresError(error)}`,
    );
  }
}
