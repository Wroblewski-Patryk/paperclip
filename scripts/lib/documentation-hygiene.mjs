import { readdir, readFile, stat } from "node:fs/promises";
import { spawnSync } from "node:child_process";
import path from "node:path";

const DOC_EXTENSIONS = new Set([".md", ".mdx", ".txt", ".json", ".yaml", ".yml"]);
const DOC_PATH = /^(?:docs?|history|\.agents|\.codex)(?:\/|$)|^(?:README|AGENTS)\.md$|^\.gitignore$/i;

function posix(value) {
  return value.split(path.sep).join("/");
}

async function exists(filePath) {
  try { await stat(filePath); return true; } catch { return false; }
}

async function filesBelow(root, relativeDir) {
  const start = path.join(root, relativeDir);
  if (!await exists(start)) return [];
  const output = [];
  const pending = [start];
  while (pending.length) {
    const current = pending.pop();
    for (const entry of await readdir(current, { withFileTypes: true })) {
      const absolute = path.join(current, entry.name);
      if (entry.isDirectory()) pending.push(absolute);
      else output.push({ absolute, relative: posix(path.relative(root, absolute)), size: (await stat(absolute)).size });
    }
  }
  return output;
}

async function filesFromAuthority(root, entries, fallback = []) {
  const selected = Array.isArray(entries) ? entries : fallback;
  const output = new Map();
  for (const relative of selected) {
    if (typeof relative !== "string" || !relative.trim()) continue;
    const absolute = path.resolve(root, relative);
    if (absolute !== root && !absolute.startsWith(`${root}${path.sep}`)) continue;
    if (!await exists(absolute)) continue;
    const info = await stat(absolute);
    if (info.isDirectory()) {
      for (const file of await filesBelow(root, relative)) output.set(file.relative, file);
    } else {
      output.set(posix(path.relative(root, absolute)), { absolute, relative: posix(path.relative(root, absolute)), size: info.size });
    }
  }
  return [...output.values()];
}

function git(root, args) {
  const result = spawnSync("git", ["-C", root, ...args], { encoding: "utf8" });
  return result.status === 0 ? result.stdout.trim() : null;
}

function repositorySnapshot(root) {
  const head = git(root, ["rev-parse", "HEAD"]);
  const upstream = git(root, ["rev-parse", "@{upstream}"]);
  const divergence = upstream ? git(root, ["rev-list", "--left-right", "--count", "@{upstream}...HEAD"]) : null;
  const [behind, ahead] = divergence?.split(/\s+/).map(Number) ?? [null, null];
  const aheadPaths = upstream && Number(ahead) > 0
    ? (git(root, ["diff", "--name-only", "@{upstream}..HEAD"]) ?? "").split(/\r?\n/).filter(Boolean)
    : [];
  const controlPlaneOnlyAhead = aheadPaths.length > 0 && aheadPaths.every((file) => DOC_PATH.test(file));
  const log = git(root, ["log", "-100", "--name-only", "--pretty=format:@@"]);
  const commits = log?.split(/^@@\r?$/m).map((block) => block.trim()).filter(Boolean) ?? [];
  const docsOnly = commits.filter((block) => {
    const files = block.split(/\r?\n/).map((line) => line.trim()).filter(Boolean);
    return files.length > 0 && files.every((file) => DOC_PATH.test(file));
  }).length;
  return { head, upstream, ahead, behind, aheadPaths, controlPlaneOnlyAhead, sampledCommits: commits.length, docsOnlyCommits: docsOnly };
}

function finding(severity, code, message, evidence = []) {
  return { severity, code, message, evidence };
}

