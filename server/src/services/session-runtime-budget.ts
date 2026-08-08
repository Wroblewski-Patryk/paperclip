import type { AdapterRuntimeProgress } from "@paperclipai/adapter-utils";

export type SessionRuntimeBudgetState =
  | "healthy"
  | "warning"
  | "throttle"
  | "near_limit"
  | "stopped_by_session_budget";

export type SessionRuntimeUsage = Required<AdapterRuntimeProgress> & {
  uncachedInputTokens: number;
  retries: number;
};

export type SessionRuntimeLimits = {
  rawInputTokens: number;
  uncachedInputTokens: number;
  cachedInputTokens: number;
  outputTokens: number;
  toolReads: number;
  referencedFiles: number;
  iterations: number;
  retries: number;
  elapsedMs: number;
};

const METRIC_KEYS = [
  "rawInputTokens",
  "uncachedInputTokens",
  "cachedInputTokens",
  "outputTokens",
  "toolReads",
  "referencedFiles",
  "iterations",
  "retries",
  "elapsedMs",
] as const;

function finiteLimit(value: unknown, fallback: number) {
  return typeof value === "number" && Number.isFinite(value) && value > 0
    ? Math.floor(value)
    : fallback;
}

export function resolveSessionRuntimeLimits(input: {
  configured?: Record<string, unknown> | null;
  contextHardTokenLimit: number;
}): SessionRuntimeLimits {
  const configured = input.configured ?? {};
  const hardContext = Math.max(1, Math.floor(input.contextHardTokenLimit));
  return {
    rawInputTokens: finiteLimit(configured.rawInputTokens, Math.max(250_000, hardContext * 100)),
    uncachedInputTokens: finiteLimit(configured.uncachedInputTokens, Math.max(100_000, hardContext * 25)),
    cachedInputTokens: finiteLimit(configured.cachedInputTokens, Math.max(1_000_000, hardContext * 500)),
    outputTokens: finiteLimit(configured.outputTokens, Math.max(50_000, hardContext * 20)),
    toolReads: finiteLimit(configured.toolReads, 300),
    referencedFiles: finiteLimit(configured.referencedFiles, 120),
    iterations: finiteLimit(configured.iterations, 40),
    retries: finiteLimit(configured.retries, 3),
    elapsedMs: finiteLimit(configured.elapsedMs, 90 * 60_000),
  };
}

export function emptySessionRuntimeUsage(): SessionRuntimeUsage {
  return {
    inputTokens: 0,
    cachedInputTokens: 0,
    uncachedInputTokens: 0,
    outputTokens: 0,
    toolReads: 0,
    referencedFiles: 0,
    iterations: 0,
    retries: 0,
    elapsedMs: 0,
  };
}

export function combineSessionRuntimeUsage(
  prior: SessionRuntimeUsage,
  current: AdapterRuntimeProgress,
): SessionRuntimeUsage {
  const inputTokens = prior.inputTokens + Math.max(0, Math.floor(current.inputTokens ?? 0));
  const cachedInputTokens = prior.cachedInputTokens + Math.max(0, Math.floor(current.cachedInputTokens ?? 0));
  return {
    inputTokens,
    cachedInputTokens,
    uncachedInputTokens: prior.uncachedInputTokens + Math.max(0, Math.floor((current.inputTokens ?? 0) - (current.cachedInputTokens ?? 0))),
    outputTokens: prior.outputTokens + Math.max(0, Math.floor(current.outputTokens ?? 0)),
    toolReads: prior.toolReads + Math.max(0, Math.floor(current.toolReads ?? 0)),
    referencedFiles: prior.referencedFiles + Math.max(0, Math.floor(current.referencedFiles ?? 0)),
    iterations: prior.iterations + Math.max(0, Math.floor(current.iterations ?? 0)),
    retries: prior.retries,
    elapsedMs: prior.elapsedMs + Math.max(0, Math.floor(current.elapsedMs ?? 0)),
  };
}

export function evaluateSessionRuntimeBudget(usage: SessionRuntimeUsage, limits: SessionRuntimeLimits) {
  const values = {
    rawInputTokens: usage.inputTokens,
    uncachedInputTokens: usage.uncachedInputTokens,
    cachedInputTokens: usage.cachedInputTokens,
    outputTokens: usage.outputTokens,
    toolReads: usage.toolReads,
    referencedFiles: usage.referencedFiles,
    iterations: usage.iterations,
    retries: usage.retries,
    elapsedMs: usage.elapsedMs,
  };
  const utilization = Object.fromEntries(METRIC_KEYS.map((key) => [key, values[key] / limits[key]])) as Record<typeof METRIC_KEYS[number], number>;
  const limitingMetric = METRIC_KEYS.reduce((highest, key) => utilization[key] > utilization[highest] ? key : highest, METRIC_KEYS[0]);
  const peak = utilization[limitingMetric];
  const state: SessionRuntimeBudgetState = peak >= 1
    ? "stopped_by_session_budget"
    : peak >= 0.95
      ? "near_limit"
      : peak >= 0.85
        ? "throttle"
        : peak >= 0.7
          ? "warning"
          : "healthy";
  return {
    state,
    admitted: state !== "stopped_by_session_budget",
    limitingMetric,
    utilization,
    usage,
    limits,
    reason: state === "stopped_by_session_budget" ? `${limitingMetric}_limit_exhausted` : "within_session_budget",
  } as const;
}
