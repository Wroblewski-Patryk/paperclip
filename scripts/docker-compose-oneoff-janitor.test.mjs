import assert from "node:assert/strict";
import test from "node:test";

import { classifyComposeOneoffForCleanup } from "./lib/docker-compose-oneoffs.mjs";

const nowMs = Date.parse("2026-07-17T20:00:00.000Z");
const base = {
  name: "roost-backend-luc-659",
  createdAt: "2026-07-17T19:00:00.000Z",
  running: false,
  mountCount: 0,
  bindCount: 0,
};

test("removes an old stopped mount-free issue-scoped one-off", () => {
  assert.deepEqual(
    classifyComposeOneoffForCleanup(base, { nowMs, graceMs: 15 * 60 * 1000 }),
    {
      action: "remove",
      reason: "stale_issue_scoped_oneoff",
      ageMs: 60 * 60 * 1000,
    },
  );
});

test("preserves active, mounted, generic, and fresh one-offs", () => {
  assert.equal(
    classifyComposeOneoffForCleanup({ ...base, running: true }, { nowMs }).reason,
    "active_proof",
  );
  assert.equal(
    classifyComposeOneoffForCleanup({ ...base, mountCount: 1 }, { nowMs }).reason,
    "persistent_mounts_present",
  );
  assert.equal(
    classifyComposeOneoffForCleanup({ ...base, name: "roost-debug" }, { nowMs }).reason,
    "not_issue_scoped",
  );
  assert.equal(
    classifyComposeOneoffForCleanup(
      { ...base, createdAt: "2026-07-17T19:55:00.000Z" },
      { nowMs, graceMs: 15 * 60 * 1000 },
    ).reason,
    "grace_period",
  );
});
