import { spawnSync } from "node:child_process";
import path from "node:path";
import {
  dirtyStateCouldInvalidateClosure,
  latestDirtyMutationMs,
} from "./lib/source-control-dirty-state.mjs";

const apiBase = process.env.PAPERCLIP_API_URL ?? "http://127.0.0.1:3200";
const companyName = "LuckySparrow Software House";
const companyNameAliases = [companyName, "LuckySparrow"];
const companyId = process.env.PAPERCLIP_COMPANY_ID ?? null;
const appsRoot = process.env.LUCKYSPARROW_APPS_ROOT ?? "C:/Personal/Projekty/Aplikacje";
const apply = process.argv.includes("--apply");
const requestTimeoutMs = Number(process.env.SOURCE_CONTROL_CLOSURE_JANITOR_REQUEST_TIMEOUT_MS ?? 15_000);
const openStatuses = new Set(["backlog", "todo", "in_progress", "in_review", "blocked"]);
const titlePattern = /^\[(?<project>.+?)\]\[Source Control Closure\] Classify and close local dirty state/;
const markerPrefix = "softwarehouse-source-control-closure-janitor:close_completed:";
const invalidMarkerPrefix = "softwarehouse-source-control-closure-janitor:reopen_invalid_completion:";
const sourceControlProjects = ["Soar", "Roost", "Aviary", "Nest"];
const invalidCompletionMaxAgeMs = Number(process.env.SOURCE_CONTROL_INVALID_COMPLETION_MAX_AGE_MS ?? 48 * 60 * 60 * 1000);

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

function toArray(value) {
  if (Array.isArray(value)) return value;
  if (Array.isArray(value?.value)) return value.value;
  return [];
}

function uniqueIssues(rows) {
  const byId = new Map();
  for (const row of rows) {
    if (!row?.id) continue;
    byId.set(row.id, row);
  }
  return [...byId.values()];
}

function gitClean(projectName) {
  const cwd = path.join(appsRoot, projectName);
  const status = spawnSync("git", ["status", "--porcelain=v1", "-z"], { cwd, encoding: "utf8" });
  if (status.status !== 0) {
    const errorText = `${status.stderr ?? ""}${status.stdout ?? ""}`.trim();
    return { exists: false, clean: false, error: errorText || `git status failed with exit code ${status.status}` };
  }
  const head = spawnSync("git", ["rev-parse", "--short", "HEAD"], { cwd, encoding: "utf8" });
  return {
    exists: true,
    clean: status.stdout.trim().length === 0,
    dirtyCount: status.stdout ? status.stdout.split("\0").filter(Boolean).length : 0,
    latestDirtyMutationMs: latestDirtyMutationMs(cwd, status.stdout),
    head: head.status === 0 ? head.stdout.trim() : null,
  };
}

function hasCompletionEvidence(comments, gitHead) {
  const text = comments.map((comment) => comment.body ?? "").join("\n\n");
  return /source-control closure completed/i.test(text)
    && /git status --short[\s\S]{0,120}(clean|no dirty paths)/i.test(text)
    && /commit:\s*[0-9a-f]{7,40}/i.test(text)
    && (!gitHead || text.includes(gitHead));
}

function hasTerminalCleanClaim(comments) {
  const text = comments.map((comment) => comment.body ?? "").join("\n\n");
  return /source-control closure (is )?complete/i.test(text)
    || /Current repo state:\s*clean working tree/i.test(text)
    || /current dirty state is closed/i.test(text)
    || /closed the (?:full )?(?:local )?dirty[- ]state packet/i.test(text);
}

function invalidReopenMarker(issueIdentifier, gitHead) {
  return `${invalidMarkerPrefix}${issueIdentifier}:${gitHead ?? "unknown"}:v2`;
}

function hasInvalidReopenMarker(comments, issueIdentifier, gitHead) {
  const marker = invalidReopenMarker(issueIdentifier, gitHead);
  return comments.some((comment) => String(comment.body ?? "").includes(marker));
}

function isRecentInvalidCompletionCandidate(issue) {
  const timestamp = Date.parse(issue.updatedAt ?? issue.completedAt ?? issue.createdAt ?? "");
  if (!Number.isFinite(timestamp)) return false;
  return Date.now() - timestamp <= invalidCompletionMaxAgeMs;
}

function defaultProjectWorkspaceId(project) {
  const policy = project?.executionWorkspacePolicy;
  if (!policy || typeof policy !== "object" || Array.isArray(policy)) return null;
  const value = policy.defaultProjectWorkspaceId;
  return typeof value === "string" && value.trim() ? value.trim() : null;
}

async function resolveCompany() {
  if (companyId) return { id: companyId, source: "PAPERCLIP_COMPANY_ID" };

  const companies = await request("GET", "/api/companies");
  const company = companies.find((candidate) => companyNameAliases.includes(candidate.name))
    ?? companies.find((candidate) => /^LuckySparrow\b/i.test(candidate.name));
  if (!company) throw new Error(`Company not found: ${companyName}`);
  return { id: company.id, source: "company_name" };
}

const company = await resolveCompany();

