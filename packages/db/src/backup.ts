import { existsSync, readFileSync } from "node:fs";
import path from "node:path";
import { formatDatabaseBackupResult, runDatabaseBackup } from "./backup-lib.js";
import {
  expandHomePrefix,
  resolveDefaultBackupDir,
  resolvePaperclipConfigPathForInstance,
} from "@paperclipai/shared/home-paths";

type PartialConfig = {
  database?: {
    mode?: "embedded-postgres" | "postgres";
    connectionString?: string;
    embeddedPostgresPort?: number;
    backup?: {
      dir?: string;
      retentionDays?: number;
      maxTotalBytes?: number;
      minFreeBytes?: number;
    };
  };
};

function readConfig(configPath: string): PartialConfig | null {
  if (!existsSync(configPath)) return null;
  try {
    const parsed = JSON.parse(readFileSync(configPath, "utf8"));
    return typeof parsed === "object" && parsed ? (parsed as PartialConfig) : null;
  } catch {
    return null;
  }
}

function asPositiveInt(value: unknown): number | null {
  if (typeof value !== "number" || !Number.isFinite(value)) return null;
  const rounded = Math.trunc(value);
  return rounded > 0 ? rounded : null;
}

function resolveEmbeddedPort(config: PartialConfig | null): number {
  return asPositiveInt(config?.database?.embeddedPostgresPort) ?? 54329;
}

function resolveConnectionString(config: PartialConfig | null): string {
  const envUrl = process.env.DATABASE_URL?.trim();
  if (envUrl) return envUrl;

  if (config?.database?.mode === "postgres" && typeof config.database.connectionString === "string") {
    const trimmed = config.database.connectionString.trim();
    if (trimmed) return trimmed;
  }

  const port = resolveEmbeddedPort(config);
  return `postgres://paperclip:paperclip@127.0.0.1:${port}/paperclip`;
}

function resolveBackupDir(config: PartialConfig | null): string {
  const raw = config?.database?.backup?.dir;
  if (typeof raw === "string" && raw.trim().length > 0) {
    return path.resolve(expandHomePrefix(raw.trim()));
  }
  return resolveDefaultBackupDir();
}

function resolveRetentionDays(config: PartialConfig | null): number {
  return asPositiveInt(config?.database?.backup?.retentionDays) ?? 7;
}

function resolveBackupMaxTotalBytes(config: PartialConfig | null): number | null {
  const envValue = process.env.PAPERCLIP_DB_BACKUP_MAX_TOTAL_BYTES;
  const raw = envValue !== undefined ? Number(envValue) : config?.database?.backup?.maxTotalBytes;
  if (typeof raw !== "number" || !Number.isFinite(raw)) return null;
  const rounded = Math.trunc(raw);
  return rounded >= 0 ? rounded : null;
}

function resolveBackupMinFreeBytes(config: PartialConfig | null): number | null {
  const envValue = process.env.PAPERCLIP_DB_BACKUP_MIN_FREE_BYTES;
  const raw = envValue !== undefined ? Number(envValue) : config?.database?.backup?.minFreeBytes;
  if (typeof raw !== "number" || !Number.isFinite(raw)) return null;
  const rounded = Math.trunc(raw);
  return rounded > 0 ? rounded : null;
}

async function main() {
  const configPath = resolvePaperclipConfigPathForInstance();
  const config = readConfig(configPath);
  const connectionString = resolveConnectionString(config);
  const backupDir = resolveBackupDir(config);
  const retentionDays = resolveRetentionDays(config);
  const maxTotalBytes = resolveBackupMaxTotalBytes(config);
  const minFreeBytes = resolveBackupMinFreeBytes(config);

  console.log(`Config path: ${configPath}`);
  console.log(`Backing up database to: ${backupDir}`);
  console.log(`Retention window: ${retentionDays} day(s)`);
  if (maxTotalBytes !== null) {
    console.log(`Retention size cap: ${maxTotalBytes} byte(s)`);
  }
  if (minFreeBytes !== null) {
    console.log(`Minimum free space: ${minFreeBytes} byte(s)`);
  }

  try {
    const result = await runDatabaseBackup({
      connectionString,
      backupDir,
      retention: { dailyDays: retentionDays, weeklyWeeks: 4, monthlyMonths: 1, maxTotalBytes },
      filenamePrefix: "paperclip",
      diskSpaceGuard: minFreeBytes === null ? undefined : { minFreeBytes },
    });

    console.log(`Backup saved: ${formatDatabaseBackupResult(result)}`);
  } catch (err) {
    console.error("Backup failed.");
    if (err instanceof Error) {
      console.error(err.message);
    } else {
      console.error(String(err));
    }
    process.exit(1);
  }
}

await main();
