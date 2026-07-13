import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

import {
  blockingLiveRunCount,
  parseUnhealthyCoolifyResources,
} from "./run-coolify-resource-recovery-seeder.mjs";

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

test("ignores the invoking watchdog run but blocks independent live work", () => {
  const currentRun = { id: "run-current" };
  const otherRun = { id: "run-other" };

  assert.equal(blockingLiveRunCount({
    activeRunCount: 1,
    liveRuns: [currentRun],
    currentRunId: currentRun.id,
  }), 0);
  assert.equal(blockingLiveRunCount({
    activeRunCount: 2,
    liveRuns: [currentRun, otherRun],
    currentRunId: currentRun.id,
  }), 1);
  assert.equal(blockingLiveRunCount({
    activeRunCount: 1,
    liveRuns: [otherRun],
    currentRunId: currentRun.id,
  }), 1);
});

test("binds recovery work to the active project's own primary workspace", async () => {
  const source = await readFile("scripts/run-coolify-resource-recovery-seeder.mjs", "utf8");

  assert.match(source, /!candidate\.archivedAt/);
  assert.match(source, /project\?\.workspaces\?\.find\(\(workspace\) => workspace\.isPrimary\)/);
  assert.match(source, /projectWorkspaceId: projectWorkspace\.id/);
  assert.match(source, /const controlPlaneRoot = process\.cwd\(\)/);
  assert.match(source, /run the proof commands from the Paperclip control-plane workspace/);
  assert.match(source, /pnpm run softwarehouse:soar-acceptance-ledger/);
});
