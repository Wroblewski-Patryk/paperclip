import { readFile } from "node:fs/promises";
import { rootBlockerIdentifierFor } from "./lib/issue-blockers.mjs";
import { findAgentByNameOrAlias } from "./lib/softwarehouse-agent-resolver.mjs";

const apiBase = process.env.PAPERCLIP_API_URL ?? "http://127.0.0.1:3200";
const companyName = process.env.SOFTWAREHOUSE_COMPANY_NAME ?? "LuckySparrow Software House";
const preferredCompanyNames = [
  process.env.SOFTWAREHOUSE_COMPANY_NAME,
  process.env.PAPERCLIP_COMPANY_NAME,
  companyName,
  "LuckySparrow",
  "LuckySparrow Software House",
].filter(Boolean);
const companyId = process.env.PAPERCLIP_COMPANY_ID ?? null;
const requiredProjects = (process.env.SOFTWAREHOUSE_READINESS_PROJECTS ?? "Soar,Roost")
  .split(",")
  .map((name) => name.trim())
  .filter(Boolean);
const requiredProjectManagers = new Map([
  ["Soar", "Soar Project Manager"],
  ["Roost", "Roost Project Manager"],
  ["Aviary", "Aviary Project Manager"],
  ["Nest", "Nest Project Manager"],
]);
// Current Stage 1 protected gates are tracked by the control brief, unblock packet,
// release governor, and Soar acceptance ledger. Do not bind readiness to retired
// project-local issue numbers here; those identifiers can be reused by new lanes.
const gateRoots = new Map();
const projectAliases = new Map([
  ["Soar", ["Soar", "11 Innovation: Soar"]],
  ["Roost", ["Roost", "11 Innovation: Roost"]],
  ["Softwarehouse Operating System", ["Softwarehouse Operating System", "00 General: Softwarehouse"]],
  ["Aviary", ["Aviary", "Personality"]],
]);
const terminalStatuses = new Set(["done", "cancelled"]);

async function request(method, route) {
  const response = await fetch(`${apiBase}${route}`, {
    method,
    headers: { "content-type": "application/json" },
  });
  const text = await response.text();
  const data = text ? JSON.parse(text) : null;
  if (!response.ok) throw new Error(`${method} ${route} failed with ${response.status}: ${text}`);
  return data;
}

function agentName(agentById, id) {
  return agentById.get(id)?.name ?? null;
}

function ageMs(timestamp) {
  return timestamp ? Date.now() - new Date(timestamp).getTime() : Number.POSITIVE_INFINITY;
}

async function readLatestSourceControlPacket() {
  try {
    const raw = await readFile("report/softwarehouse-source-control.latest.json", "utf8");
    const packet = JSON.parse(raw);
    const stale = ageMs(packet.generatedAt) > 15 * 60 * 1000;
    const repos = Array.isArray(packet.repos) ? packet.repos : [];
    return {
      generatedAt: packet.generatedAt ?? null,
      stale,
      clean: packet.clean ?? null,
      dirtyOperatingRepos: repos.filter((repo) => repo.name === "Paperclip_Softwarehouse" && repo.clean === false),
      dirtyProjectRepos: repos.filter((repo) => repo.name !== "Paperclip_Softwarehouse" && repo.clean === false && repo.parked !== true),
    };
  } catch {
    return {
      generatedAt: null,
      stale: true,
      clean: null,
      dirtyOperatingRepos: [],
      dirtyProjectRepos: [],
    };
  }
}

async function resolveCompany() {
  if (companyId) {
    const companies = await request("GET", "/api/companies");
    const company = companies.find((candidate) => candidate.id === companyId);
    return { id: companyId, name: company?.name ?? null, source: "PAPERCLIP_COMPANY_ID" };
  }

  const companies = await request("GET", "/api/companies");
  const company = preferredCompanyNames
    .map((name) => companies.find((candidate) => candidate.name === name))
    .find(Boolean)
    ?? companies.find((candidate) => /^LuckySparrow\b/i.test(candidate.name));
  if (!company) throw new Error(`Company not found: ${companyName}`);
  return { id: company.id, name: company.name, source: "company_name" };
}

const company = await resolveCompany();

const [health, agents, projects, issues, liveRuns, routines] = await Promise.all([
  request("GET", "/api/health"),
  request("GET", `/api/companies/${company.id}/agents`),
  request("GET", `/api/companies/${company.id}/projects`),
  request("GET", `/api/companies/${company.id}/issues?limit=1000`),
  request("GET", `/api/companies/${company.id}/live-runs`),
  request("GET", `/api/companies/${company.id}/routines`),
]);
const sourceControl = await readLatestSourceControlPacket();

