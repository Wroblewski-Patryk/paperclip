import assert from "node:assert/strict";
import test from "node:test";

import {
  activeProjectTruthTrackIssues,
  parseProjectTruthSourceItemId,
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

test("parseProjectTruthSourceItemId extracts the indexed source item id", () => {
  assert.equal(parseProjectTruthSourceItemId({
    description: `${marker}\n\nGap:\n- source item: function:mergegoogledriveconfig:814153a3bb`,
  }), "function:mergegoogledriveconfig:814153a3bb");
});
