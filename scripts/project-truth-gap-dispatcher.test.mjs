import assert from "node:assert/strict";
import test from "node:test";

import {
  activeProjectTruthTrackIssues,
  blockingAdmissionControl,
  isReusableProjectTruthGapIssue,
  parseProjectTruthSourceItemId,
  persistentCompletionParentForProject,
  runtimeOwnerNamesForGap,
  selectReusableProjectTruthGapIssue,
} from "./lib/project-truth-gap-dispatcher.mjs";

const marker = "softwarehouse-project-truth-gap-dispatcher:v1";
const terminalStatuses = new Set(["done", "cancelled"]);

test("activeProjectTruthTrackIssues returns active lanes for one track in identifier order", () => {
  const issues = activeProjectTruthTrackIssues({
    projectName: "Roost",
    marker,
    terminalStatuses,
    projects: [
      { id: "softwarehouse", name: "00 General: Softwarehouse", status: "in_progress" },
      { id: "roost", name: "11 Innovation: Roost", status: "in_progress" },
    ],
    issues: [
      {
        id: "pt-1",
        identifier: "LUC-101",
        projectId: "softwarehouse",
        title: "[Roost][Project Truth][App Completion] Prove Billing missing-doc-link",
        description: `${marker}\n\nCurrent dispatch lane`,
        status: "todo",
      },
      {
        id: "pt-2",
        identifier: "LUC-100",
        projectId: "softwarehouse",
        title: "[Roost][Project Truth][App Completion] Prove Account access missing-test-link",
        description: `${marker}\n\nOlder dispatch lane`,
        status: "in_progress",
      },
      {
        id: "pt-3",
        identifier: "LUC-102",
        projectId: "softwarehouse",
        title: "[Soar][Project Truth][App Completion] Prove Session docs missing-doc-link",
        description: `${marker}\n\nOther track`,
        status: "todo",
      },
    ],
  });

  assert.deepEqual(issues.map((issue) => issue.identifier), ["LUC-100", "LUC-101"]);
});

test("activeProjectTruthTrackIssues ignores blocked-only lanes for depth counting", () => {
  const issues = activeProjectTruthTrackIssues({
    projectName: "Roost",
    marker,
    terminalStatuses,
    projects: [
      { id: "softwarehouse", name: "00 General: Softwarehouse", status: "in_progress" },
      { id: "roost", name: "11 Innovation: Roost", status: "in_progress" },
    ],
    issues: [
      {
        id: "pt-1",
        identifier: "LUC-100",
        projectId: "softwarehouse",
        title: "[Roost][Project Truth][App Completion] Prove Billing missing-doc-link",
        description: `${marker}\n\nOlder blocked lane`,
        status: "blocked",
      },
    ],
  });

  assert.equal(issues.length, 0);
});

test("activeProjectTruthTrackIssues ignores backlog-only lanes for depth counting", () => {
  const issues = activeProjectTruthTrackIssues({
    projectName: "Soar",
    marker,
    terminalStatuses,
    projects: [{ id: "soar", name: "11 Innovation: Soar", status: "in_progress" }],
    issues: [{
      id: "pt-backlog",
      identifier: "LUC-103",
      projectId: "soar",
      title: "[Soar][Project Truth][App Completion] Prove login browser-review",
      description: `${marker}\n\nBacklog is inventory, not a runnable lane`,
      status: "backlog",
    }],
  });

  assert.equal(issues.length, 0);
});

test("parseProjectTruthSourceItemId extracts the indexed source item id", () => {
  assert.equal(parseProjectTruthSourceItemId({
    description: `${marker}\n\nGap:\n- source item: function:mergegoogledriveconfig:814153a3bb`,
  }), "function:mergegoogledriveconfig:814153a3bb");
});

test("runtime gap routing separates monitor egress from production outage owners", () => {
  const monitorOwners = runtimeOwnerNamesForGap({
    kind: "monitor_environment_error",
    classification: "monitor_environment",
    severity: "high",
  });
  assert.equal(monitorOwners[0], "Runtime and Adapter Engineer");
  assert.equal(monitorOwners.includes("Deployment & Reliability Engineer"), false);

  const productionOwners = runtimeOwnerNamesForGap({
    kind: "runtime_error",
    classification: "production_outage",
    severity: "critical",
  });
  assert.equal(productionOwners[0], "Deployment & Reliability Engineer");
  assert.equal(productionOwners.includes("Ops Release Lead"), true);
});

