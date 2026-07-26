import { spawnSync } from "node:child_process";
import { existsSync } from "node:fs";
import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";

const appsRoot = process.env.LUCKYSPARROW_APPS_ROOT ?? "C:/Personal/Projekty/Aplikacje";
const parkedProjectNames = new Set(
  (process.env.SOFTWAREHOUSE_PARKED_PROJECTS ?? "")
    .split(",")
    .map((name) => name.trim())
    .filter(Boolean),
);

const defaultRepositoryNames = (
  process.env.SOFTWAREHOUSE_SOURCE_CONTROL_PROJECTS ??
  "Paperclip_Softwarehouse,Soar,Roost"
)
  .split(",")
  .map((name) => name.trim())
  .filter(Boolean);

function repositoryForName(name) {
  if (name === "Paperclip_Softwarehouse") {
    return {
      name,
      path: process.cwd(),
      required: true,
    };
  }
  return {
    name,
    path: path.join(appsRoot, name),
    required: false,
  };
}

const repositories = defaultRepositoryNames.map(repositoryForName);

function runGit(cwd, args, options = {}) {
  const trimOutput = options.trimOutput ?? true;
  const result = spawnSync("git", args, {
    cwd,
    encoding: "utf8",
    stdio: ["ignore", "pipe", "pipe"],
  });
  return {
    ok: result.status === 0,
    exitCode: result.status,
    stdout: trimOutput ? (result.stdout ?? "").trim() : (result.stdout ?? ""),
    stderr: trimOutput ? (result.stderr ?? "").trim() : (result.stderr ?? ""),
  };
}

function classifyStatusLine(line) {
  const { status } = parseStatusLine(line);
  if (status === "??") return "untracked";
  if (status.includes("U")) return "conflicted";
  if (status[0] !== " " && status[0] !== "?") return "staged";
  if (status[1] !== " ") return "unstaged";
  return "other";
}

function parseStatusLine(line) {
  const match = line.match(/^(.{1,2})\s+(.+)$/);
  if (!match) {
    return {
      status: line.slice(0, 2).padEnd(2, " "),
      path: line.slice(2).trimStart(),
    };
  }
  return {
    status: match[1].padEnd(2, " "),
    path: match[2],
  };
}

function isTransientOperatingPath(repo, filePath) {
  return repo.name === "Paperclip_Softwarehouse"
    && (filePath === "report/softwarehouse-control-tick.lock"
      || filePath.startsWith("report/softwarehouse-control-tick.lock/"));
}

function classifyDirtyPath(filePath) {
  if (filePath.startsWith(".agents/")) return "agent-state";
  if (filePath.startsWith(".codex/context/")) return "codex-context";
  if (filePath.startsWith("docs/")) return "project-docs";
  if (filePath.startsWith("history/")) return "history-evidence";
  if (filePath.startsWith("scripts/")) return "scripts";
  if (filePath.startsWith("apps/") || filePath.startsWith("libs/")) return "product-code";
  if (/^package\.json$|^pnpm-lock\.yaml$|^pnpm-workspace\.yaml$/.test(filePath)) return "dependencies";
  return "other";
}

function summarizeDirtyGroups(items) {
  const groups = new Map();
  for (const item of items) {
    const group = classifyDirtyPath(item.path);
    const current = groups.get(group) ?? { group, count: 0, staged: 0, unstaged: 0, untracked: 0, sample: [] };
    current.count += 1;
    const type = classifyStatusLine(`${item.status} ${item.path}`);
    if (type === "staged") current.staged += 1;
    if (type === "unstaged") current.unstaged += 1;
    if (type === "untracked") current.untracked += 1;
    if (current.sample.length < 5) current.sample.push(item.path);
    groups.set(group, current);
  }
  return Array.from(groups.values()).sort((left, right) => right.count - left.count || left.group.localeCompare(right.group));
}

const groupClosureGuidance = {
  "project-docs": {
    action: "Review documentation diffs from the packet only; record current/obsolete classification in Paperclip, not in the project repo.",
    evidenceRequired: "Paperclip issue comment with doc paths reviewed, current/obsolete classification, related issue IDs, and commit/no-commit decision.",
  },
  "agent-state": {
    action: "Review agent state paths from the packet only; record whether they match canonical docs in Paperclip, not in the project repo.",
    evidenceRequired: "Paperclip issue comment with state files reviewed, canonical status source named, and decision to commit/update/drop stale state.",
  },
  "codex-context": {
    action: "Review Codex context paths from the packet only; record drift against current control tick in Paperclip, not in the project repo.",
    evidenceRequired: "Paperclip issue comment with context files reviewed, matching control tick timestamp or reason for drift, and commit/no-commit decision.",
  },
  "history-evidence": {
    action: "Review history/evidence paths from the packet only; record factual/linkage/redaction classification in Paperclip, not in the project repo.",
    evidenceRequired: "Paperclip issue comment with evidence paths, issue/run linkage, redaction check, and commit/no-commit decision.",
  },
  "product-code": {
    action: "Inspect code diffs, run the smallest relevant validation, and route through QA/security if behavior changed.",
    evidenceRequired: "Changed files, behavior impact, validation command/result, regression risk, and commit/no-commit decision.",
  },
  scripts: {
    action: "Inspect automation/script diffs and run syntax or dry-run checks before committing.",
    evidenceRequired: "Script paths, syntax/dry-run command/result, operational impact, and commit/no-commit decision.",
  },
  dependencies: {
    action: "Review dependency manifest/lock changes and confirm they are intentional and reproducible.",
    evidenceRequired: "Package files, install/build check, dependency reason, and commit/no-commit decision.",
  },
  other: {
    action: "Classify the files before work resumes; route to the owning PM if the group is unclear.",
    evidenceRequired: "File classification, owner, risk, and commit/no-commit decision.",
  },
};

