#!/usr/bin/env node

import { createHash } from "node:crypto";
import { copyFileSync, existsSync, lstatSync, mkdirSync, readdirSync, realpathSync, rmSync, writeFileSync } from "node:fs";
import path from "node:path";
import { execFileSync } from "node:child_process";

function readArg(name) {
  const index = process.argv.indexOf(name);
  return index >= 0 ? process.argv[index + 1] : null;
}

function git(repo, args, options = {}) {
  return execFileSync("git", ["-C", repo, ...args], {
    encoding: "utf8",
    maxBuffer: 512 * 1024 * 1024,
    stdio: ["ignore", "pipe", options.allowFailure ? "ignore" : "pipe"],
    ...options,
  });
}

function gitOptional(repo, args) {
  try {
    return git(repo, args).trim() || null;
  } catch {
    return null;
  }
}

function sha256(buffer) {
  return createHash("sha256").update(buffer).digest("hex");
}

function ensureWithin(root, candidate) {
  const resolvedRoot = path.resolve(root);
  const resolved = path.resolve(candidate);
  if (resolved !== resolvedRoot && !resolved.startsWith(`${resolvedRoot}${path.sep}`)) {
    throw new Error(`Path escapes approved root: ${candidate}`);
  }
  return resolved;
}

function parseZeroSeparated(value) {
  return value.split("\0").filter(Boolean);
}

const repoArg = readArg("--repo");
const worktreeRootArg = readArg("--worktree-root");
const recoveryRootArg = readArg("--recovery-root");
const preserve = new Set(process.argv.flatMap((value, index, all) => value === "--preserve" ? [all[index + 1]] : []).filter(Boolean));
const apply = process.argv.includes("--apply");
const cleanupManifestArg = readArg("--cleanup-leftovers");

if (cleanupManifestArg) {
  const cleanupManifestPath = path.resolve(cleanupManifestArg);
  const cleanupManifest = JSON.parse(await import("node:fs/promises").then(({ readFile }) => readFile(cleanupManifestPath, "utf8")));
  const cleanupRepo = realpathSync(cleanupManifest.repo);
  const cleanupRoot = path.resolve(cleanupManifest.worktreeRoot);
  const registered = git(cleanupRepo, ["worktree", "list", "--porcelain"]);
  let removed = 0;
  for (const entry of cleanupManifest.entries ?? []) {
    if (entry.removed || !entry.error || !entry.recoveryRef || !entry.cwd) continue;
    const cwd = ensureWithin(cleanupRoot, entry.cwd);
    const normalizedCwd = path.resolve(cwd).replaceAll("\\", "/");
    if (registered.replaceAll("\\", "/").includes(`worktree ${normalizedCwd}`)) continue;
    if (existsSync(cwd)) rmSync(cwd, { recursive: true, force: true, maxRetries: 3, retryDelay: 250 });
    entry.removed = true;
    entry.removalFallback = "removed_unregistered_directory_after_git_partial_cleanup";
    entry.error = null;
    removed += 1;
  }
  writeFileSync(cleanupManifestPath, JSON.stringify(cleanupManifest, null, 2), "utf8");
  console.log(JSON.stringify({ removed, cleanupManifestPath }));
  process.exit(0);
}

if (!repoArg || !worktreeRootArg || (apply && !recoveryRootArg)) {
  console.error("Usage: node scripts/recover-stale-git-worktrees.mjs --repo <repo> --worktree-root <dir> [--recovery-root <dir> --apply] [--preserve <name>]");
  process.exit(2);
}

const repo = realpathSync(repoArg);
const worktreeRoot = realpathSync(worktreeRootArg);
ensureWithin(repo, worktreeRoot);
const recoveryRoot = recoveryRootArg ? ensureWithin(repo, recoveryRootArg) : null;
if (recoveryRoot && (recoveryRoot === worktreeRoot || recoveryRoot.startsWith(`${worktreeRoot}${path.sep}`))) {
  throw new Error("Recovery root must be outside the worktree root being cleaned");
}

const directories = readdirSync(worktreeRoot, { withFileTypes: true })
  .filter((entry) => entry.isDirectory())
  .map((entry) => ({ name: entry.name, cwd: ensureWithin(worktreeRoot, path.join(worktreeRoot, entry.name)) }))
  .filter((entry) => ![...preserve].some((value) => entry.name === value || entry.name.startsWith(`${value}-`)))
  .sort((a, b) => a.name.localeCompare(b.name));

if (!apply) {
  const preview = directories.map(({ name, cwd }) => ({
    name,
    cwd,
    head: gitOptional(cwd, ["rev-parse", "HEAD"]),
    branch: gitOptional(cwd, ["branch", "--show-current"]),
    dirty: Boolean(gitOptional(cwd, ["status", "--porcelain=v1", "--untracked-files=normal"])),
    mergedIntoMain: (() => {
      try {
        git(repo, ["merge-base", "--is-ancestor", git(cwd, ["rev-parse", "HEAD"]).trim(), "main"]);
        return true;
      } catch {
        return false;
      }
    })(),
  }));
  console.log(JSON.stringify({ apply: false, candidates: preview.length, preserve: [...preserve], preview }, null, 2));
  process.exit(0);
}

