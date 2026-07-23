import assert from "node:assert/strict";
import { createCipheriv, createHash, randomBytes } from "node:crypto";
import { mkdtemp, mkdir, rm, writeFile } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import test from "node:test";
import {
  validateRestoredAssets,
  validateRestoredSecrets,
} from "./lib/softwarehouse-restore-validation.mjs";

async function withTempDir(run) {
  const tempDir = await mkdtemp(path.join(os.tmpdir(), "paperclip-restore-validation-"));
  try {
    await run(tempDir);
  } finally {
    await rm(tempDir, { recursive: true, force: true });
  }
}

function sha256(value) {
  return createHash("sha256").update(value).digest("hex");
}

function encrypt(masterKey, value) {
  const iv = randomBytes(12);
  const cipher = createCipheriv("aes-256-gcm", masterKey, iv);
  const ciphertext = Buffer.concat([cipher.update(value), cipher.final()]);
  return {
    scheme: "local_encrypted_v1",
    iv: iv.toString("base64"),
    tag: cipher.getAuthTag().toString("base64"),
    ciphertext: ciphertext.toString("base64"),
  };
}

test("asset completeness fails when one matching object hides one missing object", async () => {
  await withTempDir(async (storageDir) => {
    const value = Buffer.from("complete artifact");
    await mkdir(path.join(storageDir, "company"), { recursive: true });
    await writeFile(path.join(storageDir, "company", "present.bin"), value);
    const assets = [
      { object_key: "company/present.bin", byte_size: value.length, sha256: sha256(value) },
      { object_key: "company/missing.bin", byte_size: value.length, sha256: sha256(value) },
    ];
    await assert.rejects(
      validateRestoredAssets(storageDir, assets),
      /local-disk completeness 1\/2; missing=1; mismatched=0/,
    );
  });
});

test("asset completeness passes only when every restored row matches size and digest", async () => {
  await withTempDir(async (storageDir) => {
    const first = Buffer.from("first");
    const second = Buffer.from("second");
    await writeFile(path.join(storageDir, "first.bin"), first);
    await writeFile(path.join(storageDir, "second.bin"), second);
    const result = await validateRestoredAssets(storageDir, [
      { object_key: "first.bin", byte_size: first.length, sha256: sha256(first) },
      { object_key: "second.bin", byte_size: second.length, sha256: sha256(second) },
    ]);
    assert.deepEqual(result, { metadataRows: 2, verifiedRows: 2, missingRows: 0, mismatchedRows: 0 });
  });
});

test("secret completeness fails when one valid secret hides one invalid current version", async () => {
  await withTempDir(async (tempDir) => {
    const masterKey = randomBytes(32);
    const keyFile = path.join(tempDir, "master.key");
    await writeFile(keyFile, masterKey.toString("base64"));
    const first = Buffer.from("first secret");
    const second = Buffer.from("second secret");
    await assert.rejects(
      validateRestoredSecrets(keyFile, [
        { material: encrypt(masterKey, first), value_sha256: sha256(first) },
        { material: encrypt(masterKey, second), value_sha256: sha256(Buffer.from("wrong")) },
      ]),
      /encrypted-secret completeness 1\/2; mismatched=1/,
    );
  });
});

test("secret completeness passes only when every current version decrypts to its digest", async () => {
  await withTempDir(async (tempDir) => {
    const masterKey = randomBytes(32);
    const keyFile = path.join(tempDir, "master.key");
    await writeFile(keyFile, masterKey.toString("base64"));
    const values = [Buffer.from("first secret"), Buffer.from("second secret")];
    const result = await validateRestoredSecrets(
      keyFile,
      values.map((value) => ({ material: encrypt(masterKey, value), value_sha256: sha256(value) })),
    );
    assert.deepEqual(result, { currentVersions: 2, verifiedVersions: 2, mismatchedVersions: 0 });
  });
});
