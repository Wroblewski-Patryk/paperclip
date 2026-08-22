import path from "node:path";

const WINDOWS_ABSOLUTE_PATH = /^[a-zA-Z]:[\\/]/;

export function canonicalWorkspacePath(value: string | null | undefined) {
  const trimmed = value?.trim();
  if (!trimmed) return null;
  if (WINDOWS_ABSOLUTE_PATH.test(trimmed)) {
    const normalized = trimmed.replace(/\//g, "\\").replace(/\\+/g, "\\");
    return normalized.length > 3 ? normalized.replace(/\\+$/, "").toLowerCase() : normalized.toLowerCase();
  }
  const resolved = path.resolve(trimmed);
  return process.platform === "win32" ? resolved.toLowerCase() : resolved;
}
