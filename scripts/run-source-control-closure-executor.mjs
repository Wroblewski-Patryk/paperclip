import { spawnSync } from "node:child_process";
import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";

const appsRoot = process.env.LUCKYSPARROW_APPS_ROOT ?? "C:/Personal/Projekty/Aplikacje";
const outputJson = "report/softwarehouse-source-control-closure-executor.latest.json";
const outputMd = "report/softwarehouse-source-control-closure-executor.latest.md";
const safeAutoCommitGroups = new Set(["history-evidence", "project-docs", "codex-context", "agent-state"]);

async function readJson(filePath, fallback = null) {
  try {
    return JSON.parse(await readFile(filePath, "utf8"));
  } catch {
    return fallback;
  }
}

function run(cwd, args) {
  const result = spawnSync(args[0], args.slice(1), {
    cwd,
    encoding: "utf8",
    windowsHide: true,
    stdio: ["ignore", "pipe", "pipe"],
  });
  return {
    ok: result.status === 0,
    exitCode: result.status,
    stdout: (result.stdout ?? "").trim(),
    stderr: (result.stderr ?? "").trim(),
  };
}

function repoPath(name) {
  return name === "Paperclip_Softwarehouse" ? process.cwd() : path.join(appsRoot, name);
}

function validationFor(repo, group) {
  const cwd = repoPath(repo.name);
  const commands = [];
  commands.push({ name: "git status", result: run(cwd, ["git", "status", "--short"]) });
  commands.push({ name: "git diff --check", result: run(cwd, ["git", "diff", "--check"]) });
  if (group.group === "product-code" || group.group === "scripts" || group.group === "dependencies") {
    commands.push({ name: "git diff --stat", result: run(cwd, ["git", "diff", "--stat"]) });
  }
  return commands;
}

function classifyLane(repo, group) {
  const validation = validationFor(repo, group);
  const validationOk = validation.every((item) => item.result?.ok);
  const safeAutoCommitCandidate = repo.name !== "Paperclip_Softwarehouse"
    && group.staged === 0
    && ["conflicted", "staged"].every((key) => (repo.statusCounts?.[key] ?? 0) === 0)
    && safeAutoCommitGroups.has(group.group);
  const requiresHumanOrSpecialist = ["product-code", "scripts", "dependencies", "other"].includes(group.group);
  return {
    repository: repo.name,
    group: group.group,
    count: group.count,
    sample: group.sample ?? [],
    safeAutoCommitCandidate,
    requiresHumanOrSpecialist,
    validationOk,
    validation,
    decision: !validationOk
      ? "validation_failed_before_closure"
      : safeAutoCommitCandidate
      ? "commit_allowed_after_redaction_review"
      : requiresHumanOrSpecialist
        ? "specialist_review_required"
        : "classification_required",
  };
}

function renderMarkdown(output) {
  const lines = [
    "# Source-Control Closure Executor",
    "",
    `Generated at: ${output.generatedAt}`,
    "",
    "This executor selects concrete local source-control closure lanes. It does not push, deploy, restart production, run protected smoke, or disclose secrets.",
    "",
  ];
  for (const lane of output.lanes) {
    lines.push(
      `## ${lane.repository}/${lane.group}`,
      "",
      `Decision: ${lane.decision}`,
      "",
      `Safe auto-commit candidate: ${lane.safeAutoCommitCandidate}`,
      "",
      "Sample:",
      ...lane.sample.map((item) => `- ${item}`),
      "",
      "Validation:",
      ...lane.validation.map((item) => `- ${item.name}: ${item.result.ok ? "ok" : "fail"}${item.result.stderr ? ` - ${item.result.stderr}` : ""}`),
      "",
    );
  }
  return `${lines.join("\n")}\n`;
}

const packet = await readJson("report/softwarehouse-source-control.latest.json", { repos: [] });
const lanes = [];
for (const repo of packet.repos ?? []) {
  if (repo.clean !== false) continue;
  for (const group of repo.dirtyGroups ?? []) {
    lanes.push(classifyLane(repo, group));
  }
}

const output = {
  generatedAt: new Date().toISOString(),
  appsRoot,
  laneCount: lanes.length,
  safeAutoCommitCandidateCount: lanes.filter((lane) => lane.safeAutoCommitCandidate).length,
  specialistReviewRequiredCount: lanes.filter((lane) => lane.requiresHumanOrSpecialist).length,
  lanes,
};

await mkdir("report", { recursive: true });
await writeFile(outputJson, `${JSON.stringify(output, null, 2)}\n`);
await writeFile(outputMd, renderMarkdown(output));
console.log(JSON.stringify(output, null, 2));
