import assert from "node:assert/strict";
import test from "node:test";
import {
  isStandardQuotaCritical,
  probeIsQuotaFailure,
  probePassed,
  quotaWindowsFromResult,
  quotaAgentRecoveryDecision,
} from "./softwarehouse-quota-agent-recovery.mjs";

test("standard quota is critical at or above the threshold", () => {
  assert.equal(isStandardQuotaCritical([{ quotaLane: "codex_standard", usedPercent: 100 }]), true);
  assert.equal(isStandardQuotaCritical([{ quotaLane: "codex_standard", usedPercent: 89 }]), false);
  assert.equal(isStandardQuotaCritical([{ quotaLane: "codex_spark", usedPercent: 100 }]), false);
});

test("provider quota responses are flattened into routable windows", () => {
  assert.deepEqual(quotaWindowsFromResult([{
    provider: "openai",
    windows: [{ quotaLane: "codex_standard", usedPercent: 100 }],
  }]), [{ quotaLane: "codex_standard", usedPercent: 100 }]);
  assert.deepEqual(quotaWindowsFromResult({
    windows: [{ quotaLane: "codex_spark", usedPercent: 10 }],
  }), [{ quotaLane: "codex_spark", usedPercent: 10 }]);
});

test("quota failures are distinguished from environment failures", () => {
  assert.equal(probeIsQuotaFailure({
    checks: [{ level: "error", code: "adapter_command_failed", detail: "Usage limit reached. Try again at 21:00." }],
  }), true);
  assert.equal(probeIsQuotaFailure({
    checks: [{ level: "error", code: "adapter_command_missing", detail: "Command was not found." }],
  }), false);
});

test("fallback probe must pass without error checks", () => {
  assert.equal(probePassed({ status: "pass", checks: [{ level: "info", code: "ok" }] }), true);
  assert.equal(probePassed({ status: "pass", checks: [{ level: "error", code: "failed" }] }), false);
  assert.equal(probePassed({ status: "warn", checks: [] }), false);
});

test("recovery requires critical standard quota, a quota failure, and a working Spark probe", () => {
  const base = {
    quotaWindows: [{ quotaLane: "codex_standard", usedPercent: 100 }],
    primaryProbe: {
      status: "fail",
      checks: [{ level: "error", code: "adapter_command_failed", detail: "Usage limit reached." }],
    },
    fallbackProbe: { status: "pass", checks: [{ level: "info", code: "ok" }] },
  };
  assert.deepEqual(quotaAgentRecoveryDecision(base), {
    recover: true,
    reason: "standard_quota_exhausted_spark_available",
  });
  assert.equal(quotaAgentRecoveryDecision({
    ...base,
    fallbackProbe: { status: "fail", checks: [{ level: "error", code: "failed" }] },
  }).recover, false);
  assert.equal(quotaAgentRecoveryDecision({
    ...base,
    primaryProbe: { status: "fail", checks: [{ level: "error", code: "missing" }] },
  }).recover, false);
});
