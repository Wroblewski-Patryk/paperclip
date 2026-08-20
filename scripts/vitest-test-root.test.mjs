import assert from "node:assert/strict";
import { mkdirSync, mkdtempSync, rmSync } from "node:fs";
import os from "node:os";
import path from "node:path";
import test from "node:test";

import {
  assertOwnedVitestTestRoot,
  removeOwnedVitestTestRoot,
} from "./lib/vitest-test-root.mjs";

test("removes only an exact runner-owned temporary root", () => {
  const parent = mkdtempSync(path.join(os.tmpdir(), "vitest-root-guard-test-"));
  try {
    const ownedRoot = path.join(parent, "pcvt-123-4-AbCd12");
    mkdirSync(path.join(ownedRoot, "t"), { recursive: true });
    assert.equal(assertOwnedVitestTestRoot(ownedRoot, parent), path.resolve(ownedRoot));
    removeOwnedVitestTestRoot(ownedRoot, parent);
    assert.throws(() => assertOwnedVitestTestRoot(parent, parent), /escaped|unowned/);
  } finally {
    rmSync(parent, { recursive: true, force: true });
  }
});

test("rejects a similarly named directory outside the exact temporary parent", () => {
  const parent = mkdtempSync(path.join(os.tmpdir(), "vitest-root-guard-test-"));
  const sibling = path.join(path.dirname(parent), "pcvt-123-4-AbCd12");
  try {
    assert.throws(
      () => assertOwnedVitestTestRoot(sibling, parent),
      /escaped its temporary parent/,
    );
  } finally {
    rmSync(parent, { recursive: true, force: true });
  }
});
