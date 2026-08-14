export type HeartbeatAdapterOutcome = "succeeded" | "failed" | "cancelled" | "timed_out";

export function reconcileTerminalIssueSessionBudgetOutcome(input: {
  outcome: HeartbeatAdapterOutcome;
  errorCode: string | null | undefined;
  issueStatus: string | null | undefined;
}): HeartbeatAdapterOutcome {
  if (input.outcome !== "failed" || input.errorCode !== "SESSION_BUDGET_EXHAUSTED") {
    return input.outcome;
  }
  // The adapter can cross its accounting limit a few events after it has
  // already persisted the task's final disposition. In that case the task
  // outcome is authoritative: do not show a false failed run for completed
  // work, while retaining budget telemetry in resultJson/usageJson.
  if (input.issueStatus === "done") return "succeeded";
  if (input.issueStatus === "cancelled") return "cancelled";
  return input.outcome;
}
