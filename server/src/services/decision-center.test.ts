import { describe, expect, it } from "vitest";
import type { Approval } from "@paperclipai/shared";
import { approvalBriefing } from "./decision-center.js";

function approval(payload: Record<string, unknown>): Approval {
  const now = new Date("2026-08-15T12:00:00.000Z");
  return {
    id: "approval-1",
    companyId: "company-1",
    type: "request_board_approval",
    requestedByAgentId: "agent-1",
    requestedByUserId: null,
    status: "pending",
    payload,
    decisionNote: null,
    decidedByUserId: null,
    decidedAt: null,
    createdAt: now,
    updatedAt: now,
  };
}

describe("approvalBriefing", () => {
  it("uses the governed request payload instead of a generic owner prompt", () => {
    const briefing = approvalBriefing(approval({
      title: "Approve one bounded PAPER owner QA session for LUC-2284",
      summary: "Authorize one redacted, read-only protected-UI QA session.",
      recommendedAction: "Approve only the stated safety envelope.",
      nextActionOnApproval: "QVE captures evidence bound to the deployed SHA.",
      risks: ["The protected authentication path will be exercised."],
      rollbackPlan: "Stop the session and invalidate its authorization.",
    }));

    expect(briefing?.decision).toContain("Approve one bounded PAPER owner QA session for LUC-2284");
    expect(briefing?.contextFacts).toContain("Authorize one redacted, read-only protected-UI QA session.");
    expect(briefing?.recommendation).toBe("Approve only the stated safety envelope.");
    expect(briefing?.afterApproval).toEqual(["QVE captures evidence bound to the deployed SHA."]);
    expect(briefing?.rollback).toBe("Stop the session and invalidate its authorization.");
    expect(briefing?.options[0]?.risk).toBe("The protected authentication path will be exercised.");
  });

  it("retains a complete safe fallback when structured payload context is missing", () => {
    const briefing = approvalBriefing(approval({}));

    expect(briefing?.decision).toBe("Czy zatwierdzić tę formalną operację Paperclipa?");
    expect(briefing?.contextFacts.length).toBeGreaterThanOrEqual(2);
    expect(briefing?.options).toHaveLength(2);
    expect(briefing?.afterApproval).toHaveLength(1);
  });
});
