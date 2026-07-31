import { softwarehousePilotActiveRuntimeRoutineTitles } from "./lib/softwarehouse-active-routines.mjs";

const apiBase = process.env.PAPERCLIP_API_URL ?? "http://127.0.0.1:3200";
const companyName = "LuckySparrow Software House";
const companyId = process.env.PAPERCLIP_COMPANY_ID ?? null;
const expectedActiveRoutineTitles = softwarehousePilotActiveRuntimeRoutineTitles;

async function request(method, route, body) {
  const response = await fetch(`${apiBase}${route}`, {
    method,
    headers: { "content-type": "application/json" },
    body: body === undefined ? undefined : JSON.stringify(body),
  });
  const text = await response.text();
  const data = text ? JSON.parse(text) : null;
  if (!response.ok) throw new Error(`${method} ${route} failed with ${response.status}: ${text}`);
  return data;
}

function verdict(statuses) {
  if (statuses.some((status) => status === "fail" || status === "error")) return "fail";
  if (statuses.some((status) => status === "warn" || status === "warning")) return "warn";
  return "pass";
}

const health = await request("GET", "/api/health");
async function resolveCompany() {
  if (companyId) return { id: companyId, source: "PAPERCLIP_COMPANY_ID" };

  const companies = await request("GET", "/api/companies");
  const company = companies.find((candidate) => candidate.name === companyName);
  if (!company) throw new Error(`Company not found: ${companyName}`);
  return { id: company.id, source: "company_name" };
}

const company = await resolveCompany();

const [agents, projects, routines, liveRuns] = await Promise.all([
  request("GET", `/api/companies/${company.id}/agents`),
  request("GET", `/api/companies/${company.id}/projects`),
  request("GET", `/api/companies/${company.id}/routines`),
  request("GET", `/api/companies/${company.id}/live-runs`),
]);

const agentChecks = [];
const adapterProbeCache = new Map();
for (const agent of agents.filter((entry) => entry.status !== "terminated")) {
  const probeKey = JSON.stringify({
    adapterType: agent.adapterType,
    command: agent.adapterConfig?.command ?? null,
    model: agent.adapterConfig?.model ?? null,
    effort: agent.adapterConfig?.modelReasoningEffort ?? null,
  });
  let result = adapterProbeCache.get(probeKey);
  if (!result) {
    try {
      result = await request("POST", `/api/companies/${company.id}/adapters/${agent.adapterType}/test-environment`, {
        adapterConfig: agent.adapterConfig ?? {},
      });
    } catch (error) {
      result = {
        status: "fail",
        checks: [{
          level: "error",
          code: "adapter_test_request_failed",
          detail: error instanceof Error ? error.message : String(error),
        }],
      };
    }
    adapterProbeCache.set(probeKey, result);
  }
  const failing = result.checks?.find((check) => check.level === "error") ?? null;
  const warning = result.checks?.find((check) => check.level === "warn" || check.level === "warning") ?? null;
  const normalizedStatus = result.status === "warning" ? "warn" : result.status;
  agentChecks.push({
    name: agent.name,
    status: normalizedStatus,
    model: agent.adapterConfig?.model ?? null,
    command: agent.adapterConfig?.command ?? null,
    failingCheck: failing?.code ?? null,
    failingDetail: failing?.detail ?? null,
    warningCheck: warning?.code ?? null,
    warningDetail: warning?.detail ?? null,
  });
}

const activeProjects = projects.filter((project) => !project.archivedAt);
const pausedRoutines = routines.filter((routine) => routine.status === "paused");
const activeRoutines = routines.filter((routine) => routine.status === "active");
const unexpectedActiveRoutines = activeRoutines.filter((routine) => !expectedActiveRoutineTitles.has(routine.title));
const now = new Date();
const overdueScheduleGraceMs = 2 * 60 * 1000;
const overdueActiveScheduleTriggers = activeRoutines.flatMap((routine) =>
  (routine.triggers ?? [])
    .filter((trigger) =>
      trigger.kind === "schedule"
      && trigger.enabled === true
      && trigger.nextRunAt
      && new Date(trigger.nextRunAt).getTime() < now.getTime() - overdueScheduleGraceMs
    )
    .map((trigger) => ({
      routine: routine.title,
      label: trigger.label,
      nextRunAt: trigger.nextRunAt,
      lastFiredAt: trigger.lastFiredAt ?? null,
    })),
);
const overall = verdict([
  health?.status === "ok" ? "pass" : "fail",
  ...agentChecks.map((check) => check.status),
  unexpectedActiveRoutines.length === 0 ? "pass" : "warn",
  overdueActiveScheduleTriggers.length === 0 ? "pass" : "warn",
]);

console.log(JSON.stringify({
  overall,
  apiBase,
  health,
  activeProjects: activeProjects.map((project) => ({
    name: project.name,
    status: project.status,
    workspacePolicyEnabled: project.executionWorkspacePolicy?.enabled ?? false,
  })),
  agents: agentChecks,
  routines: {
    paused: pausedRoutines.map((routine) => routine.title),
    active: activeRoutines.map((routine) => routine.title),
    unexpectedActive: unexpectedActiveRoutines.map((routine) => routine.title),
    overdueActiveScheduleTriggers,
  },
  liveRuns: liveRuns.map((run) => ({
    id: run.id,
    agentName: run.agentName,
    status: run.status,
    issueId: run.issueId,
    lastOutputAt: run.lastOutputAt,
  })),
}, null, 2));
