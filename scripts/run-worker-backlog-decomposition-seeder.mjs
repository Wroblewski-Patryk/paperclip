import { agentWipBlockerFor, fetchAgentWipState, summarizeAgentWip } from "./lib/agent-wip-guard.mjs";
import { findAgentByNameOrAlias } from "./lib/softwarehouse-agent-resolver.mjs";
import { formatWeakTrackSummary, summarizeWorkerBacklogTracks } from "./lib/softwarehouse-worker-backlog-tracks.mjs";

const apiBase = process.env.PAPERCLIP_API_URL ?? "http://127.0.0.1:3200";
const companyName = "LuckySparrow Software House";
const companyId = process.env.PAPERCLIP_COMPANY_ID ?? null;
const apply = process.argv.includes("--apply");

const terminalStatuses = new Set(["done", "cancelled"]);
const plannedStatuses = new Set(["todo", "backlog"]);
const workerRosterKeys = new Set([
  "frontend-web-engineer",
  "core-backend-engineer",
  "data-persistence-engineer",
  "integration-domain-engineer",
  "runtime-adapter-engineer",
  "test-automation-engineer",
  "security-privacy-auditor",
  "deployment-reliability-engineer",
  "documentation-steward",
  "ux-web-designer",
  "ui-visual-designer",
  "code-review-specialist",
  "qa-verification-engineer",
]);
const supervisorRosterKeys = new Set([
  "innovation-portfolio-manager",
  "chief-innovation-officer",
  "chief-technology-officer",
  "chief-product-officer",
  "web-product-manager",
  "soar-product-manager",
  "roost-product-manager",
  "aviary-project-manager",
  "featherly-platform-manager",
  "nest-product-manager",
  "delivery-project-manager",
  "technical-solution-architect",
  "chief-operating-officer",
]);
const targetTitle = "[Softwarehouse][Worker Backlog] Split supervisor work into worker-ready lanes";

async function operatingRepoDirty() {
  const { spawnSync } = await import("node:child_process");
  const result = spawnSync("git", ["status", "--porcelain"], {
    cwd: process.cwd(),
    encoding: "utf8",
    stdio: ["ignore", "pipe", "pipe"],
  });
  if (result.status !== 0) return {
    known: false,
    dirty: true,
    error: (result.stderr || result.stdout || "").trim().slice(0, 500),
  };
  const lines = (result.stdout ?? "").split(/\r?\n/).filter(Boolean);
  return {
    known: true,
    dirty: lines.length > 0,
    dirtyCount: lines.length,
    sample: lines.slice(0, 10),
  };
}

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

function byName(items, name) {
  return findAgentByNameOrAlias(items, name);
}

function rosterKey(agent) {
  return agent?.metadata?.rosterKey ?? agent?.urlKey ?? agent?.name ?? null;
}

function isWorker(agent) {
  return workerRosterKeys.has(rosterKey(agent));
}

function isSupervisor(agent) {
  return supervisorRosterKeys.has(rosterKey(agent));
}

function issueLabel(issue) {
  return issue.identifier ?? issue.title ?? issue.id;
}

function priorityRank(priority) {
  return {
    critical: 0,
    urgent: 1,
    high: 2,
    medium: 3,
    low: 4,
  }[priority] ?? 5;
}

function sortIssue(left, right) {
  return priorityRank(left.priority) - priorityRank(right.priority)
    || String(left.identifier ?? "").localeCompare(String(right.identifier ?? ""), undefined, { numeric: true })
    || String(left.updatedAt ?? "").localeCompare(String(right.updatedAt ?? ""));
}

async function resolveCompany() {
  if (companyId) return { id: companyId, source: "PAPERCLIP_COMPANY_ID" };

  const companies = await request("GET", "/api/companies");
  const company = companies.find((candidate) => candidate.name === companyName);
  if (!company) throw new Error(`Company not found: ${companyName}`);
  return { id: company.id, source: "company_name" };
}

