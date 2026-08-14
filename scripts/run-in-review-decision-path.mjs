import {
  approvalRows,
  commentRows,
  hasRepeatedRoutineCommentWithoutNewEvidence,
  interactionRows,
  routineCommentMarkers,
} from "./lib/softwarehouse-routine-gates.mjs";
import {
  activeExecutionQuotaHoldIssueIds,
  buildInReviewDecisionInteraction,
  classifyInReviewDecisionAuthority,
  classifyInteractionDecisionAuthority,
  findPendingStructuredDecisionInteraction,
  hasStructuredInReviewDecisionPath,
  isMisroutedTechnicalInteraction,
  nextInReviewDecisionInteractionRevision,
  resolutionActionForTechnicalInteraction,
  reserveTechnicalReviewRecovery,
  technicalReviewRecoveryPriority,
} from "./lib/in-review-decision-path.mjs";
import { isRequestTimeoutError, requestJson } from "./lib/timed-json-request.mjs";

const apiBase = process.env.PAPERCLIP_API_URL ?? "http://127.0.0.1:3200";
const companyName = process.env.SOFTWAREHOUSE_COMPANY_NAME ?? "LuckySparrow";
const companyId = process.env.PAPERCLIP_COMPANY_ID ?? null;
const apply = process.argv.includes("--apply");
const requestTimeoutMs = Number(process.env.SOFTWAREHOUSE_IN_REVIEW_DECISION_PATH_REQUEST_TIMEOUT_MS ?? 30_000);
const terminalStatuses = new Set(["done", "cancelled"]);
const companyNameAliases = [companyName, "LuckySparrow Software House", "LuckySparrow"];

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
let supervisionSnapshot;
try {
  [issues, liveRuns, supervisionSnapshot] = await Promise.all([
    request("GET", `/api/companies/${company.id}/issues?limit=2000`),
    request("GET", `/api/companies/${company.id}/live-runs`),
    request("GET", `/api/companies/${company.id}/supervision/snapshot`),
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
      ownerAction: "Restore local Paperclip API issue-list responsiveness, then rerun node scripts/run-in-review-decision-path.mjs --apply or node scripts/run-softwarehouse-control-tick.mjs.",
    }],
    suppressed: [],
    applied: [],
  }, null, 2));
  process.exit(0);
}

const liveIssueIds = new Set(liveRuns.map((run) => run.issueId).filter(Boolean));
const quotaHeldIssueIds = activeExecutionQuotaHoldIssueIds(supervisionSnapshot?.findings);
const candidates = [];
const suppressed = [];
const technicalRecoveryState = { count: 0, projectKeys: new Set() };

const prioritizedIssues = [...issues].sort((left, right) =>
  technicalReviewRecoveryPriority(left) - technicalReviewRecoveryPriority(right)
  || Date.parse(right.updatedAt ?? 0) - Date.parse(left.updatedAt ?? 0)
  || String(left.identifier ?? "").localeCompare(String(right.identifier ?? ""), undefined, { numeric: true })
);

