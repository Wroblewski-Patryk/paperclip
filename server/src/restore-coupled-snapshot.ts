import { randomUUID } from "node:crypto";
import { cp, mkdir, readdir, rename, rm, stat, writeFile } from "node:fs/promises";
import path from "node:path";

function assertInside(candidate: string, parent: string, label: string): void {
  const relative = path.relative(parent, candidate);
  if (relative.startsWith("..") || path.isAbsolute(relative)) {
    throw new Error(`${label} must stay inside ${parent}`);
  }
}

export function resolveRestoreCoupledSnapshotDir(backupFile: string): string {
  const backupName = path.basename(backupFile);
  const backupStem = backupName.replace(/\.sql(?:\.gz)?$/, "");
  return path.join(path.dirname(backupFile), `${backupStem}.restore-coupled`);
}

export type RestoreCoupledSnapshotOptions = {
  backupDir: string;
  backupFile: string;
  storageDir: string;
  secretsMasterKeyFilePath: string;
};

export type RestoreCoupledSnapshotResult = {
  snapshotDir: string;
  manifestPath: string;
  storageFileCount: number;
  storageSizeBytes: number;
  secretsKeyBytes: number;
};

async function countFilesAndBytes(root: string): Promise<{ fileCount: number; sizeBytes: number }> {
  let fileCount = 0;
  let sizeBytes = 0;
  const pending = [root];
  while (pending.length > 0) {
    const current = pending.pop();
    if (!current) continue;
    const entries = await readdir(current, { withFileTypes: true });
    for (const entry of entries) {
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

export async function createRestoreCoupledSnapshot(
  options: RestoreCoupledSnapshotOptions,
): Promise<RestoreCoupledSnapshotResult> {
  const backupDir = path.resolve(options.backupDir);
  const backupFile = path.resolve(options.backupFile);
  const snapshotDir = resolveRestoreCoupledSnapshotDir(backupFile);
  const stagingDir = `${snapshotDir}.partial-${process.pid}-${randomUUID()}`;
  assertInside(backupFile, backupDir, "Database backup");
  assertInside(snapshotDir, backupDir, "Restore-coupled snapshot");
  assertInside(stagingDir, backupDir, "Restore-coupled snapshot staging directory");

  const backupStats = await stat(backupFile);
  if (!backupStats.isFile() || backupStats.size <= 0) {
    throw new Error(`Restore-coupled snapshot requires a completed database backup: ${backupFile}`);
  }

  const storageStats = await stat(options.storageDir);
  if (!storageStats.isDirectory()) {
    throw new Error(`Restore-coupled snapshot requires a storage directory: ${options.storageDir}`);
  }
  const keyStats = await stat(options.secretsMasterKeyFilePath);
  if (!keyStats.isFile()) {
    throw new Error(`Restore-coupled snapshot requires a secrets key file: ${options.secretsMasterKeyFilePath}`);
  }

  const existingSnapshot = await stat(snapshotDir).catch(() => null);
  if (existingSnapshot) {
    throw new Error(`Restore-coupled snapshot already exists and will not be overwritten: ${snapshotDir}`);
  }
  await mkdir(stagingDir, { recursive: false });

  const storageSnapshotDir = path.join(stagingDir, "storage");
  const secretsSnapshotDir = path.join(stagingDir, "secrets");

  try {
    await mkdir(secretsSnapshotDir, { recursive: true });
    await cp(options.storageDir, storageSnapshotDir, { recursive: true, force: false, errorOnExist: true });
    const snapshotKeyFile = path.join(secretsSnapshotDir, "master.key");
    await cp(options.secretsMasterKeyFilePath, snapshotKeyFile, { force: false, errorOnExist: true });

    const storageSummary = await countFilesAndBytes(storageSnapshotDir);
    const manifest = {
      schemaVersion: 1,
      backupFileName: path.basename(backupFile),
      backupSizeBytes: backupStats.size,
      createdAt: new Date().toISOString(),
      storage: storageSummary,
      secretsKeyBytes: keyStats.size,
    };
    await writeFile(path.join(stagingDir, "manifest.json"), `${JSON.stringify(manifest, null, 2)}\n`, {
      encoding: "utf8",
      mode: 0o600,
    });
    await rename(stagingDir, snapshotDir);

    return {
      snapshotDir,
      manifestPath: path.join(snapshotDir, "manifest.json"),
      storageFileCount: storageSummary.fileCount,
      storageSizeBytes: storageSummary.sizeBytes,
      secretsKeyBytes: keyStats.size,
    };
  } catch (error) {
    await rm(stagingDir, { recursive: true, force: true });
    throw error;
  }
}
