#!/usr/bin/env node
import { readFileSync } from "node:fs";
import path from "node:path";
import { spawnSync } from "node:child_process";

const repoRoot = process.cwd();
const pnpmEntrypoint = process.env.npm_execpath;

function spawnPnpm(args, options = {}) {
  return spawnSync(
    pnpmEntrypoint ? process.execPath : "pnpm",
    [...(pnpmEntrypoint ? [pnpmEntrypoint] : []), ...args],
    {
      cwd: repoRoot,
      shell: process.platform === "win32" && !pnpmEntrypoint,
      ...options,
    },
  );
}

function fail(message) {
  console.error(`[typecheck:build-gaps] ${message}`);
  process.exit(1);
}

function runPnpm(args) {
  const result = spawnPnpm(args, {
    stdio: "inherit",
  });

  if (result.error) {
    console.error(`[typecheck:build-gaps] Failed to spawn pnpm: ${result.error.message}`);
    process.exit(1);
  }

  if (result.status !== 0) {
    process.exit(result.status ?? 1);
  }
}

function readJson(filePath) {
  return JSON.parse(readFileSync(filePath, "utf8"));
}

function listWorkspacePackages() {
  const result = spawnPnpm(["ls", "-r", "--depth", "-1", "--json"], {
    encoding: "utf8",
  });

  if (result.error) {
    fail(`Unable to spawn pnpm to list workspace packages: ${result.error.message}`);
  }

  if (result.status !== 0) {
    fail("Unable to list pnpm workspace packages.");
  }

  return JSON.parse(result.stdout);
}

function buildSkipsTypeScript(pkg) {
  const buildScript = pkg.scripts?.build;
  if (typeof buildScript !== "string") {
    return false;
  }

  return !/\btsc\b/.test(buildScript);
}

const workspacePackages = listWorkspacePackages();
const buildGapCandidates = workspacePackages
  .filter((workspacePkg) => workspacePkg.path !== repoRoot)
  .map((workspacePkg) => ({
    name: workspacePkg.name,
    path: workspacePkg.path,
    pkg: readJson(path.join(workspacePkg.path, "package.json")),
  }))
  .filter(({ pkg }) => buildSkipsTypeScript(pkg));
const packagesMissingTypecheck = buildGapCandidates.filter(
  ({ pkg }) => typeof pkg.scripts?.typecheck !== "string",
);
if (packagesMissingTypecheck.length > 0) {
  const missingNames = packagesMissingTypecheck.map((workspacePkg) => workspacePkg.name).join(", ");
  fail(
    `Workspace packages with build scripts that skip tsc must define a typecheck script. Missing: ${missingNames}`,
  );
}
const buildGapPackages = buildGapCandidates.filter(
  ({ pkg }) => typeof pkg.scripts?.typecheck === "string",
);

console.log(
  `[typecheck:build-gaps] typechecking ${buildGapPackages.length} workspace(s): ${buildGapPackages.map(({ name }) => name).join(", ") || "(none)"}`,
);

if (buildGapPackages.length === 0) {
  process.exit(0);
}

runPnpm(["--filter", "@paperclipai/plugin-sdk", "ensure-build-deps"]);

for (const workspacePkg of buildGapPackages) {
  runPnpm(["--filter", workspacePkg.name, "typecheck"]);
}
