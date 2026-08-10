import assert from "node:assert/strict";
import test from "node:test";
import { readFile } from "node:fs/promises";
import { buildSoftwarehouseGoalAlignmentPlan, SOFTWAREHOUSE_GOAL_TITLES } from "./lib/softwarehouse-goal-alignment.mjs";

const goal = (id, key, status = "active") => ({ id, title: SOFTWAREHOUSE_GOAL_TITLES[key], status });
const goals = [
  goal("root", "root"), goal("portfolio", "portfolio"), goal("soar", "soarTakeover"),
  goal("roost", "roostTakeover"), goal("featherly", "featherlyTakeover"),
  goal("soar-mature", "soarMaturation"), goal("roost-mature", "roostMaturation"),
  goal("duplicate", "duplicateRoot"), { id: "old-soar", title: "Soar Delivery to VPS", status: "achieved" },
];

test("aligns active control-plane references and preserves terminal issue history", () => {
  const plan = buildSoftwarehouseGoalAlignmentPlan({
    goals,
    projects: [
      { id: "p0", name: "Softwarehouse Operating System", goalIds: ["old"] },
      { id: "p1", name: "Soar", goalIds: ["old-soar"] },
      { id: "p2", name: "Featherly", goalIds: [] },
    ],
    routines: [{ id: "r1", title: "Governor", status: "active", projectId: "p0", goalId: null }],
    issues: [
      { id: "i1", identifier: "LUC-1", status: "todo", projectId: "p1", goalId: "old-soar" },
      { id: "i2", identifier: "LUC-2", status: "todo", projectId: "p2", goalId: null },
      { id: "i3", identifier: "LUC-3", status: "done", projectId: "p1", goalId: "old-soar" },
    ],
  });
  assert.deepEqual(plan.projectUpdates.find((item) => item.id === "p1").goalIds, ["soar", "soar-mature"]);
  assert.equal(plan.routineUpdates[0].goalId, "root");
  assert.deepEqual(plan.issueUpdates.map((item) => [item.id, item.goalId]), [["i1", "soar"], ["i2", "featherly"]]);
  assert.equal(plan.goalUpdates[0].id, "duplicate");
});

test("reports missing canonical goals without proposing mutations", () => {
  const plan = buildSoftwarehouseGoalAlignmentPlan({ goals: [], projects: [], routines: [], issues: [] });
  assert.equal(plan.missingGoals.length, 5);
  assert.equal(plan.issueUpdates.length, 0);
});

test("the recurring control tick audits goal alignment", async () => {
  const source = await readFile(new URL("./run-softwarehouse-control-tick.mjs", import.meta.url), "utf8");
  assert.match(source, /name: "goalAlignment"/);
  assert.match(source, /audit-softwarehouse-goal-alignment\.mjs/);
});
