import assert from "node:assert/strict";
import test from "node:test";
import {
  buildInReviewDecisionInteraction,
  classifyInReviewDecisionAuthority,
  classifyInteractionDecisionAuthority,
  findPendingStructuredDecisionInteraction,
  hasStructuredInReviewDecisionPath,
  isMisroutedTechnicalInteraction,
  resolutionActionForTechnicalInteraction,
  reserveTechnicalReviewRecovery,
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

test("generic governor issue routes a local dirty-worktree commit question to technical review", () => {
  const issue = { title: "Autonomy Governor", status: "in_review" };
  const interaction = {
    status: "pending",
    createdByAgentId: "55555555-5555-4555-8555-555555555555",
    kind: "ask_user_questions",
    payload: { questions: [{ question: "Should this dirty change be committed after targeted validation?" }] },
  };
  assert.equal(classifyInteractionDecisionAuthority(issue, interaction), "technical_reviewer");
  assert.equal(isMisroutedTechnicalInteraction(issue, interaction), true);
});

test("interaction-level production or push request remains owner-gated", () => {
  const issue = { title: "Autonomy Governor", status: "in_review" };
  const interaction = { status: "pending", payload: { prompt: "Push and deploy this commit to production?" } };
  assert.equal(classifyInteractionDecisionAuthority(issue, interaction), "owner");
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

test("reversible runtime and source-control reviews stay inside the autonomous specialist lane", () => {
  const issue = {
    id: "33333333-3333-4333-8333-333333333333",
    identifier: "LUC-2615",
    title: "[Featherly][Source Control] Commit focused logout coverage test",
    description: "Create one local commit. Do not push or deploy.",
    status: "in_review",
  };
  const interaction = {
    id: "44444444-4444-4444-8444-444444444444",
    kind: "request_confirmation",
    status: "pending",
    createdByAgentId: "55555555-5555-4555-8555-555555555555",
  };

  assert.equal(classifyInReviewDecisionAuthority(issue), "technical_reviewer");
  assert.equal(isMisroutedTechnicalInteraction(issue, interaction), true);
  assert.throws(() => buildInReviewDecisionInteraction(issue), /Technical review/);
});

test("production, credential, and owner acceptance choices remain owner-gated", () => {
  for (const title of [
    "Deploy Featherly to production",
    "Provision approved least-privilege Coolify QA access",
    "Approve and bind owner QA session",
    "Rotate exposed SMTP credential",
    "Record owner acceptance",
  ]) {
    assert.equal(classifyInReviewDecisionAuthority({ title }), "owner");
  }
});

test("misrouted technical questions are cancellable while confirmations are rejectable", () => {
  assert.equal(resolutionActionForTechnicalInteraction("ask_user_questions"), "cancel");
  assert.equal(resolutionActionForTechnicalInteraction("request_confirmation"), "reject");
  assert.equal(resolutionActionForTechnicalInteraction("suggest_tasks"), "reject");
});

test("technical recovery is bounded to one issue per project and three projects per pass", () => {
  const state = { count: 0, projectKeys: new Set() };
  assert.equal(reserveTechnicalReviewRecovery({ id: "a", projectId: "p1" }, state), true);
  assert.equal(reserveTechnicalReviewRecovery({ id: "b", projectId: "p1" }, state), false);
  assert.equal(reserveTechnicalReviewRecovery({ id: "c", projectId: "p2" }, state), true);
  assert.equal(reserveTechnicalReviewRecovery({ id: "d", projectId: "p3" }, state), true);
  assert.equal(reserveTechnicalReviewRecovery({ id: "e", projectId: "p4" }, state), false);
});
