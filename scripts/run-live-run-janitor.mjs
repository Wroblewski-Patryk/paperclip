import { readFile } from "node:fs/promises";
import { createRequire } from "node:module";
import path from "node:path";
import { softwarehouseGateSpecs } from "./lib/softwarehouse-gates.mjs";

const requireFromDb = createRequire(new URL("../packages/db/package.json", import.meta.url));
const postgres = requireFromDb("postgres");

const apiBase = process.env.PAPERCLIP_API_URL ?? "http://127.0.0.1:3200";
const companyNames = ["LuckySparrow", "LuckySparrow Software House"];
const companyId = process.env.PAPERCLIP_COMPANY_ID ?? null;
const apply = process.argv.includes("--apply");
const minTailAgeMs = Number(process.env.LIVE_RUN_JANITOR_MIN_TAIL_MS ?? 90_000);
const gateHoldMinTailAgeMs = Number(process.env.LIVE_RUN_JANITOR_GATE_HOLD_MIN_TAIL_MS ?? 180_000);
const requestTimeoutMs = Number(process.env.LIVE_RUN_JANITOR_REQUEST_TIMEOUT_MS ?? 15_000);
const requestRetryCount = Number(process.env.LIVE_RUN_JANITOR_REQUEST_RETRY_COUNT ?? 2);
const requestRetryDelayMs = Number(process.env.LIVE_RUN_JANITOR_REQUEST_RETRY_DELAY_MS ?? 1_500);
const closedTailCancelCooldownMs = Number(
  process.env.LIVE_RUN_JANITOR_CLOSED_TAIL_CANCEL_COOLDOWN_MS ?? 15 * 60 * 1000,
);
const safeBulkActionLimit = Number(process.env.LIVE_RUN_JANITOR_SAFE_BULK_ACTION_LIMIT ?? 20);

const terminalStatuses = new Set(["done", "cancelled"]);
const gateRootBlockers = new Set(softwarehouseGateSpecs.map((spec) => spec.rootBlocker));
const nonBlockingTerminalSoftwarehouseRoutineTitles = new Set([
  "[Softwarehouse] Agent health and model governance",
  "[Softwarehouse] Autonomy governor",
  "[Softwarehouse] Gate freshness watcher",
]);
const operatingSourceControlClosureTitlePrefix = "[Softwarehouse][OS Closure]";
const closedTailCancelMarkerPrefix = "softwarehouse-live-run-janitor:cancel_closed_issue_tail:";
const duplicateOwnerRunMarkerPrefix = "softwarehouse-live-run-janitor:cancel_duplicate_owner_run:";
const noLiveDispositionSyncMarkerPrefix = "softwarehouse-live-run-janitor:sync_no_live_disposition:";
const safeBulkActionKinds = new Set([
  "cancel_blocked_issue_tail",
  "cancel_closed_issue_tail",
  "cancel_duplicate_owner_run",
  "cancel_duplicate_owner_orphan_run",
  "cancel_nonblocking_terminal_routine_tail",
  "cancel_silent_gate_hold_in_progress_tail",
  "close_governor_self_supervision",
  "sync_live_issue_in_progress",
  "sync_no_live_final_disposition",
]);

function isDatabaseConnectionUnavailable(error) {
  const text = `${error?.message ?? ""}\n${error?.code ?? ""}\n${error?.cause?.message ?? ""}\n${error?.cause?.code ?? ""}`;
  return /ECONNREFUSED|ECONNRESET|ETIMEDOUT|CONNECT_TIMEOUT|ENOTFOUND|Connection terminated|connect\s+ECONN/i.test(text);
}

function isRetryableRequestError(error) {
  if (!error) return false;
  if (error.name === "AbortError" || /AbortError/i.test(String(error.message ?? ""))) return true;
  if (error instanceof TypeError) return true;
  return false;
}

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function request(method, route, body) {
  const attempts = Math.max(1, requestRetryCount + 1);
  let lastError = null;
  for (let attempt = 1; attempt <= attempts; attempt += 1) {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), requestTimeoutMs);
    const headers = { "content-type": "application/json" };
    if (process.env.PAPERCLIP_API_KEY) headers.authorization = `Bearer ${process.env.PAPERCLIP_API_KEY}`;
    if (method !== "GET" && process.env.PAPERCLIP_RUN_ID) {
      headers["x-paperclip-run-id"] = process.env.PAPERCLIP_RUN_ID;
    }
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
        lastError = new Error(
          `${method} ${route} timed out after ${requestTimeoutMs}ms (attempt ${attempt}/${attempts})`,
          { cause: error },
        );
      } else {
        lastError = error;
      }
      if (attempt >= attempts || !isRetryableRequestError(error)) throw (lastError ?? error);
      const delayMs = requestRetryDelayMs * attempt;
      // Transient local API stalls can self-heal; retry a few times before failing the control loop.
      await sleep(delayMs);
    } finally {
      clearTimeout(timeout);
    }
  }

  throw lastError ?? new Error(`${method} ${route} failed`);
}

