import { spawnSync } from "node:child_process";
import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";

const appsRoot = process.env.LUCKYSPARROW_APPS_ROOT ?? "C:/Personal/Projekty/Aplikacje";
const outputJson = "report/softwarehouse-release-push-deploy-governor.latest.json";
const outputMd = "report/softwarehouse-release-push-deploy-governor.latest.md";
const defaultProjects = ["Soar", "Roost"];

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

async function resolveProjects() {
  if (process.env.SOFTWAREHOUSE_RELEASE_PROJECTS) {
    return process.env.SOFTWAREHOUSE_RELEASE_PROJECTS
      .split(",")
      .map((item) => item.trim())
      .filter(Boolean);
  }
  return defaultProjects;
}

function statusFor(name) {
  const cwd = repoPath(name);
  const status = run(cwd, ["git", "status", "--short"]);
  const branch = run(cwd, ["git", "status", "-sb"]);
  const head = run(cwd, ["git", "rev-parse", "--short", "HEAD"]);
  const upstream = run(cwd, ["git", "rev-parse", "--abbrev-ref", "--symbolic-full-name", "@{u}"]);
  const aheadBehind = upstream.ok
    ? run(cwd, ["git", "rev-list", "--left-right", "--count", `${upstream.stdout}...HEAD`])
    : { ok: false, stdout: "", stderr: "missing upstream" };
  const [behindRaw, aheadRaw] = aheadBehind.stdout.split(/\s+/);
  return {
    name,
    exists: status.ok,
    branch: branch.stdout.split("\n")[0] ?? null,
    head: head.ok ? head.stdout : null,
    upstream: upstream.ok ? upstream.stdout : null,
    ahead: Number(aheadRaw ?? 0),
    behind: Number(behindRaw ?? 0),
    dirtyLines: status.ok ? status.stdout.split("\n").filter(Boolean) : [],
    statusError: status.ok ? null : status.stderr,
  };
}

function changedPathKind(filePath) {
  const normalized = filePath.replaceAll("\\", "/");
  if (normalized.startsWith(".codex/") || normalized.startsWith(".agents/")) return "context";
  if (normalized.startsWith("docs/") || normalized.startsWith("history/") || normalized.endsWith(".md")) return "docs";
  if (normalized.includes("package.json") || normalized.includes("pnpm-lock.yaml") || normalized.includes("migrations/")) return "release-risk";
  if (/\.(test|spec)\.[tj]sx?$/.test(normalized) || normalized.includes("/tests/")) return "tests";
  if (/\.(ts|tsx|js|jsx|mjs|cjs|css|scss|json|yaml|yml)$/.test(normalized)) return "code";
  return "other";
}

function pathFromStatusLine(line) {
  const match = line.match(/^..?\s+(.+)$/);
  return (match?.[1] ?? line).trim();
}

function dirtyKinds(repo) {
  return new Set(repo.dirtyLines.map((line) => changedPathKind(pathFromStatusLine(line))));
}

