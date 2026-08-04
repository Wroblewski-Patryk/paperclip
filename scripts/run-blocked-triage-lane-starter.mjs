import { mkdir, open, rm, stat } from "node:fs/promises";
import { dirname, resolve } from "node:path";
import { rootBlockerIdentifierFor } from "./lib/issue-blockers.mjs";
import { softwarehouseGateSpecs } from "./lib/softwarehouse-gates.mjs";
import { agentWipBlockerFor, fetchAgentWipState, summarizeAgentWip } from "./lib/agent-wip-guard.mjs";
import { findAgentByNameOrAlias } from "./lib/softwarehouse-agent-resolver.mjs";

const apiBase = process.env.PAPERCLIP_API_URL ?? "http://127.0.0.1:3200";
const companyName = process.env.SOFTWAREHOUSE_COMPANY_NAME ?? process.env.PAPERCLIP_COMPANY_NAME ?? "LuckySparrow Software House";
const companyId = process.env.PAPERCLIP_COMPANY_ID ?? process.env.SOFTWAREHOUSE_COMPANY_ID ?? null;
const apply = process.argv.includes("--apply");
const requestTimeoutMs = Number(process.env.SOFTWAREHOUSE_BLOCKED_TRIAGE_REQUEST_TIMEOUT_MS ?? 30_000);

const terminalStatuses = new Set(["done", "cancelled"]);
const activeIssueStatuses = ["backlog", "todo", "in_progress", "in_review", "blocked"];
const terminalIssueStatuses = ["done", "cancelled"];
const knownGateRoots = new Set(softwarehouseGateSpecs.map((spec) => spec.rootBlocker));
const starvationCompatibleGovernorDecisions = new Set([
  "runnable_work_available",
  "runnable_work_assignment_needed",
  "supervise_active_runs",
  "closed_issue_live_run_tail",
]);
const triageTitlePrefix = "[Softwarehouse][Blocked Triage]";
const triageTargetPattern = /^\[Softwarehouse\]\[Blocked Triage\] Classify ([^\s]+) and produce next legal action$/;
const triageCreationLockPath = resolve(
  process.cwd(),
  ".paperclip",
  "runtime",
  "locks",
  "blocked-triage-create.lock",
);
const triageCreationLockTimeoutMs = Number.parseInt(
  process.env.SOFTWAREHOUSE_BLOCKED_TRIAGE_LOCK_TIMEOUT_MS ?? "15000",
  10,
);
const triageCreationLockStaleMs = Number.parseInt(
  process.env.SOFTWAREHOUSE_BLOCKED_TRIAGE_LOCK_STALE_MS ?? "60000",
  10,
);
const terminalTriageCooldownMs = Number.parseInt(
  process.env.SOFTWAREHOUSE_BLOCKED_TRIAGE_COOLDOWN_MS ?? `${24 * 60 * 60 * 1000}`,
  10,
);
const blockedTriageMaxWaitMs = Number.parseInt(
  process.env.SOFTWAREHOUSE_BLOCKED_TRIAGE_MAX_WAIT_MS ?? `${6 * 60 * 60 * 1000}`,
  10,
);
const projectPriority = (process.env.SOFTWAREHOUSE_BLOCKED_TRIAGE_PROJECTS
  ?? "Softwarehouse Operating System,Soar,Roost,Featherly")
  .split(",")
  .map((name) => name.trim())
  .filter(Boolean);
const projectAliases = new Map([
  ["Softwarehouse Operating System", ["Softwarehouse Operating System", "00 General: Softwarehouse"]],
  ["Soar", ["Soar", "11 Innovation: Soar"]],
  ["Roost", ["Roost", "11 Innovation: Roost"]],
  ["Featherly", ["Featherly", "11 Innovation: Featherly"]],
]);
const companyNameAliases = [
  companyName,
  "LuckySparrow Software House",
  "LuckySparrow",
].filter(Boolean);