async function mapWithConcurrency(items, concurrency, fn) {
  const workers = Array.from({ length: Math.max(1, Math.min(concurrency, items.length)) }, async (_, workerIndex) => {
    const results = [];
    for (let index = workerIndex; index < items.length; index += concurrency) {
      results.push(await fn(items[index], index));
    }
    return results;
  });
  return (await Promise.all(workers)).flat();
}

function isUnresolvedBlockerError(error) {
  return error instanceof Error && /Issue is blocked by unresolved blockers/i.test(error.message);
}

function isMissingAssigneeInProgressError(error) {
  return error instanceof Error && /in_progress issues require an assignee/i.test(error.message);
}

function isBoardAccessRequiredError(error) {
  return error instanceof Error
    && /failed with 403:/i.test(error.message)
    && /Board access required/i.test(error.message);
}

function isRequestTimeoutError(error) {
  return error instanceof Error
    && /timed out after \d+ms/i.test(error.message);
}

function isIssueAuthorizationBoundaryError(error) {
  const message = error instanceof Error ? error.message : String(error ?? "");
  const isIssueMutation = /(?:PATCH|POST) \/api\/issues\/[^/\s]+(?:\/comments)? failed with 403:/i.test(message);
  const isBoundaryDenial = /(?:Issue is outside this actor(?:'|\\u0027)s authorization boundary|Agent cannot mutate another agent(?:'|\\u0027)?s issue)/i
    .test(message);
  return isIssueMutation && isBoundaryDenial;
}

function ageMs(timestamp) {
  return timestamp ? Date.now() - new Date(timestamp).getTime() : Number.POSITIVE_INFINITY;
}

function timestampMs(timestamp) {
  const value = timestamp ? new Date(timestamp).getTime() : Number.NaN;
  return Number.isFinite(value) ? value : null;
}

function commentTimestamp(comment) {
  return comment.updatedAt ?? comment.createdAt ?? null;
}

function isGovernorSelfSupervision(issue, run) {
  return issue?.title === "[Softwarehouse] Autonomy governor"
    && issue.status === "in_progress"
    && ageMs(run?.lastOutputAt ?? run?.startedAt ?? run?.createdAt) >= minTailAgeMs;
}

function isTerminalSoftwarehouseTail(issue) {
  return issue?.title?.startsWith("[Softwarehouse]") && terminalStatuses.has(issue.status);
}

function isNonBlockingTerminalSoftwarehouseRoutineTail(issue) {
  return terminalStatuses.has(issue?.status)
    && nonBlockingTerminalSoftwarehouseRoutineTitles.has(issue?.title);
}

function isClosedIssueTail(issue, run) {
  return issue
    && terminalStatuses.has(issue.status)
    && ageMs(run.lastOutputAt ?? run.startedAt ?? run.createdAt) >= minTailAgeMs;
}

function isBlockedIssueTail(issue, run) {
  if (isOperatingSourceControlClosureIssue(issue) && isIssueExecutionLockedToRun(issue, run)) return false;
  return issue?.status === "blocked" && ageMs(run.lastOutputAt ?? run.startedAt ?? run.createdAt) >= minTailAgeMs;
}

function isRunnableIssueWithLiveRun(issue) {
  return issue && ["todo", "backlog"].includes(issue.status);
}

function isOperatingSourceControlClosureIssue(issue) {
  return String(issue?.title ?? "").startsWith(operatingSourceControlClosureTitlePrefix);
}

function isIssueExecutionLockedToRun(issue, run) {
  if (!issue || !run) return false;
  return issue.executionRunId === run.id || issue.checkoutRunId === run.id;
}

function runSortRank(run, issueById) {
  const issue = issueById.get(run.issueId);
  if (isOperatingSourceControlClosureIssue(issue)) return 0;
  if (!issue) return 95;
  if (issue.status === "in_progress") return 10;
  if (isRunnableIssueWithLiveRun(issue)) return 20;
  if (issue.status === "blocked") return 80;
  if (terminalStatuses.has(issue.status)) return 90;
  return 40;
}

function hasBlockedGateDisposition(comments, identifier) {
  const marker = `softwarehouse-stale-gate-escalation:${identifier}:v1`;
  return comments.some((comment) => {
    const body = String(comment.body ?? "");
    return body.includes(marker)
      || /final disposition[^.\n]*blocked/i.test(body)
      || /moving it to `?blocked`?/i.test(body)
      || /keep .*`?blocked`?.*operator|credential/i.test(body);
  });
}

function hasRunOutputAfterStart(comments, run) {
  const startedMs = timestampMs(run.startedAt ?? run.createdAt);
  if (startedMs === null) return false;
  return comments.some((comment) => {
    const commentMs = timestampMs(commentTimestamp(comment));
    return commentMs !== null && commentMs >= startedMs + 5000;
  });
}

function closedTailCancelMarker(identifier) {
  return `${closedTailCancelMarkerPrefix}${identifier}:v1`;
}

