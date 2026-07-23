import { createDecipheriv, createHash } from "node:crypto";
import { createReadStream } from "node:fs";
import { readFile, readdir, stat } from "node:fs/promises";
import path from "node:path";

export function assertInside(candidate, parent, label) {
  const relative = path.relative(parent, candidate);
  if (relative.startsWith("..") || path.isAbsolute(relative)) {
    throw new Error(`${label} must stay inside ${parent}`);
  }
}

export async function summarizeFiles(root) {
  let fileCount = 0;
  let sizeBytes = 0;
  const pending = [root];
  while (pending.length > 0) {
    const current = pending.pop();
    for (const entry of await readdir(current, { withFileTypes: true })) {
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

export async function sha256File(filePath) {
  const hash = createHash("sha256");
  for await (const chunk of createReadStream(filePath)) hash.update(chunk);
  return hash.digest("hex");
}

export function resolveStorageObjectPath(baseDir, objectKey) {
  const normalized = String(objectKey ?? "").replaceAll("\\", "/").trim();
  const parts = normalized.split("/").filter(Boolean);
  if (!normalized || normalized.startsWith("/") || parts.some((part) => part === "." || part === "..")) {
    throw new Error("Restore validation failed: invalid storage object key");
  }
  const resolved = path.resolve(baseDir, ...parts);
  assertInside(resolved, baseDir, "Restored storage object");
  return resolved;
}

export function decodeMasterKey(raw) {
  const trimmed = raw.trim();
  if (/^[A-Fa-f0-9]{64}$/.test(trimmed)) return Buffer.from(trimmed, "hex");
  const base64 = Buffer.from(trimmed, "base64");
  if (base64.length === 32) return base64;
  if (Buffer.byteLength(trimmed, "utf8") === 32) return Buffer.from(trimmed, "utf8");
  throw new Error("Restore validation failed: restored encrypted-secrets key is invalid");
}

export function decryptMasterKeyEnvelope(recoveryKeyRaw, envelope) {
  const recoveryKey = decodeMasterKey(recoveryKeyRaw);
  if (
    !envelope ||
    envelope.schemaVersion !== 1 ||
    envelope.algorithm !== "aes-256-gcm" ||
    typeof envelope.iv !== "string" ||
    typeof envelope.tag !== "string" ||
    typeof envelope.ciphertext !== "string"
  ) {
    throw new Error("Restore validation failed: encrypted master-key envelope is invalid");
  }
  try {
    const decipher = createDecipheriv("aes-256-gcm", recoveryKey, Buffer.from(envelope.iv, "base64"));
    decipher.setAuthTag(Buffer.from(envelope.tag, "base64"));
    return Buffer.concat([
      decipher.update(Buffer.from(envelope.ciphertext, "base64")),
      decipher.final(),
    ]);
  } catch {
    throw new Error("Restore validation failed: encrypted master key cannot be opened by the recovery key");
  }
}

export function resolveLocalEncryptedMaterial(masterKey, material) {
  if (
    !material ||
    material.scheme !== "local_encrypted_v1" ||
    typeof material.iv !== "string" ||
    typeof material.tag !== "string" ||
    typeof material.ciphertext !== "string"
  ) {
    throw new Error("Restore validation failed: stored local-encrypted material is invalid");
  }
  const decipher = createDecipheriv("aes-256-gcm", masterKey, Buffer.from(material.iv, "base64"));
  decipher.setAuthTag(Buffer.from(material.tag, "base64"));
  return Buffer.concat([
    decipher.update(Buffer.from(material.ciphertext, "base64")),
    decipher.final(),
  ]);
}

export async function validateRestoredAssets(storageDir, assets) {
  if (assets.length === 0) {
    throw new Error("Restore validation failed: no local-disk asset metadata available");
  }
  let verifiedRows = 0;
  let missingRows = 0;
  let mismatchedRows = 0;
  for (const asset of assets) {
    const restoredObjectPath = resolveStorageObjectPath(storageDir, asset.object_key);
    const restoredObjectStats = await stat(restoredObjectPath).catch(() => null);
    if (!restoredObjectStats?.isFile()) {
      missingRows += 1;
      continue;
    }
    const expectedSize = Number(asset.byte_size);
    if (restoredObjectStats.size !== expectedSize || await sha256File(restoredObjectPath) !== asset.sha256) {
      mismatchedRows += 1;
      continue;
    }
    verifiedRows += 1;
  }
  if (verifiedRows !== assets.length) {
    throw new Error(
      `Restore validation failed: local-disk completeness ${verifiedRows}/${assets.length}; missing=${missingRows}; mismatched=${mismatchedRows}`,
    );
  }
  return { metadataRows: assets.length, verifiedRows, missingRows, mismatchedRows };
}

export async function validateRestoredSecrets(keyFile, secretVersions) {
  if (secretVersions.length === 0) {
    throw new Error("Restore validation failed: no current local-encrypted secret versions available");
  }
  const masterKey = decodeMasterKey(await readFile(keyFile, "utf8"));
  let verifiedVersions = 0;
  let mismatchedVersions = 0;
  for (const secretVersion of secretVersions) {
    try {
      const resolvedSecret = resolveLocalEncryptedMaterial(masterKey, secretVersion.material);
      const actualDigest = createHash("sha256").update(resolvedSecret).digest("hex");
      if (actualDigest !== secretVersion.value_sha256) {
        mismatchedVersions += 1;
        continue;
      }
      verifiedVersions += 1;
    } catch {
      mismatchedVersions += 1;
    }
  }
  if (verifiedVersions !== secretVersions.length) {
    throw new Error(
      `Restore validation failed: encrypted-secret completeness ${verifiedVersions}/${secretVersions.length}; mismatched=${mismatchedVersions}`,
    );
  }
  return { currentVersions: secretVersions.length, verifiedVersions, mismatchedVersions };
}
