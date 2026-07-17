import { promises as fs } from "node:fs";
import path from "node:path";
import { and, inArray, isNotNull } from "drizzle-orm";
import { heartbeatRuns, type Db } from "@paperclipai/db";
import { logger } from "../middleware/logger.js";
import { resolveRunLogBasePath } from "./run-log-store.js";

const TERMINAL_RUN_STATUSES = ["succeeded", "failed", "cancelled", "timed_out"] as const;

export type RunLogRetentionCandidate = {
  key: string;
  bytes: number;
  modifiedAtMs: number;
  protected: boolean;
};

export function selectRunLogsForPrune(
  files: RunLogRetentionCandidate[],
  input: { nowMs: number; retentionDays: number; maxTotalBytes: number },
) {
  const cutoffMs = input.nowMs - input.retentionDays * 24 * 60 * 60 * 1_000;
  const removable = files
    .filter((file) => !file.protected)
    .sort((a, b) => a.modifiedAtMs - b.modifiedAtMs || a.key.localeCompare(b.key));
  const selected = new Set(removable.filter((file) => file.modifiedAtMs < cutoffMs).map((file) => file.key));
  let retainedBytes = files
    .filter((file) => !selected.has(file.key))
    .reduce((sum, file) => sum + file.bytes, 0);

  for (const file of removable) {
    if (retainedBytes <= input.maxTotalBytes) break;
    if (selected.has(file.key)) continue;
    selected.add(file.key);
    retainedBytes -= file.bytes;
  }

  return { keys: selected, retainedBytes };
}

function normalizeRelativePath(value: string) {
  return value.replaceAll("\\", "/").replace(/^\/+/, "");
}

function resolveWithin(basePath: string, relativePath: string) {
  const resolvedBase = path.resolve(basePath);
  const resolved = path.resolve(resolvedBase, relativePath);
  if (resolved !== resolvedBase && !resolved.startsWith(`${resolvedBase}${path.sep}`)) {
    throw new Error(`Run log path escapes the configured base: ${relativePath}`);
  }
  return resolved;
}

async function listFiles(basePath: string, relativeDir = ""): Promise<Array<{ key: string; bytes: number; modifiedAtMs: number }>> {
  const absoluteDir = resolveWithin(basePath, relativeDir);
  const entries = await fs.readdir(absoluteDir, { withFileTypes: true }).catch((error: NodeJS.ErrnoException) => {
    if (error.code === "ENOENT") return [];
    throw error;
  });
  const nested = await Promise.all(entries.map(async (entry) => {
    const key = normalizeRelativePath(path.join(relativeDir, entry.name));
    if (entry.isDirectory()) return listFiles(basePath, key);
    if (!entry.isFile() || !entry.name.endsWith(".ndjson")) return [];
    const stat = await fs.stat(resolveWithin(basePath, key));
    return [{ key, bytes: stat.size, modifiedAtMs: stat.mtimeMs }];
  }));
  return nested.flat();
}

export async function pruneRunLogs(
  db: Db,
  input: {
    basePath?: string;
    retentionDays: number;
    maxTotalBytes: number;
    now?: Date;
  },
) {
  const basePath = input.basePath ?? resolveRunLogBasePath();
  const now = input.now ?? new Date();
  const rows = await db
    .select({ id: heartbeatRuns.id, status: heartbeatRuns.status, logRef: heartbeatRuns.logRef })
    .from(heartbeatRuns)
    .where(and(isNotNull(heartbeatRuns.logRef)));
  const rowsByRef = new Map(rows.map((row) => [normalizeRelativePath(row.logRef!), row]));
  const files = await listFiles(basePath);
  const selection = selectRunLogsForPrune(
    files.map((file) => {
      const run = rowsByRef.get(file.key);
      return {
        ...file,
        protected:
          Boolean(run && !TERMINAL_RUN_STATUSES.includes(run.status as typeof TERMINAL_RUN_STATUSES[number]))
          || (!run && file.modifiedAtMs >= now.getTime() - 60 * 60 * 1_000),
      };
    }),
    {
      nowMs: now.getTime(),
      retentionDays: input.retentionDays,
      maxTotalBytes: input.maxTotalBytes,
    },
  );

  const prunedRunIds: string[] = [];
  let deletedBytes = 0;
  for (const file of files) {
    if (!selection.keys.has(file.key)) continue;
    await fs.unlink(resolveWithin(basePath, file.key)).catch((error: NodeJS.ErrnoException) => {
      if (error.code !== "ENOENT") throw error;
    });
    deletedBytes += file.bytes;
    const run = rowsByRef.get(file.key);
    if (run && TERMINAL_RUN_STATUSES.includes(run.status as typeof TERMINAL_RUN_STATUSES[number])) {
      prunedRunIds.push(run.id);
    }
  }

  for (let offset = 0; offset < prunedRunIds.length; offset += 500) {
    await db
      .update(heartbeatRuns)
      .set({ logStore: null, logRef: null, updatedAt: new Date() })
      .where(inArray(heartbeatRuns.id, prunedRunIds.slice(offset, offset + 500)));
  }

  const result = {
    scannedFiles: files.length,
    deletedFiles: selection.keys.size,
    deletedBytes,
    detachedRunLogs: prunedRunIds.length,
    retainedBytes: selection.retainedBytes,
  };
  if (result.deletedFiles > 0) logger.info(result, "Pruned terminal and orphaned run logs");
  return result;
}

export function startRunLogRetention(
  db: Db,
  input: { retentionDays: number; maxTotalBytes: number; intervalMinutes: number },
) {
  const sweep = () => pruneRunLogs(db, input).catch((error) => {
    logger.warn({ error }, "Run log retention sweep failed");
  });
  void sweep();
  const timer = setInterval(() => void sweep(), input.intervalMinutes * 60 * 1_000);
  timer.unref();
  return () => clearInterval(timer);
}
