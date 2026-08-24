#!/usr/bin/env node
import { spawnSync } from "node:child_process";
import { mkdirSync, mkdtempSync, readFileSync, readdirSync, statSync } from "node:fs";
import os from "node:os";
import path from "node:path";

import { buildVitestInvocation, chunkItems } from "./lib/vitest-invocation.mjs";
import { removeOwnedVitestTestRoot } from "./lib/vitest-test-root.mjs";

const repoRoot = process.cwd();
const serverRoot = path.join(repoRoot, "server");
const serverSrcRoot = path.join(serverRoot, "src");
const cliSrcRoot = path.join(repoRoot, "cli", "src");
const uiSrcRoot = path.join(repoRoot, "ui", "src");
const nonServerProjects = [
  "@paperclipai/shared",
  "@paperclipai/skills-catalog",
  "@paperclipai/db",
  "@paperclipai/adapter-utils",
  "@paperclipai/adapter-acpx-local",
  "@paperclipai/adapter-codex-local",
  "@paperclipai/adapter-opencode-local",
  "@paperclipai/plugin-sdk",
  "@paperclipai/create-paperclip-plugin",
  "@paperclipai/ui",
  "paperclipai",
];
const routeTestPattern = /[^/]*(?:route|routes|authz)[^/]*\.test\.ts$/;
const additionalSerializedServerTests = new Set([
  "server/src/__tests__/approval-routes-idempotency.test.ts",
  "server/src/__tests__/assets.test.ts",
  "server/src/__tests__/authz-company-access.test.ts",
  "server/src/__tests__/companies-route-path-guard.test.ts",
  "server/src/__tests__/company-portability.test.ts",
  "server/src/__tests__/costs-service.test.ts",
  "server/src/__tests__/express5-auth-wildcard.test.ts",
  "server/src/__tests__/health-dev-server-token.test.ts",
  "server/src/__tests__/health.test.ts",
  "server/src/__tests__/heartbeat-dependency-scheduling.test.ts",
  "server/src/__tests__/heartbeat-issue-liveness-escalation.test.ts",
  "server/src/__tests__/heartbeat-process-recovery.test.ts",
  "server/src/__tests__/invite-accept-existing-member.test.ts",
  "server/src/__tests__/invite-accept-gateway-defaults.test.ts",
  "server/src/__tests__/invite-accept-replay.test.ts",
  "server/src/__tests__/invite-expiry.test.ts",
  "server/src/__tests__/invite-join-manager.test.ts",
  "server/src/__tests__/invite-onboarding-text.test.ts",
  "server/src/__tests__/issues-checkout-wakeup.test.ts",
  "server/src/__tests__/issues-service.test.ts",
  "server/src/__tests__/opencode-local-adapter-environment.test.ts",
  "server/src/__tests__/project-routes-env.test.ts",
  "server/src/__tests__/redaction.test.ts",
  "server/src/__tests__/routines-e2e.test.ts",
]);
let invocationIndex = 0;
const serializedModeName = "serialized";
const generalModeName = "general";
const allModeName = "all";
const generalServerGroupName = "general-server";
const generalWorkspacesAGroupName = "general-workspaces-a";
const generalWorkspacesBGroupName = "general-workspaces-b";
const generalWorkspacesAProjects = ["@paperclipai/ui", "paperclipai"];
const generalWorkspacesBProjects = nonServerProjects.filter((project) => !generalWorkspacesAProjects.includes(project));
const generalGroupNames = [generalServerGroupName, generalWorkspacesAGroupName, generalWorkspacesBGroupName];
// Keep Windows groups small enough that suites using embedded PostgreSQL do
// not leak process-global database state into distant test files.
const generalServerBatchSize = process.platform === "win32" ? 20 : Number.MAX_SAFE_INTEGER;
// A single sequential UI invocation currently contains more than 200 files and
// exceeds five minutes on the bounded Windows workstation. Fresh Vitest
// processes keep each batch observable and release jsdom/React handles between
// groups instead of hiding the final result behind an outer command timeout.
const uiBatchSize = process.platform === "win32" ? 40 : Number.MAX_SAFE_INTEGER;
const windowsHookTimeoutArgs = process.platform === "win32" ? ["--hookTimeout=180000"] : [];
const serializedServerVitestArgs = [
  "--no-file-parallelism",
  "--maxWorkers=1",
  "--minWorkers=1",
  // Embedded PostgreSQL startup and owned PID-tree cleanup can legitimately
  // cross 60 seconds on the bounded Windows workstation under sustained
  // serial test load. Keep the hook bounded, but do not report those healthy
  // lifecycle transitions as test failures.
  ...windowsHookTimeoutArgs,
];

