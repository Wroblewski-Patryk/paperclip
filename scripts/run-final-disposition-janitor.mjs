import { spawnSync } from "node:child_process";
import path from "node:path";
import { canonicalSoftwarehouseRoutineTitle } from "./lib/softwarehouse-active-routines.mjs";

const apiBase = process.env.PAPERCLIP_API_URL ?? "http://127.0.0.1:3200";
const companyName = "LuckySparrow Software House";
const companyNameAliases = [companyName, "LuckySparrow"];
const companyId = process.env.PAPERCLIP_COMPANY_ID ?? null;
const appsRoot = process.env.LUCKYSPARROW_APPS_ROOT ?? "C:/Personal/Projekty/Aplikacje";
const apply = process.argv.includes("--apply");
const requestTimeoutMs = Number(process.env.FINAL_DISPOSITION_JANITOR_REQUEST_TIMEOUT_MS ?? 30_000);
const issuePageSize = Number(process.env.FINAL_DISPOSITION_JANITOR_ISSUE_PAGE_SIZE ?? 500);
const candidateConcurrency = Number(process.env.FINAL_DISPOSITION_JANITOR_CONCURRENCY ?? 8);
const candidateStatuses = new Set(["in_progress", "in_review", "blocked"]);
const candidateStatusList = [...candidateStatuses];
const markerPrefix = "softwarehouse-final-disposition-janitor:close_done:";
const nonBlockingRoutineTitles = new Set([
  "09 Technology: Agent Health and Model Governance",
  "11 Innovation: Autonomy Governor",
  "04 Operations: Gate Freshness Watcher",
]);

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

async function requestAllPages(route, { limit = issuePageSize } = {}) {
  const rows = [];
  for (let offset = 0; ; offset += limit) {
    const separator = route.includes("?") ? "&" : "?";
    const page = await request("GET", `${route}${separator}limit=${limit}&offset=${offset}`);
    if (!Array.isArray(page)) {
      throw new Error(`Expected paginated route to return an array: ${route}`);
    }
    rows.push(...page);
    if (page.length < limit) return rows;
  }
}

async function mapWithConcurrency(items, concurrency, mapper) {
  const limit = Number.isFinite(concurrency) && concurrency > 0 ? Math.floor(concurrency) : 1;
  const results = new Array(items.length);
  let nextIndex = 0;
  const workers = Array.from({ length: Math.min(limit, items.length) }, async () => {
    while (nextIndex < items.length) {
      const index = nextIndex;
      nextIndex += 1;
      results[index] = await mapper(items[index], index);
    }
  });
  await Promise.all(workers);
  return results;
}

function isRequestTimeoutError(error) {
  return error instanceof Error && /timed out after \d+ms/i.test(error.message);
}

function normalizeText(value) {
  return String(value ?? "").toLowerCase();
}

function commentRows(result) {
  return result?.value ?? result ?? [];
}

function hasDoneDisposition(comments) {
  const text = normalizeText(comments.map((comment) => comment.body ?? "").join("\n\n"));
  return [
    /final\s+disposition(?:\s+(?:for|dla)\s+[^:\n]+)?\s*:\s*(?:[-–]\s*)?(?:`?LUC-\d+`?\s*(?:->|=>|:)\s*)?`?done`?/i,
    /final\s+disposition[\s\S]{0,180}`?LUC-\d+`?\s*:\s*`?done`?/i,
    /finalna dyspozycja[^.\n:]*[: ]+`?done`?/i,
    /dyspozycj[ąa][^.\n]{0,80}`?done`?/i,
    /zamkni[eę]t[ay][^.\n]{0,120}`?done`?/i,
    /utrwalon[ay][^.\n]+jako `?done`?/i,
    /durably closed as `?done`?/i,
    /status(?:em)? `?done`?/i,
    /\bsource issue is now done\b/i,
    /\bissue(?: is| was)? closed as `?done`?/i,
  ].some((pattern) => pattern.test(text));
}

