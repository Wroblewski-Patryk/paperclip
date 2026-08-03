import test from "node:test";
import assert from "node:assert/strict";

import { auditOutcomeIntegrity, normalizeOutcomeFingerprint } from "./lib/outcome-integrity.mjs";

test("normalizes retry-shaped issue titles into one recurrence fingerprint", () => {
  assert.equal(
    normalizeOutcomeFingerprint("[Roost] Retry LUC-123: Verify account flow 2"),
    normalizeOutcomeFingerprint("[Roost] Follow-up: Verify account flow 9"),
  );
});

test("detects fanout, weak contracts, repetition, and typed-evidence gaming", () => {
  const children = [1, 2, 3, 4].map((number) => ({
    id: `child-${number}`,
    parentId: "parent",
    title: `[Roost] Retry verify account flow ${number}`,
    status: "todo",
    assigneeAgentId: "worker",
    description: "Check it",
    acceptanceCriteria: [],
  }));
  const report = auditOutcomeIntegrity({
    now: new Date("2026-08-03T12:00:00.000Z"),
    issues: [
      { id: "parent", title: "[Roost] Account flow", status: "in_progress", assigneeAgentId: "pm", acceptanceCriteria: ["User can sign in; verify with browser proof"] },
      ...children,
      {
        id: "done",
        title: "[Roost] Fix login API",
        status: "done",
        updatedAt: "2026-08-03T10:00:00.000Z",
        completionEvidence: {
          summary: "Documentation report completed",
          testEvidence: { summary: "report", refs: [{ kind: "request_comment" }] },
          reviewEvidence: { summary: "comment review", refs: [{ kind: "request_comment" }] },
          documentationEvidence: { summary: "docs", refs: [{ kind: "request_comment" }] },
        },
      },
    ],
  });

  const codes = new Set(report.findings.map((finding) => finding.code));
  assert.equal(report.status, "warning");
  assert.ok(codes.has("excessive_open_fanout"));
  assert.ok(codes.has("repeated_open_fingerprint"));
  assert.ok(codes.has("weak_outcome_contract"));
  assert.ok(codes.has("comment_only_completion_evidence"));
  assert.ok(codes.has("documentation_only_technical_closure"));
});

test("strict failure is reserved for recent done work without typed evidence", () => {
  const report = auditOutcomeIntegrity({
    now: new Date("2026-08-03T12:00:00.000Z"),
    issues: [{ id: "done", title: "Done", status: "done", updatedAt: "2026-08-03T11:00:00.000Z" }],
  });
  assert.equal(report.status, "fail");
  assert.equal(report.summary.errorCount, 1);
});

test("does not merge the same operating pattern across separate application projects", () => {
  const report = auditOutcomeIntegrity({
    issues: ["soar", "roost", "featherly"].map((projectId) => ({
      id: projectId,
      projectId,
      title: `[${projectId}] Daily project status refresh`,
      status: "todo",
      assigneeAgentId: "pm",
      description: "Required outcome: owner can inspect a verified current project state. Acceptance: evidence is linked.",
    })),
  });
  assert.equal(report.findings.some((finding) => finding.code === "repeated_open_fingerprint"), false);
});