async function request(method, route, body) {
  const signal = AbortSignal.timeout(requestTimeoutMs);
  const response = await fetch(`${apiBase}${route}`, {
    method,
    headers: { "content-type": "application/json" },
    signal,
    body: body === undefined ? undefined : JSON.stringify(body),
  });
  const text = await response.text();
  const data = text ? JSON.parse(text) : null;
  if (!response.ok) {
    const error = new Error(`${method} ${route} failed with ${response.status}: ${text}`);
    error.status = response.status;
    error.data = data;
    throw error;
  }
  return data;
}

function isRequestTimeoutError(error) {
  return error instanceof Error && error.name === "TimeoutError";
}

function admissionHold(error) {
  if (!(error instanceof Error) || error.status !== 409 || error.data?.error !== "Work was not admitted") return null;
  const details = error.data?.details;
  if (!details || !["waiting_for_signal", "deferred"].includes(details.disposition)) return null;
  return {
    source: "admission_control",
    disposition: details.disposition,
    reasonCode: details.reasonCode ?? "admission_hold",
    state: details.state ?? null,
    scopeType: details.scopeType ?? null,
    scopeId: details.scopeId ?? null,
    controlVersion: details.controlVersion ?? null,
  };
}

async function readGovernorDecision() {
  const { spawnSync } = await import("node:child_process");
  const result = spawnSync(process.execPath, ["scripts/run-autonomy-governor.mjs"], {
    cwd: process.cwd(),
    env: { ...process.env },
    encoding: "utf8",
    stdio: ["ignore", "pipe", "pipe"],
  });
  if (result.status !== 0) {
    return {
      ok: false,
      decision: null,
      error: (result.stderr || result.stdout || "").trim().slice(0, 1000),
    };
  }
  const data = JSON.parse(result.stdout);
  return {
    ok: true,
    decision: data.decision ?? null,
    operatingPosture: data.operatingPosture ?? null,
    activeRunCount: data.activeRunCount ?? null,
  };
}

function byName(items, name) {
  return findAgentByNameOrAlias(items, name);
}

function byTitle(items, title) {
  return items.find((item) => item.title === title) ?? null;
}

function triageAssigneeFor(target, agentById, fallbackAssignee) {
  const targetOwner = target?.assigneeAgentId ? agentById.get(target.assigneeAgentId) : null;
  if (!targetOwner || targetOwner.pausedAt || targetOwner.status === "paused") return fallbackAssignee;
  return targetOwner;
}

function projectRank(projectName) {
  const controlledName = controlledProjectNameFor(projectName) ?? projectName;
  const index = projectPriority.indexOf(controlledName);
  return index === -1 ? 999 : index;
}

function controlledProjectNameFor(projectName) {
  for (const [controlledName, aliases] of projectAliases) {
    if (aliases.includes(projectName)) return controlledName;
  }
  return null;
}

function projectIsInPriority(projectName) {
  if (!projectName) return false;
  const controlledName = controlledProjectNameFor(projectName) ?? projectName;
  return projectPriority.includes(controlledName);
}

function priorityRank(priority) {
  return { urgent: 0, high: 1, medium: 2, low: 3 }[priority] ?? 4;
}

function rootBlockerRank(issue) {
  const identifier = issue.identifier ?? issue.id;
  return issue.rootBlocker && issue.rootBlocker !== identifier ? 1 : 0;
}

function wait(ms) {
  return new Promise((resolveWait) => setTimeout(resolveWait, ms));
}

