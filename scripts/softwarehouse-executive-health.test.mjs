import assert from "node:assert/strict";
import test from "node:test";

import { selectExecutiveProject } from "./lib/softwarehouse-executive-health.mjs";

test("executive health selects canonical active projects over archived short aliases", () => {
  const projects = [
    { id: "legacy-soar", name: "Soar", archivedAt: "2026-07-10T00:56:53.175Z" },
    { id: "canonical-soar", name: "11 Innovation: Soar", archivedAt: null },
    { id: "legacy-roost", name: "Roost", archivedAt: "2026-07-10T00:56:53.762Z" },
    { id: "canonical-roost", name: "11 Innovation: Roost", archivedAt: null },
  ];

  assert.equal(selectExecutiveProject(projects, "Soar")?.id, "canonical-soar");
  assert.equal(selectExecutiveProject(projects, "Roost")?.id, "canonical-roost");
});

test("executive health never returns an archived project", () => {
  const projects = [
    { id: "legacy-soar", name: "Soar", archivedAt: "2026-07-10T00:56:53.175Z" },
  ];

  assert.equal(selectExecutiveProject(projects, "Soar"), null);
});
