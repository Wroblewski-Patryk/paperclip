export const routineCommentMarkers = {
  inReviewDecisionPath: "softwarehouse-in-review-decision-path:v1",
  runDispositionEnforcer: "softwarehouse-run-disposition-enforcer:v1",
};

function rows(result) {
  return result?.value ?? result ?? [];
}

export function interactionRows(result) {
  return rows(result);
}

export function commentRows(result) {
  return rows(result);
}

export function approvalRows(result) {
  return rows(result);
}

export function hasPendingIssueApproval(approvals) {
  return approvalRows(approvals).some((approval) => approval.status === "pending");
}

export function hasPendingRequestConfirmation(interactions) {
  return interactionRows(interactions).some((interaction) =>
    interaction.kind === "request_confirmation"
    && interaction.status === "pending"
  );
}

export function hasPendingReviewInteraction(interactions) {
  return interactionRows(interactions).some((interaction) =>
    ["request_confirmation", "request_checkbox_confirmation", "ask_user_questions", "suggest_tasks"].includes(interaction.kind)
    && interaction.status === "pending"
  );
}

function commentTime(comment) {
  const time = Date.parse(comment.createdAt ?? comment.updatedAt ?? "");
  return Number.isFinite(time) ? time : 0;
}

function containsAnyMarker(comment, markers) {
  const body = String(comment?.body ?? "");
  return markers.some((marker) => body.includes(marker));
}

export function hasRepeatedRoutineCommentWithoutNewEvidence(comments, marker, {
  allRoutineMarkers = Object.values(routineCommentMarkers),
} = {}) {
  const sorted = commentRows(comments)
    .slice()
    .sort((a, b) => commentTime(b) - commentTime(a));
  const latestMarkerIndex = sorted.findIndex((comment) =>
    String(comment?.body ?? "").includes(marker)
  );
  if (latestMarkerIndex < 0) return false;

  const newerComments = sorted.slice(0, latestMarkerIndex);
  return !newerComments.some((comment) => !containsAnyMarker(comment, allRoutineMarkers));
}