const company = await resolveCompany();

const [health, projects, agents, goals, issues, liveRuns] = await Promise.all([
  request("GET", "/api/health"),
  request("GET", `/api/companies/${company.id}/projects`),
  request("GET", `/api/companies/${company.id}/agents`),
  request("GET", `/api/companies/${company.id}/goals`),
  request("GET", `/api/companies/${company.id}/issues?limit=2000`),
  request("GET", `/api/companies/${company.id}/live-runs`),
]);

const activeRunCount = health.devServer?.activeRunCount ?? liveRuns.length;
const agentWip = summarizeAgentWip({ activeRunCount, liveRuns });
const activeProjects = projects.filter((project) => !project.archivedAt);
const activeProjectIds = new Set(activeProjects.map((project) => project.id));
const agentById = new Map(agents.map((agent) => [agent.id, agent]));
const openIssues = issues.filter((issue) =>
  activeProjectIds.has(issue.projectId)
  && !terminalStatuses.has(issue.status)
  && !String(issue.title ?? "").startsWith("Review productivity for ")
);
const plannedIssues = openIssues.filter((issue) =>
  plannedStatuses.has(issue.status) && issue.assigneeAgentId
);
const plannedWorkerIssues = plannedIssues.filter((issue) => isWorker(agentById.get(issue.assigneeAgentId)));
const plannedSupervisorIssues = plannedIssues.filter((issue) => isSupervisor(agentById.get(issue.assigneeAgentId)));
const trackBacklog = summarizeWorkerBacklogTracks({
  issues,
  projects,
  agentById,
  isWorker,
  isSupervisor,
  terminalStatuses,
  plannedStatuses,
});
const existing = issues.find((issue) => issue.title === targetTitle && !terminalStatuses.has(issue.status));
const operatingRepoState = await operatingRepoDirty();
const engineeringLead = byName(agents, "04 DPM (Delivery Project Manager)")
  ?? byName(agents, "09 CTO (Chief Technology Officer)")
  ?? byName(agents, "00 AIA (AI Assistant)");
const operatingProject = byName(projects, "Softwarehouse Operating System")
  ?? byName(projects, "Paperclip")
  ?? activeProjects[0]
  ?? null;
const goal = byName(goals, "LuckySparrow Software House autonomy")
  ?? byName(goals, "Template feedback from Soar pilot")
  ?? goals[0]
  ?? null;

const shouldSeed = trackBacklog.weakTracks.length > 0;
const weakTrackLines = trackBacklog.weakTracks.map(formatWeakTrackSummary);
const activeExistingRuns = existing
  ? liveRuns.filter((run) => run.issueId === existing.id)
  : [];
const activeOwnerRuns = engineeringLead
  ? liveRuns.filter((run) => run.agentId === engineeringLead.id)
  : [];

