import { createReadStream } from "node:fs";
import fs from "node:fs/promises";
import { createHash } from "node:crypto";
import os from "node:os";
import path from "node:path";
import type { AdapterExecutionContext } from "@paperclipai/adapter-utils";
import { resolvePaperclipInstanceRootForAdapter } from "@paperclipai/adapter-utils/server-utils";

const TRUTHY_ENV_RE = /^(1|true|yes|on)$/i;
const COPIED_SHARED_FILES = ["config.json", "config.toml", "instructions.md"] as const;
const SYMLINKED_SHARED_FILES = ["auth.json"] as const;
const SYMLINK_REPLACE_MAX_RETRIES = 3;
const AUTH_REPLACE_MAX_RETRIES = 5;
const AUTH_REPLACE_RETRY_DELAY_MS = 25;

function nonEmpty(value: string | undefined): string | null {
  return typeof value === "string" && value.trim().length > 0 ? value.trim() : null;
}

export async function pathExists(candidate: string): Promise<boolean> {
  return fs.access(candidate).then(() => true).catch(() => false);
}

export function resolveSharedCodexHomeDir(
  env: NodeJS.ProcessEnv = process.env,
): string {
  const fromEnv = nonEmpty(env.CODEX_HOME);
  return fromEnv ? path.resolve(fromEnv) : path.join(os.homedir(), ".codex");
}

function isWorktreeMode(env: NodeJS.ProcessEnv): boolean {
  return TRUTHY_ENV_RE.test(env.PAPERCLIP_IN_WORKTREE ?? "");
}

export function resolveManagedCodexHomeDir(
  env: NodeJS.ProcessEnv,
  companyId?: string,
): string {
  const instanceRoot = resolvePaperclipInstanceRootForAdapter({
    homeDir: nonEmpty(env.PAPERCLIP_HOME) ?? undefined,
    instanceId: nonEmpty(env.PAPERCLIP_INSTANCE_ID) ?? undefined,
    env,
  });
  return companyId
    ? path.resolve(instanceRoot, "companies", companyId, "codex-home")
    : path.resolve(instanceRoot, "codex-home");
}

async function ensureParentDir(target: string): Promise<void> {
  await fs.mkdir(path.dirname(target), { recursive: true });
}

async function isExpectedSymlink(target: string, source: string): Promise<boolean> {
  const existing = await fs.lstat(target).catch(() => null);
  if (!existing?.isSymbolicLink()) return false;

  const linkedPath = await fs.readlink(target).catch(() => null);
  if (!linkedPath) return false;

  return path.resolve(path.dirname(target), linkedPath) === path.resolve(source);
}

async function sha256File(filePath: string): Promise<string> {
  return await new Promise((resolve, reject) => {
    const hash = createHash("sha256");
    const stream = createReadStream(filePath);
    stream.on("error", reject);
    stream.on("data", (chunk) => hash.update(chunk));
    stream.on("end", () => resolve(hash.digest("hex")));
  });
}

async function hasSameFileContents(left: string, right: string): Promise<boolean> {
  const [leftStat, rightStat] = await Promise.all([
    fs.lstat(left).catch(() => null),
    fs.lstat(right).catch(() => null),
  ]);
  if (!leftStat?.isFile() || !rightStat?.isFile()) return false;
  if (leftStat.size !== rightStat.size) return false;

  const [leftHash, rightHash] = await Promise.all([
    sha256File(left),
    sha256File(right),
  ]);
  return leftHash === rightHash;
}

async function createExpectedSymlink(target: string, source: string): Promise<void> {
  const sourceStat = await fs.lstat(source).catch(() => null);
  const symlinkType = process.platform === "win32" && sourceStat?.isFile() ? "file" : undefined;
  let attempts = 0;
  while (true) {
    try {
      await fs.symlink(source, target, symlinkType);
      return;
    } catch (error) {
      const code = (error as NodeJS.ErrnoException).code;
      if (code === "EEXIST" && await isExpectedSymlink(target, source)) return;
      if (code === "EEXIST") {
        const existing = await fs.lstat(target).catch(() => null);
        if (existing?.isSymbolicLink()) {
          if (attempts >= SYMLINK_REPLACE_MAX_RETRIES) throw error;
          attempts += 1;
          await fs.unlink(target).catch(() => {});
          continue;
        }
        if (existing && sourceStat?.isFile()) {
          if (await hasSameFileContents(target, source)) return;
          await fs.copyFile(source, target);
          return;
        }
      }
      if (process.platform === "win32" && (code === "EPERM" || code === "EACCES")) {
        if (sourceStat?.isFile()) {
          await fs.copyFile(source, target);
          return;
        }
      }
      throw error;
    }
  }
}