async function withTriageCreationLock(callback) {
  await mkdir(dirname(triageCreationLockPath), { recursive: true });
  const deadline = Date.now() + triageCreationLockTimeoutMs;
  let lockHandle = null;

  while (!lockHandle) {
    try {
      lockHandle = await open(triageCreationLockPath, "wx");
    } catch (error) {
      if (error?.code !== "EEXIST") throw error;
      try {
        const lockStat = await stat(triageCreationLockPath);
        if (Date.now() - lockStat.mtimeMs > triageCreationLockStaleMs) {
          await rm(triageCreationLockPath, { force: true });
          continue;
        }
      } catch (statError) {
        if (statError?.code !== "ENOENT") throw statError;
        continue;
      }
      if (Date.now() >= deadline) {
        throw new Error(`Timed out waiting for blocked-triage creation lock: ${triageCreationLockPath}`);
      }
      await wait(100);
    }
  }

  try {
    return await callback();
  } finally {
    await lockHandle.close();
    await rm(triageCreationLockPath, { force: true });
  }
}

async function findOpenTriageByExactTitle(title) {
  const matches = await request(
    "GET",
    `/api/companies/${company.id}/issues?q=${encodeURIComponent(title)}&limit=100`,
  );
  return matches.find((issue) =>
    issue.title === title && !terminalStatuses.has(issue.status)
  ) ?? null;
}

function isUnknownBlockedCandidate(issue, projectById, liveIssueIds) {
  if (terminalStatuses.has(issue.status)) return false;
  if (issue.status !== "blocked") return false;
  if (liveIssueIds.has(issue.id)) return false;
  if (knownGateRoots.has(rootBlockerIdentifierFor(issue))) return false;
  const project = projectById.get(issue.projectId);
  if (!project || project.archivedAt || project.pausedAt) return false;
  if (!projectIsInPriority(project.name)) return false;
  const title = `${issue.title ?? ""}`.toLowerCase();
  if (title.includes("[blocked triage]")) return false;
  if (title.startsWith("review productivity for ")) return false;
  if (issue.originKind === "issue_productivity_review") return false;
  return true;
}

function triageTargetIdentifierFor(issue) {
  const match = String(issue.title ?? "").match(triageTargetPattern);
  return match?.[1] ?? null;
}

function newestIssue(left, right) {
  if (!left) return right;
  if (!right) return left;
  return String(left.updatedAt ?? "").localeCompare(String(right.updatedAt ?? "")) >= 0 ? left : right;
}

function terminalTriageByTargetFor(issues) {
  const byTarget = new Map();
  for (const issue of issues) {
    if (!terminalStatuses.has(issue.status)) continue;
    const target = triageTargetIdentifierFor(issue);
    if (!target) continue;
    byTarget.set(target, newestIssue(byTarget.get(target), issue));
  }
  return byTarget;
}

function hasRecentTerminalTriageDisposition(issue, terminalTriageByTarget, now = Date.now()) {
  const identifier = issue.identifier ?? issue.id;
  const terminalTriage = terminalTriageByTarget.get(identifier);
  if (!terminalTriage) return false;
  const targetUpdatedAt = Date.parse(issue.updatedAt ?? "");
  const triageUpdatedAt = Date.parse(terminalTriage.updatedAt ?? "");
  if (!Number.isFinite(targetUpdatedAt) || !Number.isFinite(triageUpdatedAt)) return false;
  return triageUpdatedAt >= targetUpdatedAt
    || (Number.isFinite(terminalTriageCooldownMs) && now - triageUpdatedAt <= terminalTriageCooldownMs);
}

function blockedTriageWaitExpired(issue, now = Date.now()) {
  const updatedAt = Date.parse(issue.updatedAt ?? "");
  return Number.isFinite(blockedTriageMaxWaitMs)
    && blockedTriageMaxWaitMs >= 0
    && Number.isFinite(updatedAt)
    && now - updatedAt >= blockedTriageMaxWaitMs;
}

function isRecoverableOpenTriage(issue) {
  return issue?.status === "blocked"
    && String(issue.title ?? "").startsWith(triageTitlePrefix)
    && (issue.blockerAttention?.unresolvedBlockerCount ?? 0) === 0
    && (issue.blockerAttention?.attentionBlockerCount ?? 0) === 0
    && (
      issue.activeRecoveryAction?.kind === "missing_disposition"
      || !issue.activeRecoveryAction
    );
}