mkdirSync(recoveryRoot, { recursive: true });
const manifestPath = path.join(recoveryRoot, "manifest.json");
const manifest = {
  version: 1,
  createdAt: new Date().toISOString(),
  repo,
  worktreeRoot,
  recoveryRoot,
  preserved: [...preserve],
  entries: [],
};
writeFileSync(path.join(recoveryRoot, "README.md"), [
  "# Paperclip Worktree Recovery",
  "",
  "Each removed worktree has a durable git ref under `refs/paperclip-recovery/`, a binary patch when tracked changes existed, and copied untracked non-ignored files with SHA-256 hashes.",
  "The manifest records merge state and removal results. Dependency/build directories ignored by git are intentionally not copied.",
  "",
].join("\n"), "utf8");

for (let index = 0; index < directories.length; index += 1) {
  const { name, cwd } = directories[index];
  const safeName = name.replace(/[^a-zA-Z0-9._-]/g, "_");
  const entryDir = ensureWithin(recoveryRoot, path.join(recoveryRoot, safeName));
  const entry = {
    name,
    cwd,
    head: null,
    branch: null,
    recoveryRef: null,
    mergedIntoMain: null,
    statusPorcelain: null,
    patch: null,
    untracked: [],
    removed: false,
    error: null,
  };
  manifest.entries.push(entry);
  console.log(`[${index + 1}/${directories.length}] recovering ${name}`);
  try {
    entry.head = git(cwd, ["rev-parse", "HEAD"]).trim();
    entry.branch = gitOptional(cwd, ["branch", "--show-current"]);
    entry.statusPorcelain = git(cwd, ["status", "--porcelain=v1", "--untracked-files=normal"]);
    try {
      git(repo, ["merge-base", "--is-ancestor", entry.head, "main"]);
      entry.mergedIntoMain = true;
    } catch {
      entry.mergedIntoMain = false;
    }

    const recoveryRef = `refs/paperclip-recovery/${path.basename(recoveryRoot)}/${safeName}`;
    git(repo, ["update-ref", recoveryRef, entry.head]);
    entry.recoveryRef = recoveryRef;

    const patchBuffer = execFileSync("git", ["-C", cwd, "diff", "--binary", "HEAD"], {
      encoding: "buffer",
      maxBuffer: 512 * 1024 * 1024,
    });
    if (patchBuffer.length > 0) {
      mkdirSync(entryDir, { recursive: true });
      const patchPath = path.join(entryDir, "tracked.patch");
      writeFileSync(patchPath, patchBuffer);
      entry.patch = { path: path.relative(recoveryRoot, patchPath), bytes: patchBuffer.length, sha256: sha256(patchBuffer) };
    }

    const untracked = parseZeroSeparated(git(cwd, ["ls-files", "--others", "--exclude-standard", "-z"]));
    for (const relativePath of untracked) {
      const source = ensureWithin(cwd, path.join(cwd, relativePath));
      if (!existsSync(source)) continue;
      const stat = lstatSync(source);
      if (!stat.isFile()) {
        entry.untracked.push({ path: relativePath, skipped: true, reason: stat.isSymbolicLink() ? "symbolic_link" : "not_regular_file" });
        continue;
      }
      const destination = ensureWithin(entryDir, path.join(entryDir, "untracked", relativePath));
      mkdirSync(path.dirname(destination), { recursive: true });
      copyFileSync(source, destination);
      const content = execFileSync(process.execPath, ["-e", "const fs=require('fs');process.stdout.write(require('crypto').createHash('sha256').update(fs.readFileSync(process.argv[1])).digest('hex'))", destination], { encoding: "utf8" });
      entry.untracked.push({ path: relativePath, bytes: stat.size, sha256: content.trim() });
    }

    writeFileSync(manifestPath, JSON.stringify(manifest, null, 2), "utf8");
    git(repo, ["worktree", "remove", "--force", cwd]);
    entry.removed = true;
  } catch (error) {
    entry.error = error instanceof Error ? error.message : String(error);
    console.error(`Failed ${name}: ${entry.error}`);
  }
  writeFileSync(manifestPath, JSON.stringify(manifest, null, 2), "utf8");
}

try {
  git(repo, ["worktree", "prune"]);
} catch (error) {
  manifest.pruneError = error instanceof Error ? error.message : String(error);
}
manifest.finishedAt = new Date().toISOString();
writeFileSync(manifestPath, JSON.stringify(manifest, null, 2), "utf8");

const failed = manifest.entries.filter((entry) => !entry.removed);
console.log(JSON.stringify({ candidates: manifest.entries.length, removed: manifest.entries.length - failed.length, failed: failed.map((entry) => entry.name), manifestPath }));
process.exit(failed.length > 0 ? 1 : 0);
