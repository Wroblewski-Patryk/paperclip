import { execFileSync } from "node:child_process";
import { mkdtemp, mkdir, readFile, rm, writeFile } from "node:fs/promises";
import assert from "node:assert/strict";
import os from "node:os";
import path from "node:path";
import test from "node:test";
import { fileURLToPath } from "node:url";

const scriptPath = fileURLToPath(new URL("./build-architecture-awareness-index.mjs", import.meta.url));
const appCompletionScriptPath = fileURLToPath(new URL("./build-app-completion-index.mjs", import.meta.url));
const projectTruthScriptPath = fileURLToPath(new URL("./build-project-truth-indexes.mjs", import.meta.url));

test("build-architecture-awareness-index writes byte-identical graph exports when inputs do not change", async () => {
    const root = await mkdtemp(path.join(os.tmpdir(), "paperclip-awareness-determinism-"));
    try {
      await mkdir(path.join(root, "src"), { recursive: true });
      await mkdir(path.join(root, "docs", "status"), { recursive: true });
      await writeFile(path.join(root, "src", "feature.ts"), "export const feature = true;\n", "utf8");
      await writeFile(path.join(root, "README.md"), "# Deterministic fixture\n", "utf8");
      await writeFile(path.join(root, "docs", "status", "project-truth-index.md"), "Generated: first run\n", "utf8");

      const run = () => {
        const commonArgs = ["--project", "Fixture", "--root", root];
        execFileSync(process.execPath, [scriptPath, ...commonArgs], { encoding: "utf8" });
        execFileSync(process.execPath, [appCompletionScriptPath, ...commonArgs], { encoding: "utf8" });
        execFileSync(process.execPath, [projectTruthScriptPath, ...commonArgs, "--apply"], {
          encoding: "utf8",
          env: { ...process.env, PROJECT_TRUTH_OBSERVED_AT: "2026-01-01T00:00:00.000Z" },
        });
      };

      run();
      const firstJson = await readFile(path.join(root, "docs", "graphs", "architecture-awareness.json"), "utf8");
      const firstCsv = await readFile(path.join(root, "docs", "graphs", "architecture-awareness.csv"), "utf8");
      const firstAppCompletion = await readFile(path.join(root, "docs", "status", "app-completion-index.json"), "utf8");
      const firstProjectTruth = await readFile(path.join(root, "docs", "status", "project-truth-index.json"), "utf8");

      await writeFile(path.join(root, "docs", "status", "project-truth-index.md"), "Generated: second run\n", "utf8");
      run();
      const secondJson = await readFile(path.join(root, "docs", "graphs", "architecture-awareness.json"), "utf8");
      const secondCsv = await readFile(path.join(root, "docs", "graphs", "architecture-awareness.csv"), "utf8");
      const secondAppCompletion = await readFile(path.join(root, "docs", "status", "app-completion-index.json"), "utf8");
      const secondProjectTruth = await readFile(path.join(root, "docs", "status", "project-truth-index.json"), "utf8");

      assert.equal(secondJson, firstJson);
      assert.equal(secondCsv, firstCsv);
      assert.equal(secondAppCompletion, firstAppCompletion);
      assert.equal(secondProjectTruth, firstProjectTruth);
    } finally {
      await rm(root, { recursive: true, force: true });
    }
});

