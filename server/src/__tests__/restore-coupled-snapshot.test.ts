import { existsSync } from "node:fs";
import { createDecipheriv } from "node:crypto";
import { mkdtemp, mkdir, readFile, readdir, rm, stat, writeFile } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { afterEach, describe, expect, it } from "vitest";
import {
  createRestoreCoupledSnapshot,
  resolveRestoreCoupledSnapshotDir,
} from "../restore-coupled-snapshot.js";

const tempRoots: string[] = [];

afterEach(async () => {
  await Promise.all(tempRoots.splice(0).map((root) => rm(root, { recursive: true, force: true })));
});

async function fixture() {
  const root = await mkdtemp(path.join(os.tmpdir(), "paperclip-coupled-snapshot-"));
  tempRoots.push(root);
  const backupDir = path.join(root, "backups");
  const storageDir = path.join(root, "storage");
  const secretsDir = path.join(root, "secrets");
  await Promise.all([
    mkdir(backupDir, { recursive: true }),
    mkdir(path.join(storageDir, "company"), { recursive: true }),
    mkdir(secretsDir, { recursive: true }),
  ]);
  const backupFile = path.join(backupDir, "paperclip-20260723-010203.sql.gz");
  const keyFile = path.join(secretsDir, "master.key");
  const recoveryKeyFile = path.join(secretsDir, "backup-recovery.key");
  await writeFile(backupFile, "database backup");
  await writeFile(path.join(storageDir, "company", "artifact.bin"), "artifact");
  await writeFile(keyFile, "a".repeat(44), { mode: 0o600 });
  await writeFile(recoveryKeyFile, Buffer.alloc(32, 7).toString("base64"), { mode: 0o600 });
  return { root, backupDir, backupFile, storageDir, keyFile, recoveryKeyFile };
}

describe("createRestoreCoupledSnapshot", () => {
  it("publishes a complete sidecar atomically without leaking source paths", async () => {
    const input = await fixture();
    const result = await createRestoreCoupledSnapshot({
      backupDir: input.backupDir,
      backupFile: input.backupFile,
      storageDir: input.storageDir,
      secretsMasterKeyFilePath: input.keyFile,
      recoveryKeyFilePath: input.recoveryKeyFile,
    });

    expect(result.snapshotDir).toBe(resolveRestoreCoupledSnapshotDir(input.backupFile));
    expect(await readFile(path.join(result.snapshotDir, "storage", "company", "artifact.bin"), "utf8")).toBe("artifact");
    expect(existsSync(path.join(result.snapshotDir, "secrets", "master.key"))).toBe(false);
    const encryptedKeyRaw = await readFile(path.join(result.snapshotDir, "secrets", "master.key.enc.json"), "utf8");
    expect(encryptedKeyRaw).not.toContain("a".repeat(44));
    const encryptedKey = JSON.parse(encryptedKeyRaw);
    const decipher = createDecipheriv(
      "aes-256-gcm",
      Buffer.from(await readFile(input.recoveryKeyFile, "utf8"), "base64"),
      Buffer.from(encryptedKey.iv, "base64"),
    );
    decipher.setAuthTag(Buffer.from(encryptedKey.tag, "base64"));
    expect(Buffer.concat([
      decipher.update(Buffer.from(encryptedKey.ciphertext, "base64")),
      decipher.final(),
    ]).toString("utf8")).toBe("a".repeat(44));
    const manifestRaw = await readFile(result.manifestPath, "utf8");
    const manifest = JSON.parse(manifestRaw);
    expect(manifest).toMatchObject({
      schemaVersion: 1,
      backupFileName: path.basename(input.backupFile),
      backupSizeBytes: (await stat(input.backupFile)).size,
      storage: { fileCount: 1, sizeBytes: 8 },
      secrets: { format: "aes-256-gcm", recoveryKeyRequired: true },
    });
    expect(manifestRaw).not.toContain(input.root);
    expect((await readdir(input.backupDir)).some((name) => name.includes(".partial-"))).toBe(false);
  });

  it("fails closed instead of replacing an existing coupled snapshot", async () => {
    const input = await fixture();
    const options = {
      backupDir: input.backupDir,
      backupFile: input.backupFile,
      storageDir: input.storageDir,
      secretsMasterKeyFilePath: input.keyFile,
      recoveryKeyFilePath: input.recoveryKeyFile,
    };
    const first = await createRestoreCoupledSnapshot(options);
    await expect(createRestoreCoupledSnapshot(options)).rejects.toThrow(/will not be overwritten/);
    expect(existsSync(first.snapshotDir)).toBe(true);
    expect((await readdir(input.backupDir)).some((name) => name.includes(".partial-"))).toBe(false);
  });

  it("refuses to place either plaintext key inside the backup boundary", async () => {
    const input = await fixture();
    const unsafeRecoveryKey = path.join(input.backupDir, "recovery.key");
    await writeFile(unsafeRecoveryKey, Buffer.alloc(32, 3).toString("base64"));
    await expect(createRestoreCoupledSnapshot({
      backupDir: input.backupDir,
      backupFile: input.backupFile,
      storageDir: input.storageDir,
      secretsMasterKeyFilePath: input.keyFile,
      recoveryKeyFilePath: unsafeRecoveryKey,
    })).rejects.toThrow(/Restore recovery key must remain outside/);
  });
});
