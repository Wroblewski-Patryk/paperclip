import { describe, expect, it } from "vitest";
import { validateAgentDecisionContract } from "./issue-decision-contract.js";

const executableContract = {
  value: "critical" as const,
  urgency: "critical" as const,
  costOfInaction: "critical" as const,
  estimatedEffort: "small" as const,
  maxMinutes: 60,
  maxTokens: null,
  maxIterations: 3,
  maxAgents: 1,
  stopCondition: "Stop after three failed attempts or any unexpected blast radius.",
  doneEnough: "The production incident is contained and independently verified.",
  disposition: "do_now" as const,
  rationale: "The incident blocks the current owner journey.",
  confidence: "verified" as const,
  evidenceRefs: ["incident:LUC-1"],
  scope: "One service and one project.",
  reversibility: "easy" as const,
  rollbackPlan: null,
  restorePoint: null,
  postChangeVerification: "Run the bounded smoke and inspect monitoring.",
  rollbackTrigger: null,
};

describe("agent decision contract", () => {
  it("blocks critical runnable work without a decision contract", () => {
    expect(validateAgentDecisionContract({
      actorType: "agent",
      priority: "critical",
      status: "todo",
      assigneeAgentId: "agent-1",
    })?.code).toBe("decision_contract_required");
  });

  it("accepts bounded evidence-backed critical work", () => {
    expect(validateAgentDecisionContract({
      actorType: "agent",
      priority: "critical",
      status: "todo",
      assigneeAgentId: "agent-1",
      executionPolicy: { decisionContract: executableContract },
    })).toBeNull();
  });

  it("keeps non-execution dispositions out of the runnable queue", () => {
    expect(validateAgentDecisionContract({
      actorType: "agent",
      title: "Delete production data",
      status: "todo",
      assigneeAgentId: "agent-1",
      executionPolicy: { decisionContract: { ...executableContract, disposition: "escalate" } },
    })?.code).toBe("decision_disposition_mismatch");
  });

  it("does not burden ordinary reversible work with the high-impact gate", () => {
    expect(validateAgentDecisionContract({
      actorType: "agent",
      title: "Fix local button spacing",
      priority: "medium",
      status: "todo",
      assigneeAgentId: "agent-1",
    })).toBeNull();
  });
});