function readClosedTailCancelMarkerTimestamp(comment, identifier) {
  const marker = closedTailCancelMarker(identifier);
  const body = String(comment.body ?? "");
  if (!body.includes(marker)) return null;
  const timestamp = comment.updatedAt ?? comment.createdAt ?? null;
  if (!timestamp) return null;
  const value = new Date(timestamp).getTime();
  return Number.isFinite(value) ? value : null;
}

function hasRecentClosedTailCancelMarker(comments, identifier, now = Date.now(), notBeforeMs = null) {
  for (const comment of comments) {
    const markerAt = readClosedTailCancelMarkerTimestamp(comment, identifier);
    if (markerAt === null) continue;
    if (notBeforeMs !== null && markerAt < notBeforeMs) continue;
    if (now - markerAt <= closedTailCancelCooldownMs) return true;
  }
  return false;
}

function noLiveDispositionSyncMarker(identifier) {
  return `${noLiveDispositionSyncMarkerPrefix}${identifier}:v1`;
}

function duplicateOwnerRunMarker(identifier) {
  return `${duplicateOwnerRunMarkerPrefix}${identifier}:v1`;
}

function hasNoLiveDispositionSyncMarker(comments, identifier) {
  const marker = noLiveDispositionSyncMarker(identifier);
  return comments.some((comment) => String(comment.body ?? "").includes(marker));
}

function readFinalDispositionStatus(body) {
  const text = String(body ?? "");
  const normalizedDispositionPatterns = [
    /final(?:na)?\s+(?:disposition|dyspozycja)(?:\s+(?:for|dla)\s+[^:\n]+)?\s*:\s*(?:[-–]\s*)?(?:[*`_\s]*LUC-\d+[*`_\s]*\s*(?:->|=>|:)\s*)?[*`_\s]*(done|cancelled|canceled|blocked|in_review|in review)[*`_\s]*/i,
    /final(?:na)?\s+(?:disposition|dyspozycja)[\s\S]{0,180}[*`_\s]*LUC-\d+[*`_\s]*\s*:\s*[*`_\s]*(done|cancelled|canceled|blocked|in_review|in review)[*`_\s]*/i,
    /closure\s+status[\s\S]{0,180}[*`_\s]*(done|cancelled|canceled|blocked|in_review|in review)[*`_\s]*/i,
  ];
  for (const pattern of normalizedDispositionPatterns) {
    const value = pattern.exec(text)?.[1]?.toLowerCase().replace(/\s+/g, "_");
    if (value === "canceled") return "cancelled";
    if (value === "done" || value === "cancelled" || value === "blocked" || value === "in_review") return value;
  }
  const patterns = [
    /final(?:na)?\s+(?:disposition|dyspozycja)(?:\s+(?:for|dla)\s+[^:\n]+)?\s*:\s*(?:[-–]\s*)?[*`_\s]*(done|cancelled|canceled|blocked|in_review|in review)[*`_\s]*/i,
    /disposition\s+(?:for|dla)\s+[^:\n]+:\s*(?:[-–]\s*)?[*`_\s]*(done|cancelled|canceled|blocked|in_review|in review)[*`_\s]*/i,
    /disposition\s+issue\s*:\s*(?:[-–]\s*)?[*`_\s]*(done|cancelled|canceled|blocked|in_review|in review)[*`_\s]*/i,
    /completed\s+`?[\w-]+`?\s+as\s+`?(done|cancelled|canceled|blocked|in_review|in review)`?/i,
  ];
  for (const pattern of patterns) {
    const value = pattern.exec(text)?.[1]?.toLowerCase().replace(/\s+/g, "_");
    if (value === "canceled") return "cancelled";
    if (value === "done" || value === "cancelled" || value === "blocked" || value === "in_review") return value;
  }
  return null;
}

function latestFinalDisposition(comments) {
  for (const comment of comments) {
    const status = readFinalDispositionStatus(comment.body);
    if (status) return { status, commentId: comment.id ?? null };
  }
  return null;
}

function latestDurableTerminalDisposition(issue, comments) {
  const identifier = issue?.identifier ? String(issue.identifier).replace(/[.*+?^${}()|[\]\\]/g, "\\$&") : null;
  const patterns = [
    /\b(?:restor(?:e|ed|ing)|re-clos(?:e|ed|ing)|closed?)\b[\s\S]{0,180}\bterminal disposition\b[\s\S]{0,80}`?(done|cancelled|canceled)`?/i,
    /\bdurable terminal disposition\b[\s\S]{0,80}`?(done|cancelled|canceled)`?/i,
    /\bfinal state\b[\s\S]{0,180}`?(done|cancelled|canceled)`?/i,
    /\bverified persisted (?:final )?state\b[\s\S]{0,180}`?(done|cancelled|canceled)`?/i,
  ];
  if (identifier) {
    patterns.push(new RegExp("\\b" + identifier + "\\b[\\s\\S]{0,80}:\\s*`?(done|cancelled|canceled)`?", "i"));
  }

  for (const comment of comments) {
    const body = String(comment.body ?? "");
    for (const pattern of patterns) {
      const value = pattern.exec(body)?.[1]?.toLowerCase();
      if (value === "done") return { status: "done", commentId: comment.id ?? null };
      if (value === "cancelled" || value === "canceled") return { status: "cancelled", commentId: comment.id ?? null };
    }
  }
  return null;
}

