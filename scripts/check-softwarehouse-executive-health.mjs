import { selectExecutiveProject } from "./lib/softwarehouse-executive-health.mjs";

const apiBase = process.env.PAPERCLIP_API_URL ?? "http://127.0.0.1:3200";
const companyId = process.env.PAPERCLIP_COMPANY_ID ?? null;
const activeProjects = (process.env.SOFTWAREHOUSE_ACTIVE_PROJECTS ?? "Soar,Roost,Featherly")
  .split(",")
  .map((name) => name.trim())
  .filter(Boolean);
const futureProjects = (process.env.SOFTWAREHOUSE_FUTURE_PROJECTS ?? "Aviary,Nest")
  .split(",")
  .map((name) => name.trim())
  .filter(Boolean);
const requestTimeoutMs = Number(process.env.SOFTWAREHOUSE_EXECUTIVE_HEALTH_REQUEST_TIMEOUT_MS ?? 15_000);
const preferredCompanyNames = [
  process.env.SOFTWAREHOUSE_COMPANY_NAME,
  process.env.PAPERCLIP_COMPANY_NAME,
  "LuckySparrow",
  "LuckySparrow Software House",
].filter(Boolean);

async function request(route, timeoutMs = 20_000) {
  const controller = new AbortController();
  const effectiveTimeoutMs = Number.isFinite(timeoutMs) ? timeoutMs : requestTimeoutMs;
  const timer = setTimeout(() => controller.abort(), effectiveTimeoutMs);
  try {
    const response = await fetch(`${apiBase}${route}`, {
      headers: { "content-type": "application/json" },
      signal: controller.signal,
    });
    const text = await response.text();
    const data = text ? JSON.parse(text) : null;
    if (!response.ok) throw new Error(`GET ${route} failed with ${response.status}: ${text}`);
    return data;
  } catch (error) {
    if (error?.name === "AbortError") {
      throw new Error(`GET ${route} timed out after ${effectiveTimeoutMs}ms`);
    }
    throw error;
  } finally {
    clearTimeout(timer);
  }
}

async function safeRequest(route, timeoutMs = 12_000) {
  try {
    return { ok: true, data: await request(route, timeoutMs) };
  } catch (error) {
    return { ok: false, error: error?.message ?? String(error), data: null };
  }
}

async function resolveCompany() {
  const companies = await request("/api/companies");
  if (companyId) {
    const company = companies.find((candidate) => candidate.id === companyId);
    return { id: companyId, name: company?.name ?? null };
  }
  const company = preferredCompanyNames
    .map((name) => companies.find((candidate) => candidate.name === name))
    .find(Boolean)
    ?? companies.find((candidate) => /^LuckySparrow\b/i.test(candidate.name));
  if (!company) throw new Error(`Company not found. Tried: ${preferredCompanyNames.join(", ")}`);
  return { id: company.id, name: company.name };
}

function statusCount(items, key = "status") {
  const counts = {};
  for (const item of items ?? []) {
    const value = item?.[key] ?? "unknown";
    counts[value] = (counts[value] ?? 0) + 1;
  }
  return counts;
}

function listOf(value) {
  if (Array.isArray(value)) return value;
  if (Array.isArray(value?.value)) return value.value;
  return [];
}

function agentKey(agent) {
  return agent?.metadata?.rosterKey ?? agent?.urlKey ?? "";
}

function projectReport(projects, agents, projectName) {
  const project = selectExecutiveProject(projects, projectName);
  const managerNeedle = `${projectName.toLowerCase()}-`;
  const manager = agents.find((agent) => {
    const key = agentKey(agent).toLowerCase();
    return key.startsWith(managerNeedle) && (key.endsWith("product-manager") || key.endsWith("project-manager") || key.endsWith("platform-manager"));
  }) ?? null;
  return {
    project: projectName,
    projectId: project?.id ?? null,
    projectStatus: project?.status ?? null,
    workspacePolicyEnabled: project?.executionWorkspacePolicy?.enabled ?? false,
    manager: manager ? {
      name: manager.name,
      status: manager.status,
      rosterKey: agentKey(manager),
    } : null,
    readyForActiveDelivery: Boolean(project && project?.executionWorkspacePolicy?.enabled && manager && manager.status !== "paused"),
    readyForFutureActivation: Boolean(project && project?.executionWorkspacePolicy?.enabled && manager),
  };
}