function releaseDecision(repo, sourceControlRepo, coolifyReport) {
  const kinds = dirtyKinds(repo);
  const dirty = repo.dirtyLines.length > 0;
  const hasCode = ["code", "tests", "release-risk"].some((kind) => kinds.has(kind));
  const docsOnly = dirty && [...kinds].every((kind) => ["docs", "context"].includes(kind));
  const sourceControlBlocked = (sourceControlRepo?.dirtyGroups ?? []).some((group) =>
    ["product-code", "dependencies", "scripts", "other"].includes(group.group)
  );
  const deployAutoExpected = repo.name === "Soar" || hasCode;
  const coolifyReady = coolifyReport?.overall === "ready";
  const coolifyPartial = coolifyReport?.overall === "partial";
  const serverUnknown = deployAutoExpected && !coolifyReady;

  if (!repo.exists) {
    return {
      decision: "repo_unavailable",
      pushAllowed: false,
      reason: "Repository status could not be read.",
      deployImpact: "unknown",
    };
  }
  if (repo.behind > 0) {
    return {
      decision: "pull_or_reconcile_before_push",
      pushAllowed: false,
      reason: "Local branch is behind upstream; do not push until it is reconciled without force.",
      deployImpact: "blocked",
    };
  }
  if (dirty) {
    return {
      decision: "commit_or_classify_before_push",
      pushAllowed: false,
      reason: docsOnly
        ? "Docs/context changes should be committed or batched locally before push."
        : "Dirty worktree must be classified, validated, and committed before push.",
      deployImpact: hasCode ? "auto-redeploy unknown until committed" : "none_or_batch",
    };
  }
  if (repo.ahead === 0) {
    return {
      decision: "no_push_needed",
      pushAllowed: false,
      reason: "Local branch has no commits ahead of upstream.",
      deployImpact: "none",
    };
  }
  if (serverUnknown) {
    return {
      decision: coolifyPartial ? "push_blocked_until_resource_inventory_complete" : "push_blocked_until_coolify_ready",
      pushAllowed: false,
      reason: "Push may trigger redeploy, but Coolify team/project/resource/server posture is not ready.",
      deployImpact: "auto-redeploy expected but unsafe to trust",
    };
  }
  if (sourceControlBlocked) {
    return {
      decision: "push_blocked_by_unclosed_source_control_lane",
      pushAllowed: false,
      reason: "Source-control report still contains behavior/risk lanes requiring specialist review.",
      deployImpact: "blocked",
    };
  }
  if (!hasCode && repo.ahead < 3) {
    return {
      decision: "hold_for_batch",
      pushAllowed: false,
      reason: "Ahead commits look low-risk; hold until a meaningful release batch or blocker exists.",
      deployImpact: "none_or_batch",
    };
  }
  return {
    decision: "push_candidate_requires_ops_verification",
    pushAllowed: true,
    reason: "Local branch is clean, ahead of upstream, and has a meaningful batch. Ops must verify post-push Coolify redeploy where applicable.",
    deployImpact: deployAutoExpected ? "auto-redeploy expected" : "none_or_batch",
  };
}

function renderMarkdown(output) {
  return [
    "# Release Push Deploy Governor",
    "",
    `Generated at: ${output.generatedAt}`,
    "",
    "This report decides whether Paperclip should hold, commit/classify, push, or prepare deploy verification. It never pushes or deploys by itself.",
    "",
    "| Project | Branch | Head | Ahead | Behind | Dirty | Decision | Deploy impact |",
    "| --- | --- | --- | ---: | ---: | ---: | --- | --- |",
    ...output.projects.map((repo) =>
      `| ${repo.name} | ${repo.branch ?? ""} | ${repo.head ?? ""} | ${repo.ahead} | ${repo.behind} | ${repo.dirtyCount} | ${repo.decision} | ${repo.deployImpact} |`
    ),
    "",
    "## Actions",
    "",
    ...(output.actions.length > 0 ? output.actions.map((action) => `- ${action.project}: ${action.action} - ${action.reason}`) : ["- none"]),
    "",
  ].join("\n");
}

const sourceControl = await readJson("report/softwarehouse-source-control.latest.json", {});
const coolifyReport = await readJson("report/coolify-production-reconciler.latest.json", {});
const sourceControlByName = new Map((sourceControl.repos ?? []).map((repo) => [repo.name, repo]));
const projects = await resolveProjects();
const projectReports = projects.map((name) => {
  const repo = statusFor(name);
  const decision = releaseDecision(repo, sourceControlByName.get(name), coolifyReport);
  return {
    ...repo,
    dirtyCount: repo.dirtyLines.length,
    dirtyKinds: [...dirtyKinds(repo)],
    ...decision,
  };
});

const actions = projectReports
  .filter((repo) => repo.decision !== "no_push_needed")
  .map((repo) => ({
    project: repo.name,
    action: repo.decision,
    reason: repo.reason,
    deployImpact: repo.deployImpact,
  }));

const output = {
  generatedAt: new Date().toISOString(),
  policy: "softwarehouse/release-push-deploy-policy.md",
  coolifyOverall: coolifyReport?.overall ?? null,
  projects: projectReports,
  actions,
  forbidden: ["force push", "push from dirty worktree", "deploy/restart without permit", "secret disclosure", "parallel redeploy under unknown server pressure"],
};

await mkdir("report", { recursive: true });
await writeFile(outputJson, `${JSON.stringify(output, null, 2)}\n`);
await writeFile(outputMd, renderMarkdown(output));
console.log(JSON.stringify(output, null, 2));
