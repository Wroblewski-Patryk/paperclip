import { spawnSync } from "node:child_process";
import { readFile } from "node:fs/promises";

const apiBase = process.env.PAPERCLIP_API_URL ?? "http://127.0.0.1:3200";
const companyName = "LuckySparrow";
const companyId = process.env.PAPERCLIP_COMPANY_ID ?? null;
const appsRoot = process.env.LUCKYSPARROW_APPS_ROOT ?? "C:/Personal/Projekty/Aplikacje";
const apply = process.argv.includes("--apply");
const requestTimeoutMs = Number(process.env.PROJECT_MUTATION_GUARD_REQUEST_TIMEOUT_MS ?? 15_000);

const protectedGroups = new Set(["product-code", "scripts", "dependencies", "other"]);

function runGit(cwd, args) {
  const result = spawnSync("git", args, {
    cwd,
    encoding: "utf8",
    stdio: ["ignore", "pipe", "pipe"],
  });
  return {
    ok: result.status === 0,
    stdout: (result.stdout ?? "").trim(),
    stderr: (result.stderr ?? "").trim(),
  };
}

function parseStatusLine(line) {
  const match = line.match(/^(.{1,2})\s+(.+)$/);
  return {
    status: match ? match[1].padEnd(2, " ") : line.slice(0, 2).padEnd(2, " "),
    path: match ? match[2] : line.slice(2).trimStart(),
  };
}

function classifyDirtyPath(filePath) {
  if (filePath.startsWith(".agents/")) return "agent-state";
  if (filePath.startsWith(".codex/context/")) return "codex-context";
  if (filePath.startsWith("docs/")) return "project-docs";
  if (filePath.startsWith("history/")) return "history-evidence";
  if (filePath.startsWith("scripts/")) return "scripts";
  if (filePath.startsWith("apps/") || filePath.startsWith("libs/")) return "product-code";
  if (/^package\.json$|^pnpm-lock\.yaml$|^pnpm-workspace\.yaml$/.test(filePath)) return "dependencies";
  return "other";
}

async function request(method, route, body) {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), requestTimeoutMs);
  const headers = { "content-type": "application/json" };
  if (process.env.PAPERCLIP_API_KEY) headers.authorization = `Bearer ${process.env.PAPERCLIP_API_KEY}`;
  if (method !== "GET" && process.env.PAPERCLIP_RUN_ID) headers["x-paperclip-run-id"] = process.env.PAPERCLIP_RUN_ID;
  try {
    const response = await fetch(`${apiBase}${route}`, {
      method,
      headers,
      body: body === undefined ? undefined : JSON.stringify(body),
      signal: controller.signal,
    });
    const text = await response.text();
    const data = text ? JSON.parse(text) : null;
    if (!response.ok) throw new Error(`${method} ${route} failed with ${response.status}: ${text}`);
    return data;
  } catch (error) {
    if (error instanceof Error && error.name === "AbortError") {
      throw new Error(`${method} ${route} timed out after ${requestTimeoutMs}ms`, { cause: error });
    }
    throw error;
  } finally {
    clearTimeout(timeout);
  }
}

function isRequestTimeoutError(error) {
  return error instanceof Error && /timed out after \d+ms/i.test(error.message);
}

function isBoardAccessRequiredError(error) {
  return error instanceof Error
    && /failed with 403:/i.test(error.message)
    && /Board access required/i.test(error.message);
}

async function readBaseline() {
  try {
    const raw = await readFile("report/softwarehouse-source-control.latest.json", "utf8");
    return JSON.parse(raw);
  } catch {
    return null;
  }
}

function dirtyItems(repoPath) {
  const status = runGit(repoPath, ["status", "--porcelain=v1"]);
  if (!status.ok) return [];
  return status.stdout
    ? status.stdout.split(/\r?\n/).filter(Boolean).map(parseStatusLine)
    : [];
}

