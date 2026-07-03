import assert from "node:assert/strict";
import test from "node:test";
import { resolveRuntimeBindingRepairSummary } from "./lib/softwarehouse-runtime-binding-repair-summary.mjs";

test("resolved manual runtime-binding assignment is removed after project ownership assignment", () => {
  const summary = resolveRuntimeBindingRepairSummary(
    {
      actionCount: 2,
      reassignCount: 0,
      manualCount: 2,
      actions: [
        {
          type: "needs_manual_assignment",
          identifier: "LUC-3602",
          status: "todo",
          fromAgentName: null,
          toAgentName: null,
          missingGroups: ["coolify"],
        },
        {
          type: "needs_manual_assignment",
          identifier: "LUC-3603",
          status: "todo",
          fromAgentName: null,
          toAgentName: null,
          missingGroups: ["coolify"],
        },
      ],
    },
    {
      actions: [
        {
          action: "assigned_issue_to_project_pm",
          identifier: "LUC-3602",
          assigneeName: "11 SPM (Soar Product Manager)",
        },
      ],
    },
  );

  assert.equal(summary.actionCount, 1);
  assert.equal(summary.manualCount, 1);
  assert.equal(summary.reassignCount, 0);
  assert.deepEqual(summary.actions.map((action) => action.identifier), ["LUC-3603"]);
});

test("non-manual runtime-binding actions remain in the summary", () => {
  const summary = resolveRuntimeBindingRepairSummary(
    {
      actionCount: 2,
      reassignCount: 1,
      manualCount: 1,
      actions: [
        {
          type: "reassign_runtime_binding_owner",
          identifier: "LUC-4000",
          fromAgentName: "Old Owner",
          toAgentName: "New Owner",
        },
        {
          type: "needs_manual_assignment",
          identifier: "LUC-4001",
          missingGroups: ["coolify"],
        },
      ],
    },
    {
      actions: [
        {
          action: "noop_existing_project_pm",
          identifier: "LUC-4001",
        },
      ],
    },
  );

  assert.equal(summary.actionCount, 2);
  assert.equal(summary.manualCount, 1);
  assert.equal(summary.reassignCount, 1);
  assert.deepEqual(summary.actions.map((action) => action.identifier), ["LUC-4000", "LUC-4001"]);
});
