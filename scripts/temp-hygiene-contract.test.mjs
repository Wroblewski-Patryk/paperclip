import assert from "node:assert/strict";
import test from "node:test";
import { readFile } from "node:fs/promises";

test("temp hygiene covers stale disposable files without broad repository deletion", async () => {
  const script = await readFile("scripts/cleanup-stale-softwarehouse-temp.ps1", "utf8");
  assert.match(script, /repoDisposableNamePattern/);
  assert.match(script, /pcvt-/);
  assert.match(script, /IncludeRecentOwnedTestArtifacts/);
  assert.match(script, /ownedRecentTestPattern/);
  assert.match(script, /tmp-\.\+/);
  assert.match(script, /completion-evidence/);
  assert.match(script, /coolify/);
  assert.match(script, /trackedRootFileSet\.Contains/);
  assert.match(script, /GetDirectoryName\(\$fullPath\) -ne \$repoRoot/);
  assert.match(script, /Repository-root candidate is referenced by a live process/);
  assert.match(script, /\$insideRepository = \$targetPath\.StartsWith\(\$repoRoot/);
  assert.match(script, /allowedExternalTargets\.Add\(\$targetPath\)/);
  assert.match(script, /Remove-Item -LiteralPath \$candidate\.FullName -Force -ErrorAction Stop/);
  assert.doesNotMatch(script, /Remove-Item\s+[^\r\n]*\*/);
});