function verdictFor({ health, dashboard, activeProjectReports, sourceControlClean, degradedSources }) {
  const blockers = [];
  const warnings = [];
  if (!health) blockers.push("Paperclip health endpoint unavailable");
  if (health?.devServer?.restartRequired) blockers.push("Paperclip restart required");
  const projectReadinessDataAvailable = !degradedSources.includes("agents") && !degradedSources.includes("projects");
  if (projectReadinessDataAvailable && !activeProjectReports.every((project) => project.readyForActiveDelivery)) {
    blockers.push("one or more active projects are missing an unpaused PM/workspace policy");
  }
  if (dashboard?.agents?.error > 0) warnings.push(`${dashboard.agents.error} agent(s) in error`);
  if (dashboard?.tasks?.blocked > 100) warnings.push(`${dashboard.tasks.blocked} blocked task(s) need blocker-owner cleanup`);
  if (degradedSources.length > 0) warnings.push(`degraded sources: ${degradedSources.join(", ")}`);
  if (sourceControlClean === false) warnings.push("source-control closure is pending");
  if ((health?.devServer?.activeRunCount ?? 0) > 0) warnings.push(`${health.devServer.activeRunCount} active run(s); restart/config changes should wait or be coordinated`);
  const mode = blockers.length === 0
    ? warnings.length === 0 ? "green_autonomous_app_studio" : "yellow_autonomous_with_supervision"
    : "red_control_action_required";
  return { mode, blockers, warnings };
}

const startedAt = Date.now();
const company = await resolveCompany();
const [healthResult, dashboardResult, agentsResult, projectsResult, liveRunsResult] = await Promise.all([
  safeRequest("/api/health", 30_000),
  safeRequest(`/api/companies/${company.id}/dashboard`, 8_000),
  safeRequest(`/api/companies/${company.id}/agents`, 12_000),
  safeRequest(`/api/companies/${company.id}/projects`, 12_000),
  safeRequest(`/api/companies/${company.id}/live-runs`, 12_000),
]);
const health = healthResult.data;
const dashboard = dashboardResult.data;
const agents = listOf(agentsResult.data);
const projects = listOf(projectsResult.data);
const liveRuns = listOf(liveRunsResult.data);
const degradedSources = [
  healthResult.ok ? null : "health",
  dashboardResult.ok ? null : "dashboard",
  agentsResult.ok ? null : "agents",
  projectsResult.ok ? null : "projects",
  liveRunsResult.ok ? null : "live-runs",
].filter(Boolean);

let sourceControl = { available: false, clean: null };
try {
  const packet = await import("node:fs/promises").then(({ readFile }) =>
    readFile("report/softwarehouse-source-control.latest.json", "utf8")
  );
  const parsed = JSON.parse(packet);
  sourceControl = {
    available: true,
    generatedAt: parsed.generatedAt ?? null,
    clean: parsed.clean ?? null,
    dirtyRepos: (parsed.repos ?? [])
      .filter((repo) => repo.clean === false && repo.parked !== true)
      .map((repo) => ({ name: repo.name, dirtyCount: repo.dirtyCount ?? null })),
  };
} catch {
  sourceControl = { available: false, clean: null };
}

const activeProjectReports = activeProjects.map((name) => projectReport(projects, agents, name));
const futureProjectReports = futureProjects.map((name) => projectReport(projects, agents, name));
const verdict = verdictFor({
  health,
  dashboard,
  activeProjectReports,
  sourceControlClean: sourceControl.clean,
  degradedSources,
});

console.log(JSON.stringify({
  generatedAt: new Date().toISOString(),
  durationMs: Date.now() - startedAt,
  apiBase,
  company,
  verdict,
  health: {
    available: healthResult.ok,
    error: healthResult.ok ? null : healthResult.error,
    restartRequired: health?.devServer?.restartRequired ?? null,
    restartReason: health?.devServer?.reason ?? null,
    activeRunCount: health?.devServer?.activeRunCount ?? liveRuns.length,
    liveRunCount: liveRuns.length,
  },
  dashboard: {
    available: dashboardResult.ok,
    error: dashboardResult.ok ? null : dashboardResult.error,
    agents: dashboard?.agents ?? null,
    tasks: dashboard?.tasks ?? null,
    costs: dashboard?.costs ?? null,
    pendingApprovals: dashboard?.pendingApprovals ?? null,
  },
  activeProjects: activeProjectReports,
  futureProjects: futureProjectReports,
  sources: {
    agents: { available: agentsResult.ok, error: agentsResult.ok ? null : agentsResult.error },
    projects: { available: projectsResult.ok, error: projectsResult.ok ? null : projectsResult.error },
    liveRuns: { available: liveRunsResult.ok, error: liveRunsResult.ok ? null : liveRunsResult.error },
  },
  agentStatus: statusCount(agents),
  liveRuns: liveRuns.map((run) => ({
    agentName: run.agentName,
    issueId: run.issueId,
    startedAt: run.startedAt,
    silenceLevel: run.outputSilence?.level ?? null,
  })),
  sourceControl,
}, null, 2));

process.exitCode = verdict.mode === "red_control_action_required" ? 1 : 0;
