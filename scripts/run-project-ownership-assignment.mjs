import { readdir, readFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { findAgentByNameOrAlias } from "./lib/softwarehouse-agent-resolver.mjs";
import { resolveLocalCodexCommand } from "./lib/local-codex-command.mjs";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(__dirname, "..");
const appsRoot = path.resolve(root, "..");
const apiBase = process.env.PAPERCLIP_API_URL ?? "http://127.0.0.1:3200";
const companyName = "LuckySparrow";
const companyNameAliases = [companyName, "LuckySparrow Software House"];
const companyId = process.env.PAPERCLIP_COMPANY_ID ?? null;
const apply = process.argv.includes("--apply");
const localCodexCommand = resolveLocalCodexCommand(root);
const rosterPath = path.join(root, "softwarehouse", "agent-roster.json");
const sharedDir = path.join(root, "softwarehouse", "instructions", "shared");
const rolesDir = path.join(root, "softwarehouse", "instructions", "roles");
const controlledProjectNames = (process.env.SOFTWAREHOUSE_LOCAL_REPAIR_PROJECTS ?? "Soar,Roost,Featherly,Softwarehouse Operating System")
  .split(",")
  .map((name) => name.trim())
  .filter(Boolean);
const terminalStatuses = new Set(["done", "cancelled"]);
const runnableStatuses = new Set(["todo", "backlog"]);

const projectAliases = new Map([
  ["Soar", ["Soar", "11 Innovation: Soar"]],
  ["Roost", ["Roost", "11 Innovation: Roost"]],
  ["Featherly", ["Featherly", "11 Innovation: Featherly"]],
  ["Softwarehouse Operating System", ["Softwarehouse Operating System", "00 General: Softwarehouse"]],
  ["Aviary", ["Aviary", "Personality"]],
]);

const projectManagerByProject = new Map([
  ["Soar", "Soar Project Manager"],
  ["Roost", "Roost Project Manager"],
  ["Featherly", "Featherly Platform Manager"],
  ["Aviary", "Aviary Project Manager"],
  ["Nest", "Nest Project Manager"],
  ["Softwarehouse Operating System", "CTO Architect"],
]);

const rosterKeyByProject = new Map([
  ["Aviary", "aviary-product-manager"],
  ["Nest", "nest-project-manager"],
  ["Featherly", "featherly-platform-manager"],
]);

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

async function readRoster() {
  return JSON.parse(await readFile(rosterPath, "utf8"));
}

function adapterConfigForLane(roster, laneKey) {
  const lane = roster.modelPolicy[laneKey] ?? roster.modelPolicy.generalReasoning;
  return {
    command: localCodexCommand,
    cwd: appsRoot,
    model: lane.model,
    modelReasoningEffort: lane.modelReasoningEffort,
    fastMode: Boolean(lane.fastMode),
    search: false,
    dangerouslyBypassApprovalsAndSandbox: false,
    timeoutSec: 0,
    graceSec: 15,
  };
}

async function buildInstructions(definition) {
  const sharedFiles = (await readdir(sharedDir))
    .filter((file) => file.endsWith(".md"))
    .sort();
  const rolePath = `roles/${definition.key}.md`;
  const files = {
    "AGENTS.md": [
      "# LuckySparrow Software House Agent Instructions",
      "",
      "This is the task-scoped bundle entry file. Start from the assigned Paperclip issue; the listed files are on-demand references, not bootstrap. Do not preload or concatenate them.",
      "",
      "## Shared Contracts",
      "",
      ...sharedFiles.map((file) => `- \`shared/${file}\``),
      "",
      "## Role File",
      "",
      `- \`${rolePath}\``,
      "",
      "## Metadata",
      "",
      "- `metadata.md`",
      "",
      "The native run context is the current role/hierarchy/permission authority; use the role file only on demand. If a task needs more responsibility than this role owns, create or request a handoff.",
    ].join("\n"),
  };

  for (const file of sharedFiles) {
    files[`shared/${file}`] = `${(await readFile(path.join(sharedDir, file), "utf8")).trim()}\n`;
  }
  files[rolePath] = `${(await readFile(path.join(rolesDir, `${definition.key}.md`), "utf8")).trim()}\n`;
  files["metadata.md"] = [
    "# Role Metadata",
    "",
    `- Agent key: ${definition.key}`,
    `- Agent name: ${definition.name}`,
    `- Reports to: ${definition.reportsTo ?? "none"}`,
    `- Model lane: ${definition.modelLane}`,
    `- Capabilities: ${definition.capabilities}`,
    "",
    "Stay inside this role unless the issue explicitly asks for cross-role coordination.",
  ].join("\n");

  return { entryFile: "AGENTS.md", files };
}

function projectRank(projectName) {
  const index = controlledProjectNames.indexOf(projectName);
  return index === -1 ? 999 : index;
}

function priorityRank(priority) {
  return { critical: 0, urgent: 1, high: 2, medium: 3, low: 4 }[priority] ?? 5;
}

function statusRank(status) {
  return { todo: 0, backlog: 1 }[status] ?? 2;
}

function canonicalProjectName(project) {
  for (const name of controlledProjectNames) {
    const aliases = projectAliases.get(name) ?? [name];
    if (aliases.includes(project.name)) return name;
  }
  return null;
}

function sortIssues(left, right) {
  return statusRank(left.status) - statusRank(right.status)
    || projectRank(left.controlledProject) - projectRank(right.controlledProject)
    || priorityRank(left.priority) - priorityRank(right.priority)
    || String(left.identifier).localeCompare(String(right.identifier), undefined, { numeric: true });
}

async function ensureAgent(companyId, roster, agentsByName, agentsByRosterKey, definition, reportsTo) {
  const existing = agentsByRosterKey.get(definition.key) ?? agentsByName.get(definition.name) ?? null;
  const instructionsBundle = await buildInstructions(definition);
  const payload = {
    name: definition.name,
    role: definition.role,
    title: definition.title,
    icon: definition.icon,
    reportsTo: reportsTo?.id ?? null,
    capabilities: definition.capabilities,
    adapterType: roster.modelPolicy.defaultAdapter,
    adapterConfig: adapterConfigForLane(roster, definition.modelLane),
    instructionsBundle,
    runtimeConfig: {
      modelProfiles: {
        cheap: {
          enabled: true,
          label: "Fast triage",
          adapterConfig: adapterConfigForLane(roster, "fastTriage"),
        },
      },
    },
    budgetMonthlyCents: 0,
    metadata: {
      ...(existing?.metadata ?? {}),
      rosterKey: definition.key,
      modelLane: definition.modelLane,
      responsibilityMode: "minimum_scope",
      createdBy: "softwarehouse-project-ownership-assignment",
    },
    replaceAdapterConfig: true,
  };

  if (!apply) {
    return {
      agent: existing ?? { id: null, name: definition.name },
      action: existing ? "would_update_project_pm" : "would_create_project_pm",
    };
  }

  const result = existing
    ? await request("PATCH", `/api/agents/${existing.id}`, payload)
    : await request("POST", `/api/companies/${companyId}/agents`, {
        ...payload,
        permissions: { canCreateAgents: Boolean(definition.canCreateAgents) },
      });
  const agent = result.agent ?? result;

  await request("PATCH", `/api/agents/${agent.id}/instructions-bundle?companyId=${companyId}`, {
    mode: "managed",
    entryFile: "AGENTS.md",
    clearLegacyPromptTemplate: true,
  });
  for (const [filePath, content] of Object.entries(instructionsBundle.files)) {
    await request("PUT", `/api/agents/${agent.id}/instructions-bundle/file?companyId=${companyId}`, {
      path: filePath,
      content,
      clearLegacyPromptTemplate: true,
    });
  }

  return {
    agent,
    action: existing ? "updated_project_pm" : "created_project_pm",
  };
}

function assignmentComment(issue, agent, controlledProject) {
  return [
    "softwarehouse-ownership-assignment:v1",
    "",
    `Assigned ${issue.identifier} to ${agent.name} as the project PM for ${controlledProject}.`,
    "",
    "Scope:",
    "- own the known-state/takeover baseline;",
    "- collect evidence before coding;",
    "- create narrow specialist handoffs only after the affected flow, owner, dependencies, and proof contract are named;",
    "- keep protected production gates intact while active local delivery proceeds.",
    "",
    "Forbidden in this lane without a fresh gate or explicit operator approval: push, deploy, restart, production mutation, protected smoke, and secret disclosure.",
  ].join("\n");
}

const roster = await readRoster();
async function resolveCompany() {
  if (companyId) return { id: companyId, source: "PAPERCLIP_COMPANY_ID" };

  const companies = await request("GET", "/api/companies");
  const company =
    companies.find((candidate) => companyNameAliases.includes(candidate.name))
    ?? companies.find((candidate) => /^LuckySparrow\b/i.test(candidate.name));
  if (!company) throw new Error(`Company not found: ${companyNameAliases.join(" / ")}`);
  return { id: company.id, source: "company_name" };
}

const company = await resolveCompany();

const [health, projects, issues, agents, liveRuns] = await Promise.all([
  request("GET", "/api/health"),
  request("GET", `/api/companies/${company.id}/projects`),
  request("GET", `/api/companies/${company.id}/issues?limit=1000`),
  request("GET", `/api/companies/${company.id}/agents`),
  request("GET", `/api/companies/${company.id}/live-runs`),
]);

const activeRunCount = health.devServer?.activeRunCount ?? liveRuns.length;
const projectById = new Map(projects.map((project) => [project.id, project]));
const agentsByName = new Map(agents.filter((agent) => agent.status !== "terminated").map((agent) => [agent.name, agent]));
const agentsByRosterKey = new Map(
  agents
    .filter((agent) => agent.status !== "terminated" && typeof agent.metadata?.rosterKey === "string")
    .map((agent) => [agent.metadata.rosterKey, agent]),
);
const liveRunsByAgentId = new Map();
for (const run of liveRuns) {
  if (!run.agentId) continue;
  const runs = liveRunsByAgentId.get(run.agentId) ?? [];
  runs.push(run);
  liveRunsByAgentId.set(run.agentId, runs);
}
const activeAgents = agents.filter((agent) => agent.status !== "terminated");
const portfolio = findAgentByNameOrAlias(activeAgents, "Portfolio Director");
const innovationsDirector =
  agentsByRosterKey.get("innovations-director")
  ?? agentsByName.get("11 Innovations Director")
  ?? portfolio;
const definitionsByKey = new Map(roster.agents.map((definition) => [definition.key, definition]));

const runnableUnowned = issues
  .map((issue) => {
    const project = projectById.get(issue.projectId);
    const controlledProject = project ? canonicalProjectName(project) : null;
    return { ...issue, project, controlledProject };
  })
  .filter((issue) =>
    issue.project
    && !issue.project.archivedAt
    && issue.controlledProject
    && runnableStatuses.has(issue.status)
    && !terminalStatuses.has(issue.status)
    && !issue.assigneeAgentId
    && !issue.assigneeUserId
  )
  .sort(sortIssues);

const actions = [];
if (activeRunCount > 0) {
  actions.push({
    action: "active_runs_present_checking_target_agent",
    activeRunCount,
    liveRunCount: liveRuns.length,
  });
}

if (runnableUnowned.length === 0) {
  actions.push({ action: "noop_no_unowned_runnable_controlled_issue" });
} else {
  const issue = runnableUnowned[0];
  const pmName = projectManagerByProject.get(issue.controlledProject) ?? "Portfolio Director";
  let agent = findAgentByNameOrAlias(activeAgents, pmName);
  const rosterKey = rosterKeyByProject.get(issue.controlledProject);
  let agentAction = "noop_existing_project_pm";

  if (!agent && rosterKey) {
    const definition = definitionsByKey.get(rosterKey);
    if (!definition) throw new Error(`Roster definition not found: ${rosterKey}`);
    const ensured = await ensureAgent(company.id, roster, agentsByName, agentsByRosterKey, definition, innovationsDirector);
    agent = ensured.agent;
    agentAction = ensured.action;
  }
  if (!agent) agent = portfolio;
  const activeRunsForAgent = agent?.id ? liveRunsByAgentId.get(agent.id) ?? [] : [];

  actions.push({
    action: agentAction,
    project: issue.controlledProject,
    agentName: agent?.name ?? null,
    agentId: agent?.id ?? null,
  });

  if (activeRunsForAgent.length > 0) {
    actions.push({
      action: "noop_target_agent_has_active_runs",
      identifier: issue.identifier,
      project: issue.project.name,
      controlledProject: issue.controlledProject,
      assigneeName: agent.name,
      activeRunCount: activeRunsForAgent.length,
    });
  } else if (!agent?.id) {
    actions.push({
      action: "would_assign_issue_after_pm_creation",
      identifier: issue.identifier,
      project: issue.project.name,
      controlledProject: issue.controlledProject,
      assigneeName: agent?.name ?? pmName,
    });
  } else if (apply) {
    const updated = await request("PATCH", `/api/issues/${issue.id}`, {
      assigneeAgentId: agent.id,
      status: issue.status,
    });
    await request("POST", `/api/issues/${issue.id}/comments`, {
      body: assignmentComment(issue, agent, issue.controlledProject),
    });
    if ((issue.project.leadAgentId ?? null) !== agent.id) {
      await request("PATCH", `/api/projects/${issue.project.id}`, {
        leadAgentId: agent.id,
      });
    }
    actions.push({
      action: "assigned_issue_to_project_pm",
      identifier: updated.identifier,
      status: updated.status,
      project: issue.project.name,
      controlledProject: issue.controlledProject,
      assigneeName: agent.name,
      assigneeAgentId: updated.assigneeAgentId ?? null,
    });
  } else {
    actions.push({
      action: "would_assign_issue_to_project_pm",
      identifier: issue.identifier,
      status: issue.status,
      project: issue.project.name,
      controlledProject: issue.controlledProject,
      assigneeName: agent.name,
      assigneeAgentId: agent.id,
    });
  }
}

console.log(JSON.stringify({
  apiBase,
  company: { id: company.id, name: company.name },
  mode: apply ? "apply" : "dry-run",
  activeRunCount,
  liveRunCount: liveRuns.length,
  candidateCount: runnableUnowned.length,
  actions,
  nextCandidates: runnableUnowned.slice(0, 5).map((issue) => ({
    identifier: issue.identifier,
    title: issue.title,
    status: issue.status,
    priority: issue.priority,
    project: issue.project.name,
    controlledProject: issue.controlledProject,
  })),
}, null, 2));
