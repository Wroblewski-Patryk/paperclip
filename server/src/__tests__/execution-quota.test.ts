import { describe, expect, it } from "vitest";
import { evaluateExecutionQuota, resolveExecutionQuotaScope } from "../services/execution-quota.js";

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

  it("starts a fresh quota window for each reusable routine execution", () => {
    const triggeredAt = new Date("2026-08-09T00:00:00.000Z");
    expect(resolveExecutionQuotaScope({
      issueId: "issue-1",
      originKind: "routine_execution",
      originRunId: "routine-run-2",
      routineTriggeredAt: triggeredAt,
    })).toEqual({
      scopeType: "routine_run",
      scopeId: "routine-run-2",
      windowStart: triggeredAt,
    });
  });

  it("keeps ordinary and malformed routine work issue-scoped", () => {
    expect(resolveExecutionQuotaScope({ issueId: "issue-1" })).toEqual({
      scopeType: "issue",
      scopeId: "issue-1",
      windowStart: null,
    });
    expect(resolveExecutionQuotaScope({
      issueId: "issue-1",
      originKind: "routine_execution",
      originRunId: "routine-run-missing",
      routineTriggeredAt: null,
    })).toEqual({
      scopeType: "issue",
      scopeId: "issue-1",
      windowStart: null,
    });
  });
});