const activeAgents = agents.filter((agent) => agent.status !== "terminated");
const agentById = new Map(activeAgents.map((agent) => [agent.id, agent]));
const projectByName = new Map(projects.filter((project) => !project.archivedAt).map((project) => [project.name, project]));
const issueByIdentifier = new Map(issues.map((issue) => [issue.identifier, issue]));
const liveRunIssueIds = new Set(liveRuns.map((run) => run.issueId).filter(Boolean));
const liveRunsByAgent = new Map();
for (const run of liveRuns) {
  if (!run.agentId) continue;
  if (!liveRunsByAgent.has(run.agentId)) liveRunsByAgent.set(run.agentId, []);
  liveRunsByAgent.get(run.agentId).push(run);
}

const projectReports = requiredProjects.map((projectName) => {
  const project = (projectAliases.get(projectName) ?? [projectName])
    .map((name) => projectByName.get(name))
    .find(Boolean) ?? null;
  const managerName = requiredProjectManagers.get(projectName) ?? "Portfolio Director";
  const manager = findAgentByNameOrAlias(activeAgents, managerName);
  const projectIssues = project
    ? issues.filter((issue) => issue.projectId === project.id && !terminalStatuses.has(issue.status))
    : [];
  const staleInProgressIssues = projectIssues.filter((issue) =>
    issue.status === "in_progress" && !liveRunIssueIds.has(issue.id)
  );
  const unassignedOpenIssues = projectIssues.filter((issue) =>
    !issue.assigneeAgentId && !issue.assigneeUserId && ["todo", "in_progress", "in_review", "blocked"].includes(issue.status)
  );
  const gateRoot = gateRoots.get(projectName);
  const gateIssue = gateRoot ? issueByIdentifier.get(gateRoot) ?? null : null;
  const gateBlockedIssues = projectIssues.filter((issue) =>
    issue.status === "blocked" && rootBlockerIdentifierFor(issue) === gateRoot
  );
  const runnableIssues = projectIssues.filter((issue) =>
    ["todo", "backlog"].includes(issue.status) && !liveRunIssueIds.has(issue.id)
  );

  const blockers = [];
  if (!project) blockers.push("missing active Paperclip project");
  if (project && !project.executionWorkspacePolicy?.enabled) blockers.push("workspace policy is not enabled");
  if (project?.executionWorkspacePolicy?.runtimePolicy?.preparationOnly) {
    blockers.push("project policy is preparationOnly");
  }
  if (!manager) blockers.push(`missing manager agent: ${managerName}`);
  if (manager && manager.status === "error") blockers.push(`${managerName} is in error status`);
  if (staleInProgressIssues.length > 0) blockers.push("stale in_progress issues without live run");
  if (unassignedOpenIssues.length > 0) blockers.push("open issues without assignee");
  if (gateIssue?.status === "blocked") blockers.push(`blocked by gate ${gateRoot}`);

  let mode = "not_ready";
  if (projectName === "Roost" && project && manager && project.executionWorkspacePolicy?.enabled) {
    mode = project.executionWorkspacePolicy?.runtimePolicy?.preparationOnly
      ? "prep_only"
      : gateIssue?.status === "blocked" ? "delivery_blocked" : "delivery_ready";
  }
  if (projectName === "Soar" && project && manager && project.executionWorkspacePolicy?.enabled) {
    mode = gateIssue?.status === "blocked" ? "supervision_ready_delivery_blocked" : "delivery_ready";
  }
  if (!["Soar", "Roost"].includes(projectName) && project && manager && project.executionWorkspacePolicy?.enabled) {
    mode = gateIssue?.status === "blocked" ? "delivery_blocked" : "takeover_ready";
  }
  if (blockers.some((blocker) =>
    !blocker.startsWith("blocked by gate")
    && blocker !== "project policy is preparationOnly"
    && blocker !== "open issues without assignee"
  )) {
    mode = "not_ready";
  }

  return {
    project: projectName,
    mode,
    projectId: project?.id ?? null,
    manager: manager ? { id: manager.id, name: manager.name, status: manager.status } : null,
    workspacePolicyEnabled: project?.executionWorkspacePolicy?.enabled ?? false,
    openIssueCount: projectIssues.length,
    runnableIssueCount: runnableIssues.length,
    blockedByGateCount: gateBlockedIssues.length,
    staleInProgressCount: staleInProgressIssues.length,
    unassignedOpenIssueCount: unassignedOpenIssues.length,
    gate: gateRoot ? {
      identifier: gateRoot,
      status: gateIssue?.status ?? null,
      title: gateIssue?.title ?? null,
    } : null,
    blockers,
  };
});