test("blockingAdmissionControl recognizes native no-start states", () => {
  assert.equal(blockingAdmissionControl([{ state: "open" }]), null);
  assert.equal(blockingAdmissionControl([{ state: "maintenance", version: 1 }])?.state, "maintenance");
  assert.equal(blockingAdmissionControl([{ state: "reopening" }])?.state, "reopening");
});

test("persistentCompletionParentForProject selects only the live canonical parent", () => {
  const issues = [
    { id: "alias", identifier: "LUC-999", title: "Soar completion", status: "todo" },
    { id: "soar-parent", identifier: "LUC-27", title: "Soar build-to-production", status: "blocked" },
    { id: "roost-parent", identifier: "LUC-28", title: "Roost build-to-production", status: "done" },
  ];

  assert.equal(persistentCompletionParentForProject({ projectName: "Soar", issues })?.id, "soar-parent");
  assert.equal(persistentCompletionParentForProject({ projectName: "Roost", issues }), null);
  assert.equal(persistentCompletionParentForProject({ projectName: "Aviary", issues }), null);
});

test("activeProjectTruthTrackIssues requires the persistent parent when supplied", () => {
  const issues = activeProjectTruthTrackIssues({
    projectName: "Soar",
    marker,
    completionParentId: "soar-parent",
    terminalStatuses,
    projects: [{ id: "soar", name: "11 Innovation: Soar", status: "in_progress" }],
    issues: [
      {
        id: "attached",
        identifier: "LUC-104",
        parentId: "soar-parent",
        projectId: "soar",
        title: "[Soar][Project Truth] Attached",
        description: marker,
        status: "todo",
      },
      {
        id: "detached",
        identifier: "LUC-105",
        parentId: null,
        projectId: "soar",
        title: "[Soar][Project Truth] Detached",
        description: marker,
        status: "todo",
      },
    ],
  });

  assert.deepEqual(issues.map((issue) => issue.id), ["attached"]);
});

test("detached and backlog copies cannot suppress a runnable child under the persistent parent", () => {
  const completionParentId = "soar-parent";

  assert.equal(isReusableProjectTruthGapIssue({
    id: "detached",
    parentId: null,
    status: "todo",
  }, completionParentId), false);
  assert.equal(isReusableProjectTruthGapIssue({
    id: "backlog",
    parentId: completionParentId,
    status: "backlog",
  }, completionParentId), false);
  assert.equal(isReusableProjectTruthGapIssue({
    id: "blocked",
    parentId: completionParentId,
    status: "blocked",
  }, completionParentId), false);
  assert.equal(isReusableProjectTruthGapIssue({
    id: "runnable",
    parentId: completionParentId,
    status: "todo",
  }, completionParentId), true);
});

test("selectReusableProjectTruthGapIssue ignores detached history and picks the runnable child lane", () => {
  const completionParentId = "soar-parent";

  const selected = selectReusableProjectTruthGapIssue([
    {
      id: "detached-older",
      identifier: "LUC-100",
      parentId: null,
      status: "todo",
      createdAt: "2026-07-20T10:00:00.000Z",
    },
    {
      id: "attached-runnable",
      identifier: "LUC-101",
      parentId: completionParentId,
      status: "todo",
      createdAt: "2026-07-20T11:00:00.000Z",
    },
    {
      id: "attached-backlog",
      identifier: "LUC-099",
      parentId: completionParentId,
      status: "backlog",
      createdAt: "2026-07-20T09:00:00.000Z",
    },
  ], completionParentId);

  assert.equal(selected?.id, "attached-runnable");
});

test("selectReusableProjectTruthGapIssue returns null when only detached or blocked copies exist", () => {
  const completionParentId = "soar-parent";

  const selected = selectReusableProjectTruthGapIssue([
    {
      id: "detached",
      identifier: "LUC-100",
      parentId: null,
      status: "todo",
    },
    {
      id: "blocked",
      identifier: "LUC-101",
      parentId: completionParentId,
      status: "blocked",
    },
  ], completionParentId);

  assert.equal(selected, null);
});
