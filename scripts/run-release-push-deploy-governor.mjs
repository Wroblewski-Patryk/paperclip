import { spawnSync } from "node:child_process";
import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import { changedPathKind, projectDeploymentReadiness, releaseDecision } from "./lib/release-delivery-policy.mjs";

const appsRoot = process.env.LUCKYSPARROW_APPS_ROOT ?? "C:/Personal/Projekty/Aplikacje";
const outputJson = "report/softwarehouse-release-push-deploy-governor.latest.json";
const outputMd = "report/softwarehouse-release-push-deploy-governor.latest.md";
const defaultProjects = ["Soar", "Roost", "Featherly"];

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
  const committedPaths = upstream.ok
    ? run(cwd, ["git", "diff", "--name-only", `${upstream.stdout}...HEAD`]).stdout.split("\n").filter(Boolean)
    : [];
  return {
    name,
    exists: status.ok,
    branch: branch.stdout.split("\n")[0] ?? null,
    head: head.ok ? head.stdout : null,
    upstream: upstream.ok ? upstream.stdout : null,
    ahead: Number(aheadRaw ?? 0),
    behind: Number(behindRaw ?? 0),
    committedPaths,
    dirtyLines: status.ok ? status.stdout.split("\n").filter(Boolean) : [],
    statusError: status.ok ? null : status.stderr,
  };
}

function pathFromStatusLine(line) {
  const match = line.match(/^..?\s+(.+)$/);
  return (match?.[1] ?? line).trim();
}

function dirtyKinds(repo) {
  return new Set(repo.dirtyLines.map((line) => changedPathKind(pathFromStatusLine(line))));
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
  const batchKinds = new Set([
    ...dirtyKinds(repo),
    ...repo.committedPaths.map(changedPathKind),
  ]);
  const deploymentReadiness = projectDeploymentReadiness(coolifyReport, name);
  const decision = releaseDecision({ ...repo, batchKinds: [...batchKinds] }, sourceControlByName.get(name), deploymentReadiness);
  const { committedPaths, ...boundedRepo } = repo;
  return {
    ...boundedRepo,
    dirtyCount: repo.dirtyLines.length,
    dirtyKinds: [...dirtyKinds(repo)],
    committedPathCount: repo.committedPaths.length,
    committedPathSample: repo.committedPaths.slice(0, 20),
    batchKinds: [...batchKinds],
    deploymentReadiness: deploymentReadiness?.overall ?? "unknown",
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
