import test from "node:test";
import assert from "node:assert/strict";

import { loadTrackTruthByTrack } from "./softwarehouse-track-truth.mjs";

test("loadTrackTruthByTrack suppresses fan-out when only a release blocker remains", async () => {
  const files = new Map([
    ["C:\\Roost\\docs\\status\\project-truth-index.json", JSON.stringify({
      status: "known_and_routable",
      counts: { totalGaps: 0 },
      gaps: [],
    })],
    ["C:\\Roost\\docs\\releases\\roost-v1-0-gap-register.md", [
      "| ID | Domain | Status | Blocking scope | Evidence | Next owner / action |",
      "| --- | --- | --- | --- | --- | --- |",
      "| SR-001 | Hosted read-only canary | open | Blocks one proof claim | Evidence | Owner |",
      "| SR-002 | Release automation | accepted_deferral | Non-blocking | Evidence | Owner |",
      "| SR-003 | Upstream agent-source merge | blocked_external_non_blocking | Non-blocking | Evidence | Owner |",
    ].join("\n")],
  ]);
  const originalSoarRoot = process.env.SOAR_ROOT;
  const originalRoostRoot = process.env.ROOST_ROOT;
  const originalReadFile = globalThis.__paperclipTrackTruthReadFile;

  process.env.SOAR_ROOT = "C:\\Soar";
  process.env.ROOST_ROOT = "C:\\Roost";

  try {
    globalThis.__paperclipTrackTruthReadFile = async (filePath) => {
      if (!files.has(filePath)) throw new Error("missing");
      return files.get(filePath);
    };
    const summaryByTrack = await loadTrackTruthByTrack({ tracks: ["Roost"] });
    const roost = summaryByTrack.get("Roost");
    assert.equal(roost.currentGapCount, 0);
    assert.equal(roost.allowsNewProductLane, false);
    assert.equal(roost.holdReason, "release_gap_open_blocker_only");
    assert.match(roost.holdSummary, /SR-001/);
  } finally {
    globalThis.__paperclipTrackTruthReadFile = originalReadFile;
    if (originalSoarRoot === undefined) delete process.env.SOAR_ROOT;
    else process.env.SOAR_ROOT = originalSoarRoot;
    if (originalRoostRoot === undefined) delete process.env.ROOST_ROOT;
    else process.env.ROOST_ROOT = originalRoostRoot;
  }
});
