import { evaluateApplicationWork, loadApplicationVersionPolicy, orderApplicationVersionPolicyActions } from "./lib/application-version-policy.mjs";

const apiBase = process.env.PAPERCLIP_API_URL ?? "http://127.0.0.1:3200";
const configuredCompanyId = process.env.PAPERCLIP_COMPANY_ID ?? null;
const apply = process.argv.includes("--apply");
const terminalStatuses = new Set(["done", "cancelled"]);
const activeStatuses = new Set(["todo", "in_progress", "in_review", "blocked"]);
const marker = "application-version-policy-reconciler:v1";

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

async function fetchAllIssues(companyId) {
  const all = [];
  const pageSize = 200;
  for (let offset = 0; ; offset += pageSize) {
    const page = await request("GET", `/api/companies/${companyId}/issues?limit=${pageSize}&offset=${offset}`);
    all.push(...page);
    if (page.length < pageSize) return all;
    if (offset >= 20_000) throw new Error("Issue pagination exceeded the bounded 20,000 row scan");
  }
}

const companies = await request("GET", "/api/companies");
const company = configuredCompanyId
  ? companies.find((candidate) => candidate.id === configuredCompanyId)
  : companies.find((candidate) => /^LuckySparrow\b/i.test(candidate.name));
if (!company) throw new Error("LuckySparrow company not found");

const [health, liveRuns, projects, issues] = await Promise.all([
  request("GET", "/api/health"),
  request("GET", `/api/companies/${company.id}/live-runs`),
  request("GET", `/api/companies/${company.id}/projects`),
  fetchAllIssues(company.id),
]);
const activeRunCount = health.devServer?.activeRunCount ?? liveRuns.length;
const mutationHeldForActiveRuns = apply && activeRunCount !== 0;

const policy = loadApplicationVersionPolicy();
const projectById = new Map(projects.map((project) => [project.id, project]));
const issueById = new Map(issues.map((issue) => [issue.id, issue]));
const decisions = new Map();
for (const issue of issues) {
  if (terminalStatuses.has(issue.status)) continue;
  const project = projectById.get(issue.projectId);
  const decision = evaluateApplicationWork({
    policy,
    projectName: project?.name,
    title: issue.title,
    description: issue.description,
    executionPolicy: issue.executionPolicy,
  });
  if (decision.controlled) decisions.set(issue.id, decision);
}

function hasUnauthorizedAncestor(issue) {
  const visited = new Set();
  let cursor = issue;
  while (cursor?.parentId && !visited.has(cursor.parentId)) {
    visited.add(cursor.parentId);
    const parentDecision = decisions.get(cursor.parentId);
    if (parentDecision?.disposition === "product_domain_not_authorized") return true;
    cursor = issueById.get(cursor.parentId);
  }
  return false;
}

const actions = [];
for (const issue of issues) {
  if (terminalStatuses.has(issue.status)) continue;
  const decision = decisions.get(issue.id);
  const inheritedUnauthorized = hasUnauthorizedAncestor(issue);
  if (decision?.disposition === "product_domain_not_authorized" || inheritedUnauthorized) {
    actions.push({
      issueId: issue.id,
      identifier: issue.identifier,
      fromStatus: issue.status,
      toStatus: "cancelled",
      reasonCode: inheritedUnauthorized ? "product_scope.invalid_ancestor" : "product_scope.domain_not_authorized",
      detail: inheritedUnauthorized ? "ancestor is outside the authorized application domain" : `marker=${decision.marker}`,
    });
  } else if (decision?.disposition === "future_version_locked" && activeStatuses.has(issue.status)) {
    actions.push({
      issueId: issue.id,
      identifier: issue.identifier,
      fromStatus: issue.status,
      toStatus: "backlog",
      reasonCode: "product_version.predecessor_not_accepted",
      detail: `${decision.targetVersion} requires accepted ${decision.predecessorVersion}`,
    });
  }
}

const orderedActions = orderApplicationVersionPolicyActions(actions);
const applied = [];
if (apply && !mutationHeldForActiveRuns) {
  for (const action of orderedActions) {
    await request("POST", `/api/issues/${action.issueId}/comments`, {
      body: `${marker}\n${action.reasonCode}: ${action.detail}. This is a deterministic portfolio-policy hold, not an implementation failure.`,
    });
    // Board comments may intentionally resume a closed issue. Record the
    // audit explanation first, then make the policy disposition the final
    // compareable state.
    await request("PATCH", `/api/issues/${action.issueId}`, { status: action.toStatus });
    applied.push(action);
  }
}

console.log(JSON.stringify({
  generatedAt: new Date().toISOString(),
  mode: apply ? "apply" : "dry-run",
  companyId: company.id,
  activeRunCount,
  mutationHeldForActiveRuns,
  controlledIssueCount: decisions.size,
  actionCount: actions.length,
  actions: orderedActions,
  applied,
}, null, 2));