function sourceControlOwnerFor(repo) {
  if (repo.name === "Soar") return "Soar Project Manager + CTO Architect source-control lane";
  if (repo.name === "Roost") return "Roost Project Manager + CTO Architect source-control lane";
  if (repo.name === "Aviary") return "Aviary Project Manager + CTO Architect source-control lane";
  if (repo.name === "Nest") return "Nest Project Manager + CTO Architect source-control lane";
  if (repo.name === "Paperclip_Softwarehouse") return "Softwarehouse Operating System owner";
  return "Project PM source-control lane";
}

function closureLaneFor(repo, group) {
  const guidance = groupClosureGuidance[group.group] ?? groupClosureGuidance.other;
  const risk = repo.name !== "Paperclip_Softwarehouse" && ["product-code", "scripts", "dependencies", "other"].includes(group.group)
    ? "behavior_or_tooling_change_requires_review"
    : repo.name !== "Paperclip_Softwarehouse"
      ? "project_state_or_evidence_change_requires_classification"
      : "operating_system_change_requires_closure";
  const gatePolicy = repo.name !== "Paperclip_Softwarehouse"
    ? "gate-hold: classify only in Paperclip comments; no project filesystem writes, mutation, commit, push, deploy, restart, or repeated protected smoke without fresh gate fact"
    : "os-closure: verify and commit/classify before broad delivery";
  return {
    repository: repo.name,
    group: group.group,
    count: group.count,
    owner: sourceControlOwnerFor(repo),
    status: repo.name === "Paperclip_Softwarehouse" ? "os_closure_allowed" : "project_gate_blocked_until_source_control_closure",
    risk,
    gatePolicy,
    action: guidance.action,
    evidenceRequired: guidance.evidenceRequired,
    forbidden: repo.name === "Paperclip_Softwarehouse"
      ? ["push outside the standing release-consent contract", "mix unrelated project repo changes into this commit"]
      : ["mutate project files before classification", "push outside the standing release-consent contract", "manual deploy or restart production without explicit approval"],
    sample: group.sample,
  };
}

function summarizeRepo(repo) {
  const parked = parkedProjectNames.has(repo.name);
  if (!existsSync(repo.path)) {
    return {
      name: repo.name,
      path: repo.path,
      parked,
      exists: false,
      required: repo.required,
      git: false,
      clean: null,
      statusCounts: {},
      sample: [],
    };
  }

  const inside = runGit(repo.path, ["rev-parse", "--is-inside-work-tree"]);
  if (!inside.ok || inside.stdout !== "true") {
    return {
      name: repo.name,
      path: repo.path,
      parked,
      exists: true,
      required: repo.required,
      git: false,
      clean: null,
      statusCounts: {},
      sample: [],
      error: inside.stderr || inside.stdout,
    };
  }

  const branch = runGit(repo.path, ["branch", "--show-current"]);
  const head = runGit(repo.path, ["rev-parse", "--short", "HEAD"]);
  const status = runGit(repo.path, ["status", "--porcelain=v1"], { trimOutput: false });
  const lines = status.stdout ? status.stdout.split(/\r?\n/).filter(Boolean) : [];
  const dirtyItems = lines.map(parseStatusLine).filter((item) => !isTransientOperatingPath(repo, item.path));
  const sample = dirtyItems.slice(0, 20);
  const statusCounts = {};
  for (const item of dirtyItems) {
    const type = classifyStatusLine(`${item.status} ${item.path}`);
    statusCounts[type] = (statusCounts[type] ?? 0) + 1;
  }

  return {
    name: repo.name,
    path: repo.path,
    parked,
    exists: true,
    required: repo.required,
    git: true,
    branch: branch.stdout || null,
    head: head.stdout || null,
    clean: dirtyItems.length === 0,
    dirtyCount: dirtyItems.length,
    statusCounts,
    sample,
    dirtyPaths: dirtyItems.map((item) => item.path),
    dirtyGroups: summarizeDirtyGroups(dirtyItems),
  };
}

function row(cells) {
  return `| ${cells.map((cell) => String(cell ?? "").replaceAll("\n", "<br>")).join(" | ")} |`;
}

