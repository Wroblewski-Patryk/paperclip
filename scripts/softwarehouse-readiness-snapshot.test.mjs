import assert from "node:assert/strict";
import test from "node:test";
import {
  buildQuotaHoldReadOnlyPacket,
  buildSnapshot,
  renderMarkdown,
  resolveSnapshotFreshness,
} from "./lib/softwarehouse-readiness-snapshot.mjs";

test("builds a fail-closed quota-hold packet with current project truth and no dispatch", () => {
  const packet = buildQuotaHoldReadOnlyPacket({
    generatedAt: "2026-08-10T03:00:00.000Z",
    activeRunCount: 0,
    projectTruth: {
      projectNames: ["Soar"],
      summary: { projectCount: 1, projectsWithGaps: 1, totalGaps: 2 },
      projects: [{
        name: "Soar",
        ok: true,
        publicProbe: { status: "pass" },
        projectTruth: { status: "gaps_require_routing", counts: { totalGaps: 2 }, firstGap: { summary: "proof gap" } },
      }],
    },
  });

  assert.equal(packet.controlDecision, "provider_quota_hold");
  assert.equal(packet.controlBrief.deliveryPermission.canStartNewLane, false);
  assert.equal(packet.supervisionReady, false);
  assert.equal(packet.activeRunCount, 0);
  assert.equal(packet.projectTruthAudit.projectCount, 1);
  assert.equal(packet.projectTruthAudit.projects[0].totalGaps, 2);
});

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

test("preserves control brief and project truth for the Roost projection", () => {
  const projectTruthAudit = {
    projectCount: 1,
    projectsWithGaps: 1,
    totalGaps: 2,
    projects: [{ name: "Soar", totalGaps: 2 }],
  };
  const controlBrief = { headline: "Canary held", primaryNextAction: "Approve deployment" };
  const snapshot = buildSnapshot({
    generatedAt: "2026-07-23T01:20:00.000Z",
    ok: false,
    projectTruthAudit,
    controlBrief,
  }, { now, maxSourceAgeMs: 15 * 60 * 1_000 });
  assert.deepEqual(snapshot.projectTruthAudit, projectTruthAudit);
  assert.deepEqual(snapshot.controlBrief, controlBrief);
});
