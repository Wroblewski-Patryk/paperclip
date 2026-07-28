import assert from "node:assert/strict";
import { execFile } from "node:child_process";
import test from "node:test";
import { promisify } from "node:util";

const execFileAsync = promisify(execFile);

test("softwarehouse operating standard audit emits parseable automation JSON", async () => {
  const { stdout } = await execFileAsync(process.execPath, [
    "scripts/audit-softwarehouse-operating-standard.mjs",
  ], {
    cwd: process.cwd(),
    env: process.env,
  });

  const report = JSON.parse(stdout);

  assert.equal(report.ok, true);
  assert.equal(report.requiredDocs, 25);
  assert.equal(report.requiredProcessDocs, 3);
  assert.equal(report.requiredProcessTerms, 11);
  assert.equal(report.protectedAccessLaneEntryDocs, 4);
  assert.equal(report.sourceRoleFilesExpected, report.rosterAgentCount);
  assert.equal(report.sourceRoleFilesPresent, report.sourceRoleFilesExpected);
  assert.equal(report.roleMapEntriesCovered, report.rosterAgentCount);
  assert.equal(report.homeSource, "repo_managed_runtime");
  assert.ok(Array.isArray(report.findings));
  assert.equal(report.findings.filter((finding) => finding.severity === "error").length, 0);
});
