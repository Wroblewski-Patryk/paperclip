import {
  hasPendingIssueApproval,
  hasPendingReviewInteraction,
  reviewInteractionKinds,
} from "./softwarehouse-routine-gates.mjs";

export { reviewInteractionKinds };

function issueHref(issue) {
  if (!issue?.identifier) return null;
  return `/LUC/issues/${issue.identifier}`;
}

export function hasStructuredInReviewDecisionPath(issue, {
  liveIssueIds = new Set(),
  interactions = [],
  approvals = [],
} = {}) {
  if (liveIssueIds.has(issue.id)) return true;
  if (hasPendingIssueApproval(approvals)) return true;
  if (hasPendingReviewInteraction(interactions)) return true;

  const policy = issue.executionPolicy ?? issue.executionState ?? {};
  if (policy.currentParticipant || policy.currentReviewer || policy.pendingInteractionId) return true;
  if (issue.reviewerUserId || issue.currentParticipantId) return true;

  return false;
}

export function findPendingStructuredDecisionInteraction(interactions) {
  return interactions.find((interaction) =>
    reviewInteractionKinds.includes(interaction.kind)
    && interaction.status === "pending"
  ) ?? null;
}

export function buildInReviewDecisionInteraction(issue) {
  const identifier = issue.identifier ?? issue.id;
  const decisionOwner = issue.assigneeUserId
    ? `board user \`${issue.assigneeUserId}\``
    : issue.reviewerUserId
      ? `reviewer \`${issue.reviewerUserId}\``
      : "board reviewer";
  const nextOwner = issue.assigneeAgentId
    ? `agent \`${issue.assigneeAgentId}\``
    : "the current execution owner";
  const title = `${identifier}: board wait decision path`;
  const summary = `Choose the next board-owned outcome for ${identifier}: approve and close, continue review, reject for changes, or block/delegate with an explicit owner path.`;
  const detailsMarkdown = [
    "This issue is `in_review` and waiting on a board/user-owned decision.",
    "",
    `Decision owner: ${decisionOwner}.`,
    "Allowed decision options:",
    "- approve: move the issue to `done` with typed completion evidence;",
    "- continue review: keep the issue `in_review` with the next reviewer/decision owner and next-check expectation;",
    "- reject: return the issue to `todo` or `backlog` with the required changes;",
    "- block or delegate: move the issue to `blocked` with an unblock owner/action, or create/link the child issue that owns the next step.",
    "",
    `Evidence target: ${identifier}${issueHref(issue) ? ` (${issueHref(issue)})` : ""}. Reference the issue comments, documents, approvals, interactions, or work products that justify the decision.`,
    "Next-check expectation: resolve this interaction or replace it with a newer typed path before the next routine pass.",
    `Next owner after decision: ${nextOwner}.`,
    "",
    "Prose-only review comments are not a sufficient autonomous wait path.",
  ].join("\n");

  return {
    kind: "request_confirmation",
    idempotencyKey: `softwarehouse-in-review-decision-path:${issue.id}:v1`,
    title,
    summary,
    continuationPolicy: "wake_assignee",
    payload: {
      version: 1,
      prompt: `Record the typed next outcome for ${identifier}.`,
      acceptLabel: "Approve / Continue",
      rejectLabel: "Reject / Block",
      rejectRequiresReason: true,
      rejectReasonLabel: "What changes, blocker, or delegated next owner is required?",
      detailsMarkdown,
      supersedeOnUserComment: true,
      target: {
        type: "custom",
        key: `softwarehouse-in-review-decision-path:${issue.id}`,
        revisionId: "v1",
        revisionNumber: 1,
        label: title,
        href: issueHref(issue),
      },
    },
  };
}
