function timestamp(value) {
  const parsed = Date.parse(value ?? "");
  return Number.isFinite(parsed) ? parsed : null;
}

export function planReusableRoutineRecoveryRestore({ issue, activeBlockers, runs, activeRoutineTitles }) {
  const action = issue?.activeRecoveryAction;
  if (issue?.status !== "blocked") return null;
  if (!action || action.status !== "active" || action.kind !== "stranded_assigned_issue") return null;
  if (!activeRoutineTitles.has(issue.title)) return null;
  if (activeBlockers.length > 0) return null;

  const actionAttemptAt = timestamp(action.lastAttemptAt);
  const successfulRecoveryRun = runs
    .filter((run) => run.status === "succeeded")
    .filter((run) => run.contextSnapshot?.source === "issue_recovery_action")
    .filter((run) => run.contextSnapshot?.recoveryActionId === action.id)
    .filter((run) => {
      const finishedAt = timestamp(run.finishedAt);
      return finishedAt !== null && (actionAttemptAt === null || finishedAt >= actionAttemptAt);
    })
    .sort((left, right) => String(right.finishedAt ?? "").localeCompare(String(left.finishedAt ?? "")))[0] ?? null;

  if (!successfulRecoveryRun) return null;
  return {
    actionId: action.id,
    runId: successfulRecoveryRun.runId ?? successfulRecoveryRun.id,
    sourceIssueStatus: "todo",
    outcome: "restored",
  };
}
