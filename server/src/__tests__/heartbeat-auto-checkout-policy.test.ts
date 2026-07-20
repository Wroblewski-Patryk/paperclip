import { describe, expect, it } from "vitest";
import { shouldAutoCheckoutIssueForWake } from "../services/heartbeat.ts";

const baseInput = {
  contextSnapshot: { wakeReason: "issue_assigned" },
  issueStatus: "todo",
  issueAssigneeAgentId: "agent-1",
  isDependencyReady: true,
  agentId: "agent-1",
};

describe("heartbeat auto-checkout policy", () => {
  it("does not auto-checkout on ordinary issue comments", () => {
    expect(
      shouldAutoCheckoutIssueForWake({
        ...baseInput,
        contextSnapshot: { wakeReason: "issue_commented" },
      }),
    ).toBe(false);
  });

  it("still auto-checkouts direct assignment wakes", () => {
    expect(shouldAutoCheckoutIssueForWake(baseInput)).toBe(true);
  });

  it("auto-checkouts a completed issue explicitly reopened for a deferred user comment", () => {
    expect(
      shouldAutoCheckoutIssueForWake({
        ...baseInput,
        contextSnapshot: { wakeReason: "issue_commented", reopenedFrom: "done" },
      }),
    ).toBe(true);
  });
});