function isSilentGateHoldInProgressTail(issue, run, comments) {
  if (!gateRootBlockers.has(issue?.identifier)) return false;
  if (issue.status !== "in_progress") return false;
  if (ageMs(run.lastOutputAt ?? run.startedAt ?? run.createdAt) < gateHoldMinTailAgeMs) return false;
  if (hasRunOutputAfterStart(comments, run)) return false;
  return hasBlockedGateDisposition(comments, issue.identifier);
}

async function resolveCompany() {
  if (companyId) return { id: companyId, source: "PAPERCLIP_COMPANY_ID" };

  const companies = await request("GET", "/api/companies");
  const company = companies.find((candidate) => companyNames.includes(candidate.name));
  if (!company) throw new Error(`Company not found: ${companyNames.join(" / ")}`);
  return { id: company.id, source: "company_name" };
}

async function resolveDatabaseUrl() {
  if (process.env.DATABASE_URL) return process.env.DATABASE_URL;
  const configPath = await findPaperclipConfigPath();
  const raw = configPath ? await readFile(configPath, "utf8").catch(() => null) : null;
  if (!raw) return null;
  const config = JSON.parse(raw);
  const port = Number(config?.database?.embeddedPostgresPort);
  if (!Number.isFinite(port) || port <= 0) return null;
  return `postgres://paperclip:paperclip@127.0.0.1:${Math.trunc(port)}/paperclip`;
}

async function findPaperclipConfigPath(startDir = process.cwd()) {
  let current = path.resolve(startDir);
  while (true) {
    const candidate = path.join(current, ".paperclip", "config.json");
    if (await readFile(candidate, "utf8").then(() => true).catch(() => false)) return candidate;
    const parent = path.dirname(current);
    if (parent === current) return null;
    current = parent;
  }
}

async function withControlSql(action) {
  const databaseUrl = await resolveDatabaseUrl();
  if (!databaseUrl) {
    throw new Error("No DATABASE_URL or .paperclip/config.json embeddedPostgresPort available for janitor direct read.");
  }

  const sql = postgres(databaseUrl, { max: 1, onnotice: () => {} });
  try {
    return await action(sql);
  } finally {
    await sql.end({ timeout: 5 });
  }
}

async function readControlDataFromSql(company) {
  return await withControlSql(async (sql) => {
    const [runRows, issueRows] = await Promise.all([
      sql`
        select
          id,
          company_id as "companyId",
          status,
          invocation_source as "invocationSource",
          trigger_detail as "triggerDetail",
          started_at as "startedAt",
          finished_at as "finishedAt",
          created_at as "createdAt",
          agent_id as "agentId",
          liveness_state as "livenessState",
          liveness_reason as "livenessReason",
          continuation_attempt as "continuationAttempt",
          last_useful_action_at as "lastUsefulActionAt",
          next_action as "nextAction",
          last_output_at as "lastOutputAt",
          last_output_seq as "lastOutputSeq",
          last_output_stream as "lastOutputStream",
          last_output_bytes as "lastOutputBytes",
          process_started_at as "processStartedAt",
          context_snapshot ->> 'issueId' as "issueId"
        from heartbeat_runs
        where company_id = ${company.id}
          and status in ('queued', 'running')
        order by created_at desc
        limit 50
      `,
      sql`
        select
          id,
          identifier,
          title,
          status,
          assignee_agent_id as "assigneeAgentId",
          checkout_run_id as "checkoutRunId",
          execution_run_id as "executionRunId",
          created_at as "createdAt",
          updated_at as "updatedAt"
        from issues
        where company_id = ${company.id}
          and hidden_at is null
      `,
    ]);
    return {
      liveRuns: runRows,
      issues: issueRows,
      fullIssueScanAvailable: true,
      readMode: "direct_db",
      readWarning: null,
    };
  });
}

async function readControlDataFromApi(company, cause) {
  const liveRuns = await request("GET", `/api/companies/${company.id}/live-runs?limit=50&minCount=0`);
  const liveIssueIds = [...new Set(liveRuns.map((run) => run.issueId).filter(Boolean))];
  const issueEntries = await mapWithConcurrency(liveIssueIds, 8, async (issueId) => {
    const issue = await request("GET", `/api/issues/${issueId}`).catch(() => null);
    return [issueId, issue];
  });
  return {
    liveRuns,
    issues: issueEntries.map(([, issue]) => issue).filter((issue) => issue?.id),
    fullIssueScanAvailable: false,
    readMode: "api_fallback",
    readWarning: `Direct database read unavailable; used API fallback and skipped whole-board no-live issue scan. Cause: ${cause?.message ?? cause}`,
  };
}

