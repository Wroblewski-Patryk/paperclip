import { softwarehouseRoutineTitleRenames } from "./lib/softwarehouse-active-routines.mjs";

const apiBase = (process.env.PAPERCLIP_API_URL ?? "http://127.0.0.1:3200").replace(/\/$/, "");
const companyId = process.env.PAPERCLIP_COMPANY_ID ?? "ae26bb8b-8f5f-4a85-b341-78d4e1985975";
const apply = process.argv.includes("--apply");

async function request(path, init = {}) {
  const response = await fetch(`${apiBase}/api${path}`, {
    ...init,
    headers: { "content-type": "application/json", ...(init.headers ?? {}) },
  });
  const text = await response.text();
  const body = text ? JSON.parse(text) : null;
  if (!response.ok) throw new Error(`${init.method ?? "GET"} ${path} failed (${response.status}): ${text}`);
  return body;
}

const routineRenames = softwarehouseRoutineTitleRenames;

const archiveRoutineTitles = new Set([
  "00 General: Softwarehouse Liveness and Active Work Review",
  "04 Operations: Portfolio Truth and Workspace Boundary Review",
  "04 Operations: PDCA Learning and Company Memory Review",
  "09 Technology: Evidence Gate and Definition of Done Review",
  "09 Technology: Source Control and Deploy Readiness Review",
  "00 General - v1 Draft Paused - Controlled Activation Dry Run",
]);

const preservedPausedRoutineTitles = new Set([
  "00 General: Owner Direction and Proposal Review",
  "06 People: Agent Hiring and Governance Review",
  "07 Finance: Cost, Quota, and Budget Review",
  "10 Legal: Secrets Coolify and VPS Access Readiness Review",
]);

const goalRenames = new Map([
  ["Softwarehouse long-term autonomy and self-maintenance", "11 Innovation: Softwarehouse Long-Term Autonomy and Self-Maintenance"],
]);

const [agents, projects, routines, goals] = await Promise.all([
  request(`/companies/${companyId}/agents`),
  request(`/companies/${companyId}/projects`),
  request(`/companies/${companyId}/routines`),
  request(`/companies/${companyId}/goals`),
]);

const activeProjects = projects.filter((project) => !project.archivedAt);
const byAgentName = new Map(agents.map((agent) => [agent.name, agent]));
const byProjectName = new Map(activeProjects.map((project) => [project.name, project]));
const byRoutineTitle = new Map(routines.map((routine) => [routine.title, routine]));

function required(map, key, kind) {
  const value = map.get(key);
  if (!value) throw new Error(`Required ${kind} not found: ${key}`);
  return value;
}

const changes = [];
for (const [from, to] of routineRenames) {
  const routine = byRoutineTitle.get(from) ?? byRoutineTitle.get(to);
  if (!routine) throw new Error(`Routine to normalize was not found: ${from}`);
  if (routine.title !== to) changes.push({ kind: "routine_rename", id: routine.id, from: routine.title, to });
}
for (const title of archiveRoutineTitles) {
  const routine = required(byRoutineTitle, title, "routine");
  if (routine.status !== "archived") changes.push({ kind: "routine_archive", id: routine.id, title });
}
for (const title of preservedPausedRoutineTitles) {
  const routine = required(byRoutineTitle, title, "routine");
  if (routine.status !== "paused") throw new Error(`Routine must remain paused but is ${routine.status}: ${title}`);
}
for (const [from, to] of goalRenames) {
  const goal = goals.find((candidate) => candidate.title === from || candidate.title === to);
  if (!goal) throw new Error(`Goal to normalize was not found: ${from}`);
  if (goal.title !== to) changes.push({ kind: "goal_rename", id: goal.id, from: goal.title, to });
}