for (const issue of prioritizedIssues) {
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
  const pendingInteraction = findPendingStructuredDecisionInteraction(interactions);
  const decisionAuthority = pendingInteraction
    ? classifyInteractionDecisionAuthority(issue, pendingInteraction)
    : classifyInReviewDecisionAuthority(issue);
  if (decisionAuthority === "technical_reviewer" && quotaHeldIssueIds.has(issue.id)) {
    suppressed.push({
      action: "suppressed_active_issue_execution_quota_hold",
      identifier: issue.identifier,
      issueId: issue.id,
      title: issue.title,
    });
    continue;
  }
  if (!liveIssueIds.has(issue.id) && isMisroutedTechnicalInteraction(issue, pendingInteraction)) {
    if (!reserveTechnicalReviewRecovery(issue, technicalRecoveryState)) {
      suppressed.push({
        action: "suppressed_bounded_technical_recovery",
        identifier: issue.identifier,
        issueId: issue.id,
        title: issue.title,
        projectId: issue.projectId ?? null,
      });
      continue;
    }
    candidates.push({
      action: apply ? "cancel_misrouted_technical_interaction" : "would_cancel_misrouted_technical_interaction",
      identifier: issue.identifier,
      issueId: issue.id,
      title: issue.title,
      decisionAuthority,
      interactionId: pendingInteraction.id,
      interactionKind: pendingInteraction.kind,
      nextStatus: "todo",
    });
    continue;
  }
  if (hasStructuredInReviewDecisionPath(issue, { liveIssueIds, interactions, approvals })) {
    if (approvals.some((approval) => approval.status === "pending")) {
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
    if (pendingInteraction) {
      suppressed.push({
        action: "suppressed_pending_review_interaction",
        identifier: issue.identifier,
        issueId: issue.id,
        title: issue.title,
        interactionId: pendingInteraction.id ?? null,
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
  if (decisionAuthority === "technical_reviewer") {
    if (!reserveTechnicalReviewRecovery(issue, technicalRecoveryState)) {
      suppressed.push({
        action: "suppressed_bounded_technical_recovery",
        identifier: issue.identifier,
        issueId: issue.id,
        title: issue.title,
        projectId: issue.projectId ?? null,
      });
      continue;
    }
    candidates.push({
      action: apply ? "return_technical_review_to_todo" : "would_return_technical_review_to_todo",
      identifier: issue.identifier,
      issueId: issue.id,
      title: issue.title,
      decisionAuthority,
      nextStatus: "todo",
    });
    continue;
  }
  const interaction = buildInReviewDecisionInteraction(issue, {
    revisionNumber: nextInReviewDecisionInteractionRevision(issue, interactions),
  });
  candidates.push({
    action: apply ? "create_request_confirmation_interaction" : "would_create_request_confirmation_interaction",
    identifier: issue.identifier,
    issueId: issue.id,
    title: issue.title,
    assigneeAgentId: issue.assigneeAgentId ?? null,
    assigneeUserId: issue.assigneeUserId ?? null,
    interactionKind: interaction.kind,
    interactionIdempotencyKey: interaction.idempotencyKey,
    allowedDecisionOptions: ["approve", "continue_review", "reject", "block_or_delegate"],
    interactionRequest: interaction,
  });
}

const applied = [];
if (apply) {
  for (const candidate of candidates) {
    try {
      if (["cancel_misrouted_technical_interaction", "return_technical_review_to_todo"].includes(candidate.action)) {
        if (candidate.interactionId) {
          const resolutionAction = resolutionActionForTechnicalInteraction(candidate.interactionKind);
          await request("POST", `/api/issues/${candidate.issueId}/interactions/${candidate.interactionId}/${resolutionAction}`, {
            reason: "Technical, reversible review was misrouted to the board. Return it to the autonomous specialist/reviewer lane; owner gates remain fail-closed.",
          });
        }
        const updated = await request("PATCH", `/api/issues/${candidate.issueId}`, { status: candidate.nextStatus });
        applied.push({
          ...candidate,
          resultingStatus: updated?.status ?? candidate.nextStatus,
        });
        continue;
      }
      const created = await request("POST", `/api/issues/${candidate.issueId}/interactions`, candidate.interactionRequest);
      applied.push({
        ...candidate,
        interactionId: created?.id ?? null,
        interactionStatus: created?.status ?? null,
      });
    } catch (error) {
      suppressed.push({
        action: "suppressed_interaction_write_failed",
        identifier: candidate.identifier,
        issueId: candidate.issueId,
        title: candidate.title,
        reason: isRequestTimeoutError(error) ? "interaction_timeout" : "interaction_write_failed",
        error: error instanceof Error ? error.message : String(error),
        statusCode: error?.status ?? null,
        route: error?.route ?? `/api/issues/${candidate.issueId}/interactions`,
      });
    }
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
