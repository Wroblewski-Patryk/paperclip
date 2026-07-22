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
        execFileSync(process.execPath, [projectTruthScriptPath, ...commonArgs, "--apply"], { encoding: "utf8" });
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