async function readRecentCommentsFromSql(company, liveIssueIdsWithIssues) {
  if (liveIssueIdsWithIssues.length === 0) return new Map();
  const commentRows = await withControlSql((sql) => sql`
    select id, issue_id as "issueId", body, created_at as "createdAt", updated_at as "updatedAt"
    from (
      select
        id,
        issue_id,
        body,
        created_at,
        updated_at,
        row_number() over (partition by issue_id order by created_at desc) as rn
      from issue_comments
      where company_id = ${company.id}
        and issue_id in ${sql(liveIssueIdsWithIssues)}
        and deleted_at is null
    ) recent_comments
    where rn <= 12
  `);
  const commentsByIssueId = new Map();
  for (const row of commentRows) {
    const comments = commentsByIssueId.get(row.issueId) ?? [];
    comments.push(row);
    commentsByIssueId.set(row.issueId, comments);
  }
  return commentsByIssueId;
}

async function readRecentCommentsFromApi(liveIssueIdsWithIssues) {
  const commentEntries = await mapWithConcurrency(liveIssueIdsWithIssues, 8, async (issueId) => {
    const comments = await request("GET", `/api/issues/${issueId}/comments`).catch(() => []);
    return [issueId, comments.slice(-12).reverse()];
  });
  return new Map(commentEntries);
}

const company = await resolveCompany();

let controlData;
try {
  controlData = await readControlDataFromSql(company);
} catch (error) {
  if (!isDatabaseConnectionUnavailable(error)) throw error;
  controlData = await readControlDataFromApi(company, error);
}

const {
  liveRuns,
  issues,
  fullIssueScanAvailable,
  readMode,
  readWarning,
} = controlData;

const issueById = new Map(issues.map((issue) => [issue.id, issue]));
const missingLiveIssueIds = [...new Set(liveRuns.map((run) => run.issueId).filter(Boolean))]
  .filter((issueId) => !issueById.has(issueId));
const missingLiveIssueEntries = await mapWithConcurrency(missingLiveIssueIds, 8, async (issueId) => {
  const issue = await request("GET", `/api/issues/${issueId}`).catch(() => null);
  return [issueId, issue];
});
for (const [issueId, issue] of missingLiveIssueEntries) {
  if (issue?.id) issueById.set(issue.id, issue);
  else issueById.set(issueId, null);
}
const liveIssueIds = new Set(liveRuns.map((run) => run.issueId).filter(Boolean));
const actions = [];
const liveIssueIdsWithIssues = [...new Set(liveRuns
  .map((run) => issueById.get(run.issueId)?.id)
  .filter(Boolean))];
let effectiveReadMode = readMode;
let effectiveReadWarning = readWarning;
let commentsByIssueId;
if (readMode === "direct_db") {
  try {
    commentsByIssueId = await readRecentCommentsFromSql(company, liveIssueIdsWithIssues);
  } catch (error) {
    if (!isDatabaseConnectionUnavailable(error)) throw error;
    commentsByIssueId = await readRecentCommentsFromApi(liveIssueIdsWithIssues);
    effectiveReadMode = "direct_db_with_api_comment_fallback";
    effectiveReadWarning = `Direct database comment read unavailable; used bounded API comment fallback. Cause: ${error?.message ?? error}`;
  }
} else {
  commentsByIssueId = await readRecentCommentsFromApi(liveIssueIdsWithIssues);
}
const commentsByRunId = new Map(liveRuns.map((run) => [
  run.id,
  commentsByIssueId.get(issueById.get(run.issueId)?.id) ?? [],
]));
const liveRunsByOwnerKey = new Map();
for (const run of liveRuns) {
  if (!run.agentId) continue;
  // Queued work for a different issue is legitimate serialization, and
  // maxConcurrentRuns may also permit deliberate parallelism. Only two live
  // runs for the same agent and issue are true duplicate-owner executions.
  const ownerKey = `${run.agentId}:${run.issueId ?? "__orphan__"}`;
  const runs = liveRunsByOwnerKey.get(ownerKey) ?? [];
  runs.push(run);
  liveRunsByOwnerKey.set(ownerKey, runs);
}

