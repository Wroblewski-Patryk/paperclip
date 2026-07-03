import { promises as fs } from "node:fs";
import { createRequire } from "node:module";
import path from "node:path";

const require = createRequire(import.meta.url);

function resolveNativePackageName(): string | null {
  const arch = process.arch;
  if (process.platform === "linux") {
    switch (arch) {
      case "arm64":
        return "linux-arm64";
      case "arm":
        return "linux-arm";
      case "ia32":
        return "linux-ia32";
      case "ppc64":
        return "linux-ppc64";
      case "x64":
        return "linux-x64";
      default:
        return null;
    }
  }
  if (process.platform === "win32") {
    switch (arch) {
      case "arm64":
        return "windows-arm64";
      case "x64":
        return "windows-x64";
      default:
        return null;
    }
  }
  return null;
}

async function pathExists(value: string): Promise<boolean> {
  try {
    await fs.stat(value);
    return true;
  } catch {
    return false;
  }
}

function resolveEmbeddedPostgresPackageRoot(): string | null {
  try {
    const entry = require.resolve("embedded-postgres");
    return path.dirname(path.dirname(entry));
  } catch {
    return null;
  }
}

function prependPathEnv(name: string, value: string): void {
  const current = process.env[name] ?? "";
  const parts = current.split(path.delimiter).filter(Boolean);
  if (parts.includes(value)) return;
  process.env[name] = [value, ...parts].join(path.delimiter);
}

export async function ensureLinuxSharedLibraryAliases(libDir: string): Promise<string[]> {
  const entries = await fs.readdir(libDir, { withFileTypes: true });
  const created: string[] = [];

  for (const entry of entries) {
    if (!entry.isFile()) continue;
    const match = entry.name.match(/^(lib.+\.so\.\d+)\.\d+(?:\.\d+)?$/);
    if (!match) continue;

    const aliasName = match[1];
    const aliasPath = path.join(libDir, aliasName);
    try {
      await fs.symlink(entry.name, aliasPath);
      created.push(aliasPath);
    } catch (error) {
      if ((error as NodeJS.ErrnoException).code === "EEXIST") continue;
      throw error;
    }
  }

  return created;
}

export async function prepareEmbeddedPostgresNativeRuntime(): Promise<void> {
  const nativePackageName = resolveNativePackageName();
  const packageRoot = resolveEmbeddedPostgresPackageRoot();
  if (!nativePackageName || !packageRoot) return;

  const nativeRoot = path.resolve(packageRoot, "..", "@embedded-postgres", nativePackageName);
  const libDir = path.join(nativeRoot, "native", "lib");
  if (process.platform === "linux") {
    if (!(await pathExists(libDir))) return;
    prependPathEnv("LD_LIBRARY_PATH", libDir);
    await ensureLinuxSharedLibraryAliases(libDir);
    return;
  }

  if (process.platform === "win32") {
    const binDir = path.join(nativeRoot, "native", "bin");
    if (await pathExists(binDir)) prependPathEnv("PATH", binDir);
    if (await pathExists(libDir)) prependPathEnv("PATH", libDir);
  }
}
