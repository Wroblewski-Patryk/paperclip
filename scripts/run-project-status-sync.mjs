const apiBase = process.env.PAPERCLIP_API_URL ?? "http://127.0.0.1:3200";
const companyName = "LuckySparrow Software House";
const companyId = process.env.PAPERCLIP_COMPANY_ID ?? null;
const apply = process.argv.includes("--apply");
const controlledProjectNames = new Set(
  (process.env.SOFTWAREHOUSE_LOCAL_REPAIR_PROJECTS ?? "Soar,Roost")
    .split(",")
    .map((name) => name.trim())
    .filter(Boolean),
);
const projectAliases = new Map([
  ["Soar", ["Soar", "11 Innovation: Soar"]],
  ["Roost", ["Roost", "11 Innovation: Roost"]],
  ["Softwarehouse Operating System", ["Softwarehouse Operating System", "00 General: Softwarehouse"]],
  ["Aviary", ["Aviary", "Personality"]],
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

function canonicalProjectName(project) {
  for (const name of controlledProjectNames) {
    const aliases = projectAliases.get(name) ?? [name];
    if (aliases.includes(project.name)) return name;
  }
  return null;
}

async function resolveCompany() {
  if (companyId) return { id: companyId, source: "PAPERCLIP_COMPANY_ID" };

  const companies = await request("GET", "/api/companies");
  const company = companies.find((candidate) => candidate.name === companyName);
  if (!company) throw new Error(`Company not found: ${companyName}`);
  return { id: company.id, source: "company_name" };
}

const company = await resolveCompany();

const [projects, issues, liveRuns] = await Promise.all([
  request("GET", `/api/companies/${company.id}/projects`),
  request("GET", `/api/companies/${company.id}/issues?limit=1000`),
  request("GET", `/api/companies/${company.id}/live-runs`),
]);

const projectById = new Map(projects.map((project) => [project.id, project]));
const inProgressByProjectId = new Map();
for (const issue of issues) {
  if (issue.status !== "in_progress") continue;
  const project = projectById.get(issue.projectId);
  if (!project || project.archivedAt || !canonicalProjectName(project)) continue;
  const current = inProgressByProjectId.get(project.id) ?? [];
  current.push(issue.identifier);
  inProgressByProjectId.set(project.id, current);
}

const actions = [];
for (const [projectId, identifiers] of inProgressByProjectId.entries()) {
  const project = projectById.get(projectId);
  if (!project || project.status === "in_progress") {
    actions.push({
      action: "noop_project_status_aligned",
      project: project?.name ?? null,
      status: project?.status ?? null,
      inProgressIssues: identifiers,
    });
    continue;
  }
  actions.push({
    action: apply ? "updated_project_status_in_progress" : "would_update_project_status_in_progress",
    project: project.name,
    fromStatus: project.status ?? null,
    toStatus: "in_progress",
    inProgressIssues: identifiers,
  });
  if (apply) {
    await request("PATCH", `/api/projects/${project.id}`, { status: "in_progress" });
  }
}

console.log(JSON.stringify({
  apiBase,
  company: { id: company.id, name: company.name },
  mode: apply ? "apply" : "dry-run",
  liveRunCount: liveRuns.length,
  actionCount: actions.filter((action) => action.action.startsWith("updated_") || action.action.startsWith("would_update_")).length,
  actions,
}, null, 2));
