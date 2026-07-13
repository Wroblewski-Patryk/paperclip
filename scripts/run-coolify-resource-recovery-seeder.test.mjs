import assert from "node:assert/strict";
import test from "node:test";

import { parseUnhealthyCoolifyResources } from "./run-coolify-resource-recovery-seeder.mjs";

test("parses one unhealthy Coolify resource without exposing unrelated text", () => {
  assert.deepEqual(
    parseUnhealthyCoolifyResources(
      "Coolify resource inventory found unhealthy resources: workers-backtest:exited:unhealthy.",
    ),
    [{ name: "workers-backtest", status: "exited:unhealthy" }],
  );
});

test("parses multiple resource statuses and rejects malformed names", () => {
  assert.deepEqual(
    parseUnhealthyCoolifyResources(
      "Unhealthy resources: workers-a:exited:unhealthy, workers-b:stopped:unknown.",
    ),
    [
      { name: "workers-a", status: "exited:unhealthy" },
      { name: "workers-b", status: "stopped:unknown" },
    ],
  );
  assert.deepEqual(parseUnhealthyCoolifyResources("No unhealthy resources."), []);
});
