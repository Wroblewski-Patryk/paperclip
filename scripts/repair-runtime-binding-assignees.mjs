import { softwarehouseGateSpecsByRootBlocker } from "./lib/softwarehouse-gates.mjs";

const apiBase = process.env.PAPERCLIP_API_URL ?? "http://127.0.0.1:3200";
const companyName = "LuckySparrow Software House";
const companyAliases = [companyName, "LuckySparrow"];
const companyId = process.env.PAPERCLIP_COMPANY_ID ?? null;
const apply = process.argv.includes("--apply");
const commentScanLimit = Math.max(
  0,
  Number(process.env.SOFTWAREHOUSE_RUNTIME_BINDING_ASSIGNEE_COMMENT_SCAN_LIMIT ?? 0),
);

const terminalStatuses = new Set(["done", "cancelled"]);
const openStatuses = ["todo", "in_progress", "in_review", "blocked"];
const runtimeBindingCommentSearchTerms = [
  "workers/ready",
  "smoke principal",
  "smoke_auth",
  "companycore_api_key",
  "aog:deploy-smoke",
  "protected deploy smoke",
];

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

function normalizeText(value) {
  return String(value ?? "").toLowerCase();
}

function agentEnvKeys(agent) {
  return new Set(Object.keys(agent?.adapterConfig?.env ?? {}));
}

function issueRequiresCoolifyBindings(issue) {
  const title = normalizeText(issue.title);
  const text = normalizeText([issue.title, issue.description].join("\n"));
  if (title.includes("subscription business readiness controller")) return false;
  if (/(coolify|vps|deploy|redeploy|restart|rollback|production health|deploy health|server health)/.test(title)) return true;
  return [
    "workers-market-stream",
    "temp stack",
    "temp-stack",
    "temp-domain",
    "coolify resource",
    "coolify project",
    "coolify team",
    "coolify binding",
    "coolify read-only",
    "read-only coolify",
    "requires coolify",
  ].some((token) => text.includes(token));
}

function requiredRuntimeBindingGroupsForIssue(issue, comments = []) {
  const text = normalizeText([
    issue.title,
    issue.description,
    ...comments.map((comment) => comment.body),
  ].join("\n"));
  const groups = [];
  if (issueRequiresCoolifyBindings(issue)) {
    groups.push({
      name: "coolify",
      anyOf: [["COOLIFY_BASE_URL", "COOLIFY_API_TOKEN"]],
    });
  }
  if (
    text.includes("workers/ready")
    || text.includes("smoke principal")
    || text.includes("smoke_auth")
  ) {
    groups.push({
      name: "soar_smoke_principal",
      anyOf: [
        ["SMOKE_AUTH_TOKEN"],
        ["SMOKE_AUTH_EMAIL", "SMOKE_AUTH_PASSWORD"],
      ],
    });
  }
  if (
    text.includes("companycore_api_key")
    || text.includes("aog:deploy-smoke")
    || text.includes("protected deploy smoke")
  ) {
    groups.push({
      name: "roost_protected_smoke",
      anyOf: [["COMPANYCORE_BASE_URL", "COMPANYCORE_API_KEY"]],
    });
  }
  return groups;
}

function issueTextHasRuntimeBindingSignal(issue) {
  const text = normalizeText([issue.title, issue.description].join("\n"));
  return issueRequiresCoolifyBindings(issue)
    || runtimeBindingCommentSearchTerms.some((term) => text.includes(term));
}

function issueListFromResponse(response) {
  return response?.value ?? response ?? [];
}

function satisfiesGroup(envKeys, group) {
  return group.anyOf.some((requiredSet) => requiredSet.every((key) => envKeys.has(key)));
}

function missingRuntimeBindingGroups(envKeys, groups) {
  return groups.filter((group) => !satisfiesGroup(envKeys, group));
}

function satisfiesAllGroups(agent, groups) {
  const envKeys = agentEnvKeys(agent);
  return missingRuntimeBindingGroups(envKeys, groups).length === 0;
}

function preferredAgentNamesFor(groups) {
  const groupNames = new Set(groups.map((group) => group.name));
  const names = [];
  if (groupNames.has("coolify") || groupNames.has("soar_smoke_principal")) {
    names.push("Ops Release Lead");
  }
  if (groupNames.has("roost_protected_smoke")) {
    names.push("Roost Project Manager");
  }
  return names;
}

function chooseCandidate(candidates, groups) {
  const preferredNames = preferredAgentNamesFor(groups);
  for (const name of preferredNames) {
    const preferred = candidates.find((agent) => agent.name === name);
    if (preferred) return preferred;
  }
  return candidates.length === 1 ? candidates[0] : null;
}

async function resolveCompany() {
  if (companyId) return { id: companyId, source: "PAPERCLIP_COMPANY_ID" };

  const companies = await request("GET", "/api/companies");
  const company = companies.find((candidate) => companyAliases.includes(candidate.name));
  if (!company) throw new Error(`Company not found: ${companyName}`);
  return { id: company.id, source: "company_name" };
}

const company = await resolveCompany();

