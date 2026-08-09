import assert from "node:assert/strict";
import test from "node:test";

import { projectByNameOrUrlKey } from "./lib/softwarehouse-project-selector.mjs";

test("project selector prefers an operational project over an exact-name cancelled shell", () => {
  const selected = projectByNameOrUrlKey([
    { id: "cancelled", name: "Soar", urlKey: "soar", status: "cancelled" },
    { id: "canonical", name: "11 Innovation: Soar", urlKey: "soar", status: "in_progress" },
  ], ["Soar"], ["soar"]);

  assert.equal(selected?.id, "canonical");
});

test("project selector falls back to a historical match when no operational match exists", () => {
  const selected = projectByNameOrUrlKey([
    { id: "cancelled", name: "Soar", urlKey: "soar", status: "cancelled" },
  ], ["Soar"], ["soar"]);

  assert.equal(selected?.id, "cancelled");
});
