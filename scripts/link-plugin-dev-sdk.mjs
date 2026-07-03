#!/usr/bin/env node

import { cpSync, existsSync, lstatSync, mkdirSync, realpathSync, rmSync, symlinkSync } from "node:fs";
import { dirname, join, relative, resolve, sep } from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const repoRoot = resolve(__dirname, "..");
const packageDir = process.cwd();
const sdkDir = join(repoRoot, "packages", "plugins", "sdk");
const scopeDir = join(packageDir, "node_modules", "@paperclipai");
const linkTarget = join(scopeDir, "plugin-sdk");

if (!existsSync(join(packageDir, "package.json"))) {
  throw new Error(`No package.json found in plugin directory: ${packageDir}`);
}

mkdirSync(scopeDir, { recursive: true });

try {
  const stat = lstatSync(linkTarget);
  const resolvedTarget = (() => {
    try {
      return realpathSync.native(linkTarget);
    } catch {
      return null;
    }
  })();
  const resolvedSdkDir = (() => {
    try {
      return realpathSync.native(sdkDir);
    } catch {
      return sdkDir;
    }
  })();
  if (stat.isSymbolicLink() || resolvedTarget === resolvedSdkDir) {
    rmSync(linkTarget, { force: true });
  } else {
    console.log("  i Keeping existing installed @paperclipai/plugin-sdk directory in place");
    process.exit(0);
  }
} catch {
  // target does not exist yet
}

const relativeSdkDir = relative(scopeDir, sdkDir);
try {
  symlinkSync(relativeSdkDir, linkTarget, "dir");
} catch (error) {
  if (process.platform !== "win32" || error?.code !== "EPERM") {
    throw error;
  }

  try {
    symlinkSync(sdkDir, linkTarget, "junction");
  } catch {
    cpSync(sdkDir, linkTarget, {
      recursive: true,
      force: true,
      filter: (source) => !source.includes(`${sep}node_modules${sep}`),
    });
  }
}

console.log(`  ✓ Linked local @paperclipai/plugin-sdk for ${packageDir}`);