function nextActionFor(repo) {
  if (repo.parked) return "Project is parked by SOFTWAREHOUSE_PARKED_PROJECTS; observe only and do not route urgent source-control closure.";
  if (!repo.exists) return repo.required ? "Restore the required repository path before running autonomous work." : "Optional project path is absent; keep project intake blocked or preparation-only.";
  if (!repo.git) return "Classify this path before assigning git/source-control work.";
  if (repo.clean) return "No source-control closure action needed.";
  if (repo.name === "Paperclip_Softwarehouse") return "Commit or classify Paperclip OS changes before treating the operating system as stable.";
  if (repo.name === "Soar") return "Route through Soar PM/source-control closure. Inspect diffs, preserve agent work, and decide commit/no-commit. Push a meaningful evidence-backed batch without asking again when it meets the standing release-consent contract, then verify normal auto-redeploy and production smoke.";
  if (repo.name === "Roost") return "Route through Roost PM/source-control closure before full delivery mode.";
  if (repo.name === "Aviary") return "Route through Aviary PM/source-control closure before full delivery mode.";
  if (repo.name === "Nest") return "Route through Nest PM/source-control closure before full delivery mode.";
  return "Route through the project PM/source-control owner for classification.";
}

function markdownFor(output) {
  const lines = [
    "# Softwarehouse Source-Control Packet",
    "",
    `Generated at: ${output.generatedAt}`,
    "",
    "This packet is generated from local git status only. It records paths and status codes, not file contents or secret values.",
    "",
    "## Summary",
    "",
    row(["Repository", "Branch", "Head", "Clean", "Dirty files", "Status counts", "Next action"]),
    row(["---", "---", "---", "---", "---", "---", "---"]),
    ...output.repos.map((repo) => row([
      repo.name,
      repo.branch ?? "",
      repo.head ?? "",
      repo.clean,
      repo.dirtyCount ?? "",
      Object.entries(repo.statusCounts ?? {}).map(([key, value]) => `${key}:${value}`).join(", "),
      repo.nextAction,
    ])),
    "",
    "## Details",
    "",
  ];

  for (const repo of output.repos) {
    lines.push(
      `### ${repo.name}`,
      "",
      row(["Field", "Value"]),
      row(["---", "---"]),
      row(["Path", repo.path]),
      row(["Exists", repo.exists]),
      row(["Git", repo.git]),
      row(["Branch", repo.branch ?? ""]),
      row(["Head", repo.head ?? ""]),
      row(["Clean", repo.clean]),
      row(["Next action", repo.nextAction]),
      "",
    );
    if ((repo.dirtyGroups ?? []).length > 0) {
      lines.push(
        row(["Group", "Count", "Staged", "Unstaged", "Untracked", "Sample"]),
        row(["---", "---", "---", "---", "---", "---"]),
        ...repo.dirtyGroups.map((group) => row([
          group.group,
          group.count,
          group.staged,
          group.unstaged,
          group.untracked,
          group.sample.join("<br>"),
        ])),
        "",
      );
    }
    if ((repo.sourceControlClosureLanes ?? []).length > 0) {
      lines.push(
        "#### Closure Lanes",
        "",
        row(["Group", "Owner", "Status", "Action", "Evidence Required", "Forbidden"]),
        row(["---", "---", "---", "---", "---", "---"]),
        ...repo.sourceControlClosureLanes.map((lane) => row([
          lane.group,
          lane.owner,
          `${lane.status}<br>${lane.risk}<br>${lane.gatePolicy}`,
          lane.action,
          lane.evidenceRequired,
          lane.forbidden.join("<br>"),
        ])),
        "",
      );
    }
    if ((repo.sample ?? []).length > 0) {
      lines.push(
        row(["Status", "Path"]),
        row(["---", "---"]),
        ...repo.sample.map((item) => row([item.status, item.path])),
        "",
      );
    }
  }

  lines.push(
    "## Operating Rule",
    "",
    "- Source-control packets are evidence for PM/source-control routing, not approval to push.",
    "- Project-local dirty work should be classified before broad delivery resumes.",
    "- Paperclip OS dirty work should be committed or explicitly classified before the OS is treated as stable.",
    "",
  );

  return `${lines.join("\n")}\n`;
}

const repos = repositories.map(summarizeRepo);
const output = {
  generatedAt: new Date().toISOString(),
  appsRoot,
  clean: repos.every((repo) => repo.parked || repo.clean !== false),
  repos: repos.map((repo) => ({
    ...repo,
    nextAction: nextActionFor(repo),
    sourceControlClosureLanes: repo.parked ? [] : (repo.dirtyGroups ?? []).map((group) => closureLaneFor(repo, group)),
  })),
};

await mkdir("report", { recursive: true });
await writeFile("report/softwarehouse-source-control.latest.json", `${JSON.stringify(output, null, 2)}\n`);
await writeFile("report/softwarehouse-source-control.latest.md", markdownFor(output));

console.log(JSON.stringify(output, null, 2));
