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

async function getWindowsProcessTreePids(rootPid: number): Promise<number[]> {
  const script = [
    `$pending = [System.Collections.Generic.Queue[int]]::new()`,
    `$seen = [System.Collections.Generic.HashSet[int]]::new()`,
    `$root = Get-CimInstance Win32_Process -Filter "ProcessId=${rootPid}" -ErrorAction SilentlyContinue`,
    `if ($null -ne $root) { $pending.Enqueue(${rootPid}) }`,
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

async function getWindowsListenerPids(port: number): Promise<number[]> {
  const { stdout } = await execFileAsync(
    "powershell.exe",
    [
      "-NoProfile",
      "-NonInteractive",
      "-Command",
      `@(Get-NetTCPConnection -State Listen -LocalPort ${port} -ErrorAction SilentlyContinue | ForEach-Object { [int]$_.OwningProcess } | Sort-Object -Unique) -join ','`,
    ],
    { windowsHide: true },
  );
  return stdout
    .trim()
    .split(",")
    .map((value) => Number.parseInt(value, 10))
    .filter((value) => Number.isInteger(value) && value > 0);
}

type TestShutdownDependencies = {
  platform: NodeJS.Platform;
  inspectTree(rootPid: number): Promise<number[]>;
  inspectListeners(port: number): Promise<number[]>;
  killTree(rootPid: number): Promise<void>;
  killPids(pids: number[]): Promise<void>;
  delay(ms: number): Promise<void>;
};

const defaultTestShutdownDependencies: TestShutdownDependencies = {
  platform: process.platform,
  inspectTree: getWindowsProcessTreePids,
  inspectListeners: getWindowsListenerPids,
  async killTree(rootPid) {
    await execFileAsync("taskkill", ["/pid", String(rootPid), "/T", "/F"], {
      windowsHide: true,
    }).catch(() => {});
  },
  async killPids(pids) {
    if (pids.length === 0) return;
    await execFileAsync(
      "taskkill",
      [...pids.flatMap((pid) => ["/pid", String(pid)]), "/F"],
      { windowsHide: true },
    ).catch(() => {});
  },
  delay,
};

export async function stopEmbeddedPostgresTestInstance(
  instance: EmbeddedPostgresInstance | null,
  port: number,
  dependencies: TestShutdownDependencies = defaultTestShutdownDependencies,
): Promise<void> {
  if (!instance) return;
  const pid = (instance as unknown as { process?: { pid?: number } }).process?.pid;
  if (dependencies.platform === "win32" && pid) {
    // embedded-postgres spawns taskkill but does not await it. The Vitest
    // process can therefore exit after the master stops but before /T has
    // terminated its Postgres children, leaking one process group per test.
    // Await the exact master PID tree ourselves before the temp directory is
    // removed or the test worker exits.
    const ownedPids = new Set(
      await dependencies.inspectTree(pid).catch(() => [pid]),
    );
    ownedPids.add(pid);
    await dependencies.killTree(pid);
    await dependencies.killPids([...ownedPids]);
    // A Windows io_worker can be reparented just after taskkill returns. Do
    // not declare cleanup complete until the exact tree and port are absent
    // for several consecutive snapshots.
    let stableSnapshots = 0;
    for (let attempt = 0; attempt < 30 && stableSnapshots < 3; attempt += 1) {
      const treePids = await dependencies.inspectTree(pid);
      treePids.forEach((candidatePid) => ownedPids.add(candidatePid));
      if (treePids.length > 0) {
        stableSnapshots = 0;
        await dependencies.killPids(treePids);
      } else {
        const listenerPids = await dependencies.inspectListeners(port);
        const ownedListenerPids = listenerPids.filter((candidatePid) =>
          ownedPids.has(candidatePid),
        );
        if (ownedListenerPids.length > 0) {
          stableSnapshots = 0;
          await dependencies.killPids(ownedListenerPids);
        } else if (listenerPids.length > 0) {
          throw new Error(
            `Embedded PostgreSQL test port ${port} was rebound by an unowned process during cleanup`,
          );
        } else {
          stableSnapshots += 1;
        }
      }
      if (stableSnapshots < 3) await dependencies.delay(100);
    }
    if (stableSnapshots < 3) {
      throw new Error(
        `Embedded PostgreSQL test process tree rooted at ${pid} did not release port ${port}`,
      );
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

  return { dataDir, port, instance };
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
  let port: number | null = null;

  try {
    const created = await createEmbeddedPostgresTestInstance(
      "paperclip-embedded-postgres-probe-",
    );
    dataDir = created.dataDir;
    port = created.port;
    instance = created.instance;
    await instance.initialise();
    await instance.start();
    return { supported: true };
  } catch (error) {
    return {
      supported: false,
      reason: formatEmbeddedPostgresError(error),
    };
  } finally {
    if (port !== null) await stopEmbeddedPostgresTestInstance(instance, port);
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
  let port: number | null = null;

  try {
    const created = await createEmbeddedPostgresTestInstance(tempDirPrefix);
    dataDir = created.dataDir;
    port = created.port;
    instance = created.instance;
    await instance.initialise();
    await instance.start();

    const adminConnectionString = `postgres://paperclip:paperclip@127.0.0.1:${port}/postgres`;
    await ensurePostgresDatabase(adminConnectionString, "paperclip");
    const connectionString = `postgres://paperclip:paperclip@127.0.0.1:${port}/paperclip`;
    await applyPendingMigrations(connectionString);
    const cleanupInstance = instance;
    const cleanupPort = port;
    const cleanupDataDir = dataDir;

    return {
      connectionString,
      cleanup: async () => {
        await stopEmbeddedPostgresTestInstance(cleanupInstance, cleanupPort);
        await cleanupEmbeddedPostgresTestDirs(cleanupDataDir);
      },
    };
  } catch (error) {
    if (port !== null) await stopEmbeddedPostgresTestInstance(instance, port);
    if (dataDir) await cleanupEmbeddedPostgresTestDirs(dataDir);
    throw new Error(
      `Failed to start embedded PostgreSQL test database: ${formatEmbeddedPostgresError(error)}`,
    );
  }
}