function hasContradictingRecentBlocker(comments) {
  const latestBodies = comments.slice(0, 3).map((comment) => normalizeText(comment.body ?? ""));
  const doneIndex = latestBodies.findIndex((body) => [
    /final\s+disposition(?:\s+(?:for|dla)\s+[^:\n]+)?\s*:\s*(?:[-–]\s*)?(?:`?LUC-\d+`?\s*(?:->|=>|:)\s*)?`?done`?/i,
    /final\s+disposition[\s\S]{0,180}`?LUC-\d+`?\s*:\s*`?done`?/i,
    /finalna dyspozycja[^.\n:]*[: ]+`?done`?/i,
    /dyspozycj[ąa][^.\n]{0,80}`?done`?/i,
    /zamkni[eę]t[ay][^.\n]{0,120}`?done`?/i,
    /utrwalon[ay][^.\n]+jako `?done`?/i,
    /durably closed as `?done`?/i,
    /status(?:em)? `?done`?/i,
    /\bsource issue is now done\b/i,
    /\bissue(?: is| was)? closed as `?done`?/i,
  ].some((pattern) => pattern.test(body)));
  const blockerIndex = latestBodies.findIndex((body) =>
    body.includes("blocked pending source-control classification")
    || body.includes("do not close")
    || body.includes("not a valid done disposition")
  );
  return blockerIndex >= 0 && (doneIndex < 0 || blockerIndex < doneIndex);
}

function repoDirForProject(projectName) {
  if (!projectName) return null;
  if (projectName === "Softwarehouse" || projectName === "Paperclip_Softwarehouse") {
    return path.join(appsRoot, "Paperclip_Softwarehouse");
  }
  return path.join(appsRoot, projectName);
}

function gitClean(repoDir) {
  if (!repoDir) return { exists: false, git: false, clean: false };
  const probe = spawnSync("git", ["-C", repoDir, "rev-parse", "--is-inside-work-tree"], {
    encoding: "utf8",
    windowsHide: true,
  });
  if (probe.status !== 0) return { exists: false, git: false, clean: false };
  const status = spawnSync("git", ["-C", repoDir, "status", "--short"], {
    encoding: "utf8",
    windowsHide: true,
  });
  return {
    exists: true,
    git: true,
    clean: status.status === 0 && status.stdout.trim() === "",
    status: status.stdout.trim(),
  };
}

async function resolveCompany() {
  if (companyId) return { id: companyId, source: "PAPERCLIP_COMPANY_ID" };

  const companies = await request("GET", "/api/companies");
  const company = companies.find((candidate) => companyNameAliases.includes(candidate.name))
    ?? companies.find((candidate) => /^LuckySparrow\b/i.test(candidate.name));
  if (!company) throw new Error(`Company not found: ${companyName}`);
  return {
    id: company.id,
    source: company.name === companyName ? "company_name" : `company_alias:${company.name}`,
  };
}

const company = await resolveCompany();

let projects = [];
let issues = [];
let liveRuns = [];
try {
  [projects, issues, liveRuns] = await Promise.all([
    request("GET", `/api/companies/${company.id}/projects`),
    requestAllPages(`/api/companies/${company.id}/issues?status=${candidateStatusList.join(",")}`),
    request("GET", `/api/companies/${company.id}/live-runs`),
  ]);
} catch (error) {
  if (!isRequestTimeoutError(error)) throw error;
  console.log(JSON.stringify({
    apiBase,
    company: { id: company.id, name: company.name },
    mode: apply ? "apply" : "dry-run",
    candidateScanStatus: "timed_out",
    liveRunCount: null,
    blockingLiveRunCount: null,
    nonBlockingRoutineLiveRunCount: null,
    actionCount: 0,
    actions: [],
    applied: [],
    skipped: [
      {
        action: "skip_final_disposition_janitor",
        reason: "candidate_scan_timeout",
        ownerAction: "Retry final-disposition janitor after the local Paperclip issue-list/live-run routes are responsive.",
        error: error.message,
      },
    ],
  }, null, 2));
  process.exit(0);
}

const issueById = new Map(issues.map((issue) => [issue.id, issue]));
const nonBlockingRoutineLiveRunCount = liveRuns.filter((run) => {
  const issue = issueById.get(run.issueId);
  return issue?.originKind === "routine_execution"
    && nonBlockingRoutineTitles.has(canonicalSoftwarehouseRoutineTitle(issue.title));
}).length;
const blockingLiveRunCount = Math.max(0, liveRuns.length - nonBlockingRoutineLiveRunCount);
const liveIssueIds = new Set(liveRuns.map((run) => run.issueId).filter(Boolean));
const candidateIssues = issues.filter((issue) =>
  candidateStatuses.has(issue.status) && !liveIssueIds.has(issue.id)
);

