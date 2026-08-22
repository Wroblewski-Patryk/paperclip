import test from "node:test";
import assert from "node:assert/strict";
import {
  buildAppFirstControlPolicy,
  shouldSkipControlStep,
} from "./lib/softwarehouse-app-first-control-policy.mjs";

const projects = [
  { id: "control", name: "00 General: Softwarehouse", status: "in_progress", archivedAt: null },
  { id: "soar", name: "11 Innovation: Soar", status: "in_progress", archivedAt: null },
];

test("application debt suppresses issue-generating Paperclip control steps", () => {
  const policy = buildAppFirstControlPolicy({
    projects,
    issues: [
      { id: "app-1", projectId: "soar", status: "todo", assigneeAgentId: "agent" },
      { id: "self-1", projectId: "control", status: "todo", assigneeAgentId: "doctor" },
    ],
    openIssueSoftLimit: 80,
  });

  assert.equal(policy.protectApplicationDelivery, true);
  assert.equal(policy.applicationOpenIssueCount, 1);
  assert.equal(policy.controlPlaneOpenIssueCount, 1);
  assert.equal(shouldSkipControlStep("learningLoop", policy), true);
  assert.equal(shouldSkipControlStep("liveRunJanitor", policy), false);
});

test("issue generation remains fail-closed under portfolio pressure", () => {
  const issues = Array.from({ length: 3 }, (_, index) => ({
    id: `self-${index}`,
    projectId: "control",
    status: "todo",
    assigneeAgentId: "doctor",
  }));
  const policy = buildAppFirstControlPolicy({ projects, issues, openIssueSoftLimit: 3 });

  assert.equal(policy.closureOnly, true);
  assert.equal(policy.protectApplicationDelivery, true);
  assert.equal(shouldSkipControlStep("workerBacklogDecompositionSeeder", policy), true);
});

test("generation can return only when applications have no debt and pressure is low", () => {
  const policy = buildAppFirstControlPolicy({ projects, issues: [], openIssueSoftLimit: 80 });
  assert.equal(policy.protectApplicationDelivery, false);
  assert.equal(shouldSkipControlStep("projectTruthGapDispatcher", policy), false);
  assert.equal(shouldSkipControlStep("learningLoop", policy), true);
});
