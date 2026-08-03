import {
  planResolvedBlockerRepair,
  planStalledTodoWake,
} from "./lib/stale-blocker-repair.mjs";
import { softwarehousePilotActiveRoutineTitles } from "./lib/softwarehouse-active-routines.mjs";
import { isRequestTimeoutError, requestJson } from "./lib/timed-json-request.mjs";

const apiBase = process.env.PAPERCLIP_API_URL ?? "http://127.0.0.1:3200";
const companyId = process.env.PAPERCLIP_COMPANY_ID ?? null;
const companyNames = ["LuckySparrow", "LuckySparrow Software House"];
const apply = process.argv.includes("--apply");
const stalledTodoHours = Number(process.env.SOFTWAREHOUSE_STALLED_TODO_HOURS ?? 6);
const maxBlockerRepairs = Number(process.env.SOFTWAREHOUSE_QUEUE_MAX_BLOCKER_REPAIRS ?? 5);
const maxTodoWakes = Number(process.env.SOFTWAREHOUSE_QUEUE_MAX_TODO_WAKES ?? 1);
const requestTimeoutMs = Number(process.env.SOFTWAREHOUSE_QUEUE_RECONCILER_TIMEOUT_MS ?? 30_000);
const heartbeatAgentId = process.env.PAPERCLIP_AGENT_ID ?? null;

async function request(method, route, body) {
  return requestJson({
    apiBase,
    method,
    route,
    body,
    timeoutMs: requestTimeoutMs,
    authToken: process.env.PAPERCLIP_API_KEY,
    runId: process.env.PAPERCLIP_RUN_ID,
  });
}

function isIssueAuthorizationBoundaryError(error) {
  const message = error instanceof Error ? error.message : String(error ?? "");
  return /(?:PATCH|POST) \/api\/issues\/[^/\s]+(?:\/comments)? failed with 403:/i.test(message)
    && /(?:Issue is outside this actor(?:'|\\u0027)s authorization boundary|Agent cannot mutate another agent(?:'|\\u0027)?s issue)/i
      .test(message);
}

function isCrossAgentWakeupError(error) {
  const message = error instanceof Error ? error.message : String(error ?? "");
  return /POST \/api\/agents\/[^/\s]+\/wakeup failed with 403:/i.test(message)
    && /Agent can only invoke itself/i.test(message);
}

async function mapWithConcurrency(items, concurrency, mapper) {
  const results = new Array(items.length);
  let cursor = 0;
  const workers = Array.from({ length: Math.min(concurrency, items.length) }, async () => {
    while (cursor < items.length) {
      const index = cursor;
      cursor += 1;
      results[index] = await mapper(items[index], index);
    }
  });
  await Promise.all(workers);
  return results;
}

async function resolveCompany() {
  if (companyId) return { id: companyId, source: "PAPERCLIP_COMPANY_ID" };
  const companies = await request("GET", "/api/companies");
  const company = companies.find((candidate) => companyNames.includes(candidate.name));
  if (!company) throw new Error(`Company not found: ${companyNames.join(" / ")}`);
  return { id: company.id, source: "company_name" };
}

const company = await resolveCompany();
let issues = [];
let liveRuns = [];
let recentRuns = [];
let candidateScanStatus = "ok";
const candidateScanSkipped = [];
try {
  [issues, liveRuns, recentRuns] = await Promise.all([
    request("GET", `/api/companies/${company.id}/issues?status=todo,blocked&limit=2000`),
    request("GET", `/api/companies/${company.id}/live-runs?limit=200&minCount=0`),
    request("GET", `/api/companies/${company.id}/heartbeat-runs?limit=1000`),
  ]);
} catch (error) {
  candidateScanStatus = isRequestTimeoutError(error) ? "timed_out" : "api_error";
  candidateScanSkipped.push({
    kind: "issue_queue_reconciler",
    skippedReason: candidateScanStatus === "timed_out" ? "candidate_scan_timeout" : "candidate_scan_api_error",
    ownerAction: "Retry issue queue reconciliation after the local Paperclip issue-list/live-run/heartbeat-run routes are responsive.",
    error: error instanceof Error ? error.message : String(error),
  });
}