export async function auditDocumentationProject({ name, root, requireDeploymentIdentity = true, now = new Date() }) {
  const findings = [];
  const manifestPath = path.join(root, "docs", "documentation-contract.json");
  if (!await exists(manifestPath)) {
    return { name, root: posix(root), status: "fail", metrics: {}, findings: [finding("error", "manifest_missing", "Missing docs/documentation-contract.json.")] };
  }

  let manifest;
  try { manifest = JSON.parse(await readFile(manifestPath, "utf8")); }
  catch (error) {
    return { name, root: posix(root), status: "fail", metrics: {}, findings: [finding("error", "manifest_invalid", error.message)] };
  }

  if (!Array.isArray(manifest.defaultAgentContext) || manifest.defaultAgentContext.length === 0) {
    findings.push(finding("error", "default_context_missing", "defaultAgentContext must contain bounded canonical entrypoints."));
  }
  const excluded = manifest.excludedFromDefaultContext ?? [];
  let defaultContextBytes = 0;
  const defaultContextText = [];
  for (const relative of manifest.defaultAgentContext ?? []) {
    const absolute = path.resolve(root, relative);
    if (absolute !== root && !absolute.startsWith(`${root}${path.sep}`)) {
      findings.push(finding("error", "context_boundary_escape", `Default context escapes the project root: ${relative}.`, [relative]));
      continue;
    }
    if (excluded.some((prefix) => relative === prefix || relative.startsWith(prefix))) {
      findings.push(finding("error", "excluded_default_context", `Excluded material is in default context: ${relative}.`, [relative]));
    }
    try {
      defaultContextBytes += (await stat(absolute)).size;
      if ([".md", ".mdx", ".txt"].includes(path.extname(relative).toLowerCase())) {
        defaultContextText.push((await readFile(absolute, "utf8")).toLowerCase());
      }
    }
    catch { findings.push(finding("error", "context_file_missing", `Default context file is missing: ${relative}.`, [relative])); }
  }
  const maxDefault = Number(manifest.budgets?.maxDefaultContextBytes ?? 180000);
  if (defaultContextBytes > maxDefault) findings.push(finding("error", "context_budget_exceeded", `Default context is ${defaultContextBytes} bytes; budget is ${maxDefault}.`));
  const codexBootstrapPath = path.join(root, ".codex", "PROJECT_CONTEXT.md");
  const configuredBootstrapBudget = manifest.budgets?.maxCodexBootstrapBytes;
  let codexBootstrapBytes = 0;
  if (configuredBootstrapBudget !== undefined) {
    const maxCodexBootstrapBytes = Number(configuredBootstrapBudget);
    if (!await exists(codexBootstrapPath)) {
      findings.push(finding("error", "codex_bootstrap_missing", "Configured Codex bootstrap is missing.", [".codex/PROJECT_CONTEXT.md"]));
    } else {
      codexBootstrapBytes = (await stat(codexBootstrapPath)).size;
      if (codexBootstrapBytes > maxCodexBootstrapBytes) {
        findings.push(finding("warning", "codex_bootstrap_oversized", `.codex/PROJECT_CONTEXT.md is ${codexBootstrapBytes} bytes; budget is ${maxCodexBootstrapBytes}.`, [".codex/PROJECT_CONTEXT.md"]));
      }
    }
  }
  const canonicalText = defaultContextText.join("\n");
  const contradictionRules = [
    {
      code: "gui_identity_contradiction",
      left: /does not include (?:a )?gui|no gui/,
      right: /web console|owner console/,
      message: "Canonical context both denies a GUI and describes a web/owner console.",
    },
    {
      code: "recovery_policy_contradiction",
      left: /manual, not automatic|not automatically self-healing/,
      right: /orphaned runs? automatically|automatic(?:ally)? recover/,
      message: "Canonical context describes recovery as both manual-only and automatic.",
    },
  ];
  for (const rule of contradictionRules) {
    if (rule.left.test(canonicalText) && rule.right.test(canonicalText)) {
      findings.push(finding("error", rule.code, rule.message, manifest.defaultAgentContext));
    }
  }

  const planning = (await filesFromAuthority(root, manifest.authority?.activePlanning, ["docs/planning"]))
    .filter((item) => DOC_EXTENSIONS.has(path.extname(item.relative).toLowerCase()));
  const state = (await filesFromAuthority(root, manifest.authority?.activeState, []))
    .filter((item) => DOC_EXTENSIONS.has(path.extname(item.relative).toLowerCase()));
  const maxPlanningSize = Number(manifest.budgets?.maxActivePlanningFileBytes ?? 256000);
  const maxPlanningFiles = Number(manifest.budgets?.maxActivePlanningFiles ?? 60);
  const maxStateSize = Number(manifest.budgets?.maxActiveStateFileBytes ?? 256000);
  if (planning.length > maxPlanningFiles) findings.push(finding("warning", "planning_inventory_oversized", `${planning.length} active planning files exceed budget ${maxPlanningFiles}.`));
  for (const item of planning.filter((entry) => entry.size > maxPlanningSize)) findings.push(finding("warning", "planning_file_oversized", `${item.relative} is ${item.size} bytes.`, [item.relative]));
  for (const item of state.filter((entry) => entry.size > maxStateSize)) findings.push(finding("warning", "state_file_oversized", `${item.relative} is ${item.size} bytes.`, [item.relative]));

  const architectureEntry = (manifest.authority?.architecture ?? []).find((entry) => /architecture-source-of-truth\.md$/i.test(entry));
  if (architectureEntry && await exists(path.join(root, architectureEntry))) {
    const source = (await readFile(path.join(root, architectureEntry), "utf8")).toLowerCase();
    if (/required architecture files[\s\S]{0,3000}docs\/planning\//.test(source)) {
      findings.push(finding("error", "planning_promoted_to_architecture", "A planning document is listed as required architecture.", [architectureEntry]));
    }
  }

  const repo = repositorySnapshot(root);
  if (repo.sampledCommits >= 20 && repo.docsOnlyCommits / repo.sampledCommits >= 0.5) {
    findings.push(finding("warning", "documentation_delivery_skew", `${repo.docsOnlyCommits}/${repo.sampledCommits} sampled commits are documentation-only.`));
  }

  const truthRelative = manifest.projectTruthPath ?? "docs/status/project-truth-index.json";
  const truthPath = path.join(root, truthRelative);
  let truth = null;
  try { truth = JSON.parse(await readFile(truthPath, "utf8")); }
  catch { findings.push(finding("error", "project_truth_missing", `Missing or invalid ${truthRelative}.`, [truthRelative])); }
  if (truth) {
    const timestamp = Date.parse(truth.observedAt ?? truth.generatedAt ?? "");
    const ageHours = Number.isFinite(timestamp) ? (now.getTime() - timestamp) / 3_600_000 : Number.POSITIVE_INFINITY;
    const maxAge = Number(manifest.budgets?.maxTruthAgeHours ?? 24);
    if (ageHours > maxAge) {
      const staleIsExplicitlyRouted = truth.status !== "known_and_routable"
        && Array.isArray(truth.gaps)
        && truth.gaps.some((gap) => gap.summary === "source_freshness: stale");
      findings.push(finding(staleIsExplicitlyRouted ? "warning" : "error", "project_truth_stale", `Project truth source is ${Math.floor(ageHours)}h old; budget is ${maxAge}h.`, [truthRelative]));
    }
    const looksGreen = truth.status === "known_and_routable" && Number(truth.counts?.totalGaps ?? 0) === 0;
    const sourceAhead = Number(truth.repository?.ahead ?? repo.ahead ?? 0) > 0;
    const controlPlaneOnlyAhead = Boolean(truth.repository?.controlPlaneOnlyAhead ?? repo.controlPlaneOnlyAhead);
    const deployedSha = truth.deployment?.deployedSha ?? null;
    const sourceSha = truth.repository?.releaseSha ?? (controlPlaneOnlyAhead ? truth.repository?.upstreamSha ?? repo.upstream : truth.repository?.headSha ?? repo.head);
    if (looksGreen && sourceAhead && !controlPlaneOnlyAhead) findings.push(finding("error", "false_green_source_ahead", `Truth is green while runtime-affecting source is ${truth.repository?.ahead ?? repo.ahead} commit(s) ahead of upstream.`));
    if (looksGreen && sourceAhead && controlPlaneOnlyAhead) findings.push(finding("warning", "control_plane_source_ahead", `Truth is green while ${truth.repository?.ahead ?? repo.ahead} documentation/control-plane-only commit(s) remain ahead of upstream; production redeploy is not required.`));
    if (looksGreen && requireDeploymentIdentity && !deployedSha) findings.push(finding("error", "false_green_deployment_unknown", "Truth is green while deployed commit identity is unknown."));
    if (looksGreen && deployedSha && sourceSha && !sourceSha.startsWith(deployedSha) && !deployedSha.startsWith(sourceSha)) findings.push(finding("error", "false_green_deployment_mismatch", "Truth is green while deployed SHA differs from source HEAD."));
  }

  return {
    name,
    root: posix(root),
    status: findings.some((item) => item.severity === "error") ? "fail" : findings.length ? "warning" : "pass",
    metrics: { defaultContextBytes, maxDefaultContextBytes: maxDefault, codexBootstrapBytes, planningFiles: planning.length, activeStateFiles: state.length, ...repo },
    findings,
  };
}

export async function auditDocumentationPortfolio(projects, options = {}) {
  const results = [];
  for (const project of projects) results.push(await auditDocumentationProject({ ...project, now: options.now }));
  return {
    generatedAt: (options.now ?? new Date()).toISOString(),
    status: results.some((item) => item.status === "fail") ? "fail" : results.some((item) => item.status === "warning") ? "warning" : "pass",
    summary: {
      projects: results.length,
      failed: results.filter((item) => item.status === "fail").length,
      warnings: results.reduce((count, item) => count + item.findings.filter((finding) => finding.severity === "warning").length, 0),
      errors: results.reduce((count, item) => count + item.findings.filter((finding) => finding.severity === "error").length, 0),
    },
    projects: results,
  };
}
