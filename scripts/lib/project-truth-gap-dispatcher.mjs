import {
  controlledProjectNameFor,
  workerBacklogTrackForIssue,
} from "./softwarehouse-worker-backlog-tracks.mjs";

const activeDispatchStatuses = new Set(["backlog", "todo", "in_progress", "in_review", "blocked"]);
const defaultTerminalStatuses = new Set(["done", "cancelled"]);
const admissionBlockingStates = new Set(["draining", "maintenance", "reopening"]);

export const persistentCompletionParentIdentifierByProject = Object.freeze({
  Soar: "LUC-27",
  Roost: "LUC-28",
  Featherly: "LUC-1899",
});

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
