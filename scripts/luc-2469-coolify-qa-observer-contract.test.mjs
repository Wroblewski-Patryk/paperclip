import assert from "node:assert/strict";
import test from "node:test";
import { readFile } from "node:fs/promises";

test("LUC-2469 observer is read-only, issue-bound, allowlisted, and excludes production", async () => {
  const source = await readFile("scripts/run-luc-2469-coolify-qa-observer.ts", "utf8");
  assert.match(source, /const QA_RESOURCE = "xj0ch8j95devlvegx8sa2tqk"/);
  assert.match(source, /const PRODUCTION_RESOURCE = "rnqqkhl3o3dut4qv56mlxly2"/);
  assert.match(source, /\/api\/v1\/applications\/\$\{QA_RESOURCE\}/);
  assert.match(source, /productionResourceAccessed: false/);
  assert.match(source, /secretsReturned: false/);
  assert.match(source, /safeApplicationFacts/);
  assert.doesNotMatch(source, /method:\s*["'](?:POST|PUT|PATCH|DELETE)/);
  assert.doesNotMatch(source, /console\.log\([^\n]*(?:token|resolved\.env)/i);
});
