export type ExecutionQuotaState = "normal" | "warning" | "throttle" | "hold" | "emergency";

export const RUNTIME_BUDGET_POLICY_VERSION = 2;

export type ExecutionQuotaScope = {
  scopeType: "issue" | "routine_run";
  scopeId: string;
  windowStart: Date | null;
};

export function resolveIssueExecutionTokenLimit(input: {
  configuredLimit?: unknown;
  sessionRawInputTokenLimit: number;
}) {
  const configured = input.configuredLimit;
  if (typeof configured === "number" && Number.isFinite(configured) && configured > 0) {
    return Math.floor(configured);
  }

  // An issue must be able to continue in a fresh bounded session after one
  // session reaches its rotation/stop boundary. Keeping the issue ceiling at
  // the same value as the session ceiling made that recovery action impossible.
  return Math.max(4_000_000, Math.floor(input.sessionRawInputTokenLimit) * 2);
}

export function executionQuotaRunInputTokens(usage: Record<string, unknown>) {
  const normalized = usage.inputTokens;
  const raw = usage.rawInputTokens;
  const value = typeof normalized === "number" && Number.isFinite(normalized)
    ? normalized
    : typeof raw === "number" && Number.isFinite(raw)
      ? raw
      : 0;
  return Math.max(0, Math.floor(value));
}

export function resolveExecutionQuotaScope(input: {
  issueId: string;
  originKind?: string | null;
  originRunId?: string | null;
  routineTriggeredAt?: Date | null;
}): ExecutionQuotaScope {
  if (
    input.originKind === "routine_execution" &&
    input.originRunId &&
    input.routineTriggeredAt instanceof Date &&
    Number.isFinite(input.routineTriggeredAt.getTime())
  ) {
    return {
      scopeType: "routine_run",
      scopeId: input.originRunId,
      windowStart: input.routineTriggeredAt,
    };
  }

  return {
    scopeType: "issue",
    scopeId: input.issueId,
    windowStart: null,
  };
}

export function evaluateExecutionQuota(input: {
  observedRawInputTokens: number;
  hardRawInputTokenLimit: number;
  criticalCloseout: boolean;
}) {
  const observed = Math.max(0, Math.floor(input.observedRawInputTokens));
  const limit = Math.max(1, Math.floor(input.hardRawInputTokenLimit));
  const ratio = observed / limit;
  const state: ExecutionQuotaState = ratio >= 2 ? "emergency" : ratio >= 1 ? "hold" : ratio >= 0.9 ? "throttle" : ratio >= 0.7 ? "warning" : "normal";
  const exceptionApplied = input.criticalCloseout && (state === "hold" || state === "emergency");
  return {
    state,
    observedRawInputTokens: observed,
    hardRawInputTokenLimit: limit,
    utilization: ratio,
    admitted: state !== "hold" && state !== "emergency" || exceptionApplied,
    exceptionApplied,
    reason: exceptionApplied ? "critical_closeout_exception" : state === "hold" || state === "emergency" ? "raw_input_quota_exceeded" : "within_quota",
  } as const;
}
