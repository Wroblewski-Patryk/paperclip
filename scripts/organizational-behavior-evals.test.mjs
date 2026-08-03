import test from "node:test";
import assert from "node:assert/strict";

import { auditOutcomeIntegrity } from "./lib/outcome-integrity.mjs";

function findingCodes(report) {
  return new Set(report.findings.map((finding) => finding.code));
}

test("unclear work is challenged instead of expanded into more work", () => {
  const issues = [{
    id: "unclear",
    title: "Improve the platform somehow",
    description: "Maybe make it better.",
    status: "todo",
    assigneeAgentId: "agent",
  }];
  const report = auditOutcomeIntegrity({ issues });

  assert.ok(findingCodes(report).has("weak_outcome_contract"));
  assert.equal(issues.length, 1, "the read-only eval must not manufacture child work");
});

test("an unsolved repeated problem trips recurrence and tree-depth circuits", () => {
  const issues = [1, 2, 3].map((attempt) => ({
    id: `attempt-${attempt}`,
    projectId: "project",
    title: `[App] Retry ${attempt}: repair the same failure`,
    description: "Required outcome: verify the existing failure.",
    status: "todo",
    assigneeAgentId: "agent",
    requestDepth: 5,
  }));
  const codes = findingCodes(auditOutcomeIntegrity({ issues }));

  assert.ok(codes.has("repeated_open_fingerprint"));
  assert.ok(codes.has("deep_request_tree"));
});

test("a non-execution decision cannot masquerade as runnable work", () => {
  const report = auditOutcomeIntegrity({ issues: [{
    id: "debt",
    title: "[App] Cosmetic cleanup",
    description: "Acceptance: existing result remains stable. Done enough: current state is accepted debt.",
    status: "todo",
    assigneeAgentId: "agent",
    executionPolicy: { decisionContract: { disposition: "accept_debt", confidence: "high", reversibility: "easy" } },
  }] });

  assert.ok(findingCodes(report).has("decision_disposition_status_mismatch"));
});

test("low-confidence costly work loses autonomous execution authority", () => {
  const report = auditOutcomeIntegrity({ issues: [{
    id: "uncertain",
    title: "[App] Migrate production data",
    description: "Required outcome: verify the migration proposal.",
    status: "in_progress",
    assigneeAgentId: "agent",
    executionPolicy: { decisionContract: { disposition: "do_now", confidence: "low", reversibility: "costly" } },
  }] });

  assert.ok(findingCodes(report).has("uncertain_high_risk_execution"));
});

test("delegation does not erase the accountable parent owner", () => {
  const report = auditOutcomeIntegrity({ issues: [
    { id: "parent", title: "Deliver app", status: "in_progress" },
    { id: "child", parentId: "parent", title: "Implement API", status: "todo", assigneeAgentId: "worker" },
  ] });

  assert.ok(findingCodes(report).has("orphan_outcome_parent"));
});

test("optimization work needs an explicit good-enough stopping boundary", () => {
  const report = auditOutcomeIntegrity({ issues: [{
    id: "polish",
    title: "Refactor and polish architecture",
    description: "Acceptance: improve consistency and verify tests.",
    status: "todo",
    assigneeAgentId: "agent",
  }] });

  assert.ok(findingCodes(report).has("optimization_without_stop_boundary"));
});

test("stale or unsupported assumptions are removed from trusted active memory", () => {
  const report = auditOutcomeIntegrity({
    now: new Date("2026-08-03T12:00:00.000Z"),
    issues: [],
    organizationalRecords: [{
      id: "assumption",
      kind: "assumption",
      status: "active",
      title: "Old deployment identity",
      confidence: null,
      evidence: [],
      expiresAt: "2026-08-01T00:00:00.000Z",
    }],
  });

  assert.ok(findingCodes(report).has("active_assumption_hygiene_failure"));
});

test("the same routine name in separate projects is not treated as cross-project duplication", () => {
  const issues = ["soar", "roost", "featherly"].map((projectId) => ({
    id: projectId,
    projectId,
    title: `[${projectId}] Verify release state`,
    description: "Required outcome: owner can inspect current verified state. Done enough: one fresh readback.",
    status: "todo",
    assigneeAgentId: `${projectId}-pm`,
  }));
  const report = auditOutcomeIntegrity({ issues });

  assert.equal(findingCodes(report).has("repeated_open_fingerprint"), false);
});
