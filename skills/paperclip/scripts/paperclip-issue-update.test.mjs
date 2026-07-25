import assert from "node:assert/strict";
import { mkdtemp, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import { spawnSync } from "node:child_process";
import test from "node:test";
import { fileURLToPath } from "node:url";

const scriptPath = fileURLToPath(new URL("./paperclip-issue-update.mjs", import.meta.url));

async function withTempDir(run) {
  const directory = await mkdtemp(path.join(tmpdir(), "paperclip-issue-update-"));
  try {
    return await run(directory);
  } finally {
    await rm(directory, { recursive: true, force: true });
  }
}

test("done updates fail locally when completion evidence is missing", () => {
  const result = spawnSync(process.execPath, [
    scriptPath,
    "--issue-id", "11111111-1111-4111-8111-111111111111",
    "--status", "done",
    "--comment", "Closeout",
    "--dry-run",
  ], { encoding: "utf8" });

  assert.notEqual(result.status, 0);
  assert.match(result.stderr, /require --completion-evidence-file/i);
});

test("dry-run includes the supplied completion evidence bundle", async () => {
  await withTempDir(async (directory) => {
    const evidencePath = path.join(directory, "completion-evidence.json");
    const completionEvidence = {
      summary: "Verified closeout",
      riskLevel: "standard",
      testEvidence: { summary: "Tests passed", refs: [{ kind: "request_comment" }] },
      reviewEvidence: { summary: "Reviewed", refs: [{ kind: "request_comment" }] },
      documentationEvidence: { summary: "Docs captured", refs: [{ kind: "request_comment" }] },
      learningDisposition: {
        classification: "not_applicable",
        rationale: "This issue delivered a new capability rather than correcting a failure.",
      },
    };
    await writeFile(evidencePath, JSON.stringify(completionEvidence), "utf8");

    const result = spawnSync(process.execPath, [
      scriptPath,
      "--issue-id", "11111111-1111-4111-8111-111111111111",
      "--status", "done",
      "--comment", "Closeout",
      "--completion-evidence-file", evidencePath,
      "--dry-run",
    ], { encoding: "utf8" });

    assert.equal(result.status, 0, result.stderr);
    assert.deepEqual(JSON.parse(result.stdout).payload.completionEvidence, completionEvidence);
  });
});
