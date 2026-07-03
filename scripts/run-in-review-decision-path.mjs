import {
  approvalRows,
  commentRows,
  hasPendingIssueApproval,
  hasPendingReviewInteraction,
  hasRepeatedRoutineCommentWithoutNewEvidence,
  interactionRows,
  routineCommentMarkers,
} from "./lib/softwarehouse-routine-gates.mjs";

const apiBase = process.env.PAPERCLIP_API_URL ?? "http://127.0.0.1:3200";
const companyName = process.env.SOFTWAREHOUSE_COMPANY_NAME ?? "LuckySparrow";
const companyId = process.env.PAPERCLIP_COMPANY_ID ?? null;
const apply = process.argv.includes("--apply");
const requestTimeoutMs = Number(process.env.SOFTWAREHOUSE_IN_REVIEW_DECISION_PATH_REQUEST_TIMEOUT_MS ?? 30_000);
const terminalStatuses = new Set(["done", "cancelled"]);
const companyNameAliases = [companyName, "LuckySparrow Software House", "LuckySparrow"];

async function request(method, route, body) {
  const signal = AbortSignal.timeout(requestTimeoutMs);
  const response = await fetch(`${apiBase}${route}`, {
    method,
    headers: { "content-type": "application/json" },
    signal,
    body: body === undefined ? undefined : JSON.stringify(body),
  });
  const text = await response.text();
  const data = text ? JSON.parse(text) : null;
  if (!response.ok) throw new Error(`${method} ${route} failed with ${response.status}: ${text}`);
  return data;
}

function isRequestTimeoutError(error) {
  return error instanceof Error && error.name === "TimeoutError";
}

function hasStructuredDecisionPath(issue, comments, liveIssueIds, interactions = [], approvals = []) {
  if (liveIssueIds.has(issue.id)) return true;
  if (hasPendingIssueApproval(approvals)) return true;
  if (hasPendingReviewInteraction(interactions)) return true;
  const policy = issue.executionPolicy ?? issue.executionState ?? {};
  if (policy.currentParticipant || policy.currentReviewer || policy.pendingInteractionId) return true;
  if (issue.assigneeUserId || issue.reviewerUserId || issue.currentParticipantId) return true;
  const text = comments.map((comment) => comment.body ?? "").join("\n\n").toLowerCase();
  return [
    /reviewer\s*:/,
    /decision owner\s*:/,
    /review owner\s*:/,
    /pending (approval|confirmation|decision)/,
    /accept\s*\/\s*reject\s*\/\s*block/,
    /final disposition/,
    /blocked with/,
    /delegated to/,
  ].some((pattern) => pattern.test(text));
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

let issues;
let liveRuns;
try {
  [issues, liveRuns] = await Promise.all([
    request("GET", `/api/companies/${company.id}/issues?limit=2000`),
    request("GET", `/api/companies/${company.id}/live-runs`),
  ]);
} catch (error) {
  if (!isRequestTimeoutError(error)) throw error;
  console.log(JSON.stringify({
    apiBase,
    company: { id: company.id, name: company.name ?? companyName },
    mode: apply ? "apply" : "dry-run",
    requestTimeoutMs,
    candidateScanStatus: "timed_out",
    liveRunCount: null,
    actionCount: 1,
    actions: [{
      action: "skip_in_review_decision_path_candidate_scan_timeout",
      status: "degraded",
      ownerAction: "Restore local Paperclip API issue-list responsiveness, then rerun node scripts/run-in-review-decision-path.mjs --apply or pnpm softwarehouse:control-tick.",
    }],
    suppressed: [],
    applied: [],
  }, null, 2));
  process.exit(0);
}

const liveIssueIds = new Set(liveRuns.map((run) => run.issueId).filter(Boolean));
const candidates = [];
const suppressed = [];

for (const issue of issues) {
  if (terminalStatuses.has(issue.status) || issue.status !== "in_review") continue;
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
  if (hasStructuredDecisionPath(issue, comments, liveIssueIds, interactions, approvals)) {
    if (hasPendingIssueApproval(approvals)) {
      const pendingApproval = approvals.find((approval) => approval.status === "pending");
      suppressed.push({
        action: "suppressed_pending_issue_approval",
        identifier: issue.identifier,
        issueId: issue.id,
        title: issue.title,
        approvalId: pendingApproval?.id ?? null,
        approvalType: pendingApproval?.type ?? null,
      });
    }
    if (hasPendingReviewInteraction(interactions)) {
      const pendingInteraction = interactions.find((interaction) =>
        ["request_confirmation", "request_checkbox_confirmation", "ask_user_questions", "suggest_tasks"].includes(interaction.kind)
        && interaction.status === "pending"
      );
      suppressed.push({
        action: "suppressed_pending_review_interaction",
        identifier: issue.identifier,
        issueId: issue.id,
        title: issue.title,
        interactionKind: pendingInteraction?.kind ?? null,
      });
    }
    continue;
  }
  if (hasRepeatedRoutineCommentWithoutNewEvidence(comments, routineCommentMarkers.inReviewDecisionPath)) {
    suppressed.push({
      action: "suppressed_duplicate_routine_comment",
      marker: routineCommentMarkers.inReviewDecisionPath,
      identifier: issue.identifier,
      issueId: issue.id,
      title: issue.title,
    });
    continue;
  }
  candidates.push({
    action: apply ? "comment_in_review_decision_path_required" : "would_comment_in_review_decision_path_required",
    identifier: issue.identifier,
    issueId: issue.id,
    title: issue.title,
    assigneeAgentId: issue.assigneeAgentId ?? null,
  });
}

const applied = [];
if (apply) {
  for (const candidate of candidates) {
    await request("POST", `/api/issues/${candidate.issueId}/comments`, {
      body: [
        routineCommentMarkers.inReviewDecisionPath,
        "",
        "This issue is `in_review` without a structured decision path.",
        "Choose exactly one next outcome and update the issue graph accordingly:",
        "",
        "- accept: move to `done` with evidence links;",
        "- reject: return to `todo`/`backlog` with required changes;",
        "- block: move to `blocked` with missing input, owner, and unblock action;",
        "- delegate: create or link one child issue with owner, acceptance criteria, and proof contract;",
        "- continue review: name reviewer/decision owner, expected evidence, and deadline.",
        "",
        "Narrative review comments alone do not satisfy autonomous closure.",
      ].join("\n"),
    });
    applied.push(candidate);
  }
}

console.log(JSON.stringify({
  apiBase,
  company: { id: company.id, name: company.name },
  mode: apply ? "apply" : "dry-run",
  liveRunCount: liveRuns.length,
  actionCount: candidates.length,
  actions: candidates,
  suppressed,
  applied,
}, null, 2));