const liveIssueIds = new Set(liveRuns.map((run) => run.issueId).filter(Boolean));
const liveAgentIds = new Set(liveRuns.map((run) => run.agentId).filter(Boolean));
const runIssueIds = new Set(recentRuns.map((run) => run.contextSnapshot?.issueId).filter(Boolean));
const blockedIssues = issues
  .filter((issue) => issue.status === "blocked")
  // Reusable controller issues have a separate recovery contract. Removing or
  // reopening their blocker graph here would revive legacy routine copies.
  .filter((issue) => !softwarehousePilotActiveRoutineTitles.has(issue.title));
const todoIssues = issues.filter((issue) => issue.status === "todo");

const blockerPlans = (await mapWithConcurrency(blockedIssues, 8, async (issue) => {
  const detail = await request("GET", `/api/issues/${issue.id}`);
  return planResolvedBlockerRepair({ target: issue, detailedTarget: detail });
}))
  .filter(Boolean)
  .sort((left, right) => left.issueIdentifier.localeCompare(right.issueIdentifier));

const staleTodoCandidates = todoIssues
  .filter((issue) => issue.assigneeAgentId && !issue.assigneeUserId)
  .filter((issue) => issue.originKind !== "routine_execution")
  .filter((issue) => !liveIssueIds.has(issue.id) && !runIssueIds.has(issue.id));
const todoPlans = (await mapWithConcurrency(staleTodoCandidates, 8, async (issue) => {
  const comments = await request("GET", `/api/issues/${issue.id}/comments?order=desc&limit=1`);
  const latestComment = (comments?.value ?? comments ?? [])[0] ?? null;
  return planStalledTodoWake({
    issue,
    liveIssueIds,
    liveAgentIds,
    runIssueIds,
    latestCommentId: latestComment?.id ?? null,
    staleHours: stalledTodoHours,
  });
}))
  .filter(Boolean)
  .sort((left, right) => right.ageHours - left.ageHours);

const selectedBlockerPlans = blockerPlans.slice(0, Math.max(0, maxBlockerRepairs));
const selectedTodoPlans = todoPlans.slice(0, Math.max(0, maxTodoWakes));
const applied = [];
const skipped = [...candidateScanSkipped];

