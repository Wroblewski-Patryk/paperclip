#!/usr/bin/env node

import { execFileSync } from "node:child_process";
import { access, readFile, readdir } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";

const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const appsRoot = path.resolve(repoRoot, "..");
const roots = [
  { key: "paperclip", cwd: repoRoot },
  { key: "soar", cwd: path.join(appsRoot, "Soar") },
  { key: "roost", cwd: path.join(appsRoot, "Roost") },
];
const apiBase = (process.env.PAPERCLIP_API_URL ?? "http://127.0.0.1:3200").replace(/\/$/, "");

function normalized(value) {
  return path.resolve(value).toLowerCase();
}

async function exists(value) {
  try {
    await access(value);
    return true;
  } catch {
    return false;
  }
}

function gitWorktrees(cwd) {
  const output = execFileSync("git", ["-C", cwd, "worktree", "list", "--porcelain"], {
    encoding: "utf8",
    maxBuffer: 1024 * 1024,
    windowsHide: true,
  });
  return output
    .split(/\r?\n/)
    .filter((line) => line.startsWith("worktree "))
    .map((line) => path.resolve(line.slice("worktree ".length)));
}

function dockerComposeOneoffs() {
  const ids = execFileSync(
    "docker",
    ["ps", "--all", "--filter", "label=com.docker.compose.oneoff", "--format", "{{.ID}}"],
    {
      encoding: "utf8",
      maxBuffer: 1024 * 1024,
      timeout: 5_000,
      windowsHide: true,
    },
  )
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter(Boolean);

  if (ids.length === 0) return [];

  const inspected = JSON.parse(
    execFileSync("docker", ["inspect", ...ids], {
      encoding: "utf8",
      maxBuffer: 4 * 1024 * 1024,
      timeout: 5_000,
      windowsHide: true,
    }),
  );

  return inspected
    .filter(
      (container) =>
        String(container?.Config?.Labels?.["com.docker.compose.oneoff"] ?? "").toLowerCase() ===
        "true",
    )
    .map((container) => ({
      id: String(container?.Id ?? "").slice(0, 12),
      name: String(container?.Name ?? "").replace(/^\//, ""),
      state: container?.State?.Status ?? "unknown",
      running: container?.State?.Running === true,
      project: container?.Config?.Labels?.["com.docker.compose.project"] ?? null,
      service: container?.Config?.Labels?.["com.docker.compose.service"] ?? null,
      workingDir: container?.Config?.Labels?.["com.docker.compose.project.working_dir"] ?? null,
      autoRemove: container?.HostConfig?.AutoRemove === true,
      mountCount: Array.isArray(container?.Mounts) ? container.Mounts.length : 0,
    }));
}

async function requestJson(route, timeoutMs = 5_000) {
  const response = await fetch(`${apiBase}${route}`, { signal: AbortSignal.timeout(timeoutMs) });
  if (!response.ok) throw new Error(`${route} returned ${response.status}`);
  return response.json();
}

async function isPaperclipHealthAt(url) {
  try {
    const response = await fetch(`${url}/api/health`, { signal: AbortSignal.timeout(1_500) });
    if (!response.ok) return false;
    const body = await response.json();
    return body?.status === "ok" && typeof body?.version === "string";
  } catch {
    return false;
  }
}

async function readDevServiceRecords() {
  const records = [];
  const registryDirs = [
    path.join(repoRoot, ".paperclip", "runtime", "home", "instances", "default", "runtime-services"),
    path.join(os.homedir(), ".paperclip", "instances", "default", "runtime-services"),
  ];
  for (const registryDir of registryDirs) {
    if (!(await exists(registryDir))) continue;
    const names = (await readdir(registryDir)).filter((name) => name.endsWith(".json"));
    for (const name of names) {
      try {
        const record = JSON.parse(await readFile(path.join(registryDir, name), "utf8"));
        if (record?.profileKind === "paperclip-dev" && normalized(record.cwd) === normalized(repoRoot)) {
          records.push(record);
        }
      } catch {
        // Invalid registry files are handled by the service supervisor.
      }
    }
  }
  return records;
}

const failures = [];
const warnings = [];
const config = JSON.parse(await readFile(path.join(repoRoot, ".paperclip", "config.json"), "utf8"));

if (config?.server?.port !== 3200 || config?.server?.strictPort !== true) {
  failures.push({ code: "paperclip_listener_not_strict", expectedPort: 3200 });
}
if (config?.database?.embeddedPostgresPort !== 54329 || config?.database?.embeddedPostgresStrictPort !== true) {
  failures.push({ code: "embedded_postgres_not_strict", expectedPort: 54329 });
}

const worktrees = [];
for (const root of roots) {
  if (!(await exists(root.cwd))) {
    failures.push({ code: "canonical_root_missing", root: root.key, cwd: root.cwd });
    continue;
  }
  const entries = gitWorktrees(root.cwd);
  worktrees.push({ ...root, entries });
  if (entries.length !== 1 || normalized(entries[0]) !== normalized(root.cwd)) {
    failures.push({ code: "noncanonical_git_worktrees", root: root.key, cwd: root.cwd, entries });
  }
}

let health = null;
let projects = [];
try {
  health = await requestJson("/api/health");
  const companies = await requestJson("/api/companies");
  if (companies.length !== 1) warnings.push({ code: "company_count_not_one", count: companies.length });
  if (companies[0]) projects = await requestJson(`/api/companies/${companies[0].id}/projects`);
} catch (error) {
  failures.push({ code: "paperclip_api_unhealthy", message: error instanceof Error ? error.message : String(error) });
}

const activeProjects = projects.filter((project) => !project.archivedAt);
function activeProjectMatches(root) {
  return activeProjects.filter((project) => {
    const cwd = project?.primaryWorkspace?.cwd ?? project?.cwd;
    return typeof cwd === "string" && normalized(cwd) === normalized(root.cwd);
  });
}
for (const root of roots) {
  const matches = activeProjectMatches(root);
  if (matches.length !== 1) {
    failures.push({ code: "canonical_active_project_count", root: root.key, count: matches.length, projectIds: matches.map((p) => p.id) });
  }
}

if (await isPaperclipHealthAt("http://127.0.0.1:3201")) {
  failures.push({ code: "fallback_paperclip_instance_detected", url: "http://127.0.0.1:3201" });
}

const devServices = await readDevServiceRecords();
const liveDevServices = devServices.filter((record) => {
  try {
    process.kill(record.pid, 0);
    return true;
  } catch {
    return false;
  }
});
if (liveDevServices.length !== 1) {
  failures.push({ code: "paperclip_dev_service_count", count: liveDevServices.length, pids: liveDevServices.map((record) => record.pid) });
}

let composeOneoffs = [];
try {
  composeOneoffs = dockerComposeOneoffs().filter((container) =>
    roots.some(
      (root) =>
        typeof container.workingDir === "string" &&
        normalized(container.workingDir) === normalized(root.cwd),
    ),
  );
  for (const container of composeOneoffs) {
    const detail = {
      id: container.id,
      name: container.name,
      state: container.state,
      project: container.project,
      service: container.service,
      workingDir: container.workingDir,
      autoRemove: container.autoRemove,
      mountCount: container.mountCount,
    };
    if (container.running) {
      warnings.push({ code: "active_compose_oneoff_container", ...detail });
    } else {
      failures.push({ code: "stale_compose_oneoff_container", ...detail });
    }
  }
} catch (error) {
  warnings.push({
    code: "docker_inventory_unavailable",
    message: (error instanceof Error ? error.message : String(error)).slice(0, 1_000),
  });
}

const result = {
  overall: failures.length === 0 ? "pass" : "fail",
  checkedAt: new Date().toISOString(),
  apiBase,
  health,
  strictPorts: {
    paperclip: { port: config?.server?.port, enabled: config?.server?.strictPort === true },
    embeddedPostgres: { port: config?.database?.embeddedPostgresPort, enabled: config?.database?.embeddedPostgresStrictPort === true },
  },
  canonicalRoots: roots.map((root) => root.cwd),
  worktrees,
  activeProjectCountByRoot: Object.fromEntries(roots.map((root) => [root.key, activeProjectMatches(root).length])),
  livePaperclipDevServices: liveDevServices.map((record) => ({ pid: record.pid, port: record.port, cwd: record.cwd })),
  composeOneoffs,
  warnings,
  failures,
};

console.log(JSON.stringify(result, null, 2));
if (failures.length > 0) process.exitCode = 1;
