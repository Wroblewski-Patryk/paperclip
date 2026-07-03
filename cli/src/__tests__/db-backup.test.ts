import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import type { PaperclipConfig } from "../config/schema.js";

const mocks = vi.hoisted(() => ({
  runDatabaseBackup: vi.fn(),
}));

vi.mock("@paperclipai/db", () => ({
  formatDatabaseBackupResult: vi.fn((result: { backupFile: string; sizeBytes: number }) =>
    `${result.backupFile} (${result.sizeBytes}B)`,
  ),
  runDatabaseBackup: mocks.runDatabaseBackup,
}));

vi.mock("@clack/prompts", () => ({
  intro: vi.fn(),
  outro: vi.fn(),
  log: {
    message: vi.fn(),
  },
  spinner: vi.fn(() => ({
    start: vi.fn(),
    stop: vi.fn(),
  })),
}));

vi.mock("../utils/banner.js", () => ({
  printPaperclipCliBanner: vi.fn(),
}));

const { dbBackupCommand } = await import("../commands/db-backup.js");

const originalMinFreeBytes = process.env.PAPERCLIP_DB_BACKUP_MIN_FREE_BYTES;
const originalMaxTotalBytes = process.env.PAPERCLIP_DB_BACKUP_MAX_TOTAL_BYTES;

function writeConfig(configPath: string, backupOverrides: Partial<PaperclipConfig["database"]["backup"]> = {}) {
  const config: PaperclipConfig = {
    $meta: {
      version: 1,
      updatedAt: "2026-01-01T00:00:00.000Z",
      source: "configure",
    },
    database: {
      mode: "embedded-postgres",
      embeddedPostgresDataDir: "/tmp/paperclip-db",
      embeddedPostgresPort: 54329,
      backup: {
        enabled: true,
        intervalMinutes: 60,
        retentionDays: 30,
        dir: "/tmp/paperclip-backups",
        ...backupOverrides,
      },
    },
    logging: {
      mode: "file",
      logDir: "/tmp/paperclip-logs",
    },
    server: {
      deploymentMode: "local_trusted",
      exposure: "private",
      bind: "loopback",
      host: "127.0.0.1",
      port: 3100,
      allowedHostnames: [],
      serveUi: true,
    },
    auth: {
      baseUrlMode: "auto",
      disableSignUp: false,
    },
    telemetry: {
      enabled: true,
    },
    storage: {
      provider: "local_disk",
      localDisk: { baseDir: "/tmp/paperclip-storage" },
      s3: {
        bucket: "paperclip",
        region: "us-east-1",
        prefix: "",
        forcePathStyle: false,
      },
    },
    secrets: {
      provider: "local_encrypted",
      strictMode: false,
      localEncrypted: { keyFilePath: "/tmp/paperclip-secrets/master.key" },
    },
  };

  fs.mkdirSync(path.dirname(configPath), { recursive: true });
  fs.writeFileSync(configPath, JSON.stringify(config, null, 2));
}

describe("dbBackupCommand", () => {
  let tempDir: string;
  let configPath: string;

  beforeEach(() => {
    tempDir = fs.mkdtempSync(path.join(os.tmpdir(), "paperclip-db-backup-cli-"));
    configPath = path.join(tempDir, "config.json");
    mocks.runDatabaseBackup.mockResolvedValue({
      backupFile: path.join(tempDir, "paperclip-test.sql.gz"),
      sizeBytes: 123,
      prunedCount: 0,
      diskSpace: { path: tempDir, availableBytes: 4096, totalBytes: 8192 },
    });
    delete process.env.PAPERCLIP_DB_BACKUP_MIN_FREE_BYTES;
    delete process.env.PAPERCLIP_DB_BACKUP_MAX_TOTAL_BYTES;
  });

  afterEach(() => {
    fs.rmSync(tempDir, { recursive: true, force: true });
    mocks.runDatabaseBackup.mockReset();

    if (originalMinFreeBytes === undefined) {
      delete process.env.PAPERCLIP_DB_BACKUP_MIN_FREE_BYTES;
    } else {
      process.env.PAPERCLIP_DB_BACKUP_MIN_FREE_BYTES = originalMinFreeBytes;
    }

    if (originalMaxTotalBytes === undefined) {
      delete process.env.PAPERCLIP_DB_BACKUP_MAX_TOTAL_BYTES;
    } else {
      process.env.PAPERCLIP_DB_BACKUP_MAX_TOTAL_BYTES = originalMaxTotalBytes;
    }
  });

  it("passes configured minimum free bytes to the backup disk-space guard", async () => {
    writeConfig(configPath, { minFreeBytes: 2048 });

    await dbBackupCommand({ config: configPath });

    expect(mocks.runDatabaseBackup).toHaveBeenCalledWith(
      expect.objectContaining({
        diskSpaceGuard: { minFreeBytes: 2048 },
      }),
    );
  });

  it("lets the environment override configured minimum free bytes", async () => {
    writeConfig(configPath, { minFreeBytes: 2048 });
    process.env.PAPERCLIP_DB_BACKUP_MIN_FREE_BYTES = "4096";

    await dbBackupCommand({ config: configPath });

    expect(mocks.runDatabaseBackup).toHaveBeenCalledWith(
      expect.objectContaining({
        diskSpaceGuard: { minFreeBytes: 4096 },
      }),
    );
  });

  it("lets the explicit CLI option override environment and configured minimum free bytes", async () => {
    writeConfig(configPath, { minFreeBytes: 2048 });
    process.env.PAPERCLIP_DB_BACKUP_MIN_FREE_BYTES = "4096";

    await dbBackupCommand({ config: configPath, minFreeBytes: 8192 });

    expect(mocks.runDatabaseBackup).toHaveBeenCalledWith(
      expect.objectContaining({
        diskSpaceGuard: { minFreeBytes: 8192 },
      }),
    );
  });
});