function baselineGroupsFor(packet, repoName) {
  const repo = (packet?.repos ?? []).find((candidate) => candidate.name === repoName);
  return new Set((repo?.dirtyGroups ?? []).map((group) => group.group));
}

function baselinePathsFor(packet, repoName) {
  const repo = (packet?.repos ?? []).find((candidate) => candidate.name === repoName);
  const paths = repo?.dirtyPaths ?? (repo?.sample ?? []).map((item) => item.path);
  return new Set(paths.filter(Boolean));
}

function isNoProjectWriteLane(issue) {
  const title = String(issue?.title ?? "");
  return /\[Infra Gate\]|\[Architecture Planning\]|\[Safe Lane\]|Non-production architecture\/status refresh/i.test(title);
}

const baseline = await readBaseline();
const currentItems = dirtyItems(`${appsRoot}/Soar`);
const currentByGroup = new Map();
for (const item of currentItems) {
  const group = classifyDirtyPath(item.path);
  const bucket = currentByGroup.get(group) ?? [];
  bucket.push(item.path);
  currentByGroup.set(group, bucket);
}

const baselineGroups = baselineGroupsFor(baseline, "Soar");
const baselinePaths = baselinePathsFor(baseline, "Soar");
const newProtectedGroups = Array.from(currentByGroup.keys())
  .filter((group) => protectedGroups.has(group) && !baselineGroups.has(group));
const newPaths = currentItems
  .map((item) => item.path)
  .filter((filePath) => !baselinePaths.has(filePath));

async function resolveCompany() {
  if (companyId) return { id: companyId, source: "PAPERCLIP_COMPANY_ID" };

  const companies = await request("GET", "/api/companies");
  const company = companies.find((candidate) => candidate.name === companyName);
  if (!company) throw new Error(`Company not found: ${companyName}`);
  return { id: company.id, source: "company_name" };
}

const company = await resolveCompany();

let liveRuns = [];
let liveRunScanStatus = "ok";
let liveRunScanError = null;
try {
  liveRuns = await request("GET", `/api/companies/${company.id}/live-runs`);
} catch (error) {
  if (!isRequestTimeoutError(error)) throw error;
  liveRunScanStatus = "timed_out";
  liveRunScanError = error.message;
}
const issueFetchSkipped = [];
const liveRunIssues = await Promise.all(liveRuns.map(async (run) => {
  try {
    return { run, issue: await request("GET", `/api/issues/${run.issueId}`) };
  } catch (error) {
    issueFetchSkipped.push({
      runId: run.id,
      issueId: run.issueId,
      skippedReason: isRequestTimeoutError(error) ? "issue_detail_timeout" : "issue_detail_fetch_failed",
      error: error instanceof Error ? error.message : String(error),
    });
    return { run, issue: null };
  }
}));
const activeSoarRuns = liveRuns
  .map((run) => liveRunIssues.find((item) => item.run.id === run.id) ?? { run, issue: null })
  .filter(({ issue }) => issue?.title?.includes("[Soar]") && !["done", "cancelled"].includes(issue.status));

const actions = [];
if (activeSoarRuns.length > 0 && newProtectedGroups.length > 0) {
  for (const { run, issue } of activeSoarRuns) {
    actions.push({
      kind: "cancel_scope_violating_project_run",
      runId: run.id,
      issueId: issue.id,
      identifier: issue.identifier,
      title: issue.title,
      issueStatus: issue.status,
      newProtectedGroups,
      sample: newProtectedGroups.flatMap((group) => currentByGroup.get(group)?.slice(0, 5) ?? []),
    });
  }
}
for (const { run, issue } of activeSoarRuns) {
  if (!isNoProjectWriteLane(issue) || newPaths.length === 0) continue;
  actions.push({
    kind: "cancel_no_project_write_lane_with_new_paths",
    runId: run.id,
    issueId: issue.id,
    identifier: issue.identifier,
    title: issue.title,
    issueStatus: issue.status,
    newPaths: newPaths.slice(0, 20),
  });
}

