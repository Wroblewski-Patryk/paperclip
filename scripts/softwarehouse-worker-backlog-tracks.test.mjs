import test from "node:test";
import assert from "node:assert/strict";

import {
  controlledProjectNameFor,
  formatWeakTrackSummary,
  summarizeWorkerBacklogTracks,
  workerBacklogTrackForIssue,
} from "./lib/softwarehouse-worker-backlog-tracks.mjs";

test("controlledProjectNameFor resolves canonical Soar and Roost aliases", () => {
  assert.equal(controlledProjectNameFor("11 Innovation: Soar"), "Soar");
  assert.equal(controlledProjectNameFor("Roost"), "Roost");
  assert.equal(controlledProjectNameFor("00 General: Softwarehouse"), null);
});

test("workerBacklogTrackForIssue prefers title tag when the issue sits in the Softwarehouse project", () => {
  const projectById = new Map([
    ["softwarehouse", { id: "softwarehouse", name: "00 General: Softwarehouse" }],
  ]);
  const track = workerBacklogTrackForIssue({
    projectId: "softwarehouse",
    title: "[Roost][Project Truth][App Completion] Prove Account access missing-test-link",
  }, projectById);

  assert.equal(track, "Roost");
});

test("summarizeWorkerBacklogTracks flags a weak Roost track even when company-wide worker counts are non-zero", () => {
  const projects = [
    { id: "softwarehouse", name: "00 General: Softwarehouse", status: "in_progress" },
    { id: "roost", name: "11 Innovation: Roost", status: "in_progress" },
    { id: "soar", name: "11 Innovation: Soar", status: "in_progress" },
  ];
  const agentById = new Map([
    ["tae", { id: "tae", metadata: { rosterKey: "test-automation-engineer" } }],
    ["dsm", { id: "dsm", metadata: { rosterKey: "documentation-steward" } }],
    ["rpm", { id: "rpm", metadata: { rosterKey: "roost-product-manager" } }],
  ]);
  const issues = [
    {
      projectId: "softwarehouse",
      title: "[Roost][Project Truth][App Completion] Prove Account access missing-test-link",
      status: "in_progress",
      assigneeAgentId: "tae",
    },
    {
      projectId: "softwarehouse",
      title: "[Roost][Project Truth][App Completion] Prove Billing missing-doc-link",
      status: "blocked",
      assigneeAgentId: "dsm",
    },
    {
      projectId: "softwarehouse",
      title: "[Roost] Supervisor-held repair lane",
      status: "todo",
      assigneeAgentId: "rpm",
    },
    {
      projectId: "softwarehouse",
      title: "[Soar][Project Truth][App Completion] Prove Account access missing-doc-link",
      status: "todo",
      assigneeAgentId: "dsm",
    },
  ];

  const summary = summarizeWorkerBacklogTracks({
    issues,
    projects,
    agentById,
    isWorker: (agent) => ["test-automation-engineer", "documentation-steward"].includes(agent?.metadata?.rosterKey),
    isSupervisor: (agent) => ["roost-product-manager"].includes(agent?.metadata?.rosterKey),
    terminalStatuses: new Set(["done", "cancelled"]),
    plannedStatuses: new Set(["todo", "backlog"]),
  });

  assert.deepEqual(summary.weakTracks.map((track) => track.track), ["Roost"]);
  assert.equal(
    formatWeakTrackSummary(summary.weakTracks[0]),
    "Roost: planned worker=0, planned supervisor=1, open=3, blocked=1",
  );
});