for (const agentRuns of liveRunsByOwnerKey.values()) {
  if (agentRuns.length <= 1) continue;
  const agentId = agentRuns[0]?.agentId ?? null;
  const sortedRuns = [...agentRuns].sort((left, right) => {
    const leftRank = runSortRank(left, issueById);
    const rightRank = runSortRank(right, issueById);
    if (leftRank !== rightRank) return leftRank - rightRank;
    const leftStarted = timestampMs(left.startedAt ?? left.createdAt) ?? Number.POSITIVE_INFINITY;
    const rightStarted = timestampMs(right.startedAt ?? right.createdAt) ?? Number.POSITIVE_INFINITY;
    return leftStarted - rightStarted || String(left.id).localeCompare(String(right.id));
  });
  const keptRun = sortedRuns[0];
  for (const duplicateRun of sortedRuns.slice(1)) {
    const issue = issueById.get(duplicateRun.issueId);
    if (!issue) {
      actions.push({
        kind: "cancel_duplicate_owner_orphan_run",
        runId: duplicateRun.id,
        keptRunId: keptRun.id,
        agentId,
        issueId: duplicateRun.issueId ?? null,
        identifier: null,
        title: null,
        issueStatus: null,
        lastOutputAt: duplicateRun.lastOutputAt ?? null,
      });
      continue;
    }
    if (terminalStatuses.has(issue.status)) continue;
    actions.push({
      kind: "cancel_duplicate_owner_run",
      runId: duplicateRun.id,
      keptRunId: keptRun.id,
      agentId,
      issueId: issue.id,
      identifier: issue.identifier,
      title: issue.title,
      issueStatus: issue.status,
      lastOutputAt: duplicateRun.lastOutputAt ?? null,
    });
  }
}

for (const run of liveRuns) {
  if (actions.some((action) => action.runId === run.id)) continue;
  const issue = issueById.get(run.issueId);
  if (!issue) continue;
  const comments = commentsByRunId.get(run.id) ?? [];

  if (isNonBlockingTerminalSoftwarehouseRoutineTail(issue)) {
    actions.push({
      kind: "cancel_nonblocking_terminal_routine_tail",
      runId: run.id,
      issueId: issue.id,
      identifier: issue.identifier,
      title: issue.title,
      issueStatus: issue.status,
      lastOutputAt: run.lastOutputAt ?? null,
    });
    continue;
  }

  if (isClosedIssueTail(issue, run)) {
    const runStartedAt = timestampMs(run.startedAt ?? run.createdAt);
    if (hasRecentClosedTailCancelMarker(comments, issue.identifier, Date.now(), runStartedAt)) {
      continue;
    }
    actions.push({
      kind: "cancel_closed_issue_tail",
      runId: run.id,
      issueId: issue.id,
      identifier: issue.identifier,
      title: issue.title,
      issueStatus: issue.status,
      writeComment: !isTerminalSoftwarehouseTail(issue),
      lastOutputAt: run.lastOutputAt ?? null,
    });
    continue;
  }

  if (isBlockedIssueTail(issue, run)) {
    actions.push({
      kind: "cancel_blocked_issue_tail",
      runId: run.id,
      issueId: issue.id,
      identifier: issue.identifier,
      title: issue.title,
      issueStatus: issue.status,
      lastOutputAt: run.lastOutputAt ?? null,
    });
    continue;
  }

  const durableTerminalDisposition = latestDurableTerminalDisposition(issue, comments);
  if (
    isRunnableIssueWithLiveRun(issue)
    && durableTerminalDisposition
    && ageMs(run.lastOutputAt ?? run.startedAt ?? run.createdAt) >= minTailAgeMs
  ) {
    actions.push({
      kind: "restore_durable_terminal_tail",
      runId: run.id,
      issueId: issue.id,
      identifier: issue.identifier,
      title: issue.title,
      issueStatus: issue.status,
      targetStatus: durableTerminalDisposition.status,
      dispositionCommentId: durableTerminalDisposition.commentId,
      lastOutputAt: run.lastOutputAt ?? null,
    });
    continue;
  }

  if (isRunnableIssueWithLiveRun(issue) && durableTerminalDisposition) {
    continue;
  }

  if (run.status === "running" && isRunnableIssueWithLiveRun(issue)) {
    actions.push({
      kind: "sync_live_issue_in_progress",
      runId: run.id,
      issueId: issue.id,
      identifier: issue.identifier,
      title: issue.title,
      issueStatus: issue.status,
      assigneeAgentId: issue.assigneeAgentId ?? null,
      lastOutputAt: run.lastOutputAt ?? null,
    });
    continue;
  }

  if (isSilentGateHoldInProgressTail(issue, run, comments)) {
    actions.push({
      kind: "cancel_silent_gate_hold_in_progress_tail",
      runId: run.id,
      issueId: issue.id,
      identifier: issue.identifier,
      title: issue.title,
      issueStatus: issue.status,
      lastOutputAt: run.lastOutputAt ?? null,
    });
    continue;
  }

  if (isGovernorSelfSupervision(issue, run)) {
    actions.push({
      kind: "close_governor_self_supervision",
      runId: run.id,
      issueId: issue.id,
      identifier: issue.identifier,
      title: issue.title,
      issueStatus: issue.status,
      lastOutputAt: run.lastOutputAt ?? null,
    });
  }
}

