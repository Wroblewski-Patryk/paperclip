import {
  controlledProjectNameFor,
  workerBacklogTrackForIssue,
} from "./softwarehouse-worker-backlog-tracks.mjs";

// Only runnable lanes contribute to dispatch depth or reusable issue selection.
// Backlog is inventory and blocked work needs an explicit unblock path; neither
// should suppress a fresh runnable gap.
const activeDispatchStatuses = new Set(["todo", "in_progress", "in_review"]);
const defaultTerminalStatuses = new Set(["done", "cancelled"]);
const admissionBlockingStates = new Set(["draining", "maintenance", "reopening"]);

export const persistentCompletionParentIdentifierByProject = Object.freeze({
  Soar: "LUC-27",
  Roost: "LUC-28",
  Featherly: "LUC-1899",
});

export const projectTruthRolloverParentMarker = "softwarehouse-project-truth-rollover-parent:v1";

function identifierNumber(identifier) {
  const match = String(identifier ?? "").match(/(\d+)$/);
  return match ? Number(match[1]) : Number.MAX_SAFE_INTEGER;
}

export function isDispatcherProjectTruthIssue(issue, marker) {
  return !issue?.hiddenAt
    && String(issue?.title ?? "").includes("[Project Truth]")
    && String(issue?.description ?? "").includes(marker);
}

export function parseProjectTruthSourceItemId(issue) {
  const match = String(issue?.description ?? "").match(/^- source item: (.+)$/im);
  return match?.[1]?.trim() ?? null;
}

export function isMonitorEnvironmentGap(gap) {
  return gap?.kind === "monitor_environment_error" || gap?.classification === "monitor_environment";
}

export function runtimeOwnerNamesForGap(gap, indexedOwnerCandidates = []) {
  if (isMonitorEnvironmentGap(gap)) {
    return [...indexedOwnerCandidates, "Runtime and Adapter Engineer", "Runtime & Adapter Engineer", "Engineering Delivery Lead"];
  }
  if (gap?.kind === "runtime_error" && gap?.severity === "critical") {
    return [...indexedOwnerCandidates, "Deployment & Reliability Engineer", "Deployment and Reliability Engineer", "Ops Release Lead", "CTO Architect"];
  }
  return null;
}

export function blockingAdmissionControl(controls) {
  return (controls ?? []).find((control) => admissionBlockingStates.has(control?.state)) ?? null;
}

export function persistentCompletionParentForProject({ projectName, issues }) {
  const identifier = persistentCompletionParentIdentifierByProject[projectName];
  if (!identifier) return null;
  return (issues ?? []).find((issue) =>
    issue?.identifier === identifier
    && !issue?.hiddenAt
    && !defaultTerminalStatuses.has(issue?.status)
  ) ?? null;
}

export function isReusableProjectTruthGapIssue(issue, completionParentId) {
  return Boolean(
    issue
    && completionParentId
    && issue.parentId === completionParentId
    && !issue.hiddenAt
    && activeDispatchStatuses.has(issue.status)
  );
}

export function selectReusableProjectTruthGapIssue(issues, completionParentId) {
  return (issues ?? [])
    .filter((issue) => isReusableProjectTruthGapIssue(issue, completionParentId))
    .sort((left, right) =>
      identifierNumber(left.identifier) - identifierNumber(right.identifier)
      || String(left.createdAt ?? "").localeCompare(String(right.createdAt ?? ""))
    )
    .at(0) ?? null;
}

export function isProblemAgentCapError(error) {
  return error?.status === 422
    && /maximum\s+4\s+distinct\s+agents/i.test(String(error?.body ?? error?.message ?? ""));
}

export function isParentChildCapError(error) {
  return error?.status === 422
    && /maximum\s+8\s+child\s+issues/i.test(String(error?.body ?? error?.message ?? ""));
}

export function isProjectTruthRolloverParent(issue, projectName) {
  return isProjectTruthRolloverContainer(issue)
    && String(issue?.description ?? "").includes(`project: ${projectName}`);
}

export function isProjectTruthRolloverContainer(issue) {
  return !issue?.hiddenAt
    && !defaultTerminalStatuses.has(issue?.status)
    && String(issue?.description ?? "").includes(projectTruthRolloverParentMarker);
}

export function selectProjectTruthCompletionParent({ projectName, issues, canonicalParents }) {
  const rollover = (issues ?? [])
    .filter((issue) => isProjectTruthRolloverParent(issue, projectName))
    .sort((left, right) =>
      String(right.createdAt ?? "").localeCompare(String(left.createdAt ?? ""))
      || identifierNumber(right.identifier) - identifierNumber(left.identifier)
    )
    .at(0);
  return rollover ?? persistentCompletionParentForProject({ projectName, issues: canonicalParents });
}

export function admissionHoldForDispatcherWake(error) {
  if (error?.status !== 409) return null;
  let data = null;
  try {
    data = typeof error?.body === "string" ? JSON.parse(error.body) : error?.body;
  } catch {
    return null;
  }
  const details = data?.details;
  if (data?.error !== "Work was not admitted"
    || !details
    || !["waiting_for_signal", "deferred"].includes(details.disposition)) {
    return null;
  }
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

export function selectProblemParticipantFallback({
  completionParent,
  agents,
  preferredAssigneeId = null,
}) {
  if (!completionParent?.id) return null;

  const participantIds = new Set();
  if (completionParent.assigneeAgentId) participantIds.add(completionParent.assigneeAgentId);

  for (const child of completionParent.blockedBy ?? []) {
    if (child?.assigneeAgentId) participantIds.add(child.assigneeAgentId);
  }

  if (preferredAssigneeId && participantIds.has(preferredAssigneeId)) {
    return (agents ?? []).find((agent) => agent.id === preferredAssigneeId && agent.status !== "paused") ?? null;
  }

  const rolePriority = new Map([
    ["engineer", 0],
    ["qa", 1],
    ["devops", 2],
    ["cto", 3],
    ["researcher", 4],
    ["designer", 5],
    ["pm", 6],
  ]);
  return (agents ?? [])
    .filter((agent) => participantIds.has(agent.id) && agent.status !== "paused")
    .sort((left, right) =>
      (rolePriority.get(left.role) ?? 50) - (rolePriority.get(right.role) ?? 50)
      || String(left.name ?? "").localeCompare(String(right.name ?? ""))
    )
    .at(0) ?? null;
}

export function activeProjectTruthTrackIssues({
  projectName,
  issues,
  projects,
  marker,
  completionParentId = null,
  terminalStatuses = defaultTerminalStatuses,
}) {
  const track = controlledProjectNameFor(projectName);
  if (!track) return [];
  const projectById = new Map((projects ?? []).map((project) => [project.id, project]));
  return (issues ?? [])
    .filter((issue) => !terminalStatuses.has(issue.status))
    .filter((issue) => activeDispatchStatuses.has(issue.status))
    .filter((issue) => isDispatcherProjectTruthIssue(issue, marker))
    .filter((issue) => !completionParentId || issue.parentId === completionParentId)
    .filter((issue) => workerBacklogTrackForIssue(issue, projectById) === track)
    .sort((left, right) =>
      identifierNumber(left.identifier) - identifierNumber(right.identifier)
      || String(left.createdAt ?? "").localeCompare(String(right.createdAt ?? ""))
    );
}
