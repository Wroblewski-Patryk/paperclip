import assert from "node:assert/strict";
import test from "node:test";
import {
  buildInReviewDecisionInteraction,
  findPendingStructuredDecisionInteraction,
  hasStructuredInReviewDecisionPath,
} from "./lib/in-review-decision-path.mjs";

test("board-owned in_review issue without typed path is not treated as structured", () => {
  const issue = {
    id: "11111111-1111-4111-8111-111111111111",
    identifier: "LUC-1236",
    status: "in_review",
    assigneeUserId: "local-board",
    executionPolicy: null,
    executionState: null,
    reviewerUserId: null,
    currentParticipantId: null,
  };

  assert.equal(hasStructuredInReviewDecisionPath(issue, {
    liveIssueIds: new Set(),
    interactions: [],
    approvals: [],
  }), false);

  const interaction = buildInReviewDecisionInteraction(issue);
  assert.equal(interaction.kind, "request_confirmation");
  assert.equal(interaction.idempotencyKey, `softwarehouse-in-review-decision-path:${issue.id}:v1`);
  assert.equal(interaction.continuationPolicy, "wake_assignee");
  assert.match(interaction.payload.detailsMarkdown, /Decision owner: board user `local-board`/);
  assert.match(interaction.payload.detailsMarkdown, /Allowed decision options:/);
  assert.match(interaction.payload.detailsMarkdown, /Next-check expectation:/);
  assert.match(interaction.payload.detailsMarkdown, /Next owner after decision:/);
  assert.equal(interaction.payload.target?.href, "/LUC/issues/LUC-1236");
});

test("pending typed interaction suppresses duplicate in_review wait repair", () => {
  const issue = {
    id: "11111111-1111-4111-8111-111111111111",
    identifier: "LUC-1236",
    status: "in_review",
    assigneeUserId: "local-board",
  };
  const interactions = [
    {
      id: "22222222-2222-4222-8222-222222222222",
      kind: "request_confirmation",
      status: "pending",
      idempotencyKey: `softwarehouse-in-review-decision-path:${issue.id}:v1`,
    },
  ];

  assert.equal(hasStructuredInReviewDecisionPath(issue, {
    liveIssueIds: new Set(),
    interactions,
    approvals: [],
  }), true);
  assert.deepEqual(findPendingStructuredDecisionInteraction(interactions), interactions[0]);
});
