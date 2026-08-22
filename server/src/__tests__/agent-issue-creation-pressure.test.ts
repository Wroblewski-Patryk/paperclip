import { describe, expect, it } from "vitest";
import { evaluateAgentIssueCreationPressure } from "../services/agent-issue-creation-pressure.js";

const base = {
  actorType: "agent",
  title: "Implement owner journey",
  parentId: "parent-1",
  openIssueCount: 120,
  duplicateOpenTitleCount: 0,
  openDirectChildCount: 0,
  openCreatedByActorCount: 0,
};

describe("agent issue creation pressure", () => {
  it("does not constrain board-created work", () => {
    expect(evaluateAgentIssueCreationPressure({ ...base, actorType: "user", parentId: null }).allowed).toBe(true);
  });

  it("rejects duplicate open work before considering saturation", () => {
    expect(evaluateAgentIssueCreationPressure({ ...base, openIssueCount: 2, duplicateOpenTitleCount: 1 })).toMatchObject({
      allowed: false,
      code: "duplicate_open_issue",
    });
  });

  it("rejects autonomous root creation while the portfolio is saturated", () => {
    expect(evaluateAgentIssueCreationPressure({ ...base, parentId: null })).toMatchObject({
      allowed: false,
      code: "saturated_portfolio_root_creation_blocked",
      saturated: true,
    });
  });

  it("bounds child fan-out and creator WIP while saturated", () => {
    expect(evaluateAgentIssueCreationPressure({ ...base, openDirectChildCount: 3 })).toMatchObject({ allowed: false, code: "saturated_parent_fanout_blocked" });
    expect(evaluateAgentIssueCreationPressure({ ...base, openCreatedByActorCount: 5 })).toMatchObject({ allowed: false, code: "saturated_creator_wip_blocked" });
  });

  it("allows one bounded child and normal below-limit creation", () => {
    expect(evaluateAgentIssueCreationPressure(base).allowed).toBe(true);
    expect(evaluateAgentIssueCreationPressure({ ...base, parentId: null, openIssueCount: 20 }).allowed).toBe(true);
  });

  it("blocks autonomous Paperclip self-improvement while application delivery debt is open", () => {
    expect(evaluateAgentIssueCreationPressure({
      ...base,
      openIssueCount: 20,
      targetProjectKind: "control_plane",
      applicationOpenIssueCount: 4,
    })).toMatchObject({
      allowed: false,
      code: "application_delivery_preempts_control_plane_growth",
    });
    expect(evaluateAgentIssueCreationPressure({
      ...base,
      openIssueCount: 20,
      targetProjectKind: "application",
      applicationOpenIssueCount: 4,
    }).allowed).toBe(true);
  });
});