async function resolveCompany() {
  if (companyId) return { id: companyId, source: "PAPERCLIP_COMPANY_ID" };

  const companies = await request("GET", "/api/companies");
  const company = companies.find((candidate) => companyNameAliases.includes(candidate.name))
    ?? companies.find((candidate) => /^LuckySparrow\b/i.test(candidate.name));
  if (!company) throw new Error(`Company not found: ${companyName}`);
  return { id: company.id, source: "company_name" };
}

const company = await resolveCompany();

let health;
let projects;
let agents;
let goals;
let activeIssues;
let terminalTriageIssues;
let liveRuns;

try {
  [health, projects, agents, goals, activeIssues, terminalTriageIssues, liveRuns] = await Promise.all([
    request("GET", "/api/health"),
    request("GET", `/api/companies/${company.id}/projects`),
    request("GET", `/api/companies/${company.id}/agents`),
    request("GET", `/api/companies/${company.id}/goals`),
    request("GET", `/api/companies/${company.id}/issues?status=${activeIssueStatuses.join(",")}&limit=2000`),
    request("GET", `/api/companies/${company.id}/issues?status=${terminalIssueStatuses.join(",")}&q=${encodeURIComponent(triageTitlePrefix)}&limit=500`),
    request("GET", `/api/companies/${company.id}/live-runs`),
  ]);
} catch (error) {
  if (!isRequestTimeoutError(error)) throw error;
  console.log(JSON.stringify({
    apiBase,
    company: { id: company.id, name: company.name },
    mode: apply ? "apply" : "dry-run",
    candidateScanStatus: "timed_out",
    requestTimeoutMs,
    activeRunCount: null,
    liveRunCount: null,
    blockingActiveRunCount: null,
    unknownActiveRunCount: null,
    nonBlockingRoutineLiveRunCount: null,
    governorDecision: {
      ok: null,
      decision: "not_checked_candidate_scan_timeout",
      operatingPosture: null,
      activeRunCount: null,
    },
    candidateCount: 0,
    skippedFreshTerminalTriageCount: 0,
    skippedFreshTerminalTriage: [],
    candidates: [],
    actions: [
      {
        action: "skip_blocked_triage_candidate_scan_timeout",
        ownerAction: "Retry blocked-triage lane starter after local issue-list routes are responsive; do not create triage lanes from partial data.",
      },
    ],
  }, null, 2));
  process.exit(0);
}
const issues = [...new Map([...activeIssues, ...terminalTriageIssues].map((issue) => [issue.id, issue])).values()];

const activeRunCount = health.devServer?.activeRunCount ?? liveRuns.length;
const agentWip = summarizeAgentWip({ activeRunCount, liveRuns });
const liveIssueIds = new Set(liveRuns.map((run) => run.issueId).filter(Boolean));
const projectById = new Map(projects.map((project) => [project.id, project]));
const agentById = new Map(agents.map((agent) => [agent.id, agent]));
const triageAssignee = byName(agents, "Engineering Delivery Lead")
  ?? byName(agents, "Portfolio Director")
  ?? byName(agents, "CTO Architect");
const terminalTriageByTarget = terminalTriageByTargetFor(issues);
const issueById = new Map(issues.map((issue) => [issue.id, issue]));
const nonBlockingRoutineLiveRunCount = liveRuns.filter((run) => {
  const issue = issueById.get(run.issueId);
  return issue?.originKind === "routine_execution";
}).length;
const blockingActiveRunCount = Math.max(0, activeRunCount - nonBlockingRoutineLiveRunCount);

const existingOpenTriage = issues.find((issue) =>
  !terminalStatuses.has(issue.status)
  && String(issue.title ?? "").startsWith(triageTitlePrefix)
);