test("project truth aggregates symbol-level proof gaps into user-flow repair lanes", async () => {
  const root = await mkdtemp(path.join(os.tmpdir(), "paperclip-project-truth-aggregation-"));
  try {
    await mkdir(path.join(root, "docs", "graphs"), { recursive: true });
    await mkdir(path.join(root, "docs", "status"), { recursive: true });
    const generatedAt = new Date().toISOString();
    await writeFile(path.join(root, "docs", "graphs", "architecture-awareness.json"), JSON.stringify({
      generatedAt,
      entities: [],
      relations: [],
    }));
    await writeFile(path.join(root, "docs", "status", "app-completion-index.json"), JSON.stringify({
      generatedAt,
      counts: { items: 4, riskItems: 4, appCompletionRiskItems: 4, priorityReviewItems: 4 },
      flows: [],
      priorityReviewItems: [
        { id: "a", risk: "missing_test_link", userFlow: "Account access", name: "login", path: "src/login.ts", kind: "api_endpoint" },
        { id: "b", risk: "missing_test_link", userFlow: "Account access", name: "logout", path: "src/logout.ts", kind: "api_endpoint" },
        { id: "c", risk: "missing_test_link", userFlow: "Account access", name: "session", path: "src/session.ts", kind: "api_endpoint" },
        { id: "d", risk: "missing_doc_link", userFlow: "Dashboard overview", name: "dashboard", path: "src/dashboard.ts", kind: "api_endpoint" },
      ],
    }));

    execFileSync(process.execPath, [projectTruthScriptPath, "--project", "Fixture", "--root", root, "--apply"], { encoding: "utf8" });
    const truth = JSON.parse(await readFile(path.join(root, "docs", "status", "project-truth-index.json"), "utf8"));
    assert.equal(truth.counts.appCompletionGaps, 2);
    const accountGap = truth.gaps.find((gap) => gap.userFlow === "Account access" && gap.risk === "missing_test_link");
    assert.equal(accountGap.affectedItemCount, 3);
    assert.equal(accountGap.sourceItemIds.length, 3);
  } finally {
    await rm(root, { recursive: true, force: true });
  }
});

test("build-architecture-awareness-index excludes repo-local .tmp content", async () => {
  const root = await mkdtemp(path.join(os.tmpdir(), "paperclip-awareness-tmp-exclusion-"));
  try {
    await mkdir(path.join(root, "src"), { recursive: true });
    await mkdir(path.join(root, "tests"), { recursive: true });
    await mkdir(path.join(root, "docs", "architecture"), { recursive: true });
    await mkdir(path.join(root, ".tmp", "nested"), { recursive: true });
    await mkdir(path.join(root, "storage", "framework", "views"), { recursive: true });

    await writeFile(
      path.join(root, "src", "real-feature.ts"),
      "export function realFeature() { return true; }\n",
      "utf8",
    );
    await writeFile(
      path.join(root, "tests", "real-feature.test.ts"),
      'import { realFeature } from "../src/real-feature.js";\nexport const verifyRealFeature = () => realFeature();\n',
      "utf8",
    );
    await writeFile(
      path.join(root, "docs", "architecture", "real-feature.md"),
      "# Real Feature\n\nDocuments the legitimate fixture feature.\n",
      "utf8",
    );
    await writeFile(
      path.join(root, ".tmp", "nested", "shadow-router.ts"),
      'export function temporaryShadow() { return false; }\napp.get("/temporary-shadow", () => temporaryShadow());\n',
      "utf8",
    );
    await writeFile(
      path.join(root, ".tmp", "shadow-notes.md"),
      "# Temporary Shadow Documentation\n\nThis must not enter the canonical graph.\n",
      "utf8",
    );
    await writeFile(
      path.join(root, "storage", "framework", "views", "compiled.php"),
      "<?php function generatedStorageFunction() { return false; }\n",
      "utf8",
    );

    execFileSync(
      process.execPath,
      [scriptPath, "--project", "Fixture", "--root", root],
      { encoding: "utf8" },
    );

    const graph = JSON.parse(
      await readFile(path.join(root, "docs", "graphs", "architecture-awareness.json"), "utf8"),
    );
    const entityPaths = new Set(graph.entities.map((entity) => entity.path));
    assert.ok(entityPaths.has("src/real-feature.ts"));
    assert.ok(entityPaths.has("tests/real-feature.test.ts"));
    assert.ok(entityPaths.has("docs/architecture/real-feature.md"));

    const tmpPathPattern = /(^|\/)\.tmp(?:\/|$)/;
    const originatesFromTmp = (entity) =>
      entity && (
        tmpPathPattern.test(entity.path) ||
        (entity.evidence ?? []).some((evidence) => tmpPathPattern.test(evidence))
      );
    const entityById = new Map(graph.entities.map((entity) => [entity.id, entity]));
    assert.deepEqual(graph.entities.filter(originatesFromTmp), []);
    assert.equal(graph.entities.some((entity) => /^storage\//.test(entity.path)), false);
    assert.equal(
      graph.relations.some((relation) =>
        originatesFromTmp(entityById.get(relation.from)) ||
        originatesFromTmp(entityById.get(relation.to)) ||
        tmpPathPattern.test(relation.evidence),
      ),
      false,
    );
  } finally {
    await rm(root, { recursive: true, force: true });
  }
});