const agentsWithMultipleLiveRuns = Array.from(liveRunsByAgent.entries())
  .map(([agentId, runs]) => ({
    agentId,
    runningRuns: runs.filter((run) => run.status === "running"),
    queuedRuns: runs.filter((run) => run.status === "queued"),
  }))
  .filter(({ runningRuns }) => runningRuns.length > 1)
  .map(({ agentId, runningRuns, queuedRuns }) => ({
    agentId,
    agentName: agentName(agentById, agentId),
    liveRunCount: runningRuns.length,
    queuedRunCount: queuedRuns.length,
  }));

const agentsWithQueuedBehindRunning = Array.from(liveRunsByAgent.entries())
  .map(([agentId, runs]) => ({
    agentId,
    runningRuns: runs.filter((run) => run.status === "running"),
    queuedRuns: runs.filter((run) => run.status === "queued"),
  }))
  .filter(({ runningRuns, queuedRuns }) => runningRuns.length === 1 && queuedRuns.length > 0)
  .map(({ agentId, runningRuns, queuedRuns }) => ({
    agentId,
    agentName: agentName(agentById, agentId),
    runningRunCount: runningRuns.length,
    queuedRunCount: queuedRuns.length,
  }));

const activeRoutineTitles = routines
  .filter((routine) => routine.status === "active")
  .map((routine) => routine.title)
  .sort();

const sharedReadinessBlockers = [];
if (health.devServer?.restartRequired) sharedReadinessBlockers.push("Paperclip restart required");
if ((health.devServer?.activeRunCount ?? liveRuns.length) !== liveRuns.length) {
  sharedReadinessBlockers.push("health active run count disagrees with live run list");
}
if (agentsWithMultipleLiveRuns.length > 0) sharedReadinessBlockers.push("one or more agents have multiple live runs");

const supervisionReady = sharedReadinessBlockers.length === 0
  && projectReports.every((report) =>
    report.manager
    && report.workspacePolicyEnabled
    && report.staleInProgressCount === 0
  );
const twoProjectFullDeliveryReady = supervisionReady
  && projectReports.filter((report) => ["Soar", "Roost"].includes(report.project)).every((report) =>
    report.mode === "delivery_ready"
    && report.blockers.length === 0
  );
const multiProjectTakeoverReady = supervisionReady
  && projectReports.every((report) =>
    ["delivery_ready", "takeover_ready", "supervision_ready_delivery_blocked", "prep_only", "delivery_blocked"].includes(report.mode)
  );
const gateBlockedProjects = projectReports.filter((report) => report.gate?.status === "blocked");
const operatingPosture = sourceControl.dirtyOperatingRepos.length > 0
  ? "operating_system_closure_required"
  : sourceControl.dirtyProjectRepos.length > 0
    ? "project_source_control_closure_allowed"
    : gateBlockedProjects.length > 0
      ? "project_repo_mutation_blocked_monitoring_allowed"
    : twoProjectFullDeliveryReady
      ? "two_project_delivery_ready"
      : supervisionReady
        ? "supervision_ready_limited_delivery"
        : "supervision_not_ready";
const operatingConstraints = operatingPosture === "operating_system_closure_required"
  ? [
    "verify and commit/classify Paperclip OS changes before broad delivery",
  ]
  : operatingPosture === "project_source_control_closure_allowed"
    ? [
      "local source-control closure is allowed for dirty project repos",
      "do not push, deploy, restart, or run protected smoke while production gates are blocked",
      "preserve agent/user work and record validation evidence before commit/no-commit decisions",
    ]
    : operatingPosture === "project_repo_mutation_blocked_monitoring_allowed"
      ? [
        "monitor routines and live runs",
        "refresh control/source-control/unblock packets",
        "do not mutate, commit, push, deploy, or restart blocked project repos until their gate is fresh",
      ]
    : [];

console.log(JSON.stringify({
  apiBase,
  company: { id: company.id, name: company.name },
  health: {
    restartRequired: health.devServer?.restartRequired ?? null,
    activeRunCount: health.devServer?.activeRunCount ?? liveRuns.length,
    liveRunCount: liveRuns.length,
  },
  readiness: {
    supervisionReady,
    twoProjectFullDeliveryReady,
    operatingPosture,
    operatingConstraints,
    currentMode: supervisionReady
      ? "Active projects can run known-state/takeover supervision; full delivery waits for project-specific gates."
      : "Shared supervision is not ready.",
    multiProjectTakeoverReady,
    requiredBeforeFullDelivery: projectReports
      .flatMap((report) => report.blockers.map((blocker) => `${report.project}: ${blocker}`)),
  },
  sharedReadinessBlockers,
  sourceControl,
  agentsWithMultipleLiveRuns,
  agentsWithQueuedBehindRunning,
  activeRoutineTitles,
  projects: projectReports,
}, null, 2));
