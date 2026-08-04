import assert from "node:assert/strict";
import { execFileSync } from "node:child_process";
import { mkdtemp, mkdir, readFile, writeFile } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import test from "node:test";
import { auditDocumentationProject } from "./lib/documentation-hygiene.mjs";

async function fixture({ truthAgeHours = 1, maxContextBytes = 10000 } = {}) {
  const root = await mkdtemp(path.join(os.tmpdir(), "paperclip-doc-hygiene-"));
  await mkdir(path.join(root, "docs/status"), { recursive: true });
  await writeFile(path.join(root, "README.md"), "# Test\n");
  await writeFile(path.join(root, "docs/README.md"), "# Docs\n");
  await writeFile(path.join(root, "docs/documentation-contract.json"), JSON.stringify({
    defaultAgentContext: ["README.md", "docs/README.md"],
    excludedFromDefaultContext: ["docs/status/"],
    projectTruthPath: "docs/status/project-truth-index.json",
    budgets: { maxDefaultContextBytes: maxContextBytes, maxTruthAgeHours: 24 },
  }));
  await writeFile(path.join(root, "docs/status/project-truth-index.json"), JSON.stringify({
    observedAt: new Date(Date.now() - truthAgeHours * 3_600_000).toISOString(),
    status: "gaps_require_routing",
    counts: { totalGaps: 1 },
  }));
  return root;
}

test("accepts bounded fresh context with an honest non-green truth", async () => {
  const root = await fixture();
  const result = await auditDocumentationProject({ name: "Test", root, requireDeploymentIdentity: false });
  assert.equal(result.status, "pass");
});

test("rejects stale truth", async () => {
  const root = await fixture({ truthAgeHours: 48 });
  const result = await auditDocumentationProject({ name: "Test", root, requireDeploymentIdentity: false });
  assert(result.findings.some((item) => item.code === "project_truth_stale"));
});

test("rejects a default context over budget", async () => {
  const root = await fixture({ maxContextBytes: 1 });
  const result = await auditDocumentationProject({ name: "Test", root, requireDeploymentIdentity: false });
  assert(result.findings.some((item) => item.code === "context_budget_exceeded"));
});

test("rejects contradictory GUI identity in canonical context", async () => {
  const root = await fixture();
  await writeFile(path.join(root, "README.md"), "This application does not include a GUI.\n");
  await writeFile(path.join(root, "docs/README.md"), "Use the owner web console.\n");
  const result = await auditDocumentationProject({ name: "Test", root, requireDeploymentIdentity: false });
  assert(result.findings.some((item) => item.code === "gui_identity_contradiction"));
});

test("counts only planning and state paths declared active by the documentation contract", async () => {
  const root = await fixture();
  await mkdir(path.join(root, "docs/planning/archive"), { recursive: true });
  await mkdir(path.join(root, ".agents/state"), { recursive: true });
  await writeFile(path.join(root, "docs/planning/current.md"), "current\n");
  await writeFile(path.join(root, "docs/planning/archive/old.md"), "x".repeat(300_000));
  await writeFile(path.join(root, ".agents/state/history.md"), "x".repeat(300_000));
  const contractPath = path.join(root, "docs/documentation-contract.json");
  const contract = JSON.parse(await readFile(contractPath, "utf8"));
  contract.authority = { activePlanning: ["docs/planning/current.md"], activeState: [] };
  contract.budgets = { ...contract.budgets, maxActivePlanningFileBytes: 100, maxActiveStateFileBytes: 100 };
  await writeFile(contractPath, JSON.stringify(contract));

  const result = await auditDocumentationProject({ name: "Test", root, requireDeploymentIdentity: false });
  assert.equal(result.metrics.planningFiles, 1);
  assert.equal(result.metrics.activeStateFiles, 0);
  assert(!result.findings.some((item) => item.code === "planning_file_oversized"));
  assert(!result.findings.some((item) => item.code === "state_file_oversized"));
});

test("treats documentation-only commits ahead of upstream as a warning, not a false deployment green", async () => {
  const root = await fixture();
  await writeFile(path.join(root, "docs/status/project-truth-index.json"), JSON.stringify({
    observedAt: new Date().toISOString(),
    status: "known_and_routable",
    counts: { totalGaps: 0 },
  }));
  const git = (...args) => execFileSync("git", ["-C", root, ...args], { encoding: "utf8" });
  git("init", "-b", "main");
  git("config", "user.email", "test@example.invalid");
  git("config", "user.name", "Documentation Hygiene Test");
  git("add", ".");
  git("commit", "-m", "baseline");
  git("branch", "baseline");
  git("branch", "--set-upstream-to", "baseline", "main");
  await writeFile(path.join(root, "README.md"), "# Test\n\nControl-plane clarification.\n");
  await writeFile(path.join(root, ".gitignore"), "docs/status/generated.json\n");
  git("add", "README.md", ".gitignore");
  git("commit", "-m", "docs: clarify control plane");

  const result = await auditDocumentationProject({ name: "Test", root, requireDeploymentIdentity: false });
  assert(!result.findings.some((item) => item.code === "false_green_source_ahead"));
  assert(result.findings.some((item) => item.code === "control_plane_source_ahead"));
});