function walk(dir) {
  const entries = readdirSync(dir);
  const files = [];
  for (const entry of entries) {
    const absolute = path.join(dir, entry);
    const stats = statSync(absolute);
    if (stats.isDirectory()) {
      files.push(...walk(absolute));
    } else if (stats.isFile()) {
      files.push(absolute);
    }
  }
  return files;
}

function toRepoPath(file) {
  return path.relative(repoRoot, file).split(path.sep).join("/");
}

function toServerPath(file) {
  return path.relative(serverRoot, file).split(path.sep).join("/");
}

function isRouteOrAuthzTest(file) {
  if (routeTestPattern.test(file)) {
    return true;
  }

  if (additionalSerializedServerTests.has(file)) {
    return true;
  }

  // Embedded PostgreSQL suites need a fresh Vitest process on Windows. Keeping
  // several of them in one general batch eventually makes later beforeAll
  // hooks compete with teardown from earlier databases and hit the 20s hook
  // timeout even though every suite passes in isolation.
  return usesEmbeddedPostgres(file);
}

function usesEmbeddedPostgres(file) {
  return readFileSync(path.join(repoRoot, file), "utf8").includes("startEmbeddedPostgresTestDatabase");
}

function fail(message) {
  console.error(`[test:run] ${message}`);
  process.exit(1);
}

function readOptionValue(argv, index, argName) {
  const value = argv[index + 1];
  if (value === undefined) {
    fail(`Missing value for ${argName}`);
  }

  return value;
}

function parseNonNegativeInteger(value, argName) {
  const parsed = Number(value);
  if (value.trim() === "" || !Number.isInteger(parsed) || parsed < 0) {
    fail(`${argName} must be a non-negative integer. Received "${value}".`);
  }

  return parsed;
}

function parsePositiveInteger(value, argName) {
  const parsed = Number(value);
  if (value.trim() === "" || !Number.isInteger(parsed) || parsed < 1) {
    fail(`${argName} must be a positive integer. Received "${value}".`);
  }

  return parsed;
}

function parseCliOptions(argv) {
  let mode = allModeName;
  let shardIndex = null;
  let shardCount = null;
  let group = null;
  let batchIndex = null;
  let dryRun = false;

  for (let index = 0; index < argv.length; index += 1) {
    const arg = argv[index];
    if (arg === "--") {
      continue;
    }

    if (arg === "--mode") {
      mode = readOptionValue(argv, index, arg);
      index += 1;
      continue;
    }

    if (arg.startsWith("--mode=")) {
      mode = arg.slice("--mode=".length);
      continue;
    }

    if (arg === "--shard-index") {
      shardIndex = parseNonNegativeInteger(readOptionValue(argv, index, arg), arg);
      index += 1;
      continue;
    }

    if (arg.startsWith("--shard-index=")) {
      shardIndex = parseNonNegativeInteger(arg.slice("--shard-index=".length), "--shard-index");
      continue;
    }

    if (arg === "--shard-count") {
      shardCount = parsePositiveInteger(readOptionValue(argv, index, arg), arg);
      index += 1;
      continue;
    }

    if (arg.startsWith("--shard-count=")) {
      shardCount = parsePositiveInteger(arg.slice("--shard-count=".length), "--shard-count");
      continue;
    }

    if (arg === "--dry-run") {
      dryRun = true;
      continue;
    }

    if (arg === "--group") {
      group = readOptionValue(argv, index, arg);
      index += 1;
      continue;
    }

    if (arg.startsWith("--group=")) {
      group = arg.slice("--group=".length);
      continue;
    }

    if (arg === "--batch-index") {
      batchIndex = parseNonNegativeInteger(readOptionValue(argv, index, arg), arg);
      index += 1;
      continue;
    }

    if (arg.startsWith("--batch-index=")) {
      batchIndex = parseNonNegativeInteger(arg.slice("--batch-index=".length), "--batch-index");
      continue;
    }

    fail(`Unknown argument "${arg}".`);
  }

  if (!new Set([allModeName, generalModeName, serializedModeName]).has(mode)) {
    fail(`Unknown mode "${mode}". Expected one of: ${allModeName}, ${generalModeName}, ${serializedModeName}.`);
  }

  if ((shardIndex === null) !== (shardCount === null)) {
    fail("--shard-index and --shard-count must be provided together.");
  }

  if (mode !== serializedModeName && shardIndex !== null) {
    fail("--shard-index/--shard-count are only valid with --mode serialized.");
  }

  if (group !== null && mode !== generalModeName) {
    fail("--group is only valid with --mode general.");
  }

  if (group !== null && !generalGroupNames.includes(group)) {
    fail(`Unknown group "${group}". Expected one of: ${generalGroupNames.join(", ")}.`);
  }

  if (batchIndex !== null && (mode !== generalModeName || group !== generalServerGroupName)) {
    fail("--batch-index requires --mode general --group general-server.");
  }

  if (mode === serializedModeName) {
    const resolvedShardCount = shardCount ?? 1;
    const resolvedShardIndex = shardIndex ?? 0;
    if (resolvedShardIndex >= resolvedShardCount) {
      fail(`--shard-index must be less than --shard-count. Received ${resolvedShardIndex} of ${resolvedShardCount}.`);
    }

    return {
      mode,
      shardIndex: resolvedShardIndex,
      shardCount: resolvedShardCount,
      group: null,
      batchIndex: null,
      dryRun,
    };
  }

  return {
    mode,
    shardIndex: null,
    shardCount: null,
    group,
    batchIndex,
    dryRun,
  };
}

