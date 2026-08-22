import { describe, expect, it } from "vitest";
import type { Approval, IssueThreadInteraction } from "@paperclipai/shared";
import { approvalBriefing, isOwnerDecisionReady } from "./decision-center.js";

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
    expect(briefing?.plainLanguageSummary).toBe("Authorize one redacted, read-only protected-UI QA session.");
    expect(briefing?.scope).toEqual([
      "Authorize one redacted, read-only protected-UI QA session.",
      "QVE captures evidence bound to the deployed SHA.",
    ]);
    expect(briefing?.contextFacts).toContain("Authorize one redacted, read-only protected-UI QA session.");
    expect(briefing?.recommendation).toBe("Approve only the stated safety envelope.");
    expect(briefing?.afterApproval).toEqual(["QVE captures evidence bound to the deployed SHA."]);
    expect(briefing?.rollback).toBe("Stop the session and invalidate its authorization.");
    expect(briefing?.options[0]?.risk).toBe("The protected authentication path will be exercised.");
    expect(briefing?.safetyConstraints).toEqual(["The protected authentication path will be exercised."]);
  });

  it("separates forbidden scope from ordinary safety constraints", () => {
    const briefing = approvalBriefing(approval({
      summary: "Run one read-only PAPER QA session.",
      risks: [
        "The runner must fail closed before authentication.",
        "Approval does not authorize exchange linkage, funds, or trading.",
      ],
    }));

    expect(briefing?.safetyConstraints).toEqual(["The runner must fail closed before authentication."]);
    expect(briefing?.outOfScope).toEqual(["Approval does not authorize exchange linkage, funds, or trading."]);
  });

  it("retains a complete safe fallback when structured payload context is missing", () => {
    const briefing = approvalBriefing(approval({}));

    expect(briefing?.decision).toBe("Czy zatwierdzić tę formalną operację Paperclipa?");
    expect(briefing?.contextFacts.length).toBeGreaterThanOrEqual(2);
    expect(briefing?.options).toHaveLength(2);
    expect(briefing?.afterApproval).toHaveLength(1);
  });
});

describe("isOwnerDecisionReady", () => {
  it("keeps an AIA-prepared internal agent routing proposal out of the owner queue", () => {
    const interaction = {
      kind: "suggest_tasks",
      payload: {
        version: 1,
        tasks: [{
          clientKey: "route-rte",
          title: "Enable governed HTTPS lane",
          assigneeAgentId: "66666666-6666-4666-8666-666666666666",
        }],
        decisionContext: {
          version: 1,
          audience: "board",
          decisionClass: "operational",
          decisionReady: true,
          authorityReason: "AIA cannot assign outside its reporting line.",
          ownerBriefing: {
            version: 1,
            language: "pl",
            preparedBy: "aia",
            decision: "Przekazać zadanie RTE?",
            contextFacts: ["To routing techniczny.", "Nie obejmuje produkcji."],
            options: [{ id: "route", label: "Route", benefit: "Kontynuacja", cost: "Jedno zadanie", risk: "Niski" }],
            recommendation: "Route",
            afterApproval: ["RTE wykona zadanie."],
            rollback: "Anulować zadanie.",
          },
        },
      },
    } as IssueThreadInteraction;

    expect(isOwnerDecisionReady(interaction)).toBe(false);
  });
});
