import { execFile } from "node:child_process";
import { setTimeout as delay } from "node:timers/promises";
import { promisify } from "node:util";

export type StoppableEmbeddedPostgres = {
  process?: { pid?: number };
  stop(): Promise<void>;
};

type ShutdownSnapshot = {
  treePids: number[];
  listenerPids: number[];
};

type ShutdownDependencies = {
  platform: NodeJS.Platform;
  inspect(rootPid: number, port: number): Promise<ShutdownSnapshot>;
  killTree(rootPid: number): Promise<void>;
  killPids(pids: number[]): Promise<void>;
  delay(ms: number): Promise<void>;
};

type OrphanedListenerSnapshot = {
  eligible: boolean;
  listenerPids: number[];
  childPids: number[];
};

type OrphanRecoveryDependencies = {
  platform: NodeJS.Platform;
  inspect(port: number): Promise<OrphanedListenerSnapshot>;
  killPids(pids: number[]): Promise<void>;
  delay(ms: number): Promise<void>;
};

const execFileAsync = promisify(execFile);

function parsePidList(value: unknown): number[] {
  if (!Array.isArray(value)) return [];
  return value
    .map((candidate) => Number(candidate))
    .filter((candidate) => Number.isInteger(candidate) && candidate > 0);
}

async function inspectWindowsShutdown(rootPid: number, port: number): Promise<ShutdownSnapshot> {
  const script = [
    "$ErrorActionPreference = 'Stop'",
    "$pending = [System.Collections.Generic.Queue[int]]::new()",
    "$seen = [System.Collections.Generic.HashSet[int]]::new()",
    `$pending.Enqueue(${rootPid})`,
    "while ($pending.Count -gt 0) {",
    "  $current = $pending.Dequeue()",
    "  if (-not $seen.Add($current)) { continue }",
    "  Get-CimInstance Win32_Process -Filter \"ParentProcessId=$current\" -ErrorAction SilentlyContinue | ForEach-Object {",
    "    $pending.Enqueue([int]$_.ProcessId)",
    "  }",
    "}",
    `$listeners = @(Get-NetTCPConnection -State Listen -LocalPort ${port} -ErrorAction SilentlyContinue | ForEach-Object { [int]$_.OwningProcess } | Sort-Object -Unique)`,
    "$result = @{ treePids = @($seen); listenerPids = $listeners }",
    "$result | ConvertTo-Json -Compress",
  ].join("\n");
  const { stdout } = await execFileAsync(
    "powershell.exe",
    ["-NoProfile", "-NonInteractive", "-Command", script],
    { windowsHide: true },
  );
  const parsed = JSON.parse(stdout) as Record<string, unknown>;
  return {
    treePids: parsePidList(parsed.treePids),
    listenerPids: parsePidList(parsed.listenerPids),
  };
}

async function inspectOrphanedWindowsListener(port: number): Promise<OrphanedListenerSnapshot> {
  const script = [
    "$ErrorActionPreference = 'Stop'",
    `$listeners = @(Get-NetTCPConnection -State Listen -LocalPort ${port} -ErrorAction SilentlyContinue | ForEach-Object { [int]$_.OwningProcess } | Sort-Object -Unique)`,
    "$eligible = $listeners.Count -eq 1",
    "$children = @()",
    "if ($eligible) {",
    "  $owner = $listeners[0]",
    "  $ownerProcess = Get-CimInstance Win32_Process -Filter \"ProcessId=$owner\" -ErrorAction SilentlyContinue",
    "  $children = @(Get-CimInstance Win32_Process -Filter \"ParentProcessId=$owner\" -ErrorAction SilentlyContinue)",
    "  $safeChildren = @($children | Where-Object {",
    "    $_.Name -ieq 'postgres.exe' -and",
    "    $_.CommandLine -match '--forkchild=' -and",
    "    $_.CommandLine -match 'embedded-postgres'",
    "  })",
    "  $eligible = $null -eq $ownerProcess -and $children.Count -gt 0 -and $safeChildren.Count -eq $children.Count",
    "}",
    "$result = @{ eligible = $eligible; listenerPids = $listeners; childPids = @($children | ForEach-Object { [int]$_.ProcessId }) }",
    "$result | ConvertTo-Json -Compress",
  ].join("\n");
  const { stdout } = await execFileAsync(
    "powershell.exe",
    ["-NoProfile", "-NonInteractive", "-Command", script],
    { windowsHide: true },
  );
  const parsed = JSON.parse(stdout) as Record<string, unknown>;
  return {
    eligible: parsed.eligible === true,
    listenerPids: parsePidList(parsed.listenerPids),
    childPids: parsePidList(parsed.childPids),
  };
}

