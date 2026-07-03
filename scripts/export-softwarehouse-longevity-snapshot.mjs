import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";

const apiBase = process.env.PAPERCLIP_API_URL ?? "http://127.0.0.1:3200";
const companyName = process.env.SOFTWAREHOUSE_COMPANY_NAME ?? "LuckySparrow";
const companyId = process.env.PAPERCLIP_COMPANY_ID ?? null;
const outputRoot = process.env.SOFTWAREHOUSE_SNAPSHOT_DIR ?? "report/longevity";
const requestTimeoutMs = Number(process.env.SOFTWAREHOUSE_LONGEVITY_REQUEST_TIMEOUT_MS ?? 60_000);
const issuePageSize = Number(process.env.SOFTWAREHOUSE_LONGEVITY_ISSUE_PAGE_SIZE ?? 500);
const maxIssueDetails = Number(process.env.SOFTWAREHOUSE_LONGEVITY_MAX_ISSUE_DETAILS ?? 2_000);
const requestRetryCount = Number(process.env.SOFTWAREHOUSE_LONGEVITY_REQUEST_RETRIES ?? 2);
const requestRetryBaseDelayMs = Number(process.env.SOFTWAREHOUSE_LONGEVITY_RETRY_BASE_DELAY_MS ?? 500);
const activeIssueStatuses = (process.env.SOFTWAREHOUSE_LONGEVITY_ISSUE_STATUSES
  ?? "backlog,todo,in_progress,in_review,blocked")
  .split(",")
  .map((status) => status.trim())
  .filter(Boolean);

async function request(route) {
  let lastError = null;
  for (let attempt = 0; attempt <= requestRetryCount; attempt += 1) {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), requestTimeoutMs);
    try {
      const response = await fetch(`${apiBase}${route}`, { signal: controller.signal });
      const text = await response.text();
      const data = text ? JSON.parse(text) : null;
      if (!response.ok) {
        const error = new Error(`GET ${route} failed with ${response.status}: ${text}`);
        error.status = response.status;
        throw error;
      }
      return data;
    } catch (error) {
      lastError = error?.name === "AbortError"
        ? new Error(`GET ${route} timed out after ${requestTimeoutMs}ms`)
        : error;
      const retryable = error?.name === "AbortError" || error?.status === 429 || error?.status >= 500;
      if (!retryable || attempt >= requestRetryCount) throw lastError;
      await new Promise((resolve) => setTimeout(resolve, requestRetryBaseDelayMs * (attempt + 1)));
    } finally {
      clearTimeout(timer);
    }
  }
  throw lastError;
}

async function requestAllPages(route, { limit = issuePageSize } = {}) {
  const rows = [];
  for (let offset = 0; ; offset += limit) {
    const separator = route.includes("?") ? "&" : "?";
    const page = await request(`${route}${separator}limit=${limit}&offset=${offset}`);
    if (!Array.isArray(page)) {
      throw new Error(`Expected paginated route to return an array: ${route}`);
    }
    rows.push(...page);
    if (page.length < limit) return rows;
  }
}

async function requestBoundedPages(route, { limit = issuePageSize, maxRows = maxIssueDetails } = {}) {
  const effectiveLimit = Math.max(1, Math.min(limit, maxRows));
  const rows = [];
  let nextOffset = 0;
  let truncated = false;
  for (let offset = 0; offset < maxRows; offset += effectiveLimit) {
    const separator = route.includes("?") ? "&" : "?";
    const remaining = maxRows - rows.length;
    const pageLimit = Math.min(effectiveLimit, remaining);
    const page = await request(`${route}${separator}limit=${pageLimit}&offset=${offset}`);
    if (!Array.isArray(page)) {
      throw new Error(`Expected paginated route to return an array: ${route}`);
    }
    rows.push(...page);
    nextOffset = offset + page.length;
    if (page.length < pageLimit) return { rows, truncated, nextOffset };
  }

  const separator = route.includes("?") ? "&" : "?";
  const overflow = await request(`${route}${separator}limit=1&offset=${rows.length}`);
  if (!Array.isArray(overflow)) {
    throw new Error(`Expected paginated route to return an array: ${route}`);
  }
  truncated = overflow.length > 0;
  return { rows, truncated, nextOffset: rows.length };
}

function redactAgent(agent) {
  return {
    id: agent.id,
    name: agent.name,
    role: agent.role,
    title: agent.title,
    status: agent.status,
    reportsTo: agent.reportsTo ?? null,
    adapterType: agent.adapterType ?? null,
    model: agent.adapterConfig?.model ?? null,
    modelReasoningEffort: agent.adapterConfig?.modelReasoningEffort ?? null,
    metadata: agent.metadata ?? {},
    updatedAt: agent.updatedAt ?? null,
  };
}

