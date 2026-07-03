import path from "node:path";
import * as p from "@clack/prompts";
import pc from "picocolors";
import { formatDatabaseBackupResult, runDatabaseBackup } from "@paperclipai/db";
import {
  expandHomePrefix,
  resolveDefaultBackupDir,
  resolvePaperclipInstanceId,
} from "../config/home.js";
import { readConfig, resolveConfigPath } from "../config/store.js";
import { printPaperclipCliBanner } from "../utils/banner.js";

type DbBackupOptions = {
  config?: string;
  dir?: string;
  retentionDays?: number;
  filenamePrefix?: string;
  maxTotalBytes?: number;
  minFreeBytes?: number;
  json?: boolean;
};

function resolveConnectionString(configPath?: string): { value: string; source: string } {
  const envUrl = process.env.DATABASE_URL?.trim();
  if (envUrl) return { value: envUrl, source: "DATABASE_URL" };

  const config = readConfig(configPath);
  if (config?.database.mode === "postgres" && config.database.connectionString?.trim()) {
    return { value: config.database.connectionString.trim(), source: "config.database.connectionString" };
  }

  const port = config?.database.embeddedPostgresPort ?? 54329;
  return {
    value: `postgres://paperclip:paperclip@127.0.0.1:${port}/paperclip`,
    source: `embedded-postgres@${port}`,
  };
}

function normalizeRetentionDays(value: number | undefined, fallback: number): number {
  const candidate = value ?? fallback;
  if (!Number.isInteger(candidate) || candidate < 1) {
    throw new Error(`Invalid retention days '${String(candidate)}'. Use a positive integer.`);
  }
  return candidate;
}

function normalizeMaxTotalBytes(value: number | undefined): number | null {
  if (value === undefined) return null;
  if (!Number.isFinite(value) || value < 0) {
    throw new Error(`Invalid backup max total bytes '${String(value)}'. Use a non-negative integer.`);
  }
  return Math.trunc(value);
}

function normalizeMinFreeBytes(value: number | undefined): number | null {
  if (value === undefined) return null;
  if (!Number.isFinite(value) || value <= 0) {
    throw new Error(`Invalid backup min free bytes '${String(value)}'. Use a positive integer.`);
  }
  return Math.trunc(value);
}

function resolveBackupDir(raw: string): string {
  return path.resolve(expandHomePrefix(raw.trim()));
}

export async function dbBackupCommand(opts: DbBackupOptions): Promise<void> {
  printPaperclipCliBanner();
  p.intro(pc.bgCyan(pc.black(" paperclip db:backup ")));

  const configPath = resolveConfigPath(opts.config);
  const config = readConfig(opts.config);
  const connection = resolveConnectionString(opts.config);
  const defaultDir = resolveDefaultBackupDir(resolvePaperclipInstanceId());
  const configuredDir = opts.dir?.trim() || config?.database.backup.dir || defaultDir;
  const backupDir = resolveBackupDir(configuredDir);
  const retentionDays = normalizeRetentionDays(
    opts.retentionDays,
    config?.database.backup.retentionDays ?? 30,
  );
  const maxTotalBytes = normalizeMaxTotalBytes(
    opts.maxTotalBytes ??
      (process.env.PAPERCLIP_DB_BACKUP_MAX_TOTAL_BYTES !== undefined
        ? Number(process.env.PAPERCLIP_DB_BACKUP_MAX_TOTAL_BYTES)
        : config?.database.backup.maxTotalBytes),
  );
  const minFreeBytes = normalizeMinFreeBytes(
    opts.minFreeBytes ??
      (process.env.PAPERCLIP_DB_BACKUP_MIN_FREE_BYTES !== undefined
        ? Number(process.env.PAPERCLIP_DB_BACKUP_MIN_FREE_BYTES)
        : config?.database.backup.minFreeBytes),
  );
  const filenamePrefix = opts.filenamePrefix?.trim() || "paperclip";

  p.log.message(pc.dim(`Config: ${configPath}`));
  p.log.message(pc.dim(`Connection source: ${connection.source}`));
  p.log.message(pc.dim(`Backup dir: ${backupDir}`));
  p.log.message(pc.dim(`Retention: ${retentionDays} day(s)`));
  if (maxTotalBytes !== null) {
    p.log.message(pc.dim(`Retention size cap: ${maxTotalBytes} byte(s)`));
  }
  if (minFreeBytes !== null) {
    p.log.message(pc.dim(`Minimum free space: ${minFreeBytes} byte(s)`));
  }

  const spinner = p.spinner();
  spinner.start("Creating database backup...");
  try {
    const result = await runDatabaseBackup({
      connectionString: connection.value,
      backupDir,
      retention: { dailyDays: retentionDays, weeklyWeeks: 4, monthlyMonths: 1, maxTotalBytes },
      filenamePrefix,
      diskSpaceGuard: minFreeBytes === null ? undefined : { minFreeBytes },
    });
    spinner.stop(`Backup saved: ${formatDatabaseBackupResult(result)}`);

    if (opts.json) {
      console.log(
        JSON.stringify(
          {
            backupFile: result.backupFile,
            sizeBytes: result.sizeBytes,
            prunedCount: result.prunedCount,
            backupDir,
            retentionDays,
            maxTotalBytes,
            minFreeBytes,
            diskSpace: result.diskSpace ?? null,
            connectionSource: connection.source,
          },
          null,
          2,
        ),
      );
    }
    p.outro(pc.green("Backup completed."));
  } catch (err) {
    spinner.stop(pc.red("Backup failed."));
    throw err;
  }
}
