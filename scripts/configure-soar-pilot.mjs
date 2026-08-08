import { readFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(__dirname, "..");
const appsRoot = path.resolve(root, "..");
const apiBase = process.env.PAPERCLIP_API_URL ?? "http://127.0.0.1:3200";
const companyName = "LuckySparrow";
const pilotProjectName = "Soar";
const generalProjectName = "Softwarehouse Operating System";

async function request(method, route, body) {
  const response = await fetch(`${apiBase}${route}`, {
    method,
    headers: { "content-type": "application/json" },
    body: body === undefined ? undefined : JSON.stringify(body),
  });
  const text = await response.text();
  const data = text ? JSON.parse(text) : null;
  if (!response.ok) {
    throw new Error(`${method} ${route} failed with ${response.status}: ${text}`);
  }
  return data;
}

async function getCompany() {
  const companies = await request("GET", "/api/companies");
  const company = companies.find((candidate) => candidate.name === companyName);
  if (!company) throw new Error(`Company not found: ${companyName}`);
  return company;
}

async function getOrCreateGeneralProject(company, portfolioDirector) {
  const projects = await request("GET", `/api/companies/${company.id}/projects`);
  const existing = projects.find((project) => project.name === generalProjectName);
  if (existing) return existing;
  return request("POST", `/api/companies/${company.id}/projects`, {
    name: generalProjectName,
    description: "Internal board for agent readiness, instructions, template feedback, and Software House operating system work.",
    status: "planned",
    leadAgentId: portfolioDirector?.id ?? null,
    color: "#2563eb",
    workspace: {
      name: "Softwarehouse local workspace",
      sourceType: "local_path",
      cwd: root,
      isPrimary: true,
      visibility: "default",
      metadata: {
        scope: "softwarehouse-operating-system",
      },
    },
  });
}

async function getOrCreateIssue(companyId, projectId, title, body) {
  const issues = await request("GET", `/api/companies/${companyId}/issues`);
  const existing = issues.find((issue) => issue.title === title);
  if (existing) {
    return request("PATCH", `/api/issues/${existing.id}`, {
      description: body,
      status: "backlog",
      projectId,
      hiddenAt: null,
      assigneeAgentId: null,
    });
  }
  return request("POST", `/api/companies/${companyId}/issues`, {
    title,
    description: body,
    status: "backlog",
    priority: "critical",
    projectId,
  });
}

async function main() {
  const company = await getCompany();
  const agents = await request("GET", `/api/companies/${company.id}/agents`);
  const portfolioDirector = agents.find((agent) => agent.name === "Portfolio Director");
  let projects = await request("GET", `/api/companies/${company.id}/projects`);
  let issues = await request("GET", `/api/companies/${company.id}/issues`);

  const soarProject = projects.find((project) => project.name === pilotProjectName);
  if (!soarProject) throw new Error("Soar project is missing. Run bootstrap first.");
  await request("PATCH", `/api/projects/${soarProject.id}`, {
    description: "Pilot takeover and maintenance board for Soar. Source project: Soar. Doc root: docs. Only active application project during the Software House pilot.",
    status: "planned",
  });
  const soarWorkspaces = await request("GET", `/api/projects/${soarProject.id}/workspaces`);
  const primarySoarWorkspace = soarWorkspaces.find((workspace) => workspace.isPrimary) ?? soarWorkspaces[0];
  if (primarySoarWorkspace) {
    await request("PATCH", `/api/projects/${soarProject.id}/workspaces/${primarySoarWorkspace.id}`, {
      cwd: path.join(appsRoot, "Soar"),
      metadata: {
        ...(primarySoarWorkspace.metadata ?? {}),
        docRoot: "docs",
        detailsLink: "Soar/docs/documentation-map.md",
      },
    });
  }

  const keepProjectIds = new Set([soarProject.id]);
  const generalProject = await getOrCreateGeneralProject(company, portfolioDirector);
  keepProjectIds.add(generalProject.id);

  const archivedAt = new Date().toISOString();
  let hiddenIssues = 0;
  let archivedProjects = 0;

  for (const issue of issues) {
    if (!issue.projectId || keepProjectIds.has(issue.projectId)) continue;
    await request("PATCH", `/api/issues/${issue.id}`, {
      status: "cancelled",
      hiddenAt: archivedAt,
      interrupt: true,
      assigneeAgentId: null,
      comment: "Hidden during Soar pilot. Non-pilot projects will be reintroduced after the Software House workflow is proven on Soar.",
    });
    hiddenIssues += 1;
  }

  projects = await request("GET", `/api/companies/${company.id}/projects`);
  for (const project of projects) {
    if (keepProjectIds.has(project.id)) continue;
    await request("PATCH", `/api/projects/${project.id}`, {
      status: "backlog",
      archivedAt,
      description: `${project.description ?? ""}\n\nArchived from active Software House view during the Soar pilot. Reintroduce after pilot readiness is proven.`.trim(),
    });
    archivedProjects += 1;
  }

  const soarAuditTitle = "[Soar] Full takeover audit and operating baseline";
  const soarAuditDescription = [
    "Pilot scope: only Soar is active.",
    "Goal: make Soar safe for agentic development by building a complete known-state baseline.",
    "",
    "Required child lanes:",
    "- Portfolio: issue tree and pilot acceptance gate",
    "- Product: capability map and acceptance criteria",
    "- CTO: architecture/function graph and risk map",
    "- QA: smoke/regression evidence baseline",
    "- Ops: runtime/deploy/environment map",
    "- Docs: documentation inventory and template feedback",
    "- UX: primary screen/workflow visual evidence",
    "",
    "Do not work on other application projects until this pilot is stable.",
  ].join("\n");
  await getOrCreateIssue(company.id, soarProject.id, soarAuditTitle, soarAuditDescription);

  await getOrCreateIssue(
    company.id,
    generalProject.id,
    "[Softwarehouse] Agent readiness and template feedback loop",
    [
      "Goal: make Paperclip agents safe to run against Soar.",
      "",
      "Checklist:",
      "- verify local adapter/model lane",
      "- keep heartbeat disabled until smoke test passes",
      "- sync agent instructions from tracked files",
      "- document how Soar lessons update !template",
      "- define when the next project can be added",
      "",
      `Softwarehouse root: ${root}`,
      `Template root: ${path.join(appsRoot, "!template")}`,
      `Soar root: ${path.join(appsRoot, "Soar")}`,
    ].join("\n"),
  );

  console.log(JSON.stringify({
    apiBase,
    company: { id: company.id, name: company.name },
    keptProjects: [pilotProjectName, generalProjectName],
    hiddenIssues,
    archivedProjects,
  }, null, 2));
}

await main();
