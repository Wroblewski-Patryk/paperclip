import { describe, expect, it } from "vitest";
import { evaluateControlPlaneExecutionPolicy } from "../services/control-plane-execution-policy.js";

describe("control-plane execution policy", () => {
  it("blocks existing Paperclip self-work while application delivery remains open", () => {
    expect(evaluateControlPlaneExecutionPolicy({
      projectName: "LuckySparrow Softwarehouse",
      issueTitle: "Add clean-env one-shot Windows exact-argv executor",
      applicationOpenIssueCount: 17,
    })).toEqual({
      blocked: true,
      reasonCode: "policy.application_delivery_preempts_control_plane_execution",
    });
  });

  it("allows product-routed work held in the Softwarehouse coordination project", () => {
    expect(evaluateControlPlaneExecutionPolicy({
      projectName: "LuckySparrow Softwarehouse",
      issueTitle: "[Roost] Reconcile deployment evidence",
      applicationOpenIssueCount: 17,
    }).blocked).toBe(false);
  });

  it("allows application-project work while delivery debt is open", () => {
    expect(evaluateControlPlaneExecutionPolicy({
      projectName: "Featherly",
      issueTitle: "Repair onboarding flow",
      applicationOpenIssueCount: 17,
    }).blocked).toBe(false);
  });

  it("allows control-plane work after application delivery debt closes", () => {
    expect(evaluateControlPlaneExecutionPolicy({
      projectName: "Paperclip control plane",
      issueTitle: "Repair runtime lifecycle",
      applicationOpenIssueCount: 0,
    }).blocked).toBe(false);
  });
});
