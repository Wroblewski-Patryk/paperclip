import { readFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(__dirname, "..");
const appsRoot = path.resolve(root, "..");
const apiBase = process.env.PAPERCLIP_API_URL ?? "http://127.0.0.1:3200";
const companyId = process.env.PAPERCLIP_COMPANY_ID ?? null;
const localCodexCommand = path.join(root, "scripts", "codex.cmd");
const rosterPath = path.join(root, "softwarehouse", "agent-roster.json");
const commonInstructionsPath = path.join(root, "softwarehouse", "instructions", "common-operating-context.md");
const roleInstructionsDir = path.join(root, "softwarehouse", "instructions", "roles");

async function request(method, route, body) {
  const response = await fetch(`${apiBase}${route}`, {
    method,
    headers: {
      "content-type": "application/json",
    },
    body: body === undefined ? undefined : JSON.stringify(body),
  });

  const text = await response.text();
  const data = text ? JSON.parse(text) : null;
  if (!response.ok) {
    throw new Error(`${method} ${route} failed with ${response.status}: ${text}`);
  }
  return data;
}

async function readApplications() {
  return (process.env.SOFTWAREHOUSE_BOOTSTRAP_PROJECTS ?? "Soar,Roost")
    .split(",")
    .map((name) => name.trim())
    .filter(Boolean)
    .map((name) => ({
      Application: name,
      Project: name,
      DocRoot: "docs",
      Overall: "",
      Status: "planned",
      DetailsLink: `${name}/docs`,
    }));
}

function adapterConfigForLane(roster, laneKey) {
  const lane = roster.modelPolicy[laneKey] ?? roster.modelPolicy.codingStrong;
  return {
    command: localCodexCommand,
    cwd: workspaceCwd(roster, null),
    model: lane.model,
    modelReasoningEffort: lane.modelReasoningEffort,
    fastMode: Boolean(lane.fastMode),
    search: false,
    dangerouslyBypassApprovalsAndSandbox: true,
    timeoutSec: 0,
    graceSec: 15,
  };
}

function workspaceCwd(roster, definition) {
  const policy = roster.workspacePolicy ?? {};
  const workspaceKey = definition?.defaultWorkspace ?? "softwarehouse";
  const configured = policy.workspaces?.[workspaceKey] ?? policy.defaultCwd;
  return configured ? path.resolve(configured) : appsRoot;
}

function adapterConfigForAgent(roster, definition, laneKey = definition.modelLane) {
  return {
    ...adapterConfigForLane(roster, laneKey),
    cwd: workspaceCwd(roster, definition),
  };
}

async function instructionsBundleForAgent(definition) {
  const [common, role] = await Promise.all([
    readFile(commonInstructionsPath, "utf8"),
    readFile(path.join(roleInstructionsDir, `${definition.key}.md`), "utf8"),
  ]);

  return {
    entryFile: "AGENTS.md",
    files: {
      "AGENTS.md": [
        common.trim(),
        "",
        "---",
        "",
        role.trim(),
        "",
        "---",
        "",
        "## Role Metadata",
        "",
        `- Agent key: ${definition.key}`,
        `- Agent name: ${definition.name}`,
        `- Reports to: ${definition.reportsTo ?? "none"}`,
        `- Model lane: ${definition.modelLane}`,
        `- Capabilities: ${definition.capabilities}`,
        "",
        "Stay inside this role unless the issue explicitly asks for cross-role coordination.",
      ].join("\n"),
    },
  };
}

async function getOrCreateCompany(roster) {
  const companies = await request("GET", "/api/companies");
  if (companyId) {
    const existingById = companies.find((company) => company.id === companyId);
    if (existingById) return existingById;
    throw new Error(`Company not found by PAPERCLIP_COMPANY_ID: ${companyId}`);
  }
  const existing = companies.find((company) => company.name === roster.company.name);
  if (existing) return existing;
  return request("POST", "/api/companies", {
    name: roster.company.name,
    description: roster.company.description,
    budgetMonthlyCents: 0,
  });
}

async function listAgents(companyId) {
  return request("GET", `/api/companies/${companyId}/agents/`);
}

async function syncAgentPermissions(agent, definition) {
  const expected = Boolean(definition.canCreateAgents);
  const current = Boolean(agent.permissions?.canCreateAgents);
  if (current === expected) return agent;
  return request("PATCH", `/api/agents/${agent.id}/permissions`, {
    canCreateAgents: expected,
  });
}

async function getOrCreateAgents(companyId, roster) {
  const createdByKey = new Map();
  const agents = await listAgents(companyId);
  const agentsByRosterKey = new Map(
    agents
      .filter((agent) => typeof agent.metadata?.rosterKey === "string")
      .map((agent) => [agent.metadata.rosterKey, agent]),
  );
  const agentsByName = new Map(agents.map((agent) => [agent.name, agent]));

  for (const definition of roster.agents) {
    const legacyName = definition.key === "engineering-delivery-lead" ? "Implementation Lead" : null;
    const existing =
      agentsByRosterKey.get(definition.key) ??
      agentsByName.get(definition.name) ??
      (legacyName ? agentsByName.get(legacyName) : null);
    const payload = {
      name: definition.name,
      role: definition.role,
      title: definition.title,
      icon: definition.icon,
      capabilities: definition.capabilities,
      adapterType: roster.modelPolicy.defaultAdapter,
      adapterConfig: adapterConfigForAgent(roster, definition),
      instructionsBundle: await instructionsBundleForAgent(definition),
      runtimeConfig: {
        modelProfiles: {
          cheap: {
            enabled: true,
            label: "Fast triage",
            adapterConfig: adapterConfigForAgent(roster, definition, "fastTriage"),
          },
        },
      },
      budgetMonthlyCents: 0,
      metadata: {
        ...(existing?.metadata ?? {}),
        rosterKey: definition.key,
        modelLane: definition.modelLane,
        responsibilityMode: "minimum_scope",
      },
      replaceAdapterConfig: true,
    };

    if (existing) {
      const updated = await syncAgentPermissions(
        await request("PATCH", `/api/agents/${existing.id}`, payload),
        definition,
      );
      createdByKey.set(definition.key, updated);
      continue;
    }

    const result = await request("POST", `/api/companies/${companyId}/agents`, {
      ...payload,
      permissions: {
        canCreateAgents: Boolean(definition.canCreateAgents),
      },
    });
    createdByKey.set(definition.key, await syncAgentPermissions(result.agent ?? result, definition));
  }

  for (const definition of roster.agents) {
    const agent = createdByKey.get(definition.key);
    if (!agent) continue;
    const reportsTo = definition.reportsTo ? createdByKey.get(definition.reportsTo)?.id ?? null : null;
    if ((agent.reportsTo ?? null) !== reportsTo) {
      const updated = await request("PATCH", `/api/agents/${agent.id}`, { reportsTo });
      createdByKey.set(definition.key, updated);
    }
  }

  return createdByKey;
}

async function listProjects(companyId) {
  return request("GET", `/api/companies/${companyId}/projects`);
}

async function getOrCreateProject(companyId, application, agentsByKey) {
  const projects = await listProjects(companyId);
  const existing = projects.find((project) => project.name === application.Application);
  if (existing) return existing;

  const cwd = path.join(appsRoot, application.Project);
  const lead =
    agentsByKey.get("innovation-portfolio-manager")
    ?? agentsByKey.get("chief-innovation-officer")
    ?? agentsByKey.get("ai-assistant");
  return request("POST", `/api/companies/${companyId}/projects`, {
    name: application.Application,
    description: `Takeover and maintenance board for ${application.Application}. Source project: ${application.Project}. Doc root: ${application.DocRoot}. Current structural score: ${application.Overall}%.`,
    status: application.Status === "structure-ready" ? "planned" : "backlog",
    leadAgentId: lead?.id ?? null,
    color: "#4f7cff",
    workspace: {
      name: `${application.Application} local workspace`,
      sourceType: "local_path",
      cwd,
      isPrimary: true,
      visibility: "default",
      metadata: {
        docRoot: application.DocRoot,
        detailsLink: application.DetailsLink,
      },
    },
  });
}

async function listIssues(companyId) {
  return request("GET", `/api/companies/${companyId}/issues?limit=2000`);
}

async function getOrCreateTakeoverIssue(companyId, application, project, agentsByKey, issues) {
  const title = `[${application.Application}] Full takeover audit and operating baseline`;
  const existing = issues.find((issue) => issue.title === title);
  if (existing) return existing;

  const description = [
    `Application: ${application.Application}`,
    `Source project: ${application.Project}`,
    `Doc root: ${application.DocRoot}`,
    `Current structural score: ${application.Overall}%`,
    `Current status: ${application.Status}`,
    "",
    "Goal:",
    "Create a full known-state baseline for product, architecture, runtime, tests, regressions, operations, and release readiness.",
    "",
    "Required child lanes:",
    "- Architecture graph and traceability audit",
    "- Product/capability roadmap audit",
    "- Runtime smoke and regression evidence",
    "- Ops/release readiness",
    "- Documentation/status/root index refresh",
    "",
    "Start policy:",
    "Keep this issue in backlog until the local agent adapter smoke test passes. Assign work only after the model lane and workspace runtime are verified.",
  ].join("\n");

  return request("POST", `/api/companies/${companyId}/issues`, {
    title,
    description,
    status: "backlog",
    priority: application.Application === "Soar" || application.Application === "Roost" ? "critical" : "high",
    projectId: project.id,
  });
}

const roster = JSON.parse(await readFile(rosterPath, "utf8"));
const applications = await readApplications();
const company = await getOrCreateCompany(roster);
const agentsByKey = await getOrCreateAgents(company.id, roster);
const issues = await listIssues(company.id);

const createdProjects = [];
for (const application of applications) {
  const project = await getOrCreateProject(company.id, application, agentsByKey);
  createdProjects.push(project);
  const issue = await getOrCreateTakeoverIssue(company.id, application, project, agentsByKey, issues);
  if (!issues.some((existing) => existing.id === issue.id)) issues.push(issue);
}

console.log(JSON.stringify({
  apiBase,
  company: { id: company.id, name: company.name },
  agents: Array.from(agentsByKey.values()).map((agent) => ({ id: agent.id, name: agent.name, role: agent.role })),
  projectCount: createdProjects.length,
}, null, 2));
