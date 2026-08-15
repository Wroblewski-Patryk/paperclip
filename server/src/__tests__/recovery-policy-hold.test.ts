import { describe, expect, it } from "vitest";
import {
  buildQuotaHoldRecoveryActionUpdate,
  classifyAutomaticRecoveryPolicyHold,
  resolveSourceScopedRecoveryAttemptLimit,
} from "../services/recovery/service.js";

describe("automatic recovery policy holds", () => {
  it("classifies raw-input quota denials as issue execution quota holds", () => {
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

  it("recognizes the typed quota-hold error code without relying on provider copy", () => {
    expect(classifyAutomaticRecoveryPolicyHold({
      id: "run-typed-quota-hold",
      agentId: "agent-1",
      status: "failed",
      error: "Execution stopped by policy",
      errorCode: "issue_execution_quota_hold",
      contextSnapshot: {},
      livenessState: "failed",
    })).toMatchObject({
      code: "issue_execution_quota_hold",
    });
  });

  it("keeps an invokable technical recovery owner while suppressing automatic recovery", () => {
    const policyHold = classifyAutomaticRecoveryPolicyHold({
      id: "run-quota-owner",
      agentId: "agent-1",
      status: "failed",
      error: "Issue execution quota hard hold",
      errorCode: "issue_execution_quota_hold",
      contextSnapshot: {},
      livenessState: "failed",
    });

    expect(buildQuotaHoldRecoveryActionUpdate({
      ownerAgentId: "technical-reviewer",
      hasInvokableOwner: true,
      policyHold: policyHold!,
      attemptCount: 2,
      evidence: { preserved: true },
      latestRunId: "run-quota-owner",
    })).toMatchObject({
      status: "escalated",
      ownerType: "agent",
      ownerAgentId: "technical-reviewer",
      wakePolicy: {
        type: "wake_owner",
        reason: "issue_execution_quota_hold",
        ownerAgentId: "technical-reviewer",
      },
      maxAttempts: 2,
      evidence: {
        preserved: true,
        automaticRecoverySuppressed: true,
        suppressionCode: "issue_execution_quota_hold",
        latestRunId: "run-quota-owner",
      },
    });
  });

  it("falls back to board escalation only without an invokable recovery owner", () => {
    const policyHold = classifyAutomaticRecoveryPolicyHold({
      id: "run-quota-board",
      agentId: "agent-1",
      status: "failed",
      error: "Issue execution quota hard hold",
      errorCode: "issue_execution_quota_hold",
      contextSnapshot: {},
      livenessState: "failed",
    });

    expect(buildQuotaHoldRecoveryActionUpdate({
      ownerAgentId: "unavailable-reviewer",
      hasInvokableOwner: false,
      policyHold: policyHold!,
      attemptCount: 2,
      evidence: {},
      latestRunId: "run-quota-board",
    })).toMatchObject({
      status: "escalated",
      ownerType: "board",
      ownerAgentId: null,
      wakePolicy: { type: "board_escalation", reason: "no_invokable_recovery_owner" },
    });
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
