import { describe, expect, it } from "vitest";
import {
  buildAdapterContextSources,
  deriveContextWorkType,
  evaluateFinalContextAdmission,
  resolveContextBudget,
} from "../services/context-admission.js";

describe("hard context admission", () => {
  it("uses work-type and role ceilings and never accepts a caller increase", () => {
    expect(resolveContextBudget({
      workType: "owner",
      role: "Chief Executive Officer",
      requested: { tokenLimit: 500_000, fileLimit: 500 },
    })).toMatchObject({ tokenLimit: 14_000, fileLimit: 8 });
    expect(deriveContextWorkType({ wakeReason: "weekly_meta_review" }, "engineer")).toBe("weekly_meta");
  });

  it("attributes adapter prompt tokens by source", () => {
    const sources = buildAdapterContextSources({
      promptMetrics: { instructionsChars: 4_000, wakePromptChars: 2_000, heartbeatPromptChars: 2_000 },
    });
    expect(sources.find((source) => source.source === "agent_instructions")).toMatchObject({
      bytes: 4_000,
      estimatedTokens: 1_000,
      owner: "paperclip_runtime",
    });
  });

  it("allows only a system-owned override before expiry", () => {
    const now = new Date("2026-08-04T12:00:00.000Z");
    const base = {
      workType: "owner" as const,
      role: "Product owner",
      requested: { tokenLimit: 500_000, fileLimit: 500 },
      now,
    };
    const valid = resolveContextBudget({
      ...base,
      override: {
        authority: "native_supervision",
        approvedBy: "system",
        overrideId: "override-1",
        reason: "Measured mandatory repository instruction delta",
        expiresAt: "2026-08-04T12:30:00.000Z",
        tokenLimit: 15_000,
        fileLimit: 8,
      },
    });
    expect(valid).toMatchObject({ tokenLimit: 15_000, fileLimit: 8, contextOverride: { overrideId: "override-1" } });
    const expired = resolveContextBudget({
      ...base,
      override: {
        authority: "native_supervision",
        approvedBy: "system",
        overrideId: "override-1",
        reason: "Expired",
        expiresAt: "2026-08-04T11:59:59.000Z",
        tokenLimit: 15_000,
      },
    });
    expect(expired).toMatchObject({ tokenLimit: 14_000, contextOverride: null });
  });

  it("fails closed before invocation when required prompt sources exceed the budget", () => {
    const sources = buildAdapterContextSources({ promptMetrics: { instructionsChars: 40_000, wakePromptChars: 8_000 } });
    expect(evaluateFinalContextAdmission({ sources, tokenLimit: 8_000, fileLimit: 8, referencedFiles: 1 }))
      .toMatchObject({ admitted: false, disposition: "fail_closed", reason: "token_budget_exceeded" });
  });
});
