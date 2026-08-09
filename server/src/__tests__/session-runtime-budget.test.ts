import { describe, expect, it } from "vitest";
import {
  combineSessionRuntimeUsage,
  emptySessionRuntimeUsage,
  evaluateSessionRuntimeBudget,
  resolveSessionRuntimeLimits,
} from "../services/session-runtime-budget.js";

describe("session runtime budget", () => {
  const limits = resolveSessionRuntimeLimits({
    contextHardTokenLimit: 10_000,
    configured: { rawInputTokens: 100, uncachedInputTokens: 80, cachedInputTokens: 50, outputTokens: 40, toolReads: 10, referencedFiles: 10, iterations: 5, retries: 2, elapsedMs: 1000 },
  });

  it("classifies the highest-utilized metric and stops fail-closed", () => {
    const usage = { ...emptySessionRuntimeUsage(), inputTokens: 101, uncachedInputTokens: 60, cachedInputTokens: 41 };
    expect(evaluateSessionRuntimeBudget(usage, limits)).toMatchObject({
      state: "stopped_by_session_budget",
      admitted: false,
      limitingMetric: "rawInputTokens",
      reason: "rawInputTokens_limit_exhausted",
    });
  });

  it("keeps cached and uncached input separate when adding live progress", () => {
    const usage = combineSessionRuntimeUsage(emptySessionRuntimeUsage(), { inputTokens: 70, cachedInputTokens: 50, outputTokens: 3 });
    expect(usage).toMatchObject({ inputTokens: 70, cachedInputTokens: 50, uncachedInputTokens: 20, outputTokens: 3 });
  });

  it("keeps the default aggregate input ceiling consistent with its component ceilings", () => {
    const defaults = resolveSessionRuntimeLimits({ contextHardTokenLimit: 12_000 });

    expect(defaults).toMatchObject({
      rawInputTokens: 6_300_000,
      cachedInputTokens: 6_000_000,
      uncachedInputTokens: 300_000,
    });
    expect(defaults.rawInputTokens).toBe(defaults.cachedInputTokens + defaults.uncachedInputTokens);
  });

  it.each([[69, "healthy"], [70, "warning"], [85, "throttle"], [95, "near_limit"]] as const)("maps %i%% to %s", (percent, state) => {
    const usage = { ...emptySessionRuntimeUsage(), toolReads: percent };
    expect(evaluateSessionRuntimeBudget(usage, { ...limits, toolReads: 100 }).state).toBe(state);
  });
});
