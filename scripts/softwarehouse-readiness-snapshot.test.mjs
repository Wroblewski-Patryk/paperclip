import assert from "node:assert/strict";
import test from "node:test";
import {
  buildSnapshot,
  renderMarkdown,
  resolveSnapshotFreshness,
} from "./lib/softwarehouse-readiness-snapshot.mjs";

const now = new Date("2026-07-23T01:30:00.000Z");

test("fresh control tick remains usable", () => {
  const freshness = resolveSnapshotFreshness("2026-07-23T01:20:00.000Z", {
    now,
    maxSourceAgeMs: 15 * 60 * 1_000,
  });
  assert.deepEqual(freshness, {
    status: "fresh",
    stale: false,
    sourceAgeMs: 10 * 60 * 1_000,
    maxSourceAgeMs: 15 * 60 * 1_000,
  });

  const snapshot = buildSnapshot({ generatedAt: "2026-07-23T01:20:00.000Z", ok: true }, {
    now,
    maxSourceAgeMs: 15 * 60 * 1_000,
  });
  assert.equal(snapshot.ok, true);
  assert.equal(snapshot.currentStateUsable, true);
  assert.equal(snapshot.stale, false);
});

test("stale control tick fails closed and is visibly labelled", () => {
  const snapshot = buildSnapshot({
    generatedAt: "2026-07-23T00:30:00.000Z",
    ok: true,
    recommendedAction: "Act on obsolete state",
    operatorActionPacket: {
      blockedGates: [{ project: "Soar", rootBlocker: "LUC-OLD", owner: "QVE" }],
    },
  }, {
    now,
    maxSourceAgeMs: 15 * 60 * 1_000,
  });

  assert.equal(snapshot.stale, true);
  assert.equal(snapshot.currentStateUsable, false);
  assert.equal(snapshot.ok, false);
  assert.equal(snapshot.sourceOk, true);
  assert.match(snapshot.recommendedAction, /fresh softwarehouse control tick/i);
  assert.match(renderMarkdown(snapshot), /must not be used as current operating truth/i);
});

test("missing or invalid source timestamp is stale", () => {
  for (const source of [undefined, null, "not-a-date"]) {
    const freshness = resolveSnapshotFreshness(source, { now });
    assert.equal(freshness.stale, true);
    assert.equal(freshness.sourceAgeMs, null);
  }
});