function selectSerializedSuites(routeTests, shardIndex, shardCount) {
  return routeTests.filter((_, index) => index % shardCount === shardIndex);
}

function runVitest(args, label) {
  console.log(`\n[test:run] ${label}`);
  invocationIndex += 1;
  const tempRootParent = process.platform === "win32" ? os.tmpdir() : "/tmp";
  const testRoot = mkdtempSync(path.join(tempRootParent, `pcvt-${process.pid}-${invocationIndex}-`));
  // Keep per-run paths compact so Unix socket fixtures stay under macOS path limits.
  const env = {
    ...process.env,
    NODE_ENV: "test",
    PAPERCLIP_HOME: path.join(testRoot, "h"),
    PAPERCLIP_INSTANCE_ID: `vt-${process.pid}-${invocationIndex}`,
    TMPDIR: path.join(testRoot, "t"),
    TEMP: path.join(testRoot, "t"),
    TMP: path.join(testRoot, "t"),
  };
  mkdirSync(env.PAPERCLIP_HOME, { recursive: true });
  mkdirSync(env.TMPDIR, { recursive: true });
  const invocation = buildVitestInvocation(repoRoot, args);
  let result;
  try {
    result = spawnSync(invocation.command, invocation.args, {
      cwd: repoRoot,
      env,
      stdio: "inherit",
      shell: invocation.shell,
    });
  } finally {
    removeOwnedVitestTestRoot(testRoot, tempRootParent);
  }
  if (result.error) {
    console.error(`[test:run] Failed to start Vitest: ${result.error.message}`);
    process.exit(1);
  }
  if (result.status !== 0) {
    process.exit(result.status ?? 1);
  }
}

function runGeneralSuites(routeTests, generalServerTests) {
  for (const groupName of generalGroupNames) {
    runGeneralGroup(routeTests, generalServerTests, groupName);
  }
}

function runProjectGroup(projects, groupName) {
  for (const project of projects) {
    if (process.platform === "win32" && project === "@paperclipai/ui") {
      // The UI has enough files to exhaust Vitest's process-worker IPC on the
      // bounded Windows workstation when the default parallel pool is used.
      // One worker is still quick, and avoids intermittent ERR_IPC_CHANNEL_CLOSED
      // failures after otherwise successful server batches.
      const uiTests = walk(uiSrcRoot)
        .filter((file) => /\.test\.[cm]?[jt]sx?$/.test(file))
        .map(toRepoPath)
        .sort((left, right) => left.localeCompare(right));
      const uiBatches = chunkItems(uiTests, uiBatchSize);
      uiBatches.forEach((batch, index) => {
        runVitest(
          ["--project", project, ...serializedServerVitestArgs, "--silent=true", ...batch],
          `${groupName} project ${project} batch ${index + 1}/${uiBatches.length} (${batch.length} suites; single worker)`,
        );
      });
      continue;
    }
    if (process.platform === "win32" && project === "@paperclipai/db") {
      // The Windows embedded-Postgres test helper uses a before/after PID
      // snapshot to remove reparented workers that taskkill /T cannot see.
      // Keep DB files sequential so one fixture cannot enter another's PID
      // ownership window.
      runVitest(
        ["--project", project, ...serializedServerVitestArgs],
        `${groupName} project ${project} (single worker)`,
      );
      continue;
    }
    if (process.platform === "win32" && project === "paperclipai") {
      const cliTests = walk(cliSrcRoot)
        .filter((file) => /\.test\.[cm]?[jt]sx?$/.test(file))
        .map(toRepoPath)
        .sort((left, right) => left.localeCompare(right));
      const isolatedCliTests = cliTests.filter(usesEmbeddedPostgres);
      const isolatedCliTestPaths = new Set(isolatedCliTests);
      const generalCliTests = cliTests.filter((file) => !isolatedCliTestPaths.has(file));

      runVitest(
        ["--project", project, ...serializedServerVitestArgs, ...generalCliTests],
        `${groupName} project ${project} general (${generalCliTests.length} suites)`,
      );
      for (const testFile of isolatedCliTests) {
        runVitest(
          ["--project", project, ...serializedServerVitestArgs, testFile],
          `${groupName} project ${project} isolated ${testFile}`,
        );
      }
      continue;
    }
    runVitest(["--project", project], `${groupName} project ${project}`);
  }
}

