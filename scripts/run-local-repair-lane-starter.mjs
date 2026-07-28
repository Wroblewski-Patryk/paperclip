import { agentWipBlockerFor, fetchAgentWipState, summarizeAgentWip } from "./lib/agent-wip-guard.mjs";
import { findAgentByNameOrAlias } from "./lib/softwarehouse-agent-resolver.mjs";
import { isRequestTimeoutError, requestJson } from "./lib/timed-json-request.mjs";

const apiBase = process.env.PAPERCLIP_API_URL ?? "http://127.0.0.1:3200";
const companyNames = [
  process.env.SOFTWAREHOUSE_COMPANY_NAME,
  process.env.PAPERCLIP_COMPANY_NAME,
  "LuckySparrow",
  "LuckySparrow Software House",
].filter(Boolean);
const companyId = process.env.PAPERCLIP_COMPANY_ID ?? null;
const authToken = process.env.PAPERCLIP_API_KEY ?? null;
const runId = process.env.PAPERCLIP_RUN_ID ?? null;
const currentIssueId = process.env.PAPERCLIP_ISSUE_ID ?? process.env.PAPERCLIP_TASK_ID ?? null;
const apply = process.argv.includes("--apply");
const requestTimeoutMs = Number(process.env.SOFTWAREHOUSE_LOCAL_REPAIR_REQUEST_TIMEOUT_MS ?? 30_000);
const governorTimeoutMs = Number(process.env.SOFTWAREHOUSE_LOCAL_REPAIR_GOVERNOR_TIMEOUT_MS ?? 30_000);
const sourceControlRefreshTimeoutMs = Number(
  process.env.SOFTWAREHOUSE_LOCAL_REPAIR_SOURCE_CONTROL_TIMEOUT_MS ?? 30_000,
);

const terminalStatuses = new Set(["done", "cancelled"]);
const runnableStatuses = new Set(["todo", "backlog"]);
const protectedGateIdentifiers = new Set(["LUC-25", "LUC-30", "LUC-31", "LUC-32"]);
const localRepairCompatibleGovernorDecisions = new Set([
  "runnable_work_available",
  "gate_recheck_ready",
  "known_gates_only",
  "safe_nonproduction_cooldown",
  "safe_nonproduction_no_evidence_cooldown",
  "project_source_control_closure_needed",
  "operating_source_control_closure_needed",
]);
const safeSourceControlGroups = new Set(["project-docs", "history-evidence", "codex-context", "agent-state"]);
const sourceControlClosureIssueByProject = new Map([
  ["Softwarehouse Operating System", "LUC-545"],
  ["Soar", "LUC-149"],
  ["Roost", "LUC-149"],
  ["Aviary", "LUC-420"],
  ["Nest", "LUC-438"],
]);
const sourceControlClosureLaneTitleByProject = new Map([
  ["Softwarehouse Operating System", "[Softwarehouse Operating System][Source Control Closure] Classify and close local dirty state for LUC-545"],
  ["Soar", "[Soar][Source Control Closure] Classify and close local dirty state for LUC-149"],
  ["Roost", "[Roost][Source Control Closure] Classify and close local dirty state for LUC-149"],
  ["Featherly", "[Featherly][Source Control Closure] Classify and close local dirty state"],
  ["Aviary", "[Aviary][Source Control Closure] Classify and close local dirty state for LUC-420"],
  ["Nest", "[Nest][Source Control Closure] Classify and close local dirty state for LUC-438"],
]);
const sourceControlClosureAssigneeByProject = new Map([
  ["Softwarehouse Operating System", "09 CTO (Chief Technology Officer)"],
  ["Soar", "Soar Project Manager"],
  ["Roost", "Roost Project Manager"],
  ["Featherly", "Featherly Platform Manager"],
  ["Aviary", "Aviary Project Manager"],
  ["Nest", "Nest Project Manager"],
]);
const specialistSourceControlGroups = new Set(["product-code", "scripts", "dependencies", "other"]);
const projectAliases = new Map([
  ["Soar", ["Soar", "11 Innovation: Soar"]],
  ["Roost", ["Roost", "11 Innovation: Roost"]],
  ["Featherly", ["Featherly", "11 Innovation: Featherly"]],
  ["Softwarehouse Operating System", ["Softwarehouse Operating System", "00 General: Softwarehouse"]],
  ["Aviary", ["Aviary", "Personality"]],
]);
const projectPriority = (process.env.SOFTWAREHOUSE_LOCAL_REPAIR_PROJECTS ?? "Soar,Roost,Featherly,Softwarehouse Operating System")
  .split(",")
  .map((name) => name.trim())
  .filter(Boolean);

