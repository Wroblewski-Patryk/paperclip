import { describe, expect, it } from "vitest";
import { reconcileTerminalIssueSessionBudgetOutcome } from "./heartbeat-outcome.js";

describe("heartbeat adapter outcome reconciliation", () => {
  it("does not report a budget stop as failure after the issue was completed", () => {
    expect(reconcileTerminalIssueSessionBudgetOutcome({
      outcome: "failed",
      errorCode: "SESSION_BUDGET_EXHAUSTED",
      issueStatus: "done",
    })).toBe("succeeded");
    expect(reconcileTerminalIssueSessionBudgetOutcome({
      outcome: "failed",
      errorCode: "SESSION_BUDGET_EXHAUSTED",
      issueStatus: "cancelled",
    })).toBe("cancelled");
  });

  it("keeps genuine failures and unfinished budget stops failed", () => {
    expect(reconcileTerminalIssueSessionBudgetOutcome({
      outcome: "failed",
      errorCode: "SESSION_BUDGET_EXHAUSTED",
      issueStatus: "in_progress",
    })).toBe("failed");
    expect(reconcileTerminalIssueSessionBudgetOutcome({
      outcome: "failed",
      errorCode: "adapter_failed",
      issueStatus: "done",
    })).toBe("failed");
  });
});
