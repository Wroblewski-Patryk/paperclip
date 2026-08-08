const apiBase = process.env.PAPERCLIP_API_URL ?? "http://127.0.0.1:3200";
const companyName = "LuckySparrow";
const companyId = process.env.PAPERCLIP_COMPANY_ID ?? null;
const apply = process.argv.includes("--apply");

const terminalStatuses = new Set(["done", "cancelled"]);
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

function parseDelegatedWorkerLane(title) {
  const match = /^\[(?<project>[^\]]+)]\[(?<root>LUC-\d+)]\[(?<role>[^\]]+)]/.exec(title ?? "");
  if (!match?.groups) return null;
  return {
    projectName: match.groups.project.trim(),
    rootIdentifier: match.groups.root.trim(),
    role: match.groups.role.trim(),
  };
}

async function resolveCompany() {
  if (companyId) return { id: companyId, source: "PAPERCLIP_COMPANY_ID" };

  const companies = await request("GET", "/api/companies");
  const company = companies.find((candidate) => candidate.name === companyName);
  if (!company) throw new Error(`Company not found: ${companyName}`);
  return { id: company.id, source: "company_name" };
}

const company = await resolveCompany();

const [projects, agents, issues, liveRuns] = await Promise.all([
  request("GET", `/api/companies/${company.id}/projects`),
  request("GET", `/api/companies/${company.id}/agents`),
  request("GET", `/api/companies/${company.id}/issues?limit=2000`),
  request("GET", `/api/companies/${company.id}/live-runs`),
]);

const projectByName = new Map(projects.map((project) => [project.name.toLowerCase(), project]));
const issueByIdentifier = new Map(issues.filter((issue) => issue.identifier).map((issue) => [issue.identifier, issue]));
const agentById = new Map(agents.map((agent) => [agent.id, agent]));
const liveRunIssueIds = new Set(liveRuns.map((run) => run.issueId).filter(Boolean));

const actions = [];
for (const issue of issues) {
  if (terminalStatuses.has(issue.status)) continue;
  const parsed = parseDelegatedWorkerLane(issue.title);
  if (!parsed) continue;
  const assignee = agentById.get(issue.assigneeAgentId);

  const project = projectByName.get(parsed.projectName.toLowerCase());
  const parent = issueByIdentifier.get(parsed.rootIdentifier);
  if (!project || !parent) {
    actions.push({
      action: "noop_missing_project_or_parent",
      identifier: issue.identifier,
      title: issue.title,
      parsed,
      projectFound: Boolean(project),
      parentFound: Boolean(parent),
    });
    continue;
  }

  const patch = {};
  if (issue.projectId !== project.id) patch.projectId = project.id;
  if ((issue.parentId ?? issue.parentIssueId ?? null) !== parent.id) patch.parentId = parent.id;
  if (!issue.goalId && parent.goalId) patch.goalId = parent.goalId;

  if (Object.keys(patch).length === 0) {
    actions.push({
      action: "noop_worker_lane_already_normalized",
      identifier: issue.identifier,
      project: project.name,
      parentIdentifier: parent.identifier,
      assignee: assignee?.name ?? null,
      liveRunActive: liveRunIssueIds.has(issue.id),
    });
    continue;
  }

  actions.push({
    action: apply ? "normalize_worker_lane_metadata" : "would_normalize_worker_lane_metadata",
    identifier: issue.identifier,
    project: project.name,
    parentIdentifier: parent.identifier,
    assignee: assignee?.name ?? null,
    status: issue.status,
    liveRunActive: liveRunIssueIds.has(issue.id),
    patch,
  });

  if (apply) {
    await request("PATCH", `/api/issues/${issue.id}`, patch);
    await request("POST", `/api/issues/${issue.id}/comments`, {
      body: [
        "softwarehouse-worker-lane-normalizer:v1",
        "",
        `Normalized delegated worker lane metadata: project=${project.name}, parent=${parent.identifier}.`,
        "This preserves the worker lane while making it visible to project-level autonomy, hierarchy, and reporting.",
      ].join("\n"),
    });
  }
}

console.log(JSON.stringify({
  apiBase,
  company: { id: company.id, name: company.name },
  mode: apply ? "apply" : "dry-run",
  liveRunCount: liveRuns.length,
  actionCount: actions.length,
  appliedCount: apply
    ? actions.filter((action) => action.action === "normalize_worker_lane_metadata").length
    : 0,
  actions,
}, null, 2));