const defaultDependencies: ShutdownDependencies = {
  platform: process.platform,
  inspect: inspectWindowsShutdown,
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

const defaultOrphanRecoveryDependencies: OrphanRecoveryDependencies = {
  platform: process.platform,
  inspect: inspectOrphanedWindowsListener,
  killPids: defaultDependencies.killPids,
  delay,
};

export async function reclaimOrphanedEmbeddedPostgresListener(
  port: number,
  dependencies: OrphanRecoveryDependencies = defaultOrphanRecoveryDependencies,
): Promise<boolean> {
  if (dependencies.platform !== "win32") return false;

  const initial = await dependencies.inspect(port);
  if (!initial.eligible || initial.childPids.length === 0) return false;

  await dependencies.killPids(initial.childPids);
  let stableSnapshots = 0;
  for (let attempt = 0; attempt < 30 && stableSnapshots < 3; attempt += 1) {
    const snapshot = await dependencies.inspect(port);
    if (snapshot.listenerPids.length === 0) {
      stableSnapshots += 1;
    } else {
      stableSnapshots = 0;
      if (!snapshot.eligible) {
        throw new Error(`Embedded PostgreSQL port ${port} was claimed during orphan recovery`);
      }
      await dependencies.killPids(snapshot.childPids);
    }
    if (stableSnapshots < 3) await dependencies.delay(100);
  }

  if (stableSnapshots < 3) {
    throw new Error(`Orphaned embedded PostgreSQL listener did not release port ${port}`);
  }
  return true;
}

export async function stopOwnedEmbeddedPostgres(
  instance: StoppableEmbeddedPostgres,
  port: number,
  dependencies: ShutdownDependencies = defaultDependencies,
): Promise<void> {
  const rootPid = instance.process?.pid;
  if (dependencies.platform !== "win32" || !rootPid) {
    await instance.stop();
    return;
  }

  // embedded-postgres starts taskkill on Windows but does not await the whole
  // PostgreSQL tree. Capture ownership before stop() can remove the master,
  // then independently wait for the exact tree and listener to disappear.
  const captured = await dependencies.inspect(rootPid, port).catch(() => ({
    treePids: [rootPid],
    listenerPids: [],
  }));
  const ownedPids = new Set([rootPid, ...captured.treePids]);

  await instance.stop().catch(() => {});
  await dependencies.killTree(rootPid);
  await dependencies.killPids([...ownedPids]);

  let stableSnapshots = 0;
  for (let attempt = 0; attempt < 30 && stableSnapshots < 3; attempt += 1) {
    const snapshot = await dependencies.inspect(rootPid, port);
    const lateOwnedPids = snapshot.treePids.filter((pid) => pid !== rootPid);
    if (lateOwnedPids.length > 0) {
      stableSnapshots = 0;
      lateOwnedPids.forEach((pid) => ownedPids.add(pid));
      await dependencies.killPids(lateOwnedPids);
    } else if (snapshot.listenerPids.some((pid) => ownedPids.has(pid))) {
      stableSnapshots = 0;
      await dependencies.killPids(snapshot.listenerPids.filter((pid) => ownedPids.has(pid)));
    } else if (snapshot.listenerPids.length > 0) {
      throw new Error(
        `Embedded PostgreSQL port ${port} was rebound by an unowned process during shutdown`,
      );
    } else {
      stableSnapshots += 1;
    }
    if (stableSnapshots < 3) await dependencies.delay(100);
  }

  if (stableSnapshots < 3) {
    throw new Error(
      `Embedded PostgreSQL process tree rooted at ${rootPid} did not release port ${port}`,
    );
  }
}