const candidates = issues
  .filter((issue) => isUnknownBlockedCandidate(issue, projectById, liveIssueIds))
  .filter((issue) => !hasRecentTerminalTriageDisposition(issue, terminalTriageByTarget))
  .map((issue) => ({
    ...issue,
    projectName: projectById.get(issue.projectId)?.name ?? null,
    rootBlocker: rootBlockerIdentifierFor(issue),
  }))
  .sort((left, right) =>
    rootBlockerRank(left) - rootBlockerRank(right)
    || projectRank(left.projectName) - projectRank(right.projectName)
    || priorityRank(left.priority) - priorityRank(right.priority)
    || String(left.updatedAt).localeCompare(String(right.updatedAt))
  );
const starvedCandidate = candidates
  .filter((issue) => blockedTriageWaitExpired(issue))
  .sort((left, right) => String(left.updatedAt).localeCompare(String(right.updatedAt)))[0] ?? null;
const starvationOverride = governorDecision =>
  starvationCompatibleGovernorDecisions.has(governorDecision)
  && Boolean(starvedCandidate)
  && agentWip.unknownActiveRunCount === 0;

const actions = [];
let governorDecision = {
  ok: null,
  decision: "not_checked_active_run_guard",
  operatingPosture: null,
  activeRunCount: null,
};
const skippedFreshTerminalTriage = issues
  .filter((issue) => isUnknownBlockedCandidate(issue, projectById, liveIssueIds))
  .filter((issue) => hasRecentTerminalTriageDisposition(issue, terminalTriageByTarget))
  .map((issue) => {
    const terminalTriage = terminalTriageByTarget.get(issue.identifier ?? issue.id);
    return {
      targetIdentifier: issue.identifier ?? issue.id,
      targetStatus: issue.status,
      targetUpdatedAt: issue.updatedAt ?? null,
      terminalTriageIdentifier: terminalTriage?.identifier ?? null,
      terminalTriageStatus: terminalTriage?.status ?? null,
      terminalTriageUpdatedAt: terminalTriage?.updatedAt ?? null,
    };
  });

if (agentWip.unknownActiveRunCount > 0) {
  actions.push({
    action: "noop_unknown_active_runs",
    activeRunCount,
    liveRunCount: liveRuns.length,
    unknownActiveRunCount: agentWip.unknownActiveRunCount,
    nonBlockingRoutineLiveRunCount,
  });
} else {
  governorDecision = await readGovernorDecision();
}

