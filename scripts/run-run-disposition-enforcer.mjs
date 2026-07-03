import {
  approvalRows,
  commentRows,
  hasPendingIssueApproval,
  hasPendingReviewInteraction,
  hasRepeatedRoutineCommentWithoutNewEvidence,
  interactionRows,
  routineCommentMarkers,
} from "./lib/softwarehouse-routine-gates.mjs";
import { isRequestTimeoutError, requestJson } from "./lib/timed-json-request.mjs";

const apiBase = process.env.PAPERCLIP_API_URL ?? "http://127.0.0.1:3200";
const companyNames = ["LuckySparrow", "LuckySparrow Software House"];
const companyId = process.env.PAPERCLIP_COMPANY_ID ?? null;
const apply = process.argv.includes("--apply");
const requestTimeoutMs = Number(process.env.SOFTWAREHOUSE_RUN_DISPOSITION_REQUEST_TIMEOUT_MS ?? 30_000);
const candidateConcurrency = Number(process.env.SOFTWAREHOUSE_RUN_DISPOSITION_CONCURRENCY ?? 8);
const staleStatuses = new Set(["in_progress", "in_review"]);
const staleStatusList = [...staleStatuses];

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

function hasDurableDisposition(issue, comments, interactions = []) {
  if (["done", "cancelled", "blocked", "todo", "backlog"].includes(issue.status)) return true;
  if (hasPendingReviewInteraction(interactions)) return true;
  const text = comments.map((comment) => comment.body ?? "").join("\n\n").toLowerCase();
  return [
    /final disposition/,
    /durable disposition/,
    /blocked with.+unblock/,
    /delegated.+(child|issue|owner)/,
    /reviewer\s*:/,
    /decision owner\s*:/,
    /resume.+because/,
  ].some((pattern) => pattern.test(text));
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
let candidateScanStatus = "ok";
let candidateScanSkipped = [];
try {
  [issues, liveRuns] = await Promise.all([
    request("GET", `/api/companies/${company.id}/issues?status=${staleStatusList.join(",")}&limit=2000`),
    request("GET", `/api/companies/${company.id}/live-runs`),
  ]);
} catch (error) {
  candidateScanStatus = isRequestTimeoutError(error) ? "timed_out" : "api_error";
  candidateScanSkipped = [
    {
      action: "skip_run_disposition_enforcer",
      reason: candidateScanStatus === "timed_out" ? "candidate_scan_timeout" : "candidate_scan_api_error",
      ownerAction: "Retry run-disposition enforcer after the local Paperclip issue-list/live-run routes are responsive.",
      error: error instanceof Error ? error.message : String(error),
    },
  ];
}

const liveIssueIds = new Set(liveRuns.map((run) => run.issueId).filter(Boolean));
const actions = [];
const suppressed = [...candidateScanSkipped];
const candidateIssues = issues.filter((issue) => staleStatuses.has(issue.status) && !liveIssueIds.has(issue.id));

const evaluations = await mapWithConcurrency(candidateIssues, candidateConcurrency, async (issue) => {
  const [comments, interactions, approvals] = await Promise.all([
    request("GET", `/api/issues/${issue.id}/comments?order=desc&limit=24`)
    .then(commentRows)
      .catch(() => []),
    request("GET", `/api/issues/${issue.id}/interactions`)
      .then(interactionRows)
      .catch(() => []),
    request("GET", `/api/issues/${issue.id}/approvals`)
      .then(approvalRows)
      .catch(() => []),
  ]);
  if (hasPendingIssueApproval(approvals)) {
    const pendingApproval = approvals.find((approval) => approval.status === "pending");
    return {
      type: "suppressed",
      item: {
        action: "suppressed_pending_issue_approval",
        identifier: issue.identifier,
        issueId: issue.id,
        status: issue.status,
        title: issue.title,
        approvalId: pendingApproval?.id ?? null,
        approvalType: pendingApproval?.type ?? null,
      },
    };
  }
  if (hasDurableDisposition(issue, comments, interactions)) {
    if (hasPendingReviewInteraction(interactions)) {
      const pendingInteraction = interactions.find((interaction) =>
        ["request_confirmation", "request_checkbox_confirmation", "ask_user_questions", "suggest_tasks"].includes(interaction.kind)
        && interaction.status === "pending"
      );
      return {
        type: "suppressed",
        item: {
        action: "suppressed_pending_review_interaction",
        identifier: issue.identifier,
        issueId: issue.id,
        status: issue.status,
        title: issue.title,
        interactionKind: pendingInteraction?.kind ?? null,
        },
      };
    }
    return null;
  }
  if (hasRepeatedRoutineCommentWithoutNewEvidence(comments, routineCommentMarkers.runDispositionEnforcer)) {
    return {
      type: "suppressed",
      item: {
      action: "suppressed_duplicate_routine_comment",
      marker: routineCommentMarkers.runDispositionEnforcer,
      identifier: issue.identifier,
      issueId: issue.id,
      status: issue.status,
      title: issue.title,
      },
    };
  }
  return {
    type: "action",
    item: {
    action: apply ? "comment_missing_run_disposition" : "would_comment_missing_run_disposition",
    identifier: issue.identifier,
    issueId: issue.id,
    status: issue.status,
    title: issue.title,
    recoveryKind: issue.activeRecoveryAction?.kind ?? null,
    },
  };
});

for (const evaluation of evaluations) {
  if (!evaluation) continue;
  if (evaluation.type === "suppressed") suppressed.push(evaluation.item);
  if (evaluation.type === "action") actions.push(evaluation.item);
}

const applied = [];
if (apply) {
  for (const action of actions) {
    try {
      await request("POST", `/api/issues/${action.issueId}/comments`, {
        body: [
          routineCommentMarkers.runDispositionEnforcer,
          "",
          `This issue is \`${action.status}\` without a live run or durable disposition.`,
          "Before any new broad work starts, record exactly one valid disposition:",
          "",
          "- `done` with evidence;",
          "- `blocked` with missing input, owner, and unblock action;",
          "- `delegated` with linked child issue;",
          "- `in_review` with reviewer/decision path;",
          "- `todo`/`backlog` if it should be restarted later.",
        ].join("\n"),
      });
      applied.push(action);
    } catch (error) {
      suppressed.push({
        action: "suppressed_comment_write_failed",
        identifier: action.identifier,
        issueId: action.issueId,
        status: action.status,
        title: action.title,
        reason: isRequestTimeoutError(error) ? "comment_timeout" : "comment_write_failed",
        error: error instanceof Error ? error.message : String(error),
      });
    }
  }
}

console.log(JSON.stringify({
  apiBase,
  company: { id: company.id, name: company.name },
  mode: apply ? "apply" : "dry-run",
  candidateScanStatus,
  liveRunCount: liveRuns.length,
  staleIssueCount: issues.length,
  candidateIssueCount: candidateIssues.length,
  requestTimeoutMs,
  candidateConcurrency,
  actionCount: actions.length,
  actions,
  suppressed,
  applied,
}, null, 2));