export async function ensureSymlink(target: string, source: string): Promise<void> {
  const existing = await fs.lstat(target).catch(() => null);
  if (!existing) {
    await ensureParentDir(target);
    await createExpectedSymlink(target, source);
    return;
  }

  if (!existing.isSymbolicLink()) {
    const sourceStat = await fs.lstat(source).catch(() => null);
    if (existing.isDirectory()) return;
    if (sourceStat?.isFile() && await hasSameFileContents(target, source)) return;
    if (process.platform === "win32" && sourceStat?.isFile()) {
      await fs.copyFile(source, target);
      return;
    }
    // A previous Paperclip version copied this file into the managed home
    // instead of symlinking it. Codex refresh tokens rotate and are
    // single-use, so a stale copy fails with refresh_token_reused on the next
    // run (#5028). Replace the regular file with a symlink so the CLI follows
    // the live source. Safe to delete: target is always under the
    // Paperclip-managed company home, never the user's real ~/.codex.
    await fs.unlink(target);
    await createExpectedSymlink(target, source);
    return;
  }

  if (await isExpectedSymlink(target, source)) return;

  await fs.unlink(target);
  await createExpectedSymlink(target, source);
}

async function ensureCopiedFile(target: string, source: string): Promise<void> {
  const existing = await fs.lstat(target).catch(() => null);
  if (existing) return;
  await ensureParentDir(target);
  await fs.copyFile(source, target);
}

function isTransientWindowsAuthReplaceError(error: unknown): boolean {
  if (process.platform !== "win32") return false;
  const code = (error as NodeJS.ErrnoException | null)?.code;
  return code === "EBUSY" || code === "EPERM";
}

async function sleep(ms: number): Promise<void> {
  await new Promise((resolve) => setTimeout(resolve, ms));
}

async function withAuthReplaceRetry<T>(operation: () => Promise<T>): Promise<T> {
  let attempts = 0;
  while (true) {
    try {
      return await operation();
    } catch (error) {
      if (!isTransientWindowsAuthReplaceError(error) || attempts >= AUTH_REPLACE_MAX_RETRIES) {
        throw error;
      }
      attempts += 1;
      await sleep(AUTH_REPLACE_RETRY_DELAY_MS * attempts);
    }
  }
}

/**
 * Writes an `auth.json` containing only `OPENAI_API_KEY` so the codex CLI can
 * authenticate via API key. Overwrites any existing file or symlink at that
 * path. Required because the codex CLI (>= 0.122) ignores the `OPENAI_API_KEY`
 * environment variable and only reads credentials from `$CODEX_HOME/auth.json`.
 */
export async function writeApiKeyAuthJson(home: string, apiKey: string): Promise<void> {
  await fs.mkdir(home, { recursive: true });
  const target = path.join(home, "auth.json");
  await withAuthReplaceRetry(async () => {
    await fs.rm(target, { force: true });
    await fs.writeFile(target, JSON.stringify({ OPENAI_API_KEY: apiKey }), { mode: 0o600 });
  });
}

export async function prepareManagedCodexHome(
  env: NodeJS.ProcessEnv,
  onLog: AdapterExecutionContext["onLog"],
  companyId?: string,
  options: { apiKey?: string | null } = {},
): Promise<string> {
  const targetHome = resolveManagedCodexHomeDir(env, companyId);
  const apiKey = nonEmpty(options.apiKey ?? undefined);

  const sourceHome = resolveSharedCodexHomeDir(env);
  const seedFromShared = path.resolve(sourceHome) !== path.resolve(targetHome);

  await fs.mkdir(targetHome, { recursive: true });

  if (seedFromShared) {
    for (const name of SYMLINKED_SHARED_FILES) {
      const source = path.join(sourceHome, name);
      if (!(await pathExists(source))) continue;
      await ensureSymlink(path.join(targetHome, name), source);
    }

    for (const name of COPIED_SHARED_FILES) {
      const source = path.join(sourceHome, name);
      if (!(await pathExists(source))) continue;
      await ensureCopiedFile(path.join(targetHome, name), source);
    }

    await onLog(
      "stdout",
      `[paperclip] Using ${isWorktreeMode(env) ? "worktree-isolated" : "Paperclip-managed"} Codex home "${targetHome}" (seeded from "${sourceHome}").\n`,
    );
  }

  if (apiKey) {
    await writeApiKeyAuthJson(targetHome, apiKey);
    await onLog(
      "stdout",
      `[paperclip] Wrote API-key auth.json into Codex home "${targetHome}" from configured OPENAI_API_KEY.\n`,
    );
  }

  return targetHome;
}