const [health, agents, projects, issues] = await Promise.all([
  request("GET", "/api/health"),
  request("GET", `/api/companies/${company.id}/agents`),
  request("GET", `/api/companies/${company.id}/projects`),
  request("GET", `/api/companies/${company.id}/issues?status=${openStatuses.join(",")}&limit=1000`),
]);

const activeRunCount = health.devServer?.activeRunCount ?? 0;
if (apply && activeRunCount > 0) {
  throw new Error(`Refusing to repair runtime-binding assignees while ${activeRunCount} run(s) are active.`);
}

const activeAgents = agents.filter((agent) => agent.status !== "terminated");
const activeAgentById = new Map(activeAgents.map((agent) => [agent.id, agent]));
const activeProjectIds = new Set(projects.filter((project) => !project.archivedAt).map((project) => project.id));
const openActiveIssues = issues.filter((issue) =>
  activeProjectIds.has(issue.projectId)
  && !terminalStatuses.has(issue.status)
);

const actions = [];
const skipped = [];
let commentScanCount = 0;
let skippedCommentScanCount = 0;
for (const issue of openActiveIssues) {
  if (!issueTextHasRuntimeBindingSignal(issue)) continue;
  let comments = [];
  if (commentScanCount < commentScanLimit) {
    commentScanCount += 1;
    comments = await request("GET", `/api/issues/${issue.id}/comments?order=desc&limit=5`)
      .then((result) => issueListFromResponse(result))
      .catch(() => []);
  } else {
    skippedCommentScanCount += 1;
  }
  const requiredGroups = requiredRuntimeBindingGroupsForIssue(issue, comments);
  if (requiredGroups.length === 0) continue;

  if (issue.assigneeUserId) {
    skipped.push({
      type: "user_assigned_decision_hold_no_reassignment",
      issueId: issue.id,
      identifier: issue.identifier,
      title: issue.title,
      status: issue.status,
      assigneeUserId: issue.assigneeUserId,
      reason: "User-owned decision or credential metadata tasks must stay visible to the assigned human instead of being reassigned to runtime-bound agents.",
      requiredGroups: requiredGroups.map((group) => group.name),
    });
    continue;
  }

  if (issue.status === "blocked") {
    skipped.push({
      type: softwarehouseGateSpecsByRootBlocker.has(issue.identifier)
        ? "blocked_gate_hold_no_reassignment"
        : "blocked_issue_hold_no_reassignment",
      issueId: issue.id,
      identifier: issue.identifier,
      title: issue.title,
      status: issue.status,
      reason: softwarehouseGateSpecsByRootBlocker.has(issue.identifier)
        ? "Blocked protected gate roots must wait for gate freshness instead of waking a bound runtime owner through reassignment."
        : "Blocked issues are not runnable runtime work; keep them on their explicit blocker path instead of letting assignee repair stall autonomy.",
      requiredGroups: requiredGroups.map((group) => group.name),
    });
    continue;
  }

  const currentAssignee = activeAgentById.get(issue.assigneeAgentId);
  if (currentAssignee && satisfiesAllGroups(currentAssignee, requiredGroups)) continue;

  const candidates = activeAgents.filter((agent) => satisfiesAllGroups(agent, requiredGroups));
  const candidate = chooseCandidate(candidates, requiredGroups);
  if (!candidate) {
    actions.push({
      type: "needs_manual_assignment",
      issueId: issue.id,
      identifier: issue.identifier,
      title: issue.title,
      status: issue.status,
      currentAssignee: currentAssignee?.name ?? null,
      missingGroups: missingRuntimeBindingGroups(agentEnvKeys(currentAssignee), requiredGroups).map((group) => group.name),
      candidateCount: candidates.length,
      candidateNames: candidates.map((agent) => agent.name),
    });
    continue;
  }

  actions.push({
    type: "reassign_runtime_binding_owner",
    issueId: issue.id,
    identifier: issue.identifier,
    title: issue.title,
    status: issue.status,
    fromAgentId: issue.assigneeAgentId ?? null,
    fromAgentName: currentAssignee?.name ?? null,
    toAgentId: candidate.id,
    toAgentName: candidate.name,
    requiredGroups: requiredGroups.map((group) => group.name),
  });
}

const applied = [];
if (apply) {
  const assignableActions = actions.filter((action) => action.type === "reassign_runtime_binding_owner");
  if (assignableActions.length > 1) {
    throw new Error(`Refusing to apply ${assignableActions.length} runtime-binding assignment repairs at once.`);
  }
  for (const action of assignableActions) {
    const updated = await request("PATCH", `/api/issues/${action.issueId}`, {
      assigneeAgentId: action.toAgentId,
    });
    applied.push({
      identifier: updated.identifier,
      status: updated.status,
      assigneeAgentId: updated.assigneeAgentId,
      assigneeName: action.toAgentName,
    });
  }
}

console.log(JSON.stringify({
  apiBase,
  company: { id: company.id, name: company.name },
  mode: apply ? "apply" : "dry-run",
  activeRunCount,
  scannedIssueCount: openActiveIssues.length,
  commentScanLimit,
  commentScanCount,
  skippedCommentScanCount,
  actionCount: actions.length,
  actions,
  skipped,
  applied,
}, null, 2));
