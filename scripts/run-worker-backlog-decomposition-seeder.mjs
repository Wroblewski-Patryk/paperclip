import { agentWipBlockerFor, fetchAgentWipState, summarizeAgentWip } from "./lib/agent-wip-guard.mjs";
import { findAgentByNameOrAlias } from "./lib/softwarehouse-agent-resolver.mjs";
import {
  formatTrackDispositionSummary,
  formatWeakTrackSummary,
  formatWorkerFanoutContract,
  filterSupersededProjectTruthLanes,
  summarizeWorkerBacklogTracks,
} from "./lib/softwarehouse-worker-backlog-tracks.mjs";
import { loadTrackTruthByTrack } from "./lib/softwarehouse-track-truth.mjs";

const apiBase = process.env.PAPERCLIP_API_URL ?? "http://127.0.0.1:3200";
const companyNames = new Set(["LuckySparrow Software House", "LuckySparrow"]);
const companyId = process.env.PAPERCLIP_COMPANY_ID ?? process.env.SOFTWAREHOUSE_COMPANY_ID ?? null;
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
const sourceControlClosureTitlePattern = /^\[(?<project>[^\]]+)\]\[Source Control Closure\] Classify and close local dirty state/;

async function controlledRepoClosureState() {
  const { spawnSync } = await import("node:child_process");
  const { readFile } = await import("node:fs/promises");
  const result = spawnSync(process.execPath, ["scripts/check-softwarehouse-source-control.mjs"], {
    cwd: process.cwd(),
    encoding: "utf8",
    stdio: ["ignore", "pipe", "pipe"],
    timeout: 30_000,
  });
  if (result.status !== 0) return {
    known: false,
    dirty: true,
    error: (result.stderr || result.stdout || "").trim().slice(0, 500),
  };
  try {
    const packet = JSON.parse(await readFile("report/softwarehouse-source-control.latest.json", "utf8"));
    const dirtyRepos = (packet.repos ?? [])
      .filter((repo) => !repo.parked && repo.git && repo.clean === false)
      .map((repo) => ({
        name: repo.name,
        dirtyCount: repo.dirtyCount ?? null,
        dirtyGroups: (repo.dirtyGroups ?? []).map((group) => group.group),
      }));
    return {
      known: true,
      dirty: dirtyRepos.length > 0,
      dirtyRepoCount: dirtyRepos.length,
      dirtyRepos,
      generatedAt: packet.generatedAt ?? null,
    };
  } catch (error) {
    return {
      known: false,
      dirty: true,
      error: error instanceof Error ? error.message.slice(0, 500) : String(error).slice(0, 500),
    };
  }
}

