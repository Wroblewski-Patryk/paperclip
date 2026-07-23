import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";

import {
  controlledProjectNameFor,
  filterSupersededProjectTruthLanes,
  formatTrackDispositionSummary,
  formatWeakTrackSummary,
  formatWorkerFanoutContract,
  summarizeWorkerBacklogTracks,
  workerBacklogTrackForIssue,
} from "./lib/softwarehouse-worker-backlog-tracks.mjs";

test("filterSupersededProjectTruthLanes removes stale reserve gaps when current truth is zero", () => {
  const projects = [{ id: "roost", name: "11 Innovation: Roost", status: "in_progress", archivedAt: null }];
  const issues = [
    {
      id: "stale",
      projectId: "roost",
      status: "backlog",
      title: "[Roost][Project Truth][App Completion] Prove missing-test-link",
      description: "Source item: api_endpoint:use-projects:2ab7f26357",
    },
    { id: "release", projectId: "roost", status: "todo", title: "[Roost][Release] Verify current VPS build" },
  ];

  assert.deepEqual(
    filterSupersededProjectTruthLanes({
      issues,
      projects,
      currentGapIdsByTrack: new Map([["Roost", new Set()]]),
    }).map((issue) => issue.id),
    ["release"],
  );
});

test("filterSupersededProjectTruthLanes retains current and unknown truth lanes", () => {
  const projects = [{ id: "soar", name: "Soar", status: "in_progress", archivedAt: null }];
  const issue = {
    id: "current",
    projectId: "soar",
    status: "backlog",
    title: "[Soar][Project Truth][App Completion] Prove browser review",
    description: "Source item: route:page-tsx:abc123",
  };

  assert.equal(filterSupersededProjectTruthLanes({
    issues: [issue],
    projects,
    currentGapIdsByTrack: new Map([["Soar", new Set(["route:page-tsx:abc123"])]]),
  }).length, 1);
  assert.equal(filterSupersededProjectTruthLanes({
    issues: [issue],
    projects,
    currentGapIdsByTrack: new Map(),
  }).length, 1);
});

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

  assert.deepEqual(summary.weakTracks.map((track) => track.track), ["Roost", "Soar"]);
  assert.equal(summary.trackDispositions.find((track) => track.track === "Roost")?.disposition, "needs-another-child");
  assert.equal(
    formatWeakTrackSummary(summary.weakTracks[0]),
    "Roost: runnable worker=0, planned worker=0, planned supervisor=1, open=3, blocked=1",
  );
});

test("planned backlog reserve does not masquerade as runnable worker work", () => {
  const projects = [{ id: "roost", name: "11 Innovation: Roost", status: "in_progress" }];
  const agentById = new Map([
    ["worker", { id: "worker", name: "09 TAE", metadata: { rosterKey: "test-automation-engineer" } }],
  ]);
  const summary = summarizeWorkerBacklogTracks({
    issues: [1, 2, 3].map((number) => ({
      id: `issue-${number}`,
      identifier: `LUC-${number}`,
      projectId: "roost",
      title: `[Roost] Planned worker ${number}`,
      status: "backlog",
      assigneeAgentId: "worker",
    })),
    projects,
    agentById,
    isWorker: (agent) => agent?.metadata?.rosterKey === "test-automation-engineer",
    isSupervisor: () => false,
    terminalStatuses: new Set(["done", "cancelled"]),
    plannedStatuses: new Set(["todo", "backlog"]),
  });

  assert.equal(summary.trackSummaries[0].plannedWorkerIssueCount, 3);
  assert.equal(summary.trackSummaries[0].runnableWorkerIssueCount, 0);
  assert.equal(summary.trackDispositions[0].disposition, "needs-another-child");
  assert.deepEqual(
    summary.trackDispositions[0].promotableBacklogWorkerIssues.map((issue) => [issue.identifier, issue.assigneeName, issue.title]),
    [
      ["LUC-1", "09 TAE", "[Roost] Planned worker 1"],
      ["LUC-2", "09 TAE", "[Roost] Planned worker 2"],
      ["LUC-3", "09 TAE", "[Roost] Planned worker 3"],
    ],
  );
  assert.deepEqual(summary.weakTracks.map((track) => track.track), ["Roost"]);
});

test("an active leaf worker is a healthy closure path when it owns the entire track backlog", () => {
  const projects = [
    { id: "roost", name: "11 Innovation: Roost", status: "in_progress" },
  ];
  const agentById = new Map([
    ["tae", { id: "tae", metadata: { rosterKey: "test-automation-engineer" } }],
  ]);
  const summary = summarizeWorkerBacklogTracks({
    issues: [{
      projectId: "roost",
      title: "[Roost][Project Truth] Active proof",
      status: "in_progress",
      assigneeAgentId: "tae",
    }],
    projects,
    agentById,
    isWorker: (agent) => agent?.metadata?.rosterKey === "test-automation-engineer",
    isSupervisor: () => false,
    terminalStatuses: new Set(["done", "cancelled"]),
    plannedStatuses: new Set(["todo", "backlog"]),
  });

  assert.equal(summary.trackSummaries[0].inProgressWorkerIssueCount, 1);
  assert.deepEqual(summary.weakTracks, []);
  assert.equal(summary.trackDispositions[0].disposition, "ready");
  assert.equal(summary.trackDispositions[0].dispositionReason, "active_worker_owns_entire_track_backlog");
});

