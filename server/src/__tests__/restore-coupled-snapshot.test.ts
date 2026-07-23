import { existsSync } from "node:fs";
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
  await writeFile(backupFile, "database backup");
  await writeFile(path.join(storageDir, "company", "artifact.bin"), "artifact");
  await writeFile(keyFile, "a".repeat(44), { mode: 0o600 });
  return { root, backupDir, backupFile, storageDir, keyFile };
}

describe("createRestoreCoupledSnapshot", () => {
  it("publishes a complete sidecar atomically without leaking source paths", async () => {
    const input = await fixture();
    const result = await createRestoreCoupledSnapshot({
      backupDir: input.backupDir,
      backupFile: input.backupFile,
      storageDir: input.storageDir,
      secretsMasterKeyFilePath: input.keyFile,
    });

    expect(result.snapshotDir).toBe(resolveRestoreCoupledSnapshotDir(input.backupFile));
    expect(await readFile(path.join(result.snapshotDir, "storage", "company", "artifact.bin"), "utf8")).toBe("artifact");
    expect(await readFile(path.join(result.snapshotDir, "secrets", "master.key"), "utf8")).toBe("a".repeat(44));
    const manifestRaw = await readFile(result.manifestPath, "utf8");
    const manifest = JSON.parse(manifestRaw);
    expect(manifest).toMatchObject({
      schemaVersion: 1,
      backupFileName: path.basename(input.backupFile),
      backupSizeBytes: (await stat(input.backupFile)).size,
      storage: { fileCount: 1, sizeBytes: 8 },
      secretsKeyBytes: 44,
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
    };
    const first = await createRestoreCoupledSnapshot(options);
    await expect(createRestoreCoupledSnapshot(options)).rejects.toThrow(/will not be overwritten/);
    expect(existsSync(first.snapshotDir)).toBe(true);
    expect((await readdir(input.backupDir)).some((name) => name.includes(".partial-"))).toBe(false);
  });
});
