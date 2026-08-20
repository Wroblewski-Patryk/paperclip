import { lstatSync, rmSync } from "node:fs";
import path from "node:path";

const ownedTestRootPattern = /^pcvt-\d+-\d+-[A-Za-z0-9]+$/;

export function assertOwnedVitestTestRoot(testRoot, tempRootParent) {
  const resolvedParent = path.resolve(tempRootParent);
  const resolvedRoot = path.resolve(testRoot);
  if (path.dirname(resolvedRoot) !== resolvedParent) {
    throw new Error(`Vitest test root escaped its temporary parent: ${resolvedRoot}`);
  }
  if (!ownedTestRootPattern.test(path.basename(resolvedRoot))) {
    throw new Error(`Refusing to remove an unowned Vitest test root: ${resolvedRoot}`);
  }

  const stats = lstatSync(resolvedRoot);
  if (!stats.isDirectory() || stats.isSymbolicLink()) {
    throw new Error(`Vitest test root is not an owned physical directory: ${resolvedRoot}`);
  }
  return resolvedRoot;
}

export function removeOwnedVitestTestRoot(testRoot, tempRootParent) {
  const resolvedRoot = assertOwnedVitestTestRoot(testRoot, tempRootParent);
  rmSync(resolvedRoot, { recursive: true, force: false });
}
