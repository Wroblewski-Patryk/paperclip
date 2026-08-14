import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import path from "node:path";
import test from "node:test";
import {
  captureProjectTruthRepositorySnapshot,
  resolveProjectTruthRepositorySnapshot,
  validateProjectTruthRepositorySnapshot,
} from "./lib/project-truth-repository-snapshot.mjs";

const headSha = "a".repeat(40);
const upstreamSha = "b".repeat(40);
const repositoryRoot = path.resolve("project-truth-fixture");

function validSnapshot(overrides = {}) {
  return {
    schemaVersion: 1,
    repositoryRoot,
    headSha,
    upstreamSha,
    behind: 0,
    ahead: 2,
    aheadPaths: ["docs/architecture.md", "README.md"],
    controlPlaneOnlyAhead: true,
    releaseSha: upstreamSha,
    ...overrides,
  };
}

test("captures repository identity from native Git output", () => {
  const outputs = new Map([
    ["rev-parse --verify HEAD", headSha],
    ["rev-parse --verify @{upstream}", upstreamSha],
    ["rev-list --left-right --count @{upstream}...HEAD", "0\t2"],
    ["diff --name-only @{upstream}..HEAD", "docs/architecture.md\nREADME.md\n"],
  ]);
  const snapshot = captureProjectTruthRepositorySnapshot({
    repositoryRoot,
    runGit: (args) => ({ status: 0, stdout: outputs.get(args.join(" ")) ?? "" }),
  });

  assert.deepEqual(snapshot, validSnapshot({ repositoryRoot: repositoryRoot.replaceAll("\\", "/") }));
});

test("captures a local candidate branch without an upstream", () => {
  const snapshot = captureProjectTruthRepositorySnapshot({
    repositoryRoot,
    runGit: (args) => args.join(" ") === "rev-parse --verify HEAD"
      ? { status: 0, stdout: headSha }
      : { status: 128, stdout: "", stderr: "fatal: no upstream configured" },
  });

  assert.deepEqual(snapshot, {
    schemaVersion: 1,
    repositoryRoot: repositoryRoot.replaceAll("\\", "/"),
    headSha,
    upstreamSha: null,
    behind: null,
    ahead: null,
    aheadPaths: [],
    controlPlaneOnlyAhead: false,
    releaseSha: headSha,
  });
});

test("uses a validated supplied snapshot when sandbox Git spawn is denied", async () => {
  let gitCalled = false;
  const snapshot = await resolveProjectTruthRepositorySnapshot({
    repositoryRoot,
    snapshotJson: JSON.stringify(validSnapshot()),
    runGit: () => {
      gitCalled = true;
      return { error: Object.assign(new Error("operation not permitted"), { code: "EPERM" }) };
    },
  });

  assert.equal(gitCalled, false);
  assert.equal(snapshot.headSha, headSha);
  assert.equal(snapshot.releaseSha, upstreamSha);
});

test("fails explicitly when Git is denied and no snapshot is supplied", async () => {
  await assert.rejects(
    resolveProjectTruthRepositorySnapshot({
      repositoryRoot,
      runGit: () => ({ error: Object.assign(new Error("operation not permitted"), { code: "EPERM" }) }),
    }),
    /Repository identity is unavailable.*EPERM.*PROJECT_TRUTH_REPOSITORY_SNAPSHOT/s,
  );
});

test("rejects snapshots with mismatched roots or derived release fields", () => {
  assert.throws(
    () => validateProjectTruthRepositorySnapshot(validSnapshot({ repositoryRoot: path.resolve("other-repository") }), { expectedRepositoryRoot: repositoryRoot }),
    /repositoryRoot does not match/,
  );
  assert.throws(
    () => validateProjectTruthRepositorySnapshot(validSnapshot({ releaseSha: headSha }), { expectedRepositoryRoot: repositoryRoot }),
    /releaseSha is inconsistent/,
  );
  assert.throws(
    () => validateProjectTruthRepositorySnapshot(validSnapshot({ aheadPaths: ["C:/outside.txt"], controlPlaneOnlyAhead: false, releaseSha: headSha }), { expectedRepositoryRoot: repositoryRoot }),
    /repository-relative path/,
  );
  assert.throws(
    () => validateProjectTruthRepositorySnapshot(validSnapshot({ upstreamSha: null }), { expectedRepositoryRoot: repositoryRoot }),
    /behind and \.ahead must be null/,
  );
});

test("daily refresh references the sandbox-safe snapshot command", async () => {
  const [routineSource, documentation] = await Promise.all([
    readFile("scripts/configure-active-project-routines.mjs", "utf8"),
    readFile("docs/softwarehouse/09-documentation-standard.md", "utf8"),
  ]);

  for (const source of [routineSource, documentation]) {
    assert.match(source, /get-project-truth-repository-snapshot\.ps1/);
    assert.match(source, /PROJECT_TRUTH_REPOSITORY_SNAPSHOT/);
    assert.match(source, /build-project-truth-indexes\.mjs/);
  }
});