const applied = [];
const actionSkips = [];
if (apply) {
  for (const action of actions) {
    if (action.kind === "cancel_scope_violating_project_run") {
      try {
        const cancelled = await request("POST", `/api/heartbeat-runs/${action.runId}/cancel`, {});
        const updated = await request("PATCH", `/api/issues/${action.issueId}`, {
          status: "blocked",
          comment: [
            "Project mutation guard stopped this run because protected project changes appeared during a gated/non-delivery lane.",
            `New protected dirty group(s): ${action.newProtectedGroups.join(", ")}.`,
            `Sample path(s): ${action.sample.join(", ") || "none"}.`,
            "",
            "Disposition: blocked pending source-control classification.",
            "No automatic revert was performed.",
          ].join("\n"),
        });
        applied.push({
          ...action,
          runStatus: cancelled?.status ?? null,
          issueStatus: updated.status,
        });
      } catch (error) {
        if (isBoardAccessRequiredError(error)) {
          actionSkips.push({
            ...action,
            skippedReason: "board_access_required",
            ownerAction: "Use a board-credentialed path to cancel the run; do not assume the cancellation happened.",
            error: error instanceof Error ? error.message : String(error),
          });
          continue;
        }
        if (isRequestTimeoutError(error)) {
          actionSkips.push({
            ...action,
            skippedReason: "cancel_timeout",
            ownerAction: "Retry the project mutation guard after the local Paperclip API is responsive.",
            error: error instanceof Error ? error.message : String(error),
          });
          continue;
        }
        throw error;
      }
      continue;
    }

    if (action.kind === "cancel_no_project_write_lane_with_new_paths") {
      try {
        const cancelled = await request("POST", `/api/heartbeat-runs/${action.runId}/cancel`, {});
        const updated = await request("PATCH", `/api/issues/${action.issueId}`, {
          status: "blocked",
          comment: [
            "Project mutation guard stopped this run because a no-project-write lane created or touched project paths.",
            `New path(s) since the source-control baseline: ${action.newPaths.join(", ") || "none"}.`,
            "",
            "Disposition: blocked pending source-control classification and boundary review.",
            "No automatic revert was performed.",
          ].join("\n"),
        });
        applied.push({
          ...action,
          runStatus: cancelled?.status ?? null,
          issueStatus: updated.status,
        });
      } catch (error) {
        if (isBoardAccessRequiredError(error)) {
          actionSkips.push({
            ...action,
            skippedReason: "board_access_required",
            ownerAction: "Use a board-credentialed path to cancel the run; do not assume the cancellation happened.",
            error: error instanceof Error ? error.message : String(error),
          });
          continue;
        }
        if (isRequestTimeoutError(error)) {
          actionSkips.push({
            ...action,
            skippedReason: "cancel_timeout",
            ownerAction: "Retry the project mutation guard after the local Paperclip API is responsive.",
            error: error instanceof Error ? error.message : String(error),
          });
          continue;
        }
        throw error;
      }
    }
  }
}

console.log(JSON.stringify({
  apiBase,
  company: { id: company.id, name: company.name },
  mode: apply ? "apply" : "dry-run",
  baselineGeneratedAt: baseline?.generatedAt ?? null,
  currentDirtyGroups: Array.from(currentByGroup.entries()).map(([group, paths]) => ({ group, count: paths.length })),
  baselineGroups: Array.from(baselineGroups),
  newPathCount: newPaths.length,
  newPathSample: newPaths.slice(0, 20),
  newProtectedGroups,
  liveRunScanStatus,
  liveRunScanError,
  activeSoarRunCount: activeSoarRuns.length,
  actionCount: actions.length,
  actions,
  applied,
  actionSkips,
  skipped: issueFetchSkipped,
}, null, 2));