function runGeneralGroup(routeTests, generalServerTests, groupName, batchIndex = null) {
  if (groupName === generalServerGroupName) {
    const batches = chunkItems(generalServerTests, generalServerBatchSize);
    if (batchIndex !== null && batchIndex >= batches.length) {
      fail(`--batch-index must be less than ${batches.length}. Received ${batchIndex}.`);
    }
    batches.forEach((batch, index) => {
      if (batchIndex !== null && index !== batchIndex) return;
      runVitest(
        [
          "--project",
          "@paperclipai/server",
          ...serializedServerVitestArgs,
          ...batch.map((file) => file.repoPath),
        ],
        `${groupName} batch ${index + 1}/${batches.length} (${batch.length} suites; ${routeTests.length} serialized suites excluded)`,
      );
    });
    return;
  }

  if (groupName === generalWorkspacesAGroupName) {
    runProjectGroup(generalWorkspacesAProjects, groupName);
    return;
  }

  if (groupName === generalWorkspacesBGroupName) {
    runProjectGroup(generalWorkspacesBProjects, groupName);
    return;
  }

  fail(`Unknown group "${groupName}".`);
}

function runSerializedSuites(routeTests, shardIndex, shardCount) {
  const shardTests = selectSerializedSuites(routeTests, shardIndex, shardCount);
  console.log(
    `\n[test:run] serialized shard ${shardIndex + 1}/${shardCount} running ${shardTests.length} of ${routeTests.length} suites`,
  );

  for (const routeTest of shardTests) {
    runVitest(
      [
        "--project",
        "@paperclipai/server",
        routeTest.repoPath,
        ...windowsHookTimeoutArgs,
        "--pool=forks",
        "--poolOptions.forks.isolate=true",
      ],
      routeTest.repoPath,
    );
  }
}

const allServerTests = walk(serverSrcRoot)
  .filter((file) => /\.test\.[cm]?[jt]sx?$/.test(file))
  .map((file) => ({
    repoPath: toRepoPath(file),
    serverPath: toServerPath(file),
  }))
  .sort((a, b) => a.repoPath.localeCompare(b.repoPath));
const routeTests = allServerTests.filter((file) => isRouteOrAuthzTest(file.repoPath));
const routeTestPaths = new Set(routeTests.map((file) => file.repoPath));
const generalServerTests = allServerTests.filter((file) => !routeTestPaths.has(file.repoPath));

const options = parseCliOptions(process.argv.slice(2));
if (options.dryRun) {
  const serializedSuites =
    options.mode === serializedModeName
      ? selectSerializedSuites(routeTests, options.shardIndex, options.shardCount)
      : routeTests;
  console.log(
    JSON.stringify(
      {
        mode: options.mode,
        shardIndex: options.shardIndex,
        shardCount: options.shardCount,
        group: options.group,
        batchIndex: options.batchIndex,
        availableGeneralGroups: generalGroupNames,
        generalServerSuiteCount: generalServerTests.length,
        generalServerBatchSize: Math.min(generalServerBatchSize, Math.max(generalServerTests.length, 1)),
        generalServerBatchCount: chunkItems(generalServerTests, generalServerBatchSize).length,
        uiSuiteCount: walk(uiSrcRoot).filter((file) => /\.test\.[cm]?[jt]sx?$/.test(file)).length,
        uiBatchSize,
        uiBatchCount: chunkItems(
          walk(uiSrcRoot).filter((file) => /\.test\.[cm]?[jt]sx?$/.test(file)),
          uiBatchSize,
        ).length,
        serializedSuiteCount: routeTests.length,
        selectedSerializedSuites: serializedSuites.map((routeTest) => routeTest.repoPath),
      },
      null,
      2,
    ),
  );
  process.exit(0);
}

if (options.mode === generalModeName || options.mode === allModeName) {
  if (options.group) {
    runGeneralGroup(routeTests, generalServerTests, options.group, options.batchIndex);
  } else {
    runGeneralSuites(routeTests, generalServerTests);
  }
}

if (options.mode === serializedModeName || options.mode === allModeName) {
  runSerializedSuites(routeTests, options.shardIndex ?? 0, options.shardCount ?? 1);
}
