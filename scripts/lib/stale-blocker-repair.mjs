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