if (
  actions.length === 0
  && governorDecision.decision !== "blocked_needs_triage"
  && !starvationOverride(governorDecision.decision)
) {
  actions.push({
    action: "noop_governor_decision_not_blocked_triage",
    decision: governorDecision.decision,
  });
} else if (actions.length === 0 && isRecoverableOpenTriage(existingOpenTriage)) {
  const comment = [
    "softwarehouse-blocked-triage-lane-starter:v2",
    "",
    "Recovered this existing blocked triage lane instead of letting it block all future blocked-triage work.",
    "The issue has no unresolved blockers and only needs a final disposition/next legal action.",
    "",
    "Allowed:",
    "- inspect the original target issue and latest evidence;",
    "- write a clear disposition and next owner/action/evidence;",
    "- create or wake at most one narrow follow-up lane if needed.",
    "",
    "Forbidden:",
    "- push, deploy, restart, protected smoke, live account mutation, or secret disclosure;",
    "- broad batch wakeups.",
  ].join("\n");
  actions.push({
    action: apply ? "recover_existing_blocked_triage_lane" : "would_recover_existing_blocked_triage_lane",
    identifier: existingOpenTriage.identifier,
    status: existingOpenTriage.status,
    title: existingOpenTriage.title,
  });
  if (apply) {
    const freshWip = await fetchAgentWipState({ request, companyId: company.id });
    const wakeBlocker = agentWipBlockerFor(existingOpenTriage.assigneeAgentId, freshWip);
    const updated = await request("PATCH", `/api/issues/${existingOpenTriage.id}`, {
      status: "todo",
      comment,
      resume: !wakeBlocker,
    });
    actions.at(-1).updatedStatus = updated.status;
    actions.at(-1).assigneeAgentId = updated.assigneeAgentId ?? null;
    if (wakeBlocker) {
      actions.at(-1).wakeSkipped = wakeBlocker;
      actions.at(-1).activeRunCount = freshWip.activeRunCount;
      actions.at(-1).liveRunCount = freshWip.liveRunCount;
      actions.at(-1).unknownActiveRunCount = freshWip.unknownActiveRunCount;
    }
  }
} else if (actions.length === 0 && existingOpenTriage) {
  actions.push({
    action: "noop_existing_blocked_triage_lane",
    identifier: existingOpenTriage.identifier,
    status: existingOpenTriage.status,
    title: existingOpenTriage.title,
  });
} else if (actions.length === 0 && candidates.length === 0) {
  actions.push({ action: "noop_no_unknown_blocked_candidate" });
} else if (actions.length === 0) {
  const target = starvationOverride(governorDecision.decision) ? starvedCandidate : candidates[0];
  const targetProject = projectById.get(target.projectId);
  const osProject = byName(projects, "Softwarehouse Operating System") ?? targetProject;
  const assignee = triageAssigneeFor(target, agentById, triageAssignee);
  const usesTargetOwner = Boolean(target.assigneeAgentId && assignee?.id === target.assigneeAgentId);
  const goal = byTitle(goals, "Softwarehouse operating cadence")
    ?? byTitle(goals, "Softwarehouse long-term autonomy and self-maintenance")
    ?? null;
  const title = `${triageTitlePrefix} Classify ${target.identifier ?? target.id} and produce next legal action`;
  const description = [
    "Autonomous blocked-triage lane created because the control loop decided `blocked_needs_triage`, but no runnable lane existed.",
    "",
    "Target issue:",
    `- identifier: ${target.identifier ?? target.id}`,
    `- title: ${target.title}`,
    `- project: ${target.projectName}`,
    `- current status: ${target.status}`,
    `- current root blocker: ${target.rootBlocker ?? "none/unknown"}`,
    `- current assignee: ${agentById.get(target.assigneeAgentId)?.name ?? target.assigneeAgentId ?? "none"}`,
    "",
    "Scope:",
    "- inspect the target issue, latest comments, blockers, recovery action, and related project policy;",
    "- decide whether it should stay blocked, become todo, be split, be cancelled/done as superseded, or wait for an explicit gate fact;",
    "- write owner/action/evidence back to the target issue and this triage lane;",
    "- if safe non-production work exists, create exactly one narrow follow-up issue with one owner and evidence contract.",
    usesTargetOwner
      ? "- this lane is assigned to the target owner so Paperclip's issue-mutation boundary permits the final source-issue disposition."
      : "- the target owner is unavailable; classify without attempting a forbidden cross-owner mutation and leave one explicit owner-path action.",
    "",
    "Forbidden:",
    "- no push, deploy, production restart, protected smoke, live account mutation, or secret disclosure;",
    "- do not mutate Soar/Roost/Nest/Aviary project repos from this lane;",
    "- do not wake broad batches.",
    "",
    "Definition of done:",
    "- target issue has an honest status/disposition path;",
    "- Paperclip has at most one next legal lane, or a clear reason why it must wait;",
    "- control tick can stop reporting ambiguous blocked triage for this target.",
  ].join("\n");

  actions.push({
    action: apply ? "created_blocked_triage_lane" : "would_create_blocked_triage_lane",
    trigger: starvationOverride(governorDecision.decision)
      ? "blocked_triage_max_wait_expired"
      : "governor_blocked_needs_triage",
    targetIdentifier: target.identifier ?? null,
    targetTitle: target.title,
    targetProject: target.projectName,
    assignee: assignee?.name ?? null,
    assigneeStrategy: usesTargetOwner ? "target_owner" : "triage_fallback",
    project: osProject?.name ?? null,
  });

  if (apply) {
    const creation = await withTriageCreationLock(async () => {
      const concurrentExisting = await findOpenTriageByExactTitle(title);
      if (concurrentExisting) return { issue: concurrentExisting, reused: true };
      const created = await request("POST", `/api/companies/${company.id}/issues`, {
        title,
        description,
        status: "todo",
        priority: "high",
        assigneeAgentId: assignee?.id ?? null,
        projectId: osProject?.id ?? null,
        goalId: goal?.id ?? null,
        requestDepth: 2,
        acceptanceCriteria: [
          "No protected delivery action occurs.",
          "No project repository mutation occurs.",
          "Target issue receives owner/action/evidence disposition.",
          "At most one next legal lane is created or woken.",
        ],
      });
      return { issue: created, reused: false };
    });
    const created = creation.issue;
    if (creation.reused) {
      actions.at(-1).action = "kept_existing_blocked_triage_lane";
      actions.at(-1).concurrentDuplicatePrevented = true;
    }
    actions.at(-1).identifier = created.identifier;
    actions.at(-1).status = created.status;
    if (!creation.reused && created.assigneeAgentId) {
      const freshWip = await fetchAgentWipState({ request, companyId: company.id });
      const blocker = agentWipBlockerFor(created.assigneeAgentId, freshWip);
      if (blocker) {
        actions.at(-1).wakeSkipped = blocker;
        actions.at(-1).activeRunCount = freshWip.activeRunCount;
        actions.at(-1).liveRunCount = freshWip.liveRunCount;
        actions.at(-1).unknownActiveRunCount = freshWip.unknownActiveRunCount;
      } else {
        try {
          const run = await request("POST", `/api/agents/${created.assigneeAgentId}/heartbeat/invoke?companyId=${company.id}`, {
            reason: "issue_assigned",
            payload: {
              issueId: created.id,
              taskId: created.id,
              taskKey: created.identifier,
              source: "softwarehouse-blocked-triage-lane-starter",
            },
            idempotencyKey: `softwarehouse-blocked-triage:${created.id}:${created.updatedAt ?? Date.now()}`,
          });
          actions.at(-1).wakeRunId = run?.id ?? null;
          actions.at(-1).wakeStatus = run?.status ?? null;
        } catch (error) {
          const hold = admissionHold(error);
          if (!hold) throw error;
          actions.at(-1).wakeSkipped = hold;
          actions.at(-1).wakeStatus = "waiting_for_signal";
        }
      }
    }
  }
}

console.log(JSON.stringify({
  apiBase,
  company: { id: company.id, name: company.name },
  mode: apply ? "apply" : "dry-run",
  activeRunCount,
  liveRunCount: liveRuns.length,
  activeIssueCount: activeIssues.length,
  terminalTriageIssueCount: terminalTriageIssues.length,
  candidateScanStatus: "ok",
  requestTimeoutMs,
  blockingActiveRunCount,
  unknownActiveRunCount: agentWip.unknownActiveRunCount,
  nonBlockingRoutineLiveRunCount,
  governorDecision,
  blockedTriageMaxWaitMs,
  starvedCandidateIdentifier: starvedCandidate?.identifier ?? null,
  candidateCount: candidates.length,
  skippedFreshTerminalTriageCount: skippedFreshTerminalTriage.length,
  skippedFreshTerminalTriage: skippedFreshTerminalTriage.slice(0, 10),
  candidates: candidates.slice(0, 5).map((issue) => ({
    identifier: issue.identifier,
    title: issue.title,
    project: issue.projectName,
    status: issue.status,
    rootBlocker: issue.rootBlocker,
  })),
  actions,
}, null, 2));
