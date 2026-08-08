export type ExecutionQuotaState = "normal" | "warning" | "throttle" | "hold" | "emergency";

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