if (apply) {
  for (const plan of selectedBlockerPlans) {
    const linkedResolved = plan.resolvedBlockerIdentifiers
      .map((identifier) => `[${identifier}](/LUC/issues/${identifier})`)
      .join(", ");
    try {
      const updated = await request("PATCH", `/api/issues/${plan.issueId}`, {
        blockedByIssueIds: plan.blockedByIssueIds,
        status: plan.nextStatus,
        comment: [
          "## Queue reconciliation",
          "",
          `- Removed completed blocker relation(s): ${linkedResolved}.`,
          `- Resulting status: \`${plan.nextStatus}\`.`,
          plan.nextStatus === "todo"
            ? plan.resolutionIsNewerThanTarget
              ? "- The blocker resolved after the issue last changed, so the assigned owner can resume."
              : "- No unresolved first-class blocker remains. The assigned owner must resume and explicitly link any replacement blocker that is still real."
            : "- Other unresolved first-class blockers remain, so the blocked disposition was preserved.",
          "- Scope: board metadata only; no repository, production, secret, or deployment mutation.",
        ].join("\n"),
      });
      const appliedRepair = { kind: "resolved_blocker_repair", identifier: plan.issueIdentifier, status: updated.status };
      if (plan.nextStatus === "todo" && plan.assigneeAgentId) {
        try {
          const comments = await request("GET", `/api/issues/${plan.issueId}/comments?order=desc&limit=1`);
          const latestComment = (comments?.value ?? comments ?? [])[0] ?? null;
          const wake = await request("POST", `/api/agents/${plan.assigneeAgentId}/wakeup`, {
            source: "automation",
            triggerDetail: "system",
            reason: "resolved_blocker_reconciler",
            payload: {
              issueId: plan.issueId,
              taskId: plan.issueId,
              wakeReason: "resolved_blocker_reconciler",
              ...(latestComment?.id ? { commentId: latestComment.id } : {}),
            },
            idempotencyKey: `softwarehouse:resolved-blocker:${plan.issueId}:${plan.resolvedBlockerIdentifiers.slice().sort().join(",")}`,
            forceFreshSession: true,
          });
          appliedRepair.runId = wake?.id ?? null;
          appliedRepair.wakeStatus = wake?.status ?? "skipped";
        } catch (error) {
          if (!isCrossAgentWakeupError(error)) throw error;
          skipped.push({
            kind: "resolved_blocker_wake",
            identifier: plan.issueIdentifier,
            skippedReason: "issue_authorization_boundary",
            ownerAction: "An authorized board/user or the assigned agent must wake this resumed issue.",
          });
        }
      }
      applied.push(appliedRepair);
    } catch (error) {
      if (!isIssueAuthorizationBoundaryError(error)) throw error;
      skipped.push({
        kind: "resolved_blocker_repair",
        identifier: plan.issueIdentifier,
        skippedReason: "issue_authorization_boundary",
        ownerAction: "An authorized board/user or issue-scoped janitor must apply this blocked-issue repair.",
      });
    }
  }

  for (const plan of selectedTodoPlans) {
    if (heartbeatAgentId && plan.assigneeAgentId !== heartbeatAgentId) {
      skipped.push({
        kind: "stalled_todo_wake",
        identifier: plan.issueIdentifier,
        skippedReason: "issue_authorization_boundary",
        ownerAction: "An authorized board/user or the assigned agent must wake this stalled todo.",
      });
      continue;
    }
    try {
      const wake = await request("POST", `/api/agents/${plan.assigneeAgentId}/wakeup`, {
        source: "automation",
        triggerDetail: "system",
        reason: "stalled_todo_reconciler",
        payload: {
          issueId: plan.issueId,
          taskId: plan.issueId,
          wakeReason: "stalled_todo_reconciler",
          ...(plan.latestCommentId ? { commentId: plan.latestCommentId } : {}),
        },
        idempotencyKey: plan.idempotencyKey,
        forceFreshSession: true,
      });
      applied.push({
        kind: "stalled_todo_wake",
        identifier: plan.issueIdentifier,
        runId: wake?.id ?? null,
        wakeStatus: wake?.status ?? "skipped",
      });
    } catch (error) {
      if (!isCrossAgentWakeupError(error)) throw error;
      skipped.push({
        kind: "stalled_todo_wake",
        identifier: plan.issueIdentifier,
        skippedReason: "issue_authorization_boundary",
        ownerAction: "An authorized board/user or the assigned agent must wake this stalled todo.",
      });
    }
  }
}

console.log(JSON.stringify({
  generatedAt: new Date().toISOString(),
  apiBase,
  company,
  mode: apply ? "apply" : "dry-run",
  thresholds: { stalledTodoHours, maxBlockerRepairs, maxTodoWakes },
  requestTimeoutMs,
  candidateScanStatus,
  liveRunCount: liveRuns.length,
  blockerRepairCount: blockerPlans.length,
  blockerRepairs: blockerPlans,
  deferredBlockerRepairCount: Math.max(0, blockerPlans.length - selectedBlockerPlans.length),
  stalledTodoWakeCount: todoPlans.length,
  stalledTodoWakes: todoPlans,
  deferredTodoWakeCount: Math.max(0, todoPlans.length - selectedTodoPlans.length),
  applied,
  skipped,
  skippedCount: skipped.length,
}, null, 2));
