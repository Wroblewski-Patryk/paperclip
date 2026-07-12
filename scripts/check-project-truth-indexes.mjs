import { spawnSync } from "node:child_process";
import path from "node:path";

const appsRoot = process.env.LUCKYSPARROW_APPS_ROOT ?? "C:/Personal/Projekty/Aplikacje";
const projectNames = (process.env.SOFTWAREHOUSE_PROJECT_TRUTH_PROJECTS ?? "Soar,Roost")
  .split(",")
  .map((name) => name.trim())
  .filter(Boolean);
const apply = process.argv.includes("--apply");

function toPosix(value) {
  return value.split(path.sep).join("/");
}

function projectRootFor(name) {
  return path.join(appsRoot, name);
}

const projects = [];
for (const name of projectNames) {
  const result = spawnSync(process.execPath, [
    "scripts/build-project-truth-indexes.mjs",
    "--project",
    name,
    "--root",
    projectRootFor(name),
    ...(apply ? ["--apply"] : []),
  ], {
    cwd: process.cwd(),
    encoding: "utf8",
    stdio: ["ignore", "pipe", "pipe"],
  });

  let data = null;
  try {
    data = result.stdout ? JSON.parse(result.stdout) : null;
  } catch {
    data = null;
  }

  projects.push({
    name,
    root: toPosix(projectRootFor(name)),
    ok: result.status === 0 && Boolean(data),
    exitCode: result.status,
    error: result.status === 0 ? null : (result.stderr || result.stdout || "project truth check failed").slice(0, 2000),
    missingInputs: data?.missingInputs ?? [],
    publicProbe: data?.publicProbe ?? null,
    eventChain: data?.eventChain ?? null,
    runtimeErrors: data?.runtimeErrors ?? null,
    operationalReadiness: data?.operationalReadiness ?? null,
    projectTruth: data?.projectTruth ? {
      status: data.projectTruth.status ?? null,
      counts: data.projectTruth.counts ?? null,
      firstGap: data.projectTruth.firstGap ?? null,
      gaps: Array.isArray(data.projectTruth.gaps) ? data.projectTruth.gaps : [],
    } : null,
  });
}

const gaps = projects.flatMap((project) =>
  (project.projectTruth?.firstGap ? [{
    project: project.name,
    ...project.projectTruth.firstGap,
  }] : [])
);
const firstGap = gaps.find((gap) => gap.severity === "critical") ?? gaps[0] ?? null;

console.log(JSON.stringify({
  mode: apply ? "apply" : "dry-run",
  generatedAt: new Date().toISOString(),
  appsRoot: toPosix(appsRoot),
  projectNames,
  summary: {
    projectCount: projects.length,
    failedProjectCount: projects.filter((project) => !project.ok).length,
    projectsWithGaps: projects.filter((project) => (project.projectTruth?.counts?.totalGaps ?? 0) > 0).length,
    totalGaps: projects.reduce((count, project) => count + (project.projectTruth?.counts?.totalGaps ?? 0), 0),
    criticalRuntimeFindings: projects.reduce((count, project) => count + (project.runtimeErrors?.criticalFindings ?? 0), 0),
    incompleteEventChains: projects.reduce((count, project) => count + (project.eventChain?.incompleteChains ?? 0), 0),
  },
  firstGap,
  projects,
}, null, 2));

if (projects.some((project) => !project.ok)) process.exitCode = 1;