const actions = [];
if (agentWip.unknownActiveRunCount > 0) {
  actions.push({
    action: "noop_unknown_active_runs",
    activeRunCount,
    liveRunCount: liveRuns.length,
    unknownActiveRunCount: agentWip.unknownActiveRunCount,
  });
} else if (activeRunCount > 0 && (activeExistingRuns.length > 0 || activeOwnerRuns.length > 0 || !shouldSeed)) {
  actions.push(activeExistingRuns.length > 0 ? {
    action: "supervise_active_worker_backlog_decomposition_lane",
    identifier: existing.identifier,
    status: existing.status,
    assignee: agentById.get(existing.assigneeAgentId)?.name ?? engineeringLead?.name ?? null,
    activeRunCount,
    liveRunCount: liveRuns.length,
    activeExistingRunCount: activeExistingRuns.length,
    activeOwnerRunCount: activeOwnerRuns.length,
  } : {
    action: "noop_active_runs",
    activeRunCount,
    liveRunCount: liveRuns.length,
    activeOwnerRunCount: activeOwnerRuns.length,
  });
} else if (operatingRepoState.dirty) {
  actions.push({
    action: "noop_operating_repo_dirty",
    dirtyCount: operatingRepoState.dirtyCount ?? null,
    sample: operatingRepoState.sample ?? [],
    error: operatingRepoState.error ?? null,
  });
} else if (!shouldSeed) {
  actions.push({
    action: "noop_worker_queue_sufficient_or_no_supervisor_work",
    plannedWorkerIssueCount: plannedWorkerIssues.length,
    plannedSupervisorIssueCount: plannedSupervisorIssues.length,
    plannedIssueCount: plannedIssues.length,
    trackSummaries: trackBacklog.trackSummaries,
  });
} else if (existing) {
  actions.push({
    action: apply ? "wake_existing_worker_backlog_decomposition_lane" : "would_wake_existing_worker_backlog_decomposition_lane",
    identifier: existing.identifier,
    status: existing.status,
    assignee: agentById.get(existing.assigneeAgentId)?.name ?? null,
  });
  if (apply && existing.assigneeAgentId && plannedStatuses.has(existing.status)) {
    const freshWip = await fetchAgentWipState({ request, companyId: company.id });
    const duplicateRisk = freshWip.liveRuns.some((run) => run.issueId === existing.id)
      || agentWipBlockerFor(existing.assigneeAgentId, freshWip);
    if (duplicateRisk) {
      actions.at(-1).action = "skip_wake_existing_worker_backlog_decomposition_lane_active_run_present";
      actions.at(-1).activeRunCount = freshWip.activeRunCount;
      actions.at(-1).liveRunCount = freshWip.liveRunCount;
      actions.at(-1).unknownActiveRunCount = freshWip.unknownActiveRunCount;
      actions.at(-1).liveRunIssueIds = freshWip.liveRuns.map((run) => run.issueId).filter(Boolean);
    } else {
      await request("POST", `/api/issues/${existing.id}/comments`, {
        body: [
          "softwarehouse-worker-backlog-decomposition-seeder:v1",
          "",
          "Re-waking this lane because the control audit still shows weak worker backlog depth.",
          ...weakTrackLines.map((line) => `- ${line}`),
          "Produce worker-ready child issues or record the exact legal blocker for each missing worker lane.",
        ].join("\n"),
        resume: true,
      });
    }
  }
} else if (!engineeringLead || !operatingProject) {
  actions.push({
    action: "noop_missing_owner_or_project",
    engineeringLeadFound: Boolean(engineeringLead),
    operatingProjectFound: Boolean(operatingProject),
  });
} else {
  const topSupervisorIssues = plannedSupervisorIssues
    .sort(sortIssue)
    .slice(0, 8)
    .map((issue) => {
      const project = projects.find((candidate) => candidate.id === issue.projectId);
      const agent = agentById.get(issue.assigneeAgentId);
      return `${issueLabel(issue)} (${project?.name ?? "unknown"}, ${agent?.name ?? "unknown"}): ${issue.title}`;
    });
  const description = [
    "softwarehouse-worker-backlog-decomposition:v1",
    "",
    "Purpose:",
    "- turn supervisor-held intent into leaf-worker-ready issues;",
    "- keep one active lane per agent while allowing many queued worker tasks;",
    "- stop treating autonomy as healthy when PM/lead/controller work is not decomposed.",
    "",
    "Current weak signal:",
    `- planned worker issue count: ${plannedWorkerIssues.length}`,
    `- planned supervisor issue count: ${plannedSupervisorIssues.length}`,
    `- planned issue count: ${plannedIssues.length}`,
    ...(weakTrackLines.length > 0 ? ["- weak active tracks:", ...weakTrackLines.map((line) => `  - ${line}`)] : []),
    "",
    "Supervisor lanes to inspect first:",
    ...topSupervisorIssues.map((line) => `- ${line}`),
    "",
    "Required output:",
    "- create or update at least three worker-ready todo/backlog issues across idle leaf workers when legal;",
    "- evaluate Soar and Roost independently; one track being healthy does not satisfy another weak track;",
    "- prioritize Soar V1 first, then unblock/prepare Roost/Aviary/Nest only where local non-production work is legal;",
    "- each worker-ready issue must name project, scope, affected files/entities, acceptance criteria, local proof, blocker policy, and handoff owner;",
    "- if fewer than three worker lanes are legal, comment the exact reason for each missing lane: protected gate, missing architecture map, duplicate active owner, source-control closure, or explicit deferral;",
    "- do not code in this lane; this is queue decomposition and dispatch only.",
    "",
    "Forbidden:",
    "- no push, deploy, production restart, protected smoke, live account mutation, secret disclosure, or broad repo mutation;",
    "- do not create duplicate lanes for the same project/issue/owner;",
    "- do not mark done with a narrative-only summary.",
  ].join("\n");

  const input = {
    title: targetTitle,
    description,
    status: "todo",
    priority: "high",
    assigneeAgentId: engineeringLead.id,
    projectId: operatingProject.id,
    goalId: goal?.id ?? null,
    requestDepth: 2,
    acceptanceCriteria: [
      "At least three legal worker-ready todo/backlog issues are created or updated, or every missing lane has an explicit legal blocker.",
      "Every created worker issue has exactly one accountable owner and one narrow scope.",
      "Soar V1 receives first priority unless a protected gate blocks the exact action.",
      "No push, deploy, restart, protected smoke, live account mutation, secret disclosure, or broad repo mutation occurs.",
      "Final disposition records worker lane identifiers and remaining blockers.",
    ],
  };

  actions.push({
    action: apply ? "create_worker_backlog_decomposition_lane" : "would_create_worker_backlog_decomposition_lane",
    title: input.title,
    assignee: engineeringLead.name,
    project: operatingProject.name,
    plannedWorkerIssueCount: plannedWorkerIssues.length,
    plannedSupervisorIssueCount: plannedSupervisorIssues.length,
  });

  if (apply) {
    const created = await request("POST", `/api/companies/${company.id}/issues`, input);
    const freshWip = await fetchAgentWipState({ request, companyId: company.id });
    const wakeBlocker = agentWipBlockerFor(created.assigneeAgentId, freshWip);
    await request("POST", `/api/issues/${created.id}/comments`, {
      body: [
        "softwarehouse-worker-backlog-decomposition-seeder:v1",
        "",
        "Created because manager/lead queues are non-empty while leaf-worker backlog depth is weak.",
        ...weakTrackLines.map((line) => `- ${line}`),
        "This lane must split work downward into worker-ready issues or record concrete legal blockers.",
      ].join("\n"),
      resume: !wakeBlocker,
    });
    actions.at(-1).identifier = created.identifier;
    actions.at(-1).status = created.status;
    if (wakeBlocker) {
      actions.at(-1).wakeSkipped = wakeBlocker;
      actions.at(-1).activeRunCount = freshWip.activeRunCount;
      actions.at(-1).liveRunCount = freshWip.liveRunCount;
      actions.at(-1).unknownActiveRunCount = freshWip.unknownActiveRunCount;
    }
  }
}

console.log(JSON.stringify({
  apiBase,
  company: { id: company.id, name: company.name },
  mode: apply ? "apply" : "dry-run",
  activeRunCount,
  liveRunCount: liveRuns.length,
  unknownActiveRunCount: agentWip.unknownActiveRunCount,
  counts: {
    openIssues: openIssues.length,
    plannedIssues: plannedIssues.length,
    plannedWorkerIssues: plannedWorkerIssues.length,
    plannedSupervisorIssues: plannedSupervisorIssues.length,
  },
  trackBacklog,
  shouldSeed,
  existing: existing ? {
    identifier: existing.identifier,
    status: existing.status,
    assignee: agentById.get(existing.assigneeAgentId)?.name ?? null,
  } : null,
  operatingRepoState,
  actions,
}, null, 2));
