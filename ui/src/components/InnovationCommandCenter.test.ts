import { describe, expect, it } from "vitest";
import type { CompanySituation } from "@paperclipai/shared";
import { hasOwnerDecisionSignal } from "./InnovationCommandCenter";

function situationWith(kind: CompanySituation["attention"][number]["kind"]): CompanySituation {
  return {
    attention: [{
      id: kind,
      kind,
      severity: "critical",
      title: kind,
      summary: kind,
      suggestedAction: kind,
      sources: [],
    }],
  } as unknown as CompanySituation;
}

describe("hasOwnerDecisionSignal", () => {
  it("does not present a recoverable agent error as an owner decision", () => {
    expect(hasOwnerDecisionSignal(situationWith("agent_error"))).toBe(false);
  });

  it("keeps judgment-dependent outcome conflicts in the owner queue", () => {
    expect(hasOwnerDecisionSignal(situationWith("outcome_state_conflict"))).toBe(true);
  });
});
