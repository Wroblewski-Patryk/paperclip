import assert from "node:assert/strict";
import test from "node:test";
import { readFile } from "node:fs/promises";

test("dirty Paperclip OS always routes one closure lane, including technical packets", async () => {
  const source = await readFile("scripts/run-local-repair-lane-starter.mjs", "utf8");

  assert.match(
    source,
    /governorDecision\.decision === "operating_source_control_closure_needed"[\s\S]*?sourceControlPacket\.operatingRepoClean === false/,
  );
  assert.match(
    source,
    /return \(sourceControlPacket\.dirtyProjectNames\?\.length \?\? 0\) > 0[\s\S]*?\|\| sourceControlPacket\.operatingRepoClean === false/,
  );
  assert.match(
    source,
    /const sourceControlProjectOrder = operatingSourceControlClosureRequested[\s\S]*?\["Softwarehouse Operating System"\]/,
  );
  assert.match(source, /if \(needsTechnicalReview\) return "09 CRS \(Code Review Specialist\)"/);
  assert.match(source, /\["Softwarehouse Operating System", "Paperclip_Softwarehouse"\]/);
  assert.match(source, /sourceControlRepoNameByProject\.get\(canonicalProjectName\)/);
});
