import { createCipheriv, randomBytes, randomUUID } from "node:crypto";
import { cp, mkdir, readFile, readdir, rename, rm, stat, writeFile } from "node:fs/promises";
import path from "node:path";

function assertInside(candidate: string, parent: string, label: string): void {
  const relative = path.relative(parent, candidate);
  if (relative.startsWith("..") || path.isAbsolute(relative)) {
    throw new Error(`${label} must stay inside ${parent}`);
  }
}

function assertOutside(candidate: string, parent: string, label: string): void {
  const relative = path.relative(parent, candidate);
  if (!relative.startsWith("..") && !path.isAbsolute(relative)) {
    throw new Error(`${label} must remain outside ${parent}`);
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
  recoveryKeyFilePath: string;
};

export type RestoreCoupledSnapshotResult = {
  snapshotDir: string;
  manifestPath: string;
  storageFileCount: number;
  storageSizeBytes: number;
  encryptedSecretsKeyBytes: number;
};

function decodeWrappingKey(raw: string): Buffer {
  const trimmed = raw.trim();
  if (/^[A-Fa-f0-9]{64}$/.test(trimmed)) return Buffer.from(trimmed, "hex");
  const base64 = Buffer.from(trimmed, "base64");
  if (base64.length === 32) return base64;
  if (Buffer.byteLength(trimmed, "utf8") === 32) return Buffer.from(trimmed, "utf8");
  throw new Error("Restore recovery key must be exactly 32 bytes (base64, hex, or raw)");
}

async function loadOrCreateRecoveryKey(filePath: string): Promise<Buffer> {
  const resolved = path.resolve(filePath);
  await mkdir(path.dirname(resolved), { recursive: true });
  try {
    return decodeWrappingKey(await readFile(resolved, "utf8"));
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code !== "ENOENT") throw error;
  }
  const encoded = randomBytes(32).toString("base64");
  try {
    await writeFile(resolved, `${encoded}\n`, { encoding: "utf8", mode: 0o600, flag: "wx" });
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code !== "EEXIST") throw error;
  }
  return decodeWrappingKey(await readFile(resolved, "utf8"));
}

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
  assertOutside(path.resolve(options.secretsMasterKeyFilePath), backupDir, "Secrets master key");
  assertOutside(path.resolve(options.recoveryKeyFilePath), backupDir, "Restore recovery key");

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
  const recoveryKey = await loadOrCreateRecoveryKey(options.recoveryKeyFilePath);

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
    const masterKeyPlaintext = await readFile(options.secretsMasterKeyFilePath);
    const iv = randomBytes(12);
    const cipher = createCipheriv("aes-256-gcm", recoveryKey, iv);
    const ciphertext = Buffer.concat([cipher.update(masterKeyPlaintext), cipher.final()]);
    const encryptedKeyEnvelope = {
      schemaVersion: 1,
      algorithm: "aes-256-gcm",
      iv: iv.toString("base64"),
      tag: cipher.getAuthTag().toString("base64"),
      ciphertext: ciphertext.toString("base64"),
    };
    const encryptedKeyPayload = `${JSON.stringify(encryptedKeyEnvelope, null, 2)}\n`;
    await writeFile(path.join(secretsSnapshotDir, "master.key.enc.json"), encryptedKeyPayload, {
      encoding: "utf8",
      mode: 0o600,
      flag: "wx",
    });

    const storageSummary = await countFilesAndBytes(storageSnapshotDir);
    const manifest = {
      schemaVersion: 1,
      backupFileName: path.basename(backupFile),
      backupSizeBytes: backupStats.size,
      createdAt: new Date().toISOString(),
      storage: storageSummary,
      secrets: {
        format: "aes-256-gcm",
        encryptedKeyBytes: Buffer.byteLength(encryptedKeyPayload),
        recoveryKeyRequired: true,
      },
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
      encryptedSecretsKeyBytes: Buffer.byteLength(encryptedKeyPayload),
    };
  } catch (error) {
    await rm(stagingDir, { recursive: true, force: true });
    throw error;
  }
}
