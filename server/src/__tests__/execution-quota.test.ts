import { describe, expect, it } from "vitest";
import { evaluateExecutionQuota } from "../services/execution-quota.js";

describe("execution quota", () => {
  it.each([
    [6_999, "normal"], [7_000, "warning"], [9_000, "throttle"], [10_000, "hold"], [20_000, "emergency"],
  ])("classifies %i raw tokens as %s", (observed, state) => {
    expect(evaluateExecutionQuota({ observedRawInputTokens: observed, hardRawInputTokenLimit: 10_000, criticalCloseout: false }).state).toBe(state);
  });

  it("does not permit an agent swap to bypass an issue-scoped hold", () => {
    const issueObserved = 12_000;
    expect(evaluateExecutionQuota({ observedRawInputTokens: issueObserved, hardRawInputTokenLimit: 10_000, criticalCloseout: false }).admitted).toBe(false);
    expect(evaluateExecutionQuota({ observedRawInputTokens: issueObserved, hardRawInputTokenLimit: 10_000, criticalCloseout: false }).admitted).toBe(false);
  });

  it("allows only an explicitly derived critical closeout exception", () => {
    expect(evaluateExecutionQuota({ observedRawInputTokens: 12_000, hardRawInputTokenLimit: 10_000, criticalCloseout: true })).toMatchObject({ admitted: true, exceptionApplied: true });
  });
});