if (liveRuns.length === 0 && fullIssueScanAvailable) {
  const noLiveInProgressIssues = issues.filter((issue) => issue.status === "in_progress" && !liveIssueIds.has(issue.id));
  const noLiveCommentsByIssueId = new Map();
  if (noLiveInProgressIssues.length > 0) {
    const commentRows = await withControlSql((sql) => sql`
      select id, issue_id as "issueId", body, created_at as "createdAt", updated_at as "updatedAt"
      from (
        select
          id,
          issue_id,
          body,
          created_at,
          updated_at,
          row_number() over (partition by issue_id order by created_at desc) as rn
        from issue_comments
        where company_id = ${company.id}
          and issue_id in ${sql(noLiveInProgressIssues.map((issue) => issue.id))}
          and deleted_at is null
      ) recent_comments
      where rn <= 8
    `);
    for (const row of commentRows) {
      const comments = noLiveCommentsByIssueId.get(row.issueId) ?? [];
      comments.push(row);
      noLiveCommentsByIssueId.set(row.issueId, comments);
    }
  }
  for (const issue of issues) {
    if (issue.status !== "in_progress") continue;
    if (liveIssueIds.has(issue.id)) continue;
    const comments = noLiveCommentsByIssueId.get(issue.id) ?? [];
    if (hasNoLiveDispositionSyncMarker(comments, issue.identifier)) continue;
    const disposition = latestFinalDisposition(comments);
    if (!disposition) continue;
    actions.push({
      kind: "sync_no_live_final_disposition",
      issueId: issue.id,
      identifier: issue.identifier,
      title: issue.title,
      issueStatus: issue.status,
      targetStatus: disposition.status,
      dispositionCommentId: disposition.commentId,
    });
  }
}