async function currentProjectTruthGapIds() {
  const { readFile } = await import("node:fs/promises");
  const path = await import("node:path");
  const roots = new Map([
    ["Soar", process.env.SOAR_ROOT ?? path.resolve(process.cwd(), "..", "Soar")],
    ["Roost", process.env.ROOST_ROOT ?? path.resolve(process.cwd(), "..", "Roost")],
  ]);
  const result = new Map();
  for (const [track, root] of roots) {
    try {
      const packet = JSON.parse(await readFile(path.join(root, "docs", "status", "project-truth-index.json"), "utf8"));
      result.set(track, new Set((packet.gaps ?? []).map((gap) => gap.sourceItemId).filter(Boolean)));
    } catch {
      // Unknown truth must fail open: retain existing lanes until a current
      // index can prove that they are superseded.
    }
  }
  return result;
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

function sourceControlClosureQueryForProject(projectName) {
  if (projectName === "Paperclip_Softwarehouse") return "[Softwarehouse Operating System][Source Control Closure]";
  return `[${projectName}][Source Control Closure]`;
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
  const company = companies.find((candidate) => companyNames.has(candidate.name));
  if (!company) throw new Error(`Company not found: ${[...companyNames].join(" or ")}`);
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
const currentGapIdsByTrack = await currentProjectTruthGapIds();
const trackTruthByTrack = await loadTrackTruthByTrack();
const currentIssues = filterSupersededProjectTruthLanes({ issues, projects, currentGapIdsByTrack });
const openIssues = issues.filter((issue) =>
  activeProjectIds.has(issue.projectId)
  && !terminalStatuses.has(issue.status)
  && issue.originKind !== "issue_productivity_review"
  && !/(?:^|\]\s+)Review productivity for /.test(String(issue.title ?? ""))
);
const plannedIssues = openIssues.filter((issue) =>
  plannedStatuses.has(issue.status)
  && issue.assigneeAgentId
  && issue.originKind !== "routine_execution"
);
const plannedWorkerIssues = plannedIssues.filter((issue) => isWorker(agentById.get(issue.assigneeAgentId)));
const runnableWorkerIssues = plannedWorkerIssues.filter((issue) => issue.status === "todo");
const plannedSupervisorIssues = plannedIssues.filter((issue) => isSupervisor(agentById.get(issue.assigneeAgentId)));
function namedBlockerForIssue(issue) {
  if (Array.isArray(issue.blockedBy) && issue.blockedBy.length > 0) return true;
  if (issue.blockerAttention?.sampleBlockerIdentifier) return true;
  const text = `${issue.title ?? ""}\n${issue.description ?? ""}`;
  return /(blocker|blocked by|unblock owner|owner action|source-control closure|required approval)/i.test(text);
}
const trackBacklog = summarizeWorkerBacklogTracks({
  issues: currentIssues,
  projects,
  agentById,
  isWorker,
  isSupervisor,
  terminalStatuses,
  plannedStatuses,
  hasNamedBlocker: namedBlockerForIssue,
  trackTruthByTrack,
});
const existing = issues.find((issue) => issue.title === targetTitle && !terminalStatuses.has(issue.status));
const sourceControlClosureState = await controlledRepoClosureState();
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
const trackDispositionLines = trackBacklog.trackSummaries.map(formatTrackDispositionSummary);
const promotableBacklogLaneLines = trackBacklog.trackSummaries.flatMap((track) =>
  track.promotableBacklogWorkerIssues.map((issue) =>
    `${track.track}: ${issue.identifier ?? issue.id ?? "unknown"} (${issue.assigneeName ?? "unassigned"}): ${issue.title ?? "untitled"}`
  )
);
const activeExistingRuns = existing
  ? liveRuns.filter((run) => run.issueId === existing.id)
  : [];
const activeOwnerRuns = engineeringLead
  ? liveRuns.filter((run) => run.agentId === engineeringLead.id)
  : [];

const actions = [];
const sourceControlClosureIssuesByProject = new Map(
  issues
    .map((issue) => ({ issue, match: String(issue.title ?? "").match(sourceControlClosureTitlePattern) }))
    .filter(({ match }) => match?.groups?.project)
    .sort((left, right) => Date.parse(left.issue.updatedAt ?? "") - Date.parse(right.issue.updatedAt ?? ""))
    .map(({ issue, match }) => [match.groups.project, {
      id: issue.id,
      identifier: issue.identifier ?? null,
      title: issue.title,
      status: issue.status,
      assignee: agentById.get(issue.assigneeAgentId)?.name ?? null,
      updatedAt: issue.updatedAt ?? null,
    }]),
);

async function latestSourceControlClosureIssue(projectName) {
  const mapKey = projectName === "Paperclip_Softwarehouse" ? "Softwarehouse Operating System" : projectName;
  const localMatch = sourceControlClosureIssuesByProject.get(mapKey);
  if (localMatch) return localMatch;
  try {
    const query = encodeURIComponent(sourceControlClosureQueryForProject(projectName));
    const matches = await request("GET", `/api/companies/${company.id}/issues?q=${query}&limit=10`);
    const match = matches
      .slice()
      .sort((left, right) => Date.parse(right.updatedAt ?? "") - Date.parse(left.updatedAt ?? ""))[0];
    if (!match) return null;
    return {
      id: match.id,
      identifier: match.identifier ?? null,
      title: match.title,
      status: match.status,
      assignee: agentById.get(match.assigneeAgentId)?.name ?? null,
      updatedAt: match.updatedAt ?? null,
    };
  } catch {
    return null;
  }
}

if (agentWip.unknownActiveRunCount > 0) {
  actions.push({
    action: "noop_unknown_active_runs",
    activeRunCount,
    liveRunCount: liveRuns.length,
    unknownActiveRunCount: agentWip.unknownActiveRunCount,
  });
} else if (sourceControlClosureState.dirty) {
  const dirtyRepos = [];
  for (const repo of sourceControlClosureState.dirtyRepos ?? []) {
    dirtyRepos.push({
      ...repo,
      sourceControlClosureIssue: await latestSourceControlClosureIssue(repo.name),
    });
  }
  actions.push({
    action: "noop_controlled_repo_source_control_closure_required",
    dirtyRepoCount: sourceControlClosureState.dirtyRepoCount ?? null,
    dirtyRepos,
    sourceControlClosureIssues: dirtyRepos
      .map((repo) => repo.sourceControlClosureIssue)
      .filter(Boolean),
    generatedAt: sourceControlClosureState.generatedAt ?? null,
    error: sourceControlClosureState.error ?? null,
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
          "Re-waking this lane because the control audit shows no justified runnable worker next action.",
          ...weakTrackLines.map((line) => `- ${line}`),
          "Promote or create the single smallest justified worker-ready next action, or record the exact legal blocker.",
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
    "- keep one active lane per agent and the smallest justified next-action queue;",
    "- stop treating autonomy as healthy when PM/lead/controller work is not decomposed.",
    "",
    "Current weak signal:",
    `- planned worker issue count: ${plannedWorkerIssues.length}`,
    `- planned supervisor issue count: ${plannedSupervisorIssues.length}`,
    `- planned issue count: ${plannedIssues.length}`,
    ...(weakTrackLines.length > 0 ? ["- weak active tracks:", ...weakTrackLines.map((line) => `  - ${line}`)] : []),
    "- per-track lane dispositions:",
    ...trackDispositionLines.map((line) => `  - ${line}`),
    ...(promotableBacklogLaneLines.length > 0
      ? [
        "- existing backlog worker lanes to promote before creating duplicates:",
        ...promotableBacklogLaneLines.map((line) => `  - ${line}`),
      ]
      : ["- existing backlog worker lanes to promote before creating duplicates: none found"]),
    "",
    formatWorkerFanoutContract(),
    "",
    "Supervisor lanes to inspect first:",
    ...topSupervisorIssues.map((line) => `- ${line}`),
    "",
    "Required output:",
    "- for every weak active track, promote or create exactly the smallest justified worker-owned `todo` next action; `backlog` alone is not runnable;",
    "- promote an existing valid backlog lane before creating a duplicate; do not replenish inventory because a count fell; another child needs its own outcome, evidence contract, owner, and dependency reason;",
    "- prioritize Soar first, then Roost, while keeping the owner-activated Featherly security-hardening lane moving; Aviary, Nest, and every other parked product remain out of scope until explicit owner activation;",
    "- before creating a product child, bind it to that product's active project and primary workspace; a Soar/Roost/Featherly child must not inherit the Softwarehouse project/workspace;",
    "- do not create or resume repo-mutating children while any controlled repo has an unresolved source-control closure packet; route the existing packet first;",
    "- for a shared project workspace, resume at most one repo-mutating worker lane at a time; leave the remaining lanes queued unless they use isolated worktrees and have proven-disjoint file sets;",
    "- treat generated truth/state surfaces such as docs/status, docs/graphs, .agents/state, and .codex/context as shared conflict sets; lanes that refresh them must execute serially;",
    "- accounting, review, queue, and governance children may inspect board/API evidence but must not mutate product or Paperclip code unless the issue names the exact module, behavior, and verification contract;",
    "- if no worker lane is legal, comment the exact reason: protected gate, missing architecture map, duplicate active owner, source-control closure, or explicit deferral;",
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
      "Every weak active track has one smallest justified worker-owned todo next action, or one explicit legal blocker explaining why none exists.",
      "Existing worker backlog lanes are promoted to todo before duplicate worker lanes are created.",
      "Every created worker issue has exactly one accountable owner and one narrow scope.",
      "Soar V1 receives first priority unless a protected gate blocks the exact action.",
      "Every product child uses the matching active product project and primary workspace; it never inherits the Softwarehouse workspace by convenience.",
      "No repo-mutating child is created or resumed while any controlled repository has an unresolved source-control closure packet.",
      "Shared-workspace repo writers are queued serially per project; concurrent starts require isolated worktrees and disjoint file sets.",
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
    runnableWorkerIssues: runnableWorkerIssues.length,
    plannedSupervisorIssues: plannedSupervisorIssues.length,
  },
  trackBacklog,
  trackDispositions: trackBacklog.trackDispositions,
  shouldSeed,
  existing: existing ? {
    identifier: existing.identifier,
    status: existing.status,
    assignee: agentById.get(existing.assigneeAgentId)?.name ?? null,
  } : null,
  sourceControlClosureState,
  actions,
}, null, 2));
