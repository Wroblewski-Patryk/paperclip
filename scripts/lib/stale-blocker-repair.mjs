const blockedTriageTargetPattern = /^\[Softwarehouse\]\[Blocked Triage\] Classify ([^\s]+) and produce next legal action$/;

export function blockedTriageTargetIdentifier(issue) {
  return String(issue?.title ?? "").match(blockedTriageTargetPattern)?.[1] ?? null;
}

export function freshCompletedBlockedTriage(target, triageIssues) {
  const targetIdentifier = target?.identifier ?? target?.id;
  const targetUpdatedAt = Date.parse(target?.updatedAt ?? "");
  if (!targetIdentifier || !Number.isFinite(targetUpdatedAt)) return null;

  return triageIssues
    .filter((issue) => issue.status === "done")
    .filter((issue) => blockedTriageTargetIdentifier(issue) === targetIdentifier)
    .filter((issue) => {
      const updatedAt = Date.parse(issue.updatedAt ?? "");
      return Number.isFinite(updatedAt) && updatedAt >= targetUpdatedAt;
    })
    .sort((left, right) => String(right.updatedAt ?? "").localeCompare(String(left.updatedAt ?? "")))[0] ?? null;
}

export function planStaleCancelledBlockerRepair({ target, detailedTarget, triageIssues }) {
  if (target?.status !== "blocked") return null;

  const triage = freshCompletedBlockedTriage(target, triageIssues);
  if (!triage) return null;

  const blockers = Array.isArray(detailedTarget?.blockedBy) ? detailedTarget.blockedBy : [];
  const cancelledBlockers = blockers.filter((blocker) => blocker.status === "cancelled");
  if (cancelledBlockers.length === 0) return null;

  const retainedBlockers = blockers.filter((blocker) => blocker.status !== "cancelled");
  const unresolvedRetainedBlockers = retainedBlockers.filter((blocker) => blocker.status !== "done");

  return {
    issueId: target.id,
    issueIdentifier: target.identifier ?? target.id,
    triageIdentifier: triage.identifier ?? triage.id,
    staleBlockerIdentifiers: cancelledBlockers.map((blocker) => blocker.identifier ?? blocker.id),
    blockedByIssueIds: retainedBlockers.map((blocker) => blocker.id).filter(Boolean),
    nextStatus: unresolvedRetainedBlockers.length > 0 ? "blocked" : "todo",
  };
}

const doneStatus = "done";

function timestampMs(value) {
  const parsed = Date.parse(value ?? "");
  return Number.isFinite(parsed) ? parsed : null;
}

export function planResolvedBlockerRepair({ target, detailedTarget }) {
  if (target?.status !== "blocked") return null;

  const blockers = Array.isArray(detailedTarget?.blockedBy) ? detailedTarget.blockedBy : [];
  const resolvedBlockers = blockers.filter((blocker) => blocker.status === doneStatus);
  if (resolvedBlockers.length === 0) return null;

  // Cancelled blockers intentionally remain unresolved. Only `done` satisfies a
  // dependency, so every other relation must be preserved.
  const retainedBlockers = blockers.filter((blocker) => blocker.status !== doneStatus);
  const targetUpdatedAtMs = timestampMs(target.updatedAt);
  const latestResolvedAtMs = Math.max(
    ...resolvedBlockers
      .map((blocker) => timestampMs(blocker.completedAt ?? blocker.updatedAt))
      .filter((value) => value !== null),
    Number.NEGATIVE_INFINITY,
  );
  const resolutionIsNewerThanTarget = targetUpdatedAtMs !== null
    && Number.isFinite(latestResolvedAtMs)
    && latestResolvedAtMs >= targetUpdatedAtMs;

  return {
    issueId: target.id,
    issueIdentifier: target.identifier ?? target.id,
    resolvedBlockerIdentifiers: resolvedBlockers.map((blocker) => blocker.identifier ?? blocker.id),
    blockedByIssueIds: retainedBlockers.map((blocker) => blocker.id).filter(Boolean),
    nextStatus: retainedBlockers.length === 0 && resolutionIsNewerThanTarget ? "todo" : "blocked",
    resolutionIsNewerThanTarget,
  };
}

export function planStalledTodoWake({
  issue,
  liveIssueIds = new Set(),
  liveAgentIds = new Set(),
  runIssueIds = new Set(),
  hasComments = false,
  nowMs = Date.now(),
  staleHours = 6,
}) {
  if (issue?.status !== "todo") return null;
  if (!issue.assigneeAgentId || issue.assigneeUserId) return null;
  if (issue.originKind === "routine_execution") return null;
  if (liveIssueIds.has(issue.id) || liveAgentIds.has(issue.assigneeAgentId) || runIssueIds.has(issue.id) || hasComments) return null;

  const updatedAtMs = timestampMs(issue.updatedAt ?? issue.createdAt);
  if (updatedAtMs === null) return null;
  const ageHours = Math.max(0, (nowMs - updatedAtMs) / 3_600_000);
  if (ageHours < staleHours) return null;

  return {
    issueId: issue.id,
    issueIdentifier: issue.identifier ?? issue.id,
    assigneeAgentId: issue.assigneeAgentId,
    ageHours: Math.round(ageHours * 100) / 100,
    idempotencyKey: `softwarehouse:stalled-todo:${issue.id}:${issue.updatedAt ?? issue.createdAt ?? "unknown"}`,
  };
}