const applied = [];
const skipped = [];
if (apply) {
  async function patchIssueForJanitor(action, item, body) {
    try {
      return await request("PATCH", `/api/issues/${action.issueId}`, body);
    } catch (error) {
      if (isIssueAuthorizationBoundaryError(error)) {
        skipped.push({
          ...item,
          skipped: true,
          skippedReason: "issue_authorization_boundary",
          ownerAction: "An authorized board/user or issue-scoped janitor must apply this issue status/comment update.",
          error: error.message,
        });
        return null;
      }
      if (isRequestTimeoutError(error)) {
        skipped.push({
          ...item,
          skipped: true,
          skippedReason: "issue_status_patch_timeout",
          ownerAction: "Retry this issue status/comment update after the local Paperclip API is responsive; do not infer the issue was patched.",
          error: error.message,
        });
        return null;
      }
      throw error;
    }
  }

  const allActionsAreSafeBulk = actions.every((action) => safeBulkActionKinds.has(action.kind));
  if (actions.length > 2 && (!allActionsAreSafeBulk || actions.length > safeBulkActionLimit)) {
    const actionKinds = [...new Set(actions.map((action) => action.kind))].sort().join(", ");
    throw new Error(
      `Refusing to apply ${actions.length} janitor actions at once; inspect first. kinds=[${actionKinds}] limit=${safeBulkActionLimit}`,
    );
  }
  for (const action of actions) {
    const item = {
      ...action,
      runStatus: null,
      runFinishedAt: null,
    };

    if (
      action.kind === "cancel_closed_issue_tail" ||
      action.kind === "cancel_blocked_issue_tail" ||
      action.kind === "cancel_silent_gate_hold_in_progress_tail" ||
      action.kind === "cancel_duplicate_owner_run" ||
      action.kind === "cancel_duplicate_owner_orphan_run" ||
      action.kind === "restore_durable_terminal_tail" ||
      action.kind === "close_governor_self_supervision" ||
      action.kind === "cancel_nonblocking_terminal_routine_tail"
    ) {
      try {
        const cancelled = await request("POST", `/api/heartbeat-runs/${action.runId}/cancel`, {
          suppressAutomaticRecovery:
            action.kind === "cancel_duplicate_owner_run" ||
            action.kind === "cancel_duplicate_owner_orphan_run",
        });
        item.runStatus = cancelled?.status ?? null;
        item.runFinishedAt = cancelled?.finishedAt ?? null;
      } catch (error) {
        if (isBoardAccessRequiredError(error)) {
          const skippedItem = {
            ...item,
            skipped: true,
            skippedReason: "board_access_required",
            ownerAction: "A board user or board-credentialed janitor must cancel this heartbeat run.",
            error: error.message,
          };
          skipped.push(skippedItem);
          continue;
        }
        if (isRequestTimeoutError(error)) {
          const skippedItem = {
            ...item,
            skipped: true,
            skippedReason: "heartbeat_run_cancel_timeout",
            ownerAction: "Retry heartbeat-run cancellation after the local Paperclip API is responsive; do not infer the run was cancelled.",
            error: error.message,
          };
          skipped.push(skippedItem);
          continue;
        }
        throw error;
      }
    }

    if (action.kind === "close_governor_self_supervision") {
      const updated = await patchIssueForJanitor(action, item, {
        status: "done",
        comment: [
          "Live-run janitor closed a governor self-supervision loop.",
          "The governor must not keep itself in_progress merely to supervise itself.",
          "No product, deploy, production, secret, or project-code mutation was performed.",
        ].join("\n"),
      });
      if (!updated) continue;
      item.issueStatus = updated.status;
    }

    if (action.kind === "sync_no_live_final_disposition") {
      const updated = await patchIssueForJanitor(action, item, {
        status: action.targetStatus,
        comment: [
          noLiveDispositionSyncMarker(action.identifier),
          "",
          `Live-run janitor synced issue status to ${action.targetStatus} because no live run remains and the issue thread has an explicit final disposition.`,
          "This is board metadata cleanup only; no product, deploy, production, secret, or project-code mutation was performed.",
        ].join("\n"),
      });
      if (!updated) continue;
      item.issueStatus = updated.status;
    }

    if (action.kind === "cancel_closed_issue_tail" && action.writeComment !== false) {
      const updated = await patchIssueForJanitor(action, item, {
        status: action.issueStatus,
        comment: [
          closedTailCancelMarker(action.identifier),
          "",
          "Live-run janitor cancelled a closed-issue tail for this issue.",
          "Idempotency guard: skip repeated closed-tail cancellation for a short cooldown window.",
          "No product, deploy, production, secret, or project-code mutation was performed.",
        ].join("\n"),
      });
      if (!updated) continue;
      item.issueStatus = updated.status;
    }

    if (action.kind === "cancel_closed_issue_tail" && action.writeComment === false) {
      const updated = await patchIssueForJanitor(action, item, {
        status: action.issueStatus,
      });
      if (!updated) continue;
      item.issueStatus = updated.status;
    }

    if (action.kind === "restore_durable_terminal_tail") {
      const updated = await patchIssueForJanitor(action, item, {
        status: action.targetStatus,
      });
      if (!updated) continue;
      item.issueStatus = updated.status;
    }

    if (action.kind === "sync_live_issue_in_progress") {
      if (!action.assigneeAgentId) {
        item.issueStatusSyncSkipped = "missing_assignee";
        item.issueStatusSyncReason = "Cannot mark a live issue in_progress until it has an assignee.";
      } else {
        try {
          const updated = await request("PATCH", `/api/issues/${action.issueId}`, {
            status: "in_progress",
            comment: [
              "Live-run janitor synced issue status to in_progress because a live run is still active.",
              "This is bookkeeping only so runnable counts do not treat active work as idle backlog.",
              "No product, deploy, production, secret, or project-code mutation was performed.",
            ].join("\n"),
          });
          item.issueStatus = updated.status;
        } catch (error) {
          if (isIssueAuthorizationBoundaryError(error)) {
            skipped.push({
              ...item,
              skipped: true,
              skippedReason: "issue_authorization_boundary",
              ownerAction: "An authorized board/user or issue-scoped janitor must apply this issue status/comment update.",
              error: error.message,
            });
            continue;
          } else if (isUnresolvedBlockerError(error)) {
            item.issueStatusSyncSkipped = "unresolved_blockers";
            item.issueStatusSyncError = error.message;
          } else if (isMissingAssigneeInProgressError(error)) {
            item.issueStatusSyncSkipped = "missing_assignee";
            item.issueStatusSyncError = error.message;
          } else if (isRequestTimeoutError(error)) {
            skipped.push({
              ...item,
              skipped: true,
              skippedReason: "issue_status_sync_timeout",
              ownerAction: "Retry this bookkeeping sync after the local Paperclip API is responsive; do not start duplicate work from this uncertain mutation.",
              error: error.message,
            });
            continue;
          } else {
            throw error;
          }
        }
      }
    }

    if (action.kind === "cancel_silent_gate_hold_in_progress_tail") {
      const updated = await patchIssueForJanitor(action, item, {
        status: "blocked",
        comment: [
          "Live-run janitor cancelled a silent gate-hold in-progress tail.",
          "This gate-root issue already had a blocked disposition and no new run output after the retry started.",
          "Keeping the issue blocked until a fresh accepted operator/credential fact exists.",
          "No product, deploy, production, secret, or project-code mutation was performed.",
        ].join("\n"),
      });
      if (!updated) continue;
      item.issueStatus = updated.status;
    }

    if (action.kind === "cancel_duplicate_owner_run") {
      item.issueStatus = action.issueStatus ?? null;
      item.issueStatusSyncSkipped = "preserved_active_owner_status";
      item.issueStatusSyncReason =
        "Cancelled only the duplicate run; preserved issue status because the kept owner run remains active.";
    }

    applied.push(item);
  }
}

console.log(JSON.stringify({
  apiBase,
  company: { id: company.id, name: company.name },
  mode: apply ? "apply" : "dry-run",
  readMode: effectiveReadMode,
  readWarning: effectiveReadWarning,
  fullIssueScanAvailable,
  minTailAgeMs,
  gateHoldMinTailAgeMs,
  safeBulkActionLimit,
  liveRunCount: liveRuns.length,
  actionCount: actions.length,
  actions,
  applied,
  skipped,
}, null, 2));