if (apply && blockingLiveRunCount > 0) {
  console.log(JSON.stringify({
    apiBase,
    company: { id: company.id, name: company.name },
    mode: "apply",
    candidateScanStatus: "ok",
    liveRunCount: liveRuns.length,
    blockingLiveRunCount,
    nonBlockingRoutineLiveRunCount,
    candidateIssueCount: candidateIssues.length,
    requestTimeoutMs,
    candidateConcurrency,
    actionCount: 0,
    actions: [],
    applied: [],
    skipped: [
      {
        action: "skip_final_disposition_janitor",
        reason: "active_live_runs_present",
        ownerAction: "Wait for live runs to finish before applying final-disposition cleanup.",
      },
    ],
  }, null, 2));
  process.exit(0);
}

const projectById = new Map(projects.map((project) => [project.id, project]));
const actions = [];
const skipped = [];

const evaluations = await mapWithConcurrency(candidateIssues, candidateConcurrency, async (issue) => {
  const commentsResult = await request("GET", `/api/issues/${issue.id}/comments?order=desc&limit=8`)
    .then((comments) => ({ ok: true, comments: commentRows(comments) }))
    .catch((error) => ({ ok: false, error }));
  if (!commentsResult.ok) {
    return {
      type: "skipped",
      item: {
        action: "skip_final_disposition_issue",
        identifier: issue.identifier,
        issueId: issue.id,
        reason: isRequestTimeoutError(commentsResult.error) ? "comments_timeout" : "comments_read_failed",
        error: commentsResult.error instanceof Error ? commentsResult.error.message : String(commentsResult.error),
      },
    };
  }
  const comments = commentsResult.comments;
  if (!hasDoneDisposition(comments)) return null;
  if (hasContradictingRecentBlocker(comments)) return null;

  const project = projectById.get(issue.projectId);
  const repo = gitClean(repoDirForProject(project?.name));
  if (!repo.clean) return null;

  return {
    type: "action",
    item: {
    action: "close_done_disposition_issue",
    identifier: issue.identifier,
    issueId: issue.id,
    title: issue.title,
    status: issue.status,
    project: project?.name ?? null,
    recoveryActionId: issue.activeRecoveryAction?.id ?? null,
    recoveryKind: issue.activeRecoveryAction?.kind ?? null,
    },
  };
});

for (const evaluation of evaluations) {
  if (!evaluation) continue;
  if (evaluation.type === "action") actions.push(evaluation.item);
  if (evaluation.type === "skipped") skipped.push(evaluation.item);
}

const applied = [];
if (apply) {
  for (const action of actions) {
    await request("POST", `/api/issues/${action.issueId}/comments`, {
      body: [
        `${markerPrefix}${action.identifier}:v1`,
        "",
        "Closed this issue because recent durable evidence records a final `done` disposition and the project repository is clean.",
        "This is board/process metadata cleanup only: no project code, production, deploy, restart, protected smoke, push, or secret mutation.",
      ].join("\n"),
    });
    const updated = await request("PATCH", `/api/issues/${action.issueId}`, {
      status: "done",
    });
    if (action.recoveryActionId) {
      await request("POST", `/api/issues/${action.issueId}/recovery-actions/resolve`, {
        actionId: action.recoveryActionId,
        outcome: "done",
        sourceIssueStatus: "done",
        resolutionNote: "Softwarehouse final-disposition janitor closed a stale missing-disposition recovery after durable `done` evidence and clean repo state.",
      }).catch(() => null);
    }
    applied.push({ ...action, updatedStatus: updated.status });
  }
}

console.log(JSON.stringify({
  apiBase,
  company: { id: company.id, name: company.name },
  mode: apply ? "apply" : "dry-run",
  candidateScanStatus: "ok",
  liveRunCount: liveRuns.length,
  blockingLiveRunCount,
  nonBlockingRoutineLiveRunCount,
  candidateIssueCount: candidateIssues.length,
  requestTimeoutMs,
  candidateConcurrency,
  actionCount: actions.length,
  actions,
  applied,
  skipped,
}, null, 2));