async function readSourceControlPacket() {
  let refresh = {
    attempted: true,
    ok: false,
    error: null,
  };
  try {
    const { spawnSync } = await import("node:child_process");
    const result = spawnSync(process.execPath, ["scripts/check-softwarehouse-source-control.mjs"], {
      cwd: process.cwd(),
      env: { ...process.env },
      encoding: "utf8",
      stdio: ["ignore", "pipe", "pipe"],
      timeout: sourceControlRefreshTimeoutMs,
    });
    refresh = {
      attempted: true,
      ok: result.status === 0 && !result.error,
      error: result.error?.code === "ETIMEDOUT"
        ? `source-control refresh timed out after ${sourceControlRefreshTimeoutMs}ms`
        : result.status === 0
          ? null
          : (result.stderr || result.stdout || "source-control refresh failed").trim().slice(0, 1000),
    };
  } catch (error) {
    refresh.error = error instanceof Error ? error.message : String(error);
  }

  try {
    const { readFile } = await import("node:fs/promises");
    const packet = JSON.parse(await readFile("report/softwarehouse-source-control.latest.json", "utf8"));
    const repos = packet.repos ?? [];
    const operatingRepo = repos.find((repo) => repo.name === "Paperclip_Softwarehouse");
    const dirtyProjectNames = repos
      .filter((repo) => repo.name !== "Paperclip_Softwarehouse" && repo.git && repo.clean === false)
      .map((repo) => repo.name)
      .filter(Boolean);
    return {
      sourceControlPacketRead: true,
      sourceControlRefresh: refresh,
      sourceControlPacketVerified: refresh.ok,
      generatedAt: packet.generatedAt ?? null,
      repos,
      operatingRepo,
      operatingRepoClean: operatingRepo?.clean ?? null,
      operatingDirtyCount: operatingRepo?.dirtyCount ?? 0,
      operatingSourceControlSafe:
        operatingRepo?.clean === false
        && (operatingRepo.dirtyGroups?.length ?? 0) > 0
        && operatingRepo.dirtyGroups.every((group) => safeSourceControlGroups.has(group.group)),
      dirtyProjectNames,
    };
  } catch {
    return {
      sourceControlPacketRead: false,
      sourceControlRefresh: refresh,
      sourceControlPacketVerified: false,
      generatedAt: null,
      repos: [],
      operatingRepo: null,
      operatingRepoClean: null,
      operatingDirtyCount: null,
      operatingSourceControlSafe: false,
      dirtyProjectNames: [],
    };
  }
}

