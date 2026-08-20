import { spawnSync } from "node:child_process";
import { stat } from "node:fs/promises";
import path from "node:path";

const appsRoot = process.env.LUCKYSPARROW_APPS_ROOT ?? "C:/Personal/Projekty/Aplikacje";
const apply = process.argv.includes("--apply");
const force = process.argv.includes("--force");
const maxAgeHours = Number(process.env.ARCHITECTURE_AWARENESS_MAX_AGE_HOURS ?? 24);
const childOutputMaxBytes = 64 * 1024 * 1024;
const now = Date.now();

const projectNames = (process.env.SOFTWAREHOUSE_ARCHITECTURE_AWARENESS_PROJECTS ?? "Paperclip,Soar,Roost,Featherly")
  .split(",")
  .map((name) => name.trim())
  .filter(Boolean);

const requiredExports = [
  "docs/graphs/architecture-awareness.json",
  "docs/graphs/architecture-awareness.csv",
  "docs/graphs/architecture-proof-register.csv",
  "docs/graphs/architecture-graph.md",
  "docs/graphs/architecture-graph.mmd",
  "docs/graphs/architecture-health.json",
  "docs/status/architecture-awareness-report.md",
  "docs/status/architecture-dependency-report.md",
  "docs/status/architecture-ownership-report.md",
  "docs/status/task-synchronization-report.md",
  "docs/status/app-completion-index.json",
  "docs/status/app-completion-index.md",
  "docs/status/event-chain-index.json",
  "docs/status/event-chain-index.md",
  "docs/status/runtime-error-index.json",
  "docs/status/runtime-error-index.md",
  "docs/status/operational-readiness-index.json",
  "docs/status/operational-readiness-index.md",
  "docs/status/project-truth-index.json",
  "docs/status/project-truth-index.md",
];

function projectRootFor(name) {
  if (name === "Paperclip") return process.cwd();
  if (name === "Paperclip_Softwarehouse") return process.cwd();
  return path.join(appsRoot, name);
}

function toPosix(value) {
  return value.split(path.sep).join("/");
}

async function fileState(root, relativePath) {
  const fullPath = path.join(root, relativePath);
  try {
    const stats = await stat(fullPath);
    const ageHours = (now - stats.mtime.getTime()) / (60 * 60 * 1000);
    return {
      path: toPosix(fullPath),
      exists: true,
      size: stats.size,
      updatedAt: stats.mtime.toISOString(),
      ageHours: Number(ageHours.toFixed(2)),
      stale: ageHours > maxAgeHours,
    };
  } catch {
    return {
      path: toPosix(fullPath),
      exists: false,
      size: 0,
      updatedAt: null,
      ageHours: null,
      stale: true,
    };
  }
}

async function projectState(name) {
  const root = projectRootFor(name);
  try {
    await stat(root);
  } catch {
    return {
      name,
      root: toPosix(root),
      exists: false,
      action: "missing_project_root",
      missingExports: requiredExports,
      staleExports: [],
      exports: [],
    };
  }

  const exports = [];
  for (const relativePath of requiredExports) {
    exports.push({ relativePath, ...await fileState(root, relativePath) });
  }
  const missingExports = exports.filter((item) => !item.exists).map((item) => item.relativePath);
  const staleExports = exports.filter((item) => item.exists && item.stale).map((item) => item.relativePath);
  return {
    name,
    root: toPosix(root),
    exists: true,
    action: missingExports.length > 0
      ? "refresh_missing_exports"
      : staleExports.length > 0
        ? "refresh_stale_exports"
        : "noop_exports_fresh",
    missingExports,
    staleExports,
    exports,
  };
}

