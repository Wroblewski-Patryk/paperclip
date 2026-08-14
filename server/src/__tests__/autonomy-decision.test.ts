import { describe, expect, it } from "vitest";
import { determineAutonomyDisposition, determineAutonomyStage } from "../services/autonomy-decision.js";

describe("autonomy decision safety contract", () => {
  it("requires evidence when the linked goal is already achieved", () => {
    expect(determineAutonomyDisposition({
      hasCandidate: true,
      goalStatus: "achieved",
      staleHours: 1,
      confidence: 0.95,
      riskLevel: "low",
      costCoverage: "NONZERO",
      mode: "AUTO",
    })).toBe("GATHER_EVIDENCE");
  });

  it.each([
    { name: "stale evidence", staleHours: 25, confidence: 0.9, riskLevel: "low" as const, costCoverage: "NONZERO" as const },
    { name: "medium risk", staleHours: 1, confidence: 0.9, riskLevel: "medium" as const, costCoverage: "NONZERO" as const },
    { name: "low confidence", staleHours: 1, confidence: 0.7, riskLevel: "low" as const, costCoverage: "NONZERO" as const },
  ])("fails closed for $name", ({ staleHours, confidence, riskLevel, costCoverage }) => {
    expect(determineAutonomyDisposition({ hasCandidate: true, goalStatus: "active", staleHours, confidence, riskLevel, costCoverage, mode: "LIMITED_AUTO" })).toBe("GATHER_EVIDENCE");
  });

  it("authorizes only inside a graduated envelope", () => {
    const base = { hasCandidate: true, goalStatus: "active", staleHours: 1, confidence: 0.9, riskLevel: "low" as const, costCoverage: "NONZERO" as const };
    expect(determineAutonomyDisposition({ ...base, mode: "SHADOW" })).toBe("RECOMMEND");
    expect(determineAutonomyDisposition({ ...base, mode: "LIMITED_AUTO" })).toBe("AUTHORIZE");
  });

  it("lets fresh typed post-goal intent produce a recommendation without changing the envelope stage", () => {
    expect(determineAutonomyDisposition({
      hasCandidate: true,
      goalStatus: "achieved",
      intentStatus: "ACTIVE",
      staleHours: 200,
      confidence: 0.9,
      riskLevel: "low",
      costCoverage: "PARTIAL",
      mode: "SHADOW",
    })).toBe("RECOMMEND");
  });

  it("allows board review of bounded unknown cost in SHADOW but not autonomous execution", () => {
    const base = { hasCandidate: true, goalStatus: "active", intentStatus: "ACTIVE", staleHours: 1, confidence: 0.9, riskLevel: "low" as const, costCoverage: "UNKNOWN" as const };
    expect(determineAutonomyDisposition({ ...base, mode: "SHADOW" })).toBe("RECOMMEND");
    expect(determineAutonomyDisposition({ ...base, mode: "LIMITED_AUTO" })).toBe("GATHER_EVIDENCE");
    expect(determineAutonomyDisposition({ ...base, mode: "LIMITED_AUTO", boundedCostAuthority: true })).toBe("AUTHORIZE");
  });

  it("uses hybrid graduation thresholds", () => {
    expect(determineAutonomyStage({ current: "SHADOW", distinctSamples: 5, oracleAgreementRate: 0.8, meanConfidence: 0.8, verifiedOutcomes: 0, outcomeSuccessRate: null, unsafeCount: 0 }).stage).toBe("RECOMMEND");
    expect(determineAutonomyStage({ current: "RECOMMEND", distinctSamples: 5, oracleAgreementRate: 0.8, meanConfidence: 0.8, verifiedOutcomes: 3, outcomeSuccessRate: 0.8, unsafeCount: 0 }).stage).toBe("LIMITED_AUTO");
  });

  it("downgrades on an unsafe verdict", () => {
    expect(determineAutonomyStage({ current: "AUTO", distinctSamples: 20, oracleAgreementRate: 1, meanConfidence: 0.95, verifiedOutcomes: 20, outcomeSuccessRate: 1, unsafeCount: 1 })).toEqual({ stage: "SHADOW", downgradeReason: "unsafe_evaluator_verdict" });
  });

  it("keeps outcome failure separate from oracle agreement", () => {
    expect(determineAutonomyStage({ current: "LIMITED_AUTO", distinctSamples: 20, oracleAgreementRate: 1, meanConfidence: 0.95, verifiedOutcomes: 5, outcomeSuccessRate: 0.6, unsafeCount: 0 })).toEqual({ stage: "SHADOW", downgradeReason: "outcome_success_below_threshold" });
  });
});