const softwarehouse = required(byProjectName, "00 General: Softwarehouse", "project");
const teamInstalls = [
  {
    catalogId: "paperclipai:bundled:company-defaults:core-exec-team",
    options: {
      deploymentMode: "install",
      agentBindings: {
        ceo: required(byAgentName, "00 AIA (AI Assistant)", "agent").id,
        cto: required(byAgentName, "09 CTO (Chief Technology Officer)", "agent").id,
        qa: required(byAgentName, "09 QVE (QA & Verification Engineer)", "agent").id,
      },
      projectBindings: { "first-project": softwarehouse.id },
      routineBindings: {
        "first-heartbeat": required(
          byRoutineTitle,
          byRoutineTitle.has("11 Innovation: Autonomy Governor")
            ? "11 Innovation: Autonomy Governor"
            : "[Softwarehouse] Autonomy governor",
          "routine",
        ).id,
      },
    },
  },
  {
    catalogId: "paperclipai:bundled:product:product-design",
    options: {
      deploymentMode: "install",
      include: { issues: false },
      agentBindings: { "ux-designer": required(byAgentName, "02 UXW (UX Web Designer)", "agent").id },
      projectBindings: { "product-design": softwarehouse.id },
    },
  },
  {
    catalogId: "paperclipai:bundled:software-development:product-engineering",
    options: {
      deploymentMode: "install",
      include: { issues: false },
      agentBindings: {
        cto: required(byAgentName, "09 CTO (Chief Technology Officer)", "agent").id,
        "senior-coder": required(byAgentName, "09 EDL (Engineering Delivery Lead)", "agent").id,
        qa: required(byAgentName, "09 QVE (QA & Verification Engineer)", "agent").id,
      },
      projectBindings: { "product-engineering": softwarehouse.id },
    },
  },
  {
    catalogId: "paperclipai:optional:operations:agent-enablement",
    options: {
      deploymentMode: "install",
      agentBindings: {
        "ai-agent-development-partner": required(byAgentName, "06 AIM (AI Agent Manager)", "agent").id,
      },
      projectBindings: { "agent-enablement": softwarehouse.id },
      routineBindings: {
        "daily-agent-development-review": required(
          byRoutineTitle,
          byRoutineTitle.has("06 People: AI-Agent Development Review")
            ? "06 People: AI-Agent Development Review"
            : "[Softwarehouse] AI-agent development review",
          "routine",
        ).id,
      },
    },
  },
  {
    catalogId: "paperclipai:optional:content:content-machine",
    options: { deploymentMode: "stage" },
  },
];

const previews = [];
for (const install of teamInstalls) {
  const preview = await request(
    `/companies/${companyId}/teams/catalog/${encodeURIComponent(install.catalogId)}/preview`,
    { method: "POST", body: JSON.stringify(install.options) },
  );
  if (preview.errors?.length) {
    throw new Error(`Team preview failed for ${install.catalogId}: ${preview.errors.join("; ")}`);
  }
  previews.push({
    catalogId: install.catalogId,
    agentActions: preview.portabilityPreview.plan.agentPlans.map((item) => `${item.slug}:${item.action}`),
    projectActions: preview.portabilityPreview.plan.projectPlans.map((item) => `${item.slug}:${item.action}`),
    issueActions: preview.portabilityPreview.plan.issuePlans.map((item) => `${item.slug}:${item.action}`),
    warnings: preview.warnings,
  });
}

if (apply) {
  for (const change of changes) {
    if (change.kind === "routine_rename") await request(`/routines/${change.id}`, { method: "PATCH", body: JSON.stringify({ title: change.to }) });
    if (change.kind === "routine_archive") await request(`/routines/${change.id}`, { method: "PATCH", body: JSON.stringify({ status: "archived" }) });
    if (change.kind === "goal_rename") await request(`/goals/${change.id}`, { method: "PATCH", body: JSON.stringify({ title: change.to }) });
  }
  for (const install of teamInstalls) {
    await request(`/companies/${companyId}/teams/catalog/${encodeURIComponent(install.catalogId)}/install`, {
      method: "POST",
      body: JSON.stringify(install.options),
    });
  }
}

console.log(JSON.stringify({
  mode: apply ? "apply" : "dry-run",
  companyId,
  changes,
  preservedPausedRoutines: Array.from(preservedPausedRoutineTitles),
  teamInstalls: teamInstalls.map((entry) => ({ catalogId: entry.catalogId, ...entry.options })),
  previews,
}, null, 2));
