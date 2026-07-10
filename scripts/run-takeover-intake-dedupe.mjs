const apiBase = process.env.PAPERCLIP_API_URL ?? "http://127.0.0.1:3200";
const companyName = "LuckySparrow Software House";
const companyNameAliases = [companyName, "LuckySparrow"];
const companyId = process.env.PAPERCLIP_COMPANY_ID ?? null;
const apply = process.argv.includes("--apply");
const requestTimeoutMs = Number(process.env.TAKEOVER_INTAKE_DEDUPE_REQUEST_TIMEOUT_MS ?? 15_000);
const terminalStatuses = new Set(["done", "cancelled"]);
const openStatuses = ["backlog", "todo", "in_progress", "in_review", "blocked"];
const takeoverTitleSearch = "Full takeover audit and operating baseline";
const takeoverTitlePattern = /^\[(?<project>.+?)\] Full takeover audit and operating baseline$/;
const protectedKeepByProject = new Map([
  ["Soar", "LUC-12"],
  ["Roost", "LUC-262"],
  ["Aviary", "LUC-976"],
]);

async function request(method, route, body) {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), requestTimeoutMs);
  try {
    const response = await fetch(`${apiBase}${route}`, {
      method,
      headers: { "content-type": "application/json" },
      body: body === undefined ? undefined : JSON.stringify(body),
      signal: controller.signal,
    });
    const text = await response.text();
    const data = text ? JSON.parse(text) : null;
    if (!response.ok) throw new Error(`${method} ${route} failed with ${response.status}: ${text}`);
    return data;
  } catch (error) {
    if (error instanceof Error && error.name === "AbortError") {
      throw new Error(`${method} ${route} timed out after ${requestTimeoutMs}ms`, { cause: error });
    }
    throw error;
  } finally {
    clearTimeout(timeout);
  }
}

function isRequestTimeoutError(error) {
  return error instanceof Error && /timed out after \d+ms/i.test(error.message);
}

function timestampMs(timestamp) {
  const value = timestamp ? new Date(timestamp).getTime() : Number.NaN;
  return Number.isFinite(value) ? value : 0;
}

function keepScore(issue) {
  let score = 0;
  if (issue.assigneeAgentId) score += 10;
  if (issue.status === "in_progress") score += 8;
  if (issue.status === "blocked") score += 6;
  if (issue.status === "todo") score += 4;
  if (issue.status === "backlog") score += 2;
  score += Math.min(timestampMs(issue.updatedAt ?? issue.createdAt) / 1_000_000_000_000, 2);
  return score;
}

function chooseKeeper(projectName, issues) {
  const protectedIdentifier = protectedKeepByProject.get(projectName);
  const protectedIssue = protectedIdentifier
    ? issues.find((issue) => issue.identifier === protectedIdentifier)
    : null;
  if (protectedIssue) return protectedIssue;
  return [...issues].sort((left, right) =>
    keepScore(right) - keepScore(left)
    || String(right.identifier).localeCompare(String(left.identifier), undefined, { numeric: true })
  )[0];
}

async function resolveCompany() {
  if (companyId) return { id: companyId, source: "PAPERCLIP_COMPANY_ID" };

  const companies = await request("GET", "/api/companies");
  const company = companies.find((candidate) => companyNameAliases.includes(candidate.name))
    ?? companies.find((candidate) => /^LuckySparrow\b/i.test(candidate.name));
  if (!company) throw new Error(`Company not found: ${companyName}`);
  return {
    id: company.id,
    source: company.name === companyName ? "company_name" : `company_alias:${company.name}`,
  };
}

const company = await resolveCompany();
const issueParams = new URLSearchParams({
  limit: "200",
  status: openStatuses.join(","),
  q: takeoverTitleSearch,
});

let issues = [];
let agents = [];
try {
  [issues, agents] = await Promise.all([
    request("GET", `/api/companies/${company.id}/issues?${issueParams}`),
    request("GET", `/api/companies/${company.id}/agents`),
  ]);
} catch (error) {
  if (!isRequestTimeoutError(error)) throw error;
  console.log(JSON.stringify({
    apiBase,
    company: { id: company.id, name: company.name },
    mode: apply ? "apply" : "dry-run",
    candidateScanStatus: "timed_out",
    duplicateGroupCount: null,
    actionCount: 0,
    actions: [],
    applied: [],
    skipped: [
      {
        action: "skip_takeover_intake_dedupe",
        reason: "candidate_scan_timeout",
        ownerAction: "Retry takeover intake dedupe after the local Paperclip issue-list route is responsive.",
        error: error.message,
      },
    ],
  }, null, 2));
  process.exit(0);
}
const agentById = new Map(agents.map((agent) => [agent.id, agent]));
const grouped = new Map();

for (const issue of issues) {
  if (terminalStatuses.has(issue.status)) continue;
  const match = takeoverTitlePattern.exec(issue.title ?? "");
  if (!match) continue;
  const projectName = match.groups.project;
  const items = grouped.get(projectName) ?? [];
  items.push(issue);
  grouped.set(projectName, items);
}

const actions = [];
for (const [projectName, items] of grouped.entries()) {
  if (items.length <= 1) continue;
  const keeper = chooseKeeper(projectName, items);
  for (const duplicate of items) {
    if (duplicate.id === keeper.id) continue;
    actions.push({
      action: "cancel_duplicate_takeover_issue",
      project: projectName,
      identifier: duplicate.identifier,
      status: duplicate.status,
      assignee: agentById.get(duplicate.assigneeAgentId)?.name ?? null,
      keepIdentifier: keeper.identifier,
      keepStatus: keeper.status,
      keepAssignee: agentById.get(keeper.assigneeAgentId)?.name ?? null,
    });
  }
}

const applied = [];
if (apply) {
  for (const action of actions) {
    const issue = issues.find((candidate) => candidate.identifier === action.identifier);
    if (!issue) continue;
    const updated = await request("PATCH", `/api/issues/${issue.id}`, {
      status: "cancelled",
      comment: [
        "softwarehouse-takeover-intake-dedupe:v1",
        "",
        `Cancelled duplicate takeover baseline for ${action.project}.`,
        `Canonical kept issue: ${action.keepIdentifier}.`,
        "This is Paperclip board hygiene only; no product, deploy, production, secret, or project-code mutation was performed.",
      ].join("\n"),
    });
    applied.push({
      ...action,
      appliedStatus: updated.status,
    });
  }
}

console.log(JSON.stringify({
  apiBase,
  company: { id: company.id, name: company.name },
  mode: apply ? "apply" : "dry-run",
  duplicateGroupCount: [...grouped.values()].filter((items) => items.length > 1).length,
  actionCount: actions.length,
  actions,
  applied,
}, null, 2));
