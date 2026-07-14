import assert from "node:assert/strict";
import test from "node:test";

import {
  dirtyStateCouldInvalidateClosure,
  parsePorcelainV1ZPaths,
} from "./source-control-dirty-state.mjs";

test("parses modified, untracked, and rename paths from porcelain v1 z output", () => {
  assert.deepEqual(
    parsePorcelainV1ZPaths(" M src/app.ts\0?? docs/proof.md\0R  src/new.ts\0src/old.ts\0"),
    ["src/app.ts", "docs/proof.md", "src/new.ts", "src/old.ts"],
  );
});

test("does not invalidate an earlier clean closeout with a later dirty packet", () => {
  assert.equal(dirtyStateCouldInvalidateClosure(
    { latestDirtyMutationMs: Date.parse("2026-07-14T16:37:00Z") },
    "2026-07-14T16:27:00Z",
  ), false);
});

test("keeps fail-closed reopening when dirty state predates the closeout", () => {
  assert.equal(dirtyStateCouldInvalidateClosure(
    { latestDirtyMutationMs: Date.parse("2026-07-14T16:20:00Z") },
    "2026-07-14T16:27:00Z",
  ), true);
});

test("keeps fail-closed reopening when mutation time cannot be established", () => {
  assert.equal(dirtyStateCouldInvalidateClosure(
    { latestDirtyMutationMs: null },
    "2026-07-14T16:27:00Z",
  ), true);
});
