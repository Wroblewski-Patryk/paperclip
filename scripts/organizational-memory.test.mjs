import assert from "node:assert/strict";
import test from "node:test";
import {
  findByOrganizationalDedupeKey,
  organizationalDedupeRef,
  prepareOrganizationalPayload,
} from "./lib/organizational-memory.mjs";

const issue = {
  id: "11111111-1111-4111-8111-111111111111",
  identifier: "LUC-123",
  title: "Verify durable learning",
  projectId: "22222222-2222-4222-8222-222222222222",
  goalId: "33333333-3333-4333-8333-333333333333",
};

test("prepares an observation with execution context, provenance, and a stable dedupe ref", () => {
  const payload = prepareOrganizationalPayload({
    mode: "observe",
    dedupeKey: "issue:LUC-123:learning:v1",
    payload: {
      companyId: "must-not-leak-into-body",
      kind: "learning",
      title: "A reusable finding",
      summary: "The repeated condition has inspectable evidence.",
      sourceClass: "test",
      provenance: [{ kind: "document", ref: "doc/test.md" }],
    },
    context: {
      issue,
      agentId: "44444444-4444-4444-8444-444444444444",
      runId: "55555555-5555-4555-8555-555555555555",
    },
    now: "2026-07-17T10:00:00.000Z",
  });

  assert.equal(payload.companyId, undefined);
  assert.equal(payload.issueId, issue.id);
  assert.equal(payload.projectId, issue.projectId);
  assert.equal(payload.goalId, issue.goalId);
  assert.equal(payload.agentId, "44444444-4444-4444-8444-444444444444");
  assert.equal(payload.runId, "55555555-5555-4555-8555-555555555555");
  assert.equal(payload.observedAt, "2026-07-17T10:00:00.000Z");
  assert.deepEqual(payload.provenance.map(({ kind, ref }) => ({ kind, ref })), [
    { kind: "document", ref: "doc/test.md" },
    { kind: "issue", ref: "LUC-123" },
    { kind: "other", ref: organizationalDedupeRef("issue:LUC-123:learning:v1") },
  ]);
});

test("prepares an owned record and preserves explicit payload context", () => {
  const payload = prepareOrganizationalPayload({
    mode: "record",
    dedupeKey: "issue:LUC-123:decision:v1",
    payload: {
      kind: "decision",
      title: "Use the bounded mechanism",
      statement: "Adopt the bounded mechanism.",
      projectId: "66666666-6666-4666-8666-666666666666",
    },
    context: { issue, agentId: "44444444-4444-4444-8444-444444444444" },
    now: "2026-07-17T10:00:00.000Z",
  });

  assert.equal(payload.ownerAgentId, "44444444-4444-4444-8444-444444444444");
  assert.equal(payload.projectId, "66666666-6666-4666-8666-666666666666");
  assert.ok(payload.evidence.some((entry) => entry.ref === "LUC-123"));
});

test("finds a previously written object by dedupe evidence", () => {
  const key = "learning:bounded:v1";
  const expected = {
    id: "observation-1",
    provenance: [{ kind: "other", ref: organizationalDedupeRef(key) }],
  };
  assert.equal(findByOrganizationalDedupeKey([expected], key, "provenance"), expected);
  assert.equal(findByOrganizationalDedupeKey([expected], "different", "provenance"), null);
});

test("rejects empty dedupe keys", () => {
  assert.throws(() => organizationalDedupeRef("  "), /non-empty/);
});