let issues = [];
try {
  issues = toArray(await request("GET", `/api/companies/${company.id}/issues?limit=2000`));
} catch (error) {
  if (!isRequestTimeoutError(error)) throw error;
  console.log(JSON.stringify({
    apiBase,
    company: { id: company.id, name: company.name },
    mode: apply ? "apply" : "dry-run",
    candidateScanStatus: "timed_out",
    actionCount: 0,
    actions: [],
    applied: [],
    skipped: [
      {
        action: "skip_source_control_closure_janitor",
        reason: "candidate_scan_timeout",
        ownerAction: "Retry source-control closure janitor after the local Paperclip issue-list route is responsive.",
        error: error.message,
      },
    ],
  }, null, 2));
  process.exit(0);
}
const projects = toArray(await request("GET", `/api/companies/${company.id}/projects`).catch(() => []));
const projectByName = new Map(projects.map((project) => [project.name, project]));
const projectById = new Map(projects.map((project) => [project.id, project]));
const closureSearches = await Promise.all(sourceControlProjects.map((project) =>
  request("GET", `/api/companies/${company.id}/issues?q=${encodeURIComponent(`[${project}][Source Control Closure]`)}&limit=100`)
    .then((result) => toArray(result))
    .catch(() => [])
));
issues = uniqueIssues([...issues, ...closureSearches.flat()]);
const actions = [];

for (const issue of issues) {
  const match = titlePattern.exec(issue.title ?? "");
  if (!match?.groups?.project) continue;
  const project = match.groups.project;
  const repo = gitClean(project);
  const comments = await request("GET", `/api/issues/${issue.id}/comments?order=desc&limit=12`)
    .then((result) => toArray(result))
    .catch(() => []);
  if (
    issue.status === "done"
    && isRecentInvalidCompletionCandidate(issue)
    && repo.exists
    && !repo.clean
    && hasTerminalCleanClaim(comments)
    && dirtyStateCouldInvalidateClosure(repo, issue.updatedAt ?? issue.completedAt ?? issue.createdAt)
    && !hasInvalidReopenMarker(comments, issue.identifier, repo.head)
  ) {
    const projectRow = projectById.get(issue.projectId) ?? projectByName.get(project) ?? null;
    actions.push({
      action: "reopen_invalid_source_control_closure",
      identifier: issue.identifier,
      issueId: issue.id,
      title: issue.title,
      status: issue.status,
      project,
      dirtyCount: repo.dirtyCount,
      latestDirtyMutationAt: Number.isFinite(repo.latestDirtyMutationMs)
        ? new Date(repo.latestDirtyMutationMs).toISOString()
        : null,
      head: repo.head,
      projectWorkspaceId: defaultProjectWorkspaceId(projectRow),
    });
    continue;
  }
  if (!openStatuses.has(issue.status)) continue;
  if (!repo.exists || !repo.clean) continue;
  if (!hasCompletionEvidence(comments, repo.head)) continue;
  actions.push({
    action: "close_completed_source_control_closure",
    identifier: issue.identifier,
    issueId: issue.id,
    title: issue.title,
    status: issue.status,
    project,
    head: repo.head,
  });
}

const applied = [];
if (apply) {
  for (const action of actions) {
    if (action.action === "reopen_invalid_source_control_closure") {
      await request("POST", `/api/issues/${action.issueId}/comments`, {
        body: [
          invalidReopenMarker(action.identifier, action.head),
          "",
          `Reopening source-control closure because ${action.project} primary local repository is still dirty (${action.dirtyCount} paths) at ${action.head}.`,
          "Previous clean evidence is invalid for local source-control closure if it came from an isolated worktree or any workspace other than the project primary path.",
          "Required next evidence: run `git -C <project path> status --short --branch`, classify dirty groups, then commit/no-commit with rationale. No push, deploy, restart, protected smoke, production mutation, or secret disclosure.",
        ].join("\n"),
        resume: false,
      });
      const patch = {
        status: "todo",
        executionWorkspacePreference: "shared_workspace",
        executionWorkspaceSettings: { mode: "shared_workspace" },
        ...(action.projectWorkspaceId ? { projectWorkspaceId: action.projectWorkspaceId } : {}),
      };
      const updated = await request("PATCH", `/api/issues/${action.issueId}`, patch);
      applied.push({ ...action, updatedStatus: updated.status });
      continue;
    }
    await request("POST", `/api/issues/${action.issueId}/comments`, {
      body: [
        `${markerPrefix}${action.identifier}:v1`,
        "",
        `Source-control closure issue is being marked done because ${action.project} is clean at ${action.head} and the issue already contains completion evidence.`,
        "This is board metadata cleanup only: no project code, push, deploy, restart, protected smoke, production, or secret mutation.",
      ].join("\n"),
    });
    const updated = await request("PATCH", `/api/issues/${action.issueId}`, { status: "done" });
    applied.push({ ...action, updatedStatus: updated.status });
  }
}

console.log(JSON.stringify({
  apiBase,
  company: { id: company.id, name: company.name },
  mode: apply ? "apply" : "dry-run",
  actionCount: actions.length,
  actions,
  applied,
}, null, 2));