function redactProject(project) {
  return {
    id: project.id,
    name: project.name,
    status: project.status,
    archivedAt: project.archivedAt ?? null,
    leadAgentId: project.leadAgentId ?? null,
    executionWorkspacePolicy: project.executionWorkspacePolicy
      ? {
          enabled: project.executionWorkspacePolicy.enabled ?? null,
          defaultMode: project.executionWorkspacePolicy.defaultMode ?? null,
          allowIssueOverride: project.executionWorkspacePolicy.allowIssueOverride ?? null,
          runtimePolicy: project.executionWorkspacePolicy.runtimePolicy ?? null,
          branchPolicy: project.executionWorkspacePolicy.branchPolicy ?? null,
          workspaceStrategy: project.executionWorkspacePolicy.workspaceStrategy
            ? {
                type: project.executionWorkspacePolicy.workspaceStrategy.type ?? null,
                branchTemplate: project.executionWorkspacePolicy.workspaceStrategy.branchTemplate ?? null,
              }
            : null,
        }
      : null,
    updatedAt: project.updatedAt ?? null,
  };
}

function redactIssue(issue) {
  return {
    id: issue.id,
    identifier: issue.identifier,
    title: issue.title,
    status: issue.status,
    priority: issue.priority,
    projectId: issue.projectId ?? null,
    goalId: issue.goalId ?? null,
    parentId: issue.parentId ?? null,
    assigneeAgentId: issue.assigneeAgentId ?? null,
    blockedBy: (issue.blockedBy ?? []).map((blocker) => ({
      id: blocker.id,
      identifier: blocker.identifier,
      status: blocker.status,
      title: blocker.title,
    })),
    blockerAttention: issue.blockerAttention ?? null,
    updatedAt: issue.updatedAt ?? null,
  };
}

function redactRoutine(routine) {
  return {
    id: routine.id,
    title: routine.title,
    status: routine.status,
    priority: routine.priority,
    projectId: routine.projectId ?? null,
    assigneeAgentId: routine.assigneeAgentId ?? null,
    concurrencyPolicy: routine.concurrencyPolicy ?? null,
    catchUpPolicy: routine.catchUpPolicy ?? null,
    updatedAt: routine.updatedAt ?? null,
  };
}

function markdownFor(snapshot) {
  const projectRows = snapshot.projects
    .map((project) => `| ${project.name} | ${project.status} | ${project.archivedAt ? "archived" : "active"} | ${project.executionWorkspacePolicy?.enabled ?? false} | ${project.executionWorkspacePolicy?.runtimePolicy?.preparationOnly ?? false} |`)
    .join("\n");
  const liveRows = snapshot.liveRuns
    .map((run) => `| ${run.issueIdentifier ?? ""} | ${run.issueTitle ?? ""} | ${run.agentName ?? ""} | ${run.status} | ${run.lastOutputAt ?? ""} |`)
    .join("\n");
  const statusCounts = Object.entries(snapshot.issueStatusCounts)
    .map(([status, count]) => `- ${status}: ${count}`)
    .join("\n");
  const issueExport = snapshot.issueExport ?? {};
  const omittedIssueDetails = issueExport.truncated
    ? `- omittedIssueDetails: true; nextOffset: ${issueExport.nextOffset ?? "unknown"}`
    : "- omittedIssueDetails: false";

  return [
    "# Softwarehouse Longevity Snapshot",
    "",
    `Generated: ${snapshot.generatedAt}`,
    "",
    "## Health",
    "",
    `- API: ${snapshot.apiBase}`,
    `- restartRequired: ${snapshot.health?.devServer?.restartRequired ?? "unknown"}`,
    `- activeRunCount: ${snapshot.health?.devServer?.activeRunCount ?? snapshot.liveRuns.length}`,
    `- liveRunCount: ${snapshot.liveRuns.length}`,
    "",
    "## Projects",
    "",
    "| Project | Status | Archive | Workspace Policy | Preparation Only |",
    "| --- | --- | --- | --- | --- |",
    projectRows || "| none | | | | |",
    "",
    "## Live Runs",
    "",
    "| Issue | Title | Agent | Run Status | Last Output |",
    "| --- | --- | --- | --- | --- |",
    liveRows || "| none | | | | |",
    "",
    "## Issue Status Counts",
    "",
    statusCounts || "none",
    "",
    "## Issue Export Scope",
    "",
    `- detailedStatuses: ${(issueExport.statuses ?? []).join(", ") || "unknown"}`,
    `- detailedIssueLimit: ${issueExport.maxDetails ?? "unknown"}`,
    `- detailedIssueCount: ${issueExport.exportedDetails ?? snapshot.issues.length}`,
    omittedIssueDetails,
    "",
    "## Redaction",
    "",
    "This snapshot stores IDs, names, statuses, policy shape, and secret key metadata only. Secret values are never exported.",
    "",
  ].join("\n");
}

