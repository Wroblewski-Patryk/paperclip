import { existsSync } from "node:fs";
import { mkdir, readFile, rm, writeFile } from "node:fs/promises";
import path from "node:path";

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function normalizePositiveInt(value, fallback) {
  return typeof value === "number" && Number.isFinite(value) && value > 0
    ? Math.trunc(value)
    : fallback;
}

export function isProcessRunning(pid) {
  if (!Number.isInteger(pid) || pid <= 0) return false;
  try {
    process.kill(pid, 0);
    return true;
  } catch (error) {
    return error?.code === "EPERM";
  }
}

async function readJsonIfExists(filePath) {
  if (!existsSync(filePath)) return null;
  try {
    return JSON.parse(await readFile(filePath, "utf8"));
  } catch {
    return null;
  }
}

async function readLockMetadata(lockDir) {
  return await readJsonIfExists(path.join(lockDir, "meta.json"));
}

async function writeLockMetadata(lockDir, metadata) {
  await writeFile(path.join(lockDir, "meta.json"), `${JSON.stringify(metadata, null, 2)}\n`, "utf8");
}

async function releaseLockDir(lockDir) {
  await rm(lockDir, { recursive: true, force: true });
}

async function waitForActiveRun({
  lockDir,
  reportPath,
  initialMetadata,
  waitMs,
  pollMs,
  reuseReportOnTimeout,
}) {
  const startedWaitingAt = Date.now();
  const timeoutMs = normalizePositiveInt(waitMs, 60_000);
  const delayMs = normalizePositiveInt(pollMs, 1_000);

  while (Date.now() - startedWaitingAt <= timeoutMs) {
    const currentMetadata = await readLockMetadata(lockDir) ?? initialMetadata ?? null;
    const currentPid = Number(currentMetadata?.pid ?? Number.NaN);
    const lockExists = existsSync(lockDir);

    if (lockExists && Number.isInteger(currentPid) && currentPid > 0 && !isProcessRunning(currentPid)) {
      await releaseLockDir(lockDir);
      return { retry: true };
    }

    if (!lockExists) {
      const report = await readJsonIfExists(reportPath);
      if (report) {
        return {
          retry: false,
          waitedMs: Date.now() - startedWaitingAt,
          metadata: currentMetadata,
          report,
        };
      }
    }

    await sleep(delayMs);
  }

  const currentMetadata = await readLockMetadata(lockDir) ?? initialMetadata ?? null;
  if (reuseReportOnTimeout) {
    const report = await readJsonIfExists(reportPath);
    if (report) {
      return {
        retry: false,
        waitedMs: Date.now() - startedWaitingAt,
        metadata: currentMetadata,
        report,
        timedOut: true,
      };
    }
  }
  throw new Error(
    `Timed out waiting ${timeoutMs}ms for active single-flight run to finish (pid=${currentMetadata?.pid ?? "unknown"}).`,
  );
}

export async function acquireSingleFlightExecution({
  lockDir,
  reportPath,
  waitMs,
  pollMs = 1_000,
  reuseReportOnTimeout = false,
  metadata = {},
}) {
  while (true) {
    try {
      await mkdir(lockDir, { recursive: false });
      const nextMetadata = {
        pid: process.pid,
        acquiredAt: new Date().toISOString(),
        ...metadata,
      };
      await writeLockMetadata(lockDir, nextMetadata);
      return {
        mode: "leader",
        metadata: nextMetadata,
        async release() {
          await releaseLockDir(lockDir);
        },
      };
    } catch (error) {
      if (error?.code !== "EEXIST") throw error;
      const currentMetadata = await readLockMetadata(lockDir);
      const currentPid = Number(currentMetadata?.pid ?? Number.NaN);
      if (!Number.isInteger(currentPid) || currentPid <= 0 || !isProcessRunning(currentPid)) {
        await releaseLockDir(lockDir);
        continue;
      }
      const waited = await waitForActiveRun({
        lockDir,
        reportPath,
        initialMetadata: currentMetadata,
        waitMs,
        pollMs,
        reuseReportOnTimeout,
      });
      if (waited.retry) continue;
      return {
        mode: "follower",
        metadata: waited.metadata,
        waitedMs: waited.waitedMs,
        waitTimedOut: waited.timedOut ?? false,
        reusedReport: waited.report,
      };
    }
  }
}
