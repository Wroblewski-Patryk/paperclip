import assert from "node:assert/strict";
import test from "node:test";
import {
  dryRunCommandFor,
  isNonFatalBlockedRootGuardrailTimeout,
  isNonFatalJanitorBoardCancelDenied,
  isNonFatalJanitorBulkRefusal,
  isNonFatalSoftwarehouseAuditTimeout,
} from "./lib/control-tick-step-runner.mjs";

test("non-fatal janitor bulk refusal is detected only for liveRunJanitor", () => {
  const failure = {
    stderr: "Refusing to apply 7 janitor actions at once; inspect first. kinds=[cancel_closed_issue_tail] limit=2",
    stdout: "",
  };
  assert.equal(isNonFatalJanitorBulkRefusal("liveRunJanitor", failure), true);
  assert.equal(isNonFatalJanitorBulkRefusal("routineDuplicateJanitor", failure), false);
});

test("non-fatal janitor bulk refusal detection also works via stdout payload", () => {
  const failure = {
    stderr: "",
    stdout: "{\"error\":\"Refusing to apply 3 janitor actions at once; inspect first.\"}",
  };
  assert.equal(isNonFatalJanitorBulkRefusal("liveRunJanitor", failure), true);
});

test("dryRunCommandFor removes apply flag and preserves script path", () => {
  assert.deepEqual(
    dryRunCommandFor(["scripts/run-live-run-janitor.mjs", "--apply"]),
    ["scripts/run-live-run-janitor.mjs"],
  );
});

test("non-fatal janitor board-only cancellation denial is detected only for liveRunJanitor", () => {
  const failure = {
    stderr:
      "Error: POST /api/heartbeat-runs/3488a0d0-ac4b-4adc-a546-241a5c21d1b8/cancel failed with 403: {\"error\":\"Board access required\"}",
    stdout: "",
  };
  assert.equal(isNonFatalJanitorBoardCancelDenied("liveRunJanitor", failure), true);
  assert.equal(isNonFatalJanitorBoardCancelDenied("routineDuplicateJanitor", failure), false);
});

test("blocked-root guardrail timeout is non-fatal only for the guardrail step", () => {
  const timeoutFailure = { timedOut: true };
  assert.equal(isNonFatalBlockedRootGuardrailTimeout("blockedRootGuardrail", timeoutFailure), true);
  assert.equal(isNonFatalBlockedRootGuardrailTimeout("liveRunJanitor", timeoutFailure), false);
  assert.equal(isNonFatalBlockedRootGuardrailTimeout("blockedRootGuardrail", { timedOut: false }), false);
});

test("softwarehouse audit timeout is non-fatal only for the audit step", () => {
  const timeoutFailure = { timedOut: true };
  assert.equal(isNonFatalSoftwarehouseAuditTimeout("softwarehouseAudit", timeoutFailure), true);
  assert.equal(isNonFatalSoftwarehouseAuditTimeout("blockedRootGuardrail", timeoutFailure), false);
  assert.equal(isNonFatalSoftwarehouseAuditTimeout("softwarehouseAudit", { timedOut: false }), false);
});