const companies = await request("/api/companies");
const companyList = Array.isArray(companies) ? companies : companies?.value ?? [];
const company = companyList.find((candidate) => candidate.id === companyId)
  ?? companyList.find((candidate) => candidate.name === companyName)
  ?? companyList.find((candidate) => candidate.name === "LuckySparrow Software House");
if (!company) throw new Error(`Company not found: ${companyId ?? companyName}`);

const [health, agents, projects, issues, routines, goals, labels, liveRuns, secrets] = await Promise.all([
  request("/api/health"),
  request(`/api/companies/${company.id}/agents`),
  request(`/api/companies/${company.id}/projects`),
  requestBoundedPages(
    `/api/companies/${company.id}/issues?status=${activeIssueStatuses.join(",")}&sortField=updated&sortDir=desc`,
  ),
  request(`/api/companies/${company.id}/routines`),
  request(`/api/companies/${company.id}/goals`),
  request(`/api/companies/${company.id}/labels`),
  request(`/api/companies/${company.id}/live-runs`),
  request(`/api/companies/${company.id}/secrets`).catch(() => []),
]);

const issueRows = issues.rows;
const issueById = new Map(issueRows.map((issue) => [issue.id, issue]));
const agentById = new Map(agents.map((agent) => [agent.id, agent]));
const issueStatusCounts = {};
for (const issue of issueRows) issueStatusCounts[issue.status] = (issueStatusCounts[issue.status] ?? 0) + 1;

const generatedAt = new Date().toISOString();
const snapshot = {
  generatedAt,
  apiBase,
  company: { id: company.id, name: company.name },
  health,
  agents: agents.map(redactAgent),
  projects: projects.map(redactProject),
  issueExport: {
    statuses: activeIssueStatuses,
    maxDetails: maxIssueDetails,
    exportedDetails: issueRows.length,
    truncated: issues.truncated,
    nextOffset: issues.nextOffset,
    sort: { field: "updated", dir: "desc" },
    degradation: issues.truncated
      ? "Issue details were capped for bounded longevity export; use API pagination for older matching rows."
      : null,
  },
  issues: issueRows.map(redactIssue),
  routines: routines.map(redactRoutine),
  goals: goals.map((goal) => ({
    id: goal.id,
    title: goal.title,
    status: goal.status,
    level: goal.level,
    ownerAgentId: goal.ownerAgentId ?? null,
    parentId: goal.parentId ?? null,
  })),
  labels: labels.map((label) => ({ id: label.id, name: label.name, color: label.color })),
  secrets: secrets.map((secret) => ({
    id: secret.id,
    key: secret.key,
    targetType: secret.targetType ?? null,
    targetId: secret.targetId ?? null,
    updatedAt: secret.updatedAt ?? null,
    createdAt: secret.createdAt ?? null,
  })),
  liveRuns: liveRuns.map((run) => {
    const issue = issueById.get(run.issueId);
    const agent = agentById.get(run.agentId);
    return {
      id: run.id,
      status: run.status,
      issueId: run.issueId ?? null,
      issueIdentifier: issue?.identifier ?? null,
      issueTitle: issue?.title ?? null,
      issueStatus: issue?.status ?? null,
      agentId: run.agentId ?? null,
      agentName: agent?.name ?? null,
      lastOutputAt: run.lastOutputAt ?? null,
      startedAt: run.startedAt ?? null,
    };
  }),
  issueStatusCounts,
};

await mkdir(outputRoot, { recursive: true });
const stamp = generatedAt.replace(/[:.]/g, "-");
const latestJson = path.join(outputRoot, "softwarehouse-longevity-snapshot.latest.json");
const latestMd = path.join(outputRoot, "softwarehouse-longevity-snapshot.latest.md");
const stampedJson = path.join(outputRoot, `softwarehouse-longevity-snapshot.${stamp}.json`);
await writeFile(latestJson, `${JSON.stringify(snapshot, null, 2)}\n`);
await writeFile(latestMd, markdownFor(snapshot));
await writeFile(stampedJson, `${JSON.stringify(snapshot, null, 2)}\n`);

console.log(JSON.stringify({
  apiBase,
  company: snapshot.company,
  generatedAt,
  outputs: [latestJson, latestMd, stampedJson],
  counts: {
    agents: snapshot.agents.length,
    projects: snapshot.projects.length,
    issues: snapshot.issues.length,
    issueDetailsTruncated: snapshot.issueExport.truncated,
    routines: snapshot.routines.length,
    liveRuns: snapshot.liveRuns.length,
    secretMetadata: snapshot.secrets.length,
  },
}, null, 2));