function refreshProject(project) {
  const architectureResult = spawnSync(process.execPath, [
    "scripts/build-architecture-awareness-index.mjs",
    "--project",
    project.name === "Paperclip_Softwarehouse" ? "Paperclip" : project.name,
    "--root",
    project.root,
  ], {
    cwd: process.cwd(),
    encoding: "utf8",
    maxBuffer: childOutputMaxBytes,
    stdio: ["ignore", "pipe", "pipe"],
  });

  if (architectureResult.status !== 0) {
    return {
      ok: false,
      exitCode: architectureResult.status,
      stdout: (architectureResult.stdout ?? "").trim().slice(0, 4000),
      stderr: (architectureResult.stderr ?? "").trim().slice(0, 4000),
    };
  }

  const completionResult = spawnSync(process.execPath, [
    "scripts/build-app-completion-index.mjs",
    "--project",
    project.name === "Paperclip_Softwarehouse" ? "Paperclip" : project.name,
    "--root",
    project.root,
  ], {
    cwd: process.cwd(),
    encoding: "utf8",
    maxBuffer: childOutputMaxBytes,
    stdio: ["ignore", "pipe", "pipe"],
  });

  if (completionResult.status !== 0) {
    return {
      ok: false,
      exitCode: completionResult.status,
      stdout: [
        (architectureResult.stdout ?? "").trim(),
        (completionResult.stdout ?? "").trim(),
      ].filter(Boolean).join("\n").slice(0, 4000),
      stderr: [
        (architectureResult.stderr ?? "").trim(),
        (completionResult.stderr ?? "").trim(),
      ].filter(Boolean).join("\n").slice(0, 4000),
    };
  }

  const truthResult = spawnSync(process.execPath, [
    "scripts/build-project-truth-indexes.mjs",
    "--project",
    project.name === "Paperclip_Softwarehouse" ? "Paperclip" : project.name,
    "--root",
    project.root,
    "--apply",
  ], {
    cwd: process.cwd(),
    encoding: "utf8",
    maxBuffer: childOutputMaxBytes,
    stdio: ["ignore", "pipe", "pipe"],
  });

  return {
    ok: truthResult.status === 0,
    exitCode: truthResult.status,
    stdout: [
      (architectureResult.stdout ?? "").trim(),
      (completionResult.stdout ?? "").trim(),
      (truthResult.stdout ?? "").trim(),
    ].filter(Boolean).join("\n").slice(0, 4000),
    stderr: [
      (architectureResult.stderr ?? "").trim(),
      (completionResult.stderr ?? "").trim(),
      (truthResult.stderr ?? "").trim(),
    ].filter(Boolean).join("\n").slice(0, 4000),
  };
}

const before = [];
for (const name of projectNames) {
  before.push(await projectState(name));
}

const refreshes = [];
if (apply) {
  for (const project of before) {
    if (!project.exists) continue;
    if (!force && project.action === "noop_exports_fresh") continue;
    const refresh = refreshProject(project);
    refreshes.push({ project: project.name, ...refresh });
  }
}

const after = [];
if (apply) {
  for (const name of projectNames) {
    after.push(await projectState(name));
  }
}

const current = apply ? after : before;
const missingProjectRoots = current.filter((project) => !project.exists);
const projectsMissingExports = current.filter((project) => project.exists && project.missingExports.length > 0);
const projectsWithStaleExports = current.filter((project) => project.exists && project.staleExports.length > 0);

console.log(JSON.stringify({
  mode: apply ? "apply" : "dry-run",
  generatedAt: new Date().toISOString(),
  appsRoot: toPosix(appsRoot),
  maxAgeHours,
  projectNames,
  summary: {
    projectCount: current.length,
    missingProjectRootCount: missingProjectRoots.length,
    projectsMissingExportsCount: projectsMissingExports.length,
    projectsWithStaleExportsCount: projectsWithStaleExports.length,
    refreshCount: refreshes.length,
    failedRefreshCount: refreshes.filter((refresh) => !refresh.ok).length,
    allExistingProjectsHaveExports: projectsMissingExports.length === 0,
    allExistingProjectsFresh: projectsMissingExports.length === 0 && projectsWithStaleExports.length === 0,
  },
  projects: current.map((project) => ({
    name: project.name,
    root: project.root,
    exists: project.exists,
    action: project.action,
    missingExports: project.missingExports,
    staleExports: project.staleExports,
    newestExportUpdatedAt: project.exports
      .filter((item) => item.updatedAt)
      .map((item) => item.updatedAt)
      .sort()
      .at(-1) ?? null,
    oldestExportUpdatedAt: project.exports
      .filter((item) => item.updatedAt)
      .map((item) => item.updatedAt)
      .sort()
      .at(0) ?? null,
  })),
  refreshes,
}, null, 2));

if (refreshes.some((refresh) => !refresh.ok)) process.exitCode = 1;
