import { describe, expect, it } from "vitest";
import {
  classifyAutomaticRecoveryPolicyHold,
  resolveSourceScopedRecoveryAttemptLimit,
} from "../services/recovery/service.js";

describe("automatic recovery policy holds", () => {
  it("escalates an issue quota hard hold instead of retrying it", () => {
    expect(classifyAutomaticRecoveryPolicyHold({
      id: "run-1",
      agentId: "agent-1",
      status: "failed",
      error: "Issue execution quota hard hold",
      errorCode: "adapter_failed",
      contextSnapshot: {
        executionQuota: {
          admitted: false,
          reason: "raw_input_quota_exceeded",
        },
      },
      livenessState: "failed",
    })).toMatchObject({ code: "issue_execution_quota_hold" });
  });

  it("leaves recoverable adapter failures eligible for bounded recovery", () => {
    expect(classifyAutomaticRecoveryPolicyHold({
      id: "run-2",
      agentId: "agent-1",
      status: "failed",
      error: "Process lost",
      errorCode: "process_lost",
      contextSnapshot: {},
      livenessState: "failed",
    })).toBeNull();
  });
});

describe("source-scoped recovery attempt limits", () => {
  it("defaults legacy missing-disposition actions to their single handoff limit", () => {
    expect(resolveSourceScopedRecoveryAttemptLimit({
      kind: "missing_disposition",
      maxAttempts: null,
      evidence: { maxHandoffAttempts: 1 },
      latestRun: null,
    })).toBe(1);
  });

  it("keeps transient adapter recovery bounded", () => {
    expect(resolveSourceScopedRecoveryAttemptLimit({
      kind: "stranded_assigned_issue",
      maxAttempts: null,
      evidence: {},
      latestRun: {
        id: "run-3",
        agentId: "agent-1",
        status: "failed",
        error: "temporary upstream failure",
        errorCode: "adapter_failed",
        contextSnapshot: {},
        livenessState: "failed",
      },
    })).toBe(3);
  });
});