async function readGovernorDecision() {
  try {
    const { spawnSync } = await import("node:child_process");
    const result = spawnSync(process.execPath, ["scripts/run-autonomy-governor.mjs"], {
      cwd: process.cwd(),
      env: { ...process.env },
      encoding: "utf8",
      stdio: ["ignore", "pipe", "pipe"],
      timeout: governorTimeoutMs,
    });
    if (result.error?.code === "ETIMEDOUT") {
      return {
        ok: false,
        decision: null,
        operatingPosture: null,
        timedOut: true,
        timeoutMs: governorTimeoutMs,
        error: `scripts/run-autonomy-governor.mjs timed out after ${governorTimeoutMs}ms`,
      };
    }
    if (result.status !== 0) {
      return {
        ok: false,
        decision: null,
        operatingPosture: null,
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
  } catch (error) {
    return {
      ok: false,
      decision: null,
      operatingPosture: null,
      error: error instanceof Error ? error.message : String(error),
    };
  }
}

async function request(method, route, body) {
  return requestJson({
    apiBase,
    method,
    route,
    body,
    timeoutMs: requestTimeoutMs,
    authToken,
    runId,
  });
}

function priorityRank(priority) {
  return {
    urgent: 0,
    high: 1,
    medium: 2,
    low: 3,
  }[priority] ?? 4;
}

function projectRank(projectName) {
  const controlledName = controlledProjectNameFor(projectName) ?? projectName;
  const index = projectPriority.indexOf(controlledName);
  return index === -1 ? 999 : index;
}

function byName(items, name) {
  return findAgentByNameOrAlias(items, name);
}

function activeProjectForControlledName(projects, controlledName) {
  const aliases = projectAliases.get(controlledName) ?? [controlledName];
  return projects.find((project) => aliases.includes(project.name) && !project.archivedAt) ?? null;
}

function controlledProjectNameFor(projectName) {
  for (const [controlledName, aliases] of projectAliases) {
    if (aliases.includes(projectName)) return controlledName;
  }
  return null;
}

function projectInPriority(project) {
  if (!project?.name) return false;
  const controlledName = controlledProjectNameFor(project.name) ?? project.name;
  return projectPriority.includes(controlledName);
}

function defaultProjectWorkspaceId(project) {
  const policy = project?.executionWorkspacePolicy;
  if (!policy || typeof policy !== "object" || Array.isArray(policy)) return null;
  const value = policy.defaultProjectWorkspaceId;
  return typeof value === "string" && value.trim() ? value.trim() : null;
}

function projectHasActiveWork(projectId, liveProjectIds) {
  return Boolean(projectId && liveProjectIds.has(projectId));
}

function issueHasActiveConflict(issue, liveProjectIds, busyAgentIds, unknownActiveRunCount) {
  return unknownActiveRunCount > 0
    || projectHasActiveWork(issue.projectId, liveProjectIds)
    || Boolean(issue.assigneeAgentId && busyAgentIds.has(issue.assigneeAgentId));
}

function sidecarHasActiveConflict(sidecar, liveProjectIds, busyAgentIds, unknownActiveRunCount) {
  return unknownActiveRunCount > 0
    || projectHasActiveWork(sidecar.project?.id, liveProjectIds)
    || Boolean(sidecar.assignee?.id && busyAgentIds.has(sidecar.assignee.id));
}

function isCurrentControlRun(run) {
  return Boolean(
    (runId && run.id === runId)
    || (currentIssueId && run.issueId === currentIssueId)
    || (currentIssueId && run.issueIdentifier === currentIssueId)
  );
}

function wipStateIgnoringCurrentRun(state) {
  const observedLiveRuns = Array.isArray(state?.liveRuns) ? state.liveRuns : [];
  const ignoredSelfRuns = observedLiveRuns.filter(isCurrentControlRun);
  const externalLiveRuns = observedLiveRuns.filter((run) => !isCurrentControlRun(run));
  const observedActiveRunCount = Number.isFinite(Number(state?.activeRunCount))
    ? Math.max(0, Number(state.activeRunCount))
    : observedLiveRuns.length;
  return {
    ...state,
    ...summarizeAgentWip({
      activeRunCount: Math.max(0, observedActiveRunCount - ignoredSelfRuns.length),
      liveRuns: externalLiveRuns,
    }),
    liveRuns: externalLiveRuns,
    observedActiveRunCount,
    observedLiveRunCount: observedLiveRuns.length,
    ignoredSelfRunCount: ignoredSelfRuns.length,
  };
}

function sourceControlClosureTitlePrefix(projectName) {
  const canonicalProjectName = controlledProjectNameFor(projectName) ?? projectName;
  return `[${canonicalProjectName}][Source Control Closure] Classify and close local dirty state`;
}

function sourceControlClosureAssigneeName(projectName, sourceControlPacket) {
  const canonicalProjectName = controlledProjectNameFor(projectName) ?? projectName;
  const repo = (sourceControlPacket.repos ?? [])
    .find((candidate) => candidate.name === canonicalProjectName);
  const needsTechnicalReview = (repo?.dirtyGroups ?? [])
    .some((group) => specialistSourceControlGroups.has(group.group));
  if (needsTechnicalReview) return "09 CRS (Code Review Specialist)";
  return sourceControlClosureAssigneeByProject.get(canonicalProjectName) ?? null;
}

function isSourceControlClosureTitle(title) {
  return Array.from(sourceControlClosureLaneTitleByProject.values()).includes(title)
    || Array.from(sourceControlClosureLaneTitleByProject.keys())
      .some((projectName) => title?.startsWith(sourceControlClosureTitlePrefix(projectName)));
}

function sourceControlClosureAllowed(governorDecision, sourceControlPacket) {
  if (sourceControlPacket.sourceControlPacketVerified !== true) return false;
  if (!localRepairCompatibleGovernorDecisions.has(governorDecision.decision)) return false;
  return (sourceControlPacket.dirtyProjectNames?.length ?? 0) > 0
    || sourceControlPacket.operatingSourceControlSafe === true;
}

function issueRefsFromPaths(paths) {
  const refs = [];
  for (const filePath of paths ?? []) {
    for (const match of String(filePath).matchAll(/\bLUC-\d+\b/gi)) {
      refs.push(match[0].toUpperCase());
    }
  }
  return [...new Set(refs)].sort((left, right) => left.localeCompare(right, undefined, { numeric: true }));
}

function sourceControlTargetLabel(refs, fallbackIdentifier) {
  if (refs.length === 0) return fallbackIdentifier;
  const visibleRefs = refs.slice(0, 4);
  const extraCount = refs.length - visibleRefs.length;
  return extraCount > 0
    ? `${visibleRefs.join("-")}-plus-${extraCount}`
    : visibleRefs.join("-");
}

function sourceControlSidecarSpec({ projectName, issues, sourceControlPacket }) {
  const repo = (sourceControlPacket.repos ?? []).find((candidate) => candidate.name === projectName) ?? null;
  const refs = issueRefsFromPaths(repo?.dirtyPaths ?? repo?.sample?.map((item) => item.path));
  const linkedIssues = refs
    .map((identifier) => issues.find((issue) => issue.identifier === identifier))
    .filter(Boolean);
  const fallbackIdentifier = sourceControlClosureIssueByProject.get(projectName);
  const targetIssue = linkedIssues[0]
    ?? issues.find((issue) => issue.identifier === fallbackIdentifier)
    ?? null;
  const targetLabel = sourceControlTargetLabel(refs, fallbackIdentifier);
  const title = targetLabel
    ? `${sourceControlClosureTitlePrefix(projectName)} for ${targetLabel}`
    : sourceControlClosureLaneTitleByProject.get(projectName);
  return { repo, refs, linkedIssues, targetIssue, targetLabel, title, fallbackIdentifier };
}

function issueSort(left, right) {
  return projectRank(left.projectName) - projectRank(right.projectName)
    || priorityRank(left.priority) - priorityRank(right.priority)
    || String(left.identifier).localeCompare(String(right.identifier), undefined, { numeric: true })
    || String(left.updatedAt).localeCompare(String(right.updatedAt));
}

function isSourceControlClosureCandidate(issue, project, governorDecision, liveIssueIds, sourceControlPacket) {
  if (!sourceControlClosureAllowed(governorDecision, sourceControlPacket)) return false;
  if (!project || project.archivedAt) return false;
  if (!projectInPriority(project)) return false;
  if (!issue.title?.startsWith(sourceControlClosureTitlePrefix(project.name))) return false;
  const isRunnable = ["todo", "backlog"].includes(issue.status);
  const isSelfBlockedDispositionRecovery = issue.status === "blocked"
    && issue.blockerAttention?.unresolvedBlockerCount === 0
    && issue.activeRecoveryAction?.kind === "missing_disposition";
  const isBlockedWithoutLiveBlocker = issue.status === "blocked"
    && (issue.blockerAttention?.unresolvedBlockerCount ?? 0) === 0
    && !issue.activeRecoveryAction;
  const isBlockedWithStrandedRecovery = issue.status === "blocked"
    && (issue.blockerAttention?.unresolvedBlockerCount ?? 0) === 0
    && issue.activeRecoveryAction?.kind === "stranded_assigned_issue";
  if (!isRunnable && !isSelfBlockedDispositionRecovery && !isBlockedWithoutLiveBlocker && !isBlockedWithStrandedRecovery) return false;
  if (liveIssueIds.has(issue.id)) return false;
  if (!issue.assigneeAgentId) return false;
  return true;
}

function isLocalRepairCandidate(issue, projectById, liveIssueIds, governorDecision) {
  const project = projectById.get(issue.projectId);
  if (isSourceControlClosureCandidate(issue, project, governorDecision, liveIssueIds, sourceControlPacket)) return true;
  if (!project || project.archivedAt) return false;
  if (!projectInPriority(project)) return false;
  if (issue.originKind === "routine_execution") return false;
  if (!runnableStatuses.has(issue.status)) return false;
  if (terminalStatuses.has(issue.status)) return false;
  if (liveIssueIds.has(issue.id)) return false;
  if (protectedGateIdentifiers.has(issue.identifier)) return false;
  if (!issue.assigneeAgentId) return false;

  const text = `${issue.title ?? ""}\n${issue.description ?? ""}`.toLowerCase();
  const mentionsProtectedDelivery = /\bpush\b|\bdeploy\b|restart|protected smoke|secret disclosure/.test(text);
  const explicitlyForbidsProtectedDelivery =
    /forbidden:[\s\S]{0,500}(\bpush\b|\bdeploy\b|restart|protected smoke|secret disclosure)/.test(text)
    || /do not (push|deploy|restart|run protected smoke|disclose secrets)/.test(text)
    || /\bno (push|deploy|restart|protected smoke|secret disclosure)\b/.test(text)
    || /protected delivery remains fail-closed/.test(text);
  const requiresProtectedDelivery =
    /\b(must|requires|needs|required)\b[\s\S]{0,160}(\bpush\b|\bdeploy\b|restart|protected smoke|secret disclosure)/.test(text)
    || /blocked[\s\S]{0,160}(\bpush\b|\bdeploy\b|restart|protected smoke|secret disclosure)/.test(text);
  if (mentionsProtectedDelivery && requiresProtectedDelivery && !explicitlyForbidsProtectedDelivery) {
    return false;
  }
  return true;
}

async function resolveCompany() {
  if (companyId) return { id: companyId, source: "PAPERCLIP_COMPANY_ID" };

  const companies = await request("GET", "/api/companies");
  const company = companies.find((candidate) => companyNames.includes(candidate.name));
  if (!company) throw new Error(`Company not found. Tried: ${companyNames.join(", ")}`);
  return { id: company.id, source: "company_name" };
}

function ownerActionForApiFailure() {
  return "Restore local Paperclip API issue-list/live-run responsiveness, then rerun node scripts/run-local-repair-lane-starter.mjs or pnpm softwarehouse:control-tick.";
}

function isIssueAuthorizationBoundaryError(error) {
  return error?.name === "HttpRequestError"
    && error?.status === 403
    && /(?:Issue is outside this actor(?:'|\\u0027)s authorization boundary|Agent cannot mutate another agent(?:'|\\u0027)?s issue)/i
      .test(error?.body ?? error?.message ?? "");
}

function apiFailureOutput(error) {
  const timedOut = isRequestTimeoutError(error);
  return {
    apiBase,
    company: companyId ? { id: companyId, source: "PAPERCLIP_COMPANY_ID" } : null,
    mode: apply ? "apply" : "dry-run",
    candidateScanStatus: timedOut ? "api_timeout" : "api_error",
    activeRunCount: null,
    liveRunCount: null,
    governorDecision: null,
    sourceControlPacket: null,
    projectPriority,
    candidateCount: null,
    candidates: [],
    actions: [{
      action: "noop_api_unresponsive",
      route: error?.route ?? null,
      method: error?.method ?? null,
      timeoutMs: timedOut ? error?.timeoutMs ?? requestTimeoutMs : null,
      error: error instanceof Error ? error.message.slice(0, 500) : String(error).slice(0, 500),
      ownerAction: ownerActionForApiFailure(),
    }],
  };
}

let company;
let health;
let projects;
let issues;
let liveRuns;
let agents;
let governorDecision;

try {
  company = await resolveCompany();
  [health, projects, issues, liveRuns, agents, governorDecision] = await Promise.all([
    request("GET", "/api/health"),
    request("GET", `/api/companies/${company.id}/projects`),
    request("GET", `/api/companies/${company.id}/issues?limit=1000`),
    request("GET", `/api/companies/${company.id}/live-runs`),
    request("GET", `/api/companies/${company.id}/agents`),
    readGovernorDecision(),
  ]);
} catch (error) {
  console.log(JSON.stringify(apiFailureOutput(error), null, 2));
  process.exit(0);
}

const sourceControlPacket = await readSourceControlPacket();
const dirtyProjectNames = new Set(sourceControlPacket.dirtyProjectNames ?? []);
const operatingSourceControlClosureRequested =
  sourceControlPacket.operatingSourceControlSafe === true
  && projectPriority.length === 1
  && projectPriority[0] === "Softwarehouse Operating System";
const projectSourceControlClosureRequested =
  governorDecision.decision === "project_source_control_closure_needed"
  && dirtyProjectNames.size > 0;
const dedicatedSourceControlClosureRequested =
  operatingSourceControlClosureRequested || projectSourceControlClosureRequested;
const initialWip = wipStateIgnoringCurrentRun({
  activeRunCount: health.devServer?.activeRunCount ?? liveRuns.length,
  liveRuns,
});
const observedActiveRunCount = initialWip.observedActiveRunCount;
const observedLiveRunCount = initialWip.observedLiveRunCount;
const ignoredSelfRunCount = initialWip.ignoredSelfRunCount;
liveRuns = initialWip.liveRuns;
const activeRunCount = initialWip.activeRunCount;
const unknownActiveRunCount = initialWip.unknownActiveRunCount;
const liveIssueIds = new Set(liveRuns.map((run) => run.issueId).filter(Boolean));
const projectById = new Map(projects.map((project) => [project.id, project]));
const agentById = new Map(agents.map((agent) => [agent.id, agent]));
const issueById = new Map(issues.map((issue) => [issue.id, issue]));
const liveProjectIds = new Set(liveRuns
  .map((run) => issueById.get(run.issueId)?.projectId)
  .filter(Boolean));
const busyAgentIds = new Set(liveRuns.map((run) => run.agentId).filter(Boolean));
let candidates = issues
  .filter((issue) => isLocalRepairCandidate(issue, projectById, liveIssueIds, governorDecision))
  .filter((issue) => !dedicatedSourceControlClosureRequested || isSourceControlClosureTitle(issue.title))
  .filter((issue) => {
    if (!isSourceControlClosureTitle(issue.title)) return true;
    const project = projectById.get(issue.projectId);
    const controlledProjectName = controlledProjectNameFor(project?.name) ?? project?.name;
    return Boolean(controlledProjectName && dirtyProjectNames.has(controlledProjectName));
  })
  .filter((issue) => !issueHasActiveConflict(issue, liveProjectIds, busyAgentIds, unknownActiveRunCount))
  .map((issue) => ({
    ...issue,
    projectName: projectById.get(issue.projectId)?.name ?? null,
  }))
  .sort(issueSort);

const sidecarCreations = [];
if (sourceControlClosureAllowed(governorDecision, sourceControlPacket)) {
  const dirtyProjectNames = new Set(sourceControlPacket.dirtyProjectNames ?? []);
  if (sourceControlPacket.operatingSourceControlSafe) {
    dirtyProjectNames.add("Softwarehouse Operating System");
  }
  for (const projectName of projectPriority) {
    if (dirtyProjectNames.size > 0 && !dirtyProjectNames.has(projectName)) continue;
    const { refs, linkedIssues, targetIssue, title, fallbackIdentifier } = sourceControlSidecarSpec({
      projectName,
      issues,
      sourceControlPacket,
    });
    const resolvedTargetIssue = targetIssue ?? await findIssueByIdentifier(company.id, fallbackIdentifier);
    if (!title || !resolvedTargetIssue) continue;
    const project = activeProjectForControlledName(projects, projectName);
    const existing = issues.find((issue) =>
      issue.title?.startsWith(sourceControlClosureTitlePrefix(projectName)) && !terminalStatuses.has(issue.status)
    );
    if (existing) continue;
    if (!project) continue;
    const assigneeName = sourceControlClosureAssigneeName(projectName, sourceControlPacket);
    const assignee = assigneeName ? byName(agents, assigneeName) : null;
    sidecarCreations.push({ project, targetIssue: resolvedTargetIssue, title, assignee, refs, linkedIssues });
    break;
  }
}
const availableSidecarCreations = sidecarCreations.filter((sidecar) =>
  !sidecarHasActiveConflict(sidecar, liveProjectIds, busyAgentIds, unknownActiveRunCount)
);

async function refreshIssueByExactTitle(companyId, title) {
  const matches = await request("GET", `/api/companies/${companyId}/issues?q=${encodeURIComponent(title)}&limit=100`);
  const values = Array.isArray(matches) ? matches : matches?.value ?? [];
  return values.find((issue) => issue.title === title && !terminalStatuses.has(issue.status)) ?? null;
}

async function findIssueByIdentifier(companyId, identifier) {
  if (!identifier) return null;
  const directMatch = await request("GET", `/api/issues/${encodeURIComponent(identifier)}`).catch(() => null);
  if (directMatch?.identifier === identifier) return directMatch;
  const matches = await request("GET", `/api/companies/${companyId}/issues?q=${encodeURIComponent(identifier)}&limit=100`);
  const values = Array.isArray(matches) ? matches : matches?.value ?? [];
  return values.find((issue) => issue.identifier === identifier) ?? null;
}

const actions = [];
if (activeRunCount > 0 && candidates.length === 0
  && sidecarCreations.length > 0 && availableSidecarCreations.length === 0) {
  actions.push({
    action: "noop_active_runs",
    activeRunCount,
    liveRunCount: liveRuns.length,
    unknownActiveRunCount,
  });
} else if (!localRepairCompatibleGovernorDecisions.has(governorDecision.decision)) {
  actions.push({
    action: "noop_governor_decision_not_runnable_work",
    governorDecision: governorDecision.decision,
    operatingPosture: governorDecision.operatingPosture,
  });
} else if (sourceControlPacket.operatingRepoClean === false && !operatingSourceControlClosureRequested) {
  actions.push({
    action: "noop_operating_repo_dirty",
    operatingDirtyCount: sourceControlPacket.operatingDirtyCount,
  });
} else if (candidates.length === 0 && availableSidecarCreations.length === 0) {
  actions.push({
    action: "noop_no_local_repair_candidate",
    projectPriority,
  });
} else if (candidates.length === 0 && availableSidecarCreations.length > 0) {
  const sidecar = availableSidecarCreations[0];
  const description = [
    "softwarehouse-source-control-closure-sidecar:v1",
    "",
    `Target blocked issue: ${sidecar.targetIssue.identifier} ${sidecar.targetIssue.title}`,
    sidecar.refs?.length
      ? `Dirty-path issue refs: ${sidecar.refs.join(", ")}`
      : "Dirty-path issue refs: none detected; using project fallback source-control root.",
    sidecar.linkedIssues?.length
      ? `Linked dirty-state issues: ${sidecar.linkedIssues.map((issue) => `${issue.identifier} ${issue.title}`).join("; ")}`
      : "",
    "",
    "Purpose:",
    "- inspect the current local dirty state for the target project;",
    "- classify each dirty group as current/stale/out-of-scope;",
    "- run only local validation that does not require protected credentials;",
    "- make a local commit/no-commit decision with evidence.",
    "",
    "Commit rule:",
    "- if the dirty set is only docs/history/evidence/context/agent-state and the redaction check finds no secrets, make one local source-control closure commit;",
    "- if the packet contains product-code/scripts/dependencies/other, the CRS owner must inspect that diff, run the smallest relevant validation, and commit the coherent packet only when validation passes;",
    "- do not leave a docs/state/evidence-only dirty set uncommitted just because it spans multiple issues; use an operational evidence commit message and link every affected issue in the final comment;",
    "- choose no-commit only for stale/out-of-scope/secret-risk files, unresolved user-owned edits, or when local validation fails.",
    "- do not mark this issue done while the target repo is still dirty unless the final comment names the remaining dirty paths, the no-commit blocker, and a linked open non-terminal issue/sidecar that keeps closure active.",
    "- `PM sidecar evidence only`, `ownership remains with another lane`, or a bare `not committed` closure is not a valid done disposition for docs/state/evidence-only dirty sets.",
    "",
    "Bounded redaction rule:",
    "- prefer the repository's existing secret scanner; otherwise search only high-confidence credential signatures and report matching file names or counts, capped at 100 paths;",
    "- do not scan generic words such as token/password/secret across generated graphs, status indexes, or append-heavy state files;",
    "- do not pipe a full generated diff into a secret search; restrict added-line review to small authored/untracked paths and cap output;",
    "- validate generated files by producer command and summary counts rather than printing generated content.",
    "",
    "Allowed:",
    "- local diff inspection;",
    "- local validation;",
    "- local commit only when evidence supports closure.",
    "",
    "Forbidden:",
    "- push;",
    "- deploy;",
    "- production restart;",
    "- protected smoke/live account mutation;",
    "- secret disclosure.",
  ].join("\n");
  actions.push({
    action: apply ? "create_source_control_closure_sidecar" : "would_create_source_control_closure_sidecar",
    title: sidecar.title,
    project: sidecar.project.name,
    targetIdentifier: sidecar.targetIssue.identifier,
    dirtyRefs: sidecar.refs ?? [],
    assignee: sidecar.assignee?.name ?? null,
  });
  if (apply) {
    let created;
    try {
      const existing = await refreshIssueByExactTitle(company.id, sidecar.title);
      if (existing) {
        actions.at(-1).action = "kept_existing_source_control_closure_sidecar";
        actions.at(-1).identifier = existing.identifier;
        actions.at(-1).status = existing.status;
        actions.at(-1).readback = "exact_title_match";
        console.log(JSON.stringify({
          apiBase,
          company: { id: company.id, name: company.name },
          mode: apply ? "apply" : "dry-run",
          candidateScanStatus: "ok",
          activeRunCount,
          liveRunCount: liveRuns.length,
          governorDecision,
          sourceControlPacket,
          projectPriority,
          candidateCount: candidates.length,
          candidates: candidates.slice(0, 5).map((issue) => ({
            identifier: issue.identifier,
            title: issue.title,
            project: issue.projectName,
            status: issue.status,
            priority: issue.priority,
            assigneeAgentId: issue.assigneeAgentId,
          })),
          actions,
        }, null, 2));
        process.exit(0);
      }
      created = await request("POST", `/api/companies/${company.id}/issues`, {
      title: sidecar.title,
      description,
      status: "todo",
      priority: "high",
      assigneeAgentId: sidecar.assignee?.id ?? null,
      projectId: sidecar.project.id,
      projectWorkspaceId: defaultProjectWorkspaceId(sidecar.project),
      executionWorkspacePreference: "shared_workspace",
      executionWorkspaceSettings: { mode: "shared_workspace" },
      requestDepth: 2,
      acceptanceCriteria: [
        "Protected delivery remains fail-closed: no push, deploy, restart, protected smoke, live account mutation, or secret disclosure.",
        "The run uses the project's primary local workspace, not an isolated git worktree; final evidence includes `git -C <project path> status --short --branch`.",
        "Every dirty file/group is classified with commit/no-commit rationale.",
        "Dirty-path issue refs are identified from file paths when present and linked in the final disposition.",
        "Local validation evidence is recorded.",
        "Redaction evidence uses a bounded repository scanner or high-confidence signatures with file-name/count-only output; full generated diffs and generic secret-word scans are forbidden.",
        "Docs/history/evidence/context/agent-state-only dirty sets are committed locally unless a concrete blocker is recorded.",
        "Behavior/tooling dirty groups are reviewed by CRS with the smallest relevant validation before commit/no-commit disposition.",
        "The issue is not marked done while the target repo remains dirty unless the remaining paths, blocker, and linked open non-terminal owner issue/sidecar are recorded.",
        "A final comment that says `not committed` because ownership remains elsewhere is treated as blocked/delegated, not done.",
        "Final comment links the decision back to the target issue.",
      ],
      });
    } catch (error) {
      if (isRequestTimeoutError(error)) {
        actions.at(-1).action = "apply_outcome_unknown";
        actions.at(-1).route = error.route ?? null;
        actions.at(-1).timeoutMs = error.timeoutMs ?? requestTimeoutMs;
        actions.at(-1).requiredReadback = "Search by exact sidecar title and target issue before retrying create.";
        console.log(JSON.stringify({
          apiBase,
          company: { id: company.id, name: company.name },
          mode: apply ? "apply" : "dry-run",
          candidateScanStatus: "ok",
          activeRunCount,
          liveRunCount: liveRuns.length,
          governorDecision,
          sourceControlPacket,
          projectPriority,
          candidateCount: candidates.length,
          candidates: candidates.slice(0, 5).map((issue) => ({
            identifier: issue.identifier,
            title: issue.title,
            project: issue.projectName,
            status: issue.status,
            priority: issue.priority,
            assigneeAgentId: issue.assigneeAgentId,
          })),
          actions,
        }, null, 2));
        process.exit(1);
      }
      throw error;
    }
    const freshWip = wipStateIgnoringCurrentRun(
      await fetchAgentWipState({ request, companyId: company.id }),
    );
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
} else {
  const issue = candidates[0];
  const comment = [
    "softwarehouse-local-repair-lane-starter:v1",
    "",
    "Autonomous local repair/source-control lane selected by Paperclip control tick.",
    governorDecision.decision === "project_source_control_closure_needed"
      ? "This lane is allowed to perform local source-control closure while protected delivery remains fail-closed."
      : "",
    governorDecision.decision === "gate_recheck_ready"
      ? "A protected gate recheck is also available, but this lane is non-production/local and must not perform protected delivery."
      : "",
    "",
    "Allowed:",
    "- inspect and edit the local project repository for this narrow issue;",
    "- run local validation relevant to the affected files/capability;",
    "- make a local commit only when evidence supports closure.",
    "",
    "Forbidden until protected gate evidence exists:",
    "- push;",
    "- deploy;",
    "- production restart;",
    "- protected smoke/live account mutation;",
    "- secret disclosure.",
    "",
    "Required evidence before closure:",
    "- affected capability/chain/files;",
    "- validation commands and results;",
    "- regression risk and follow-up gaps;",
    "- commit/no-commit decision;",
    "- when the dirty set is docs/history/evidence/context/agent-state only, either the local commit hash or the concrete blocker plus linked open non-terminal issue/sidecar that prevented committing.",
    "- do not mark this issue done while the affected repo is still dirty unless the final comment names the remaining dirty paths, the no-commit blocker, and the next owner/sidecar that keeps closure active.",
  ].join("\n");

  actions.push({
    action: apply ? "start_local_repair_lane" : "would_start_local_repair_lane",
    identifier: issue.identifier,
    title: issue.title,
    project: issue.projectName,
    status: issue.status,
    priority: issue.priority,
    assigneeAgentId: issue.assigneeAgentId,
  });

  if (apply) {
    const targetAssigneeName = sourceControlClosureAssigneeName(issue.projectName, sourceControlPacket);
    const targetAssignee = targetAssigneeName ? byName(agents, targetAssigneeName) : null;
    const isBacklogWake = issue.status === "backlog";
    const input = {
      status: "todo",
      comment,
      resume: !isBacklogWake,
    };
    if (targetAssignee) input.assigneeAgentId = targetAssignee.id;
    let updated;
    try {
      updated = await request("PATCH", `/api/issues/${issue.id}`, {
        ...input,
      });
    } catch (error) {
      if (isRequestTimeoutError(error)) {
        actions.at(-1).action = "apply_outcome_unknown";
        actions.at(-1).route = error.route ?? null;
        actions.at(-1).timeoutMs = error.timeoutMs ?? requestTimeoutMs;
        actions.at(-1).requiredReadback = "Read the issue status, assignee, and latest comments before retrying the patch.";
        console.log(JSON.stringify({
          apiBase,
          company: { id: company.id, name: company.name },
          mode: apply ? "apply" : "dry-run",
          candidateScanStatus: "ok",
          activeRunCount,
          liveRunCount: liveRuns.length,
          governorDecision,
          sourceControlPacket,
          projectPriority,
          candidateCount: candidates.length,
          candidates: candidates.slice(0, 5).map((issue) => ({
            identifier: issue.identifier,
            title: issue.title,
            project: issue.projectName,
            status: issue.status,
            priority: issue.priority,
            assigneeAgentId: issue.assigneeAgentId,
          })),
          actions,
        }, null, 2));
        process.exit(1);
      }
      if (isIssueAuthorizationBoundaryError(error)) {
        actions.at(-1).action = "skipped_cross_boundary_issue_mutation";
        actions.at(-1).route = error.route ?? null;
        actions.at(-1).statusCode = error.status ?? null;
        actions.at(-1).ownerAction = "Read back the existing owner-path issue and let its assigned owner perform the mutation; do not retry from this actor.";
        actions.at(-1).requiredReadback = "Confirm an open owner-path issue already exists for the target, or create one assigned to the owning role before rerunning apply.";
      } else {
        throw error;
      }
    }
    if (updated && isBacklogWake && updated.assigneeAgentId) {
      const freshWip = wipStateIgnoringCurrentRun(
        await fetchAgentWipState({ request, companyId: company.id }),
      );
      const wakeBlocker = agentWipBlockerFor(updated.assigneeAgentId, freshWip);
      if (wakeBlocker) {
        actions.at(-1).wakeSkipped = wakeBlocker;
        actions.at(-1).activeRunCount = freshWip.activeRunCount;
        actions.at(-1).liveRunCount = freshWip.liveRunCount;
        actions.at(-1).unknownActiveRunCount = freshWip.unknownActiveRunCount;
      } else {
        try {
          await request("POST", `/api/agents/${updated.assigneeAgentId}/heartbeat/invoke?companyId=${company.id}`, {
            reason: "issue_assigned",
            payload: {
              issueId: updated.id,
              taskId: updated.id,
              taskKey: updated.identifier,
              source: "softwarehouse-local-repair-lane-starter",
            },
            idempotencyKey: `softwarehouse-local-repair-lane-starter:${updated.id}:${updated.updatedAt ?? Date.now()}`,
          });
        } catch (error) {
          if (isRequestTimeoutError(error)) {
            actions.at(-1).wakeOutcome = "unknown";
            actions.at(-1).wakeRoute = error.route ?? null;
            actions.at(-1).wakeTimeoutMs = error.timeoutMs ?? requestTimeoutMs;
            actions.at(-1).requiredReadback = "Refresh live-runs/WIP for the assignee before retrying heartbeat invoke.";
          } else {
            throw error;
          }
        }
      }
    }
    if (updated) {
      actions.at(-1).updatedStatus = updated.status;
      actions.at(-1).assigneeAgentId = updated.assigneeAgentId ?? null;
      actions.at(-1).assigneeName = agentById.get(updated.assigneeAgentId)?.name ?? null;
    }
  }
}

console.log(JSON.stringify({
  apiBase,
  company: { id: company.id, name: company.name },
  mode: apply ? "apply" : "dry-run",
  candidateScanStatus: "ok",
  observedActiveRunCount,
  observedLiveRunCount,
  ignoredSelfRunCount,
  activeRunCount,
  liveRunCount: liveRuns.length,
  governorDecision,
  sourceControlPacket,
  operatingSourceControlClosureRequested,
  projectSourceControlClosureRequested,
  dedicatedSourceControlClosureRequested,
  projectPriority,
  candidateCount: candidates.length,
  candidates: candidates.slice(0, 5).map((issue) => ({
    identifier: issue.identifier,
    title: issue.title,
    project: issue.projectName,
    status: issue.status,
    priority: issue.priority,
    assigneeAgentId: issue.assigneeAgentId,
  })),
  actions,
}, null, 2));