test("track dispositions report ready, blocked, and needs-another-child per controlled project", () => {
  const projects = [
    { id: "roost", name: "11 Innovation: Roost", status: "in_progress" },
    { id: "soar", name: "11 Innovation: Soar", status: "in_progress" },
  ];
  const agentById = new Map([
    ["worker", { id: "worker", metadata: { rosterKey: "test-automation-engineer" } }],
  ]);
  const summary = summarizeWorkerBacklogTracks({
    issues: [
      { projectId: "soar", title: "[Soar] Worker 1", status: "todo", assigneeAgentId: "worker" },
      { projectId: "soar", title: "[Soar] Worker 2", status: "todo", assigneeAgentId: "worker" },
      { projectId: "soar", title: "[Soar] Worker 3", status: "todo", assigneeAgentId: "worker" },
      { projectId: "roost", title: "[Roost] Worker 1", status: "todo", assigneeAgentId: "worker" },
      { projectId: "roost", title: "[Roost] Gate A", status: "blocked", assigneeAgentId: "worker", blockedBy: [{ identifier: "LUC-1" }] },
      { projectId: "roost", title: "[Roost] Gate B", status: "blocked", assigneeAgentId: "worker", blockedBy: [{ identifier: "LUC-2" }] },
    ],
    projects,
    agentById,
    isWorker: (agent) => agent?.metadata?.rosterKey === "test-automation-engineer",
    isSupervisor: () => false,
    terminalStatuses: new Set(["done", "cancelled"]),
    plannedStatuses: new Set(["todo", "backlog"]),
  });

  assert.deepEqual(
    summary.trackDispositions.map((track) => [track.track, track.disposition]),
    [["Roost", "blocked"], ["Soar", "ready"]],
  );
  assert.equal(
    formatTrackDispositionSummary(summary.trackSummaries[0]),
    "Roost: blocked (runnable=1/1, planned=1/3, named blockers=2)",
  );
});

test("project truth can legally hold per-track fan-out without creating duplicate product lanes", () => {
  const projects = [{ id: "roost", name: "11 Innovation: Roost", status: "in_progress" }];
  const agentById = new Map([
    ["worker", { id: "worker", metadata: { rosterKey: "test-automation-engineer" } }],
  ]);
  const summary = summarizeWorkerBacklogTracks({
    issues: [
      {
        projectId: "roost",
        title: "[Roost][Validation] Prove read-only local-Paperclip-to-hosted-Roost canary for v1.0 contract",
        status: "blocked",
        assigneeAgentId: "worker",
      },
    ],
    projects,
    agentById,
    isWorker: (agent) => agent?.metadata?.rosterKey === "test-automation-engineer",
    isSupervisor: () => false,
    terminalStatuses: new Set(["done", "cancelled"]),
    plannedStatuses: new Set(["todo", "backlog"]),
    trackTruthByTrack: new Map([["Roost", {
      projectTruthStatus: "known_and_routable",
      currentGapCount: 0,
      openBlockingEntries: [{ id: "SR-001" }],
      deferredEntries: [{ id: "SR-002" }],
      externalNonBlockingEntries: [{ id: "SR-003" }],
      allowsNewProductLane: false,
      holdReason: "release_gap_open_blocker_only",
      holdSummary: "Current project truth has no routable gaps; release gap register stays blocked by SR-001.",
    }]]),
  });

  assert.deepEqual(summary.weakTracks, []);
  assert.equal(summary.trackDispositions[0].disposition, "blocked");
  assert.equal(summary.trackDispositions[0].fanoutDecision, "hold");
  assert.equal(summary.trackDispositions[0].fanoutReason, "release_gap_open_blocker_only");
  assert.match(summary.trackDispositions[0].fanoutSummary, /SR-001/);
  assert.equal(
    formatTrackDispositionSummary(summary.trackSummaries[0]),
    "Roost: blocked (runnable=0/1, planned=0/3, named blockers=0, fanout=hold:release_gap_open_blocker_only)",
  );
});

test("formatWorkerFanoutContract keeps the fan-out rule track-scoped and evidence-named", () => {
  const contract = formatWorkerFanoutContract();

  assert.match(contract, /Soar/);
  assert.match(contract, /Roost/);
  assert.match(contract, /ready, blocked, or needs-another-child/);
  assert.match(contract, /project, scope, affected files\/entities, acceptance criteria, local proof, blocker policy, and handoff owner/);
  assert.match(contract, /do not create agents silently/);
});

test("worker backlog and learning planners exclude recurring controller issues", async () => {
  const workerSeeder = await readFile("scripts/run-worker-backlog-decomposition-seeder.mjs", "utf8");
  const learningLoop = await readFile("scripts/run-softwarehouse-learning-loop.mjs", "utf8");

  assert.match(workerSeeder, /issue\.originKind !== "routine_execution"/);
  assert.match(workerSeeder, /existing backlog worker lanes to promote before creating duplicates/);
  assert.match(workerSeeder, /action: "noop_controlled_repo_source_control_closure_required"/);
  assert.match(workerSeeder, /"LuckySparrow Software House", "LuckySparrow"/);
  assert.match(workerSeeder, /process\.env\.PAPERCLIP_COMPANY_ID \?\? process\.env\.SOFTWAREHOUSE_COMPANY_ID/);
  assert.match(learningLoop, /issue\.originKind !== "routine_execution"/);
});
