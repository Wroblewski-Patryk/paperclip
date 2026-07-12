import {
  controlledProjectNameFor,
  workerBacklogTrackForIssue,
} from "./softwarehouse-worker-backlog-tracks.mjs";

const activeDispatchStatuses = new Set(["backlog", "todo", "in_progress", "in_review"]);
const defaultTerminalStatuses = new Set(["done", "cancelled"]);

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

export function activeProjectTruthTrackIssues({
  projectName,
  issues,
  projects,
  marker,
  terminalStatuses = defaultTerminalStatuses,
}) {
  const track = controlledProjectNameFor(projectName);
  if (!track) return [];
  const projectById = new Map((projects ?? []).map((project) => [project.id, project]));
  return (issues ?? [])
    .filter((issue) => !terminalStatuses.has(issue.status))
    .filter((issue) => activeDispatchStatuses.has(issue.status))
    .filter((issue) => isDispatcherProjectTruthIssue(issue, marker))
    .filter((issue) => workerBacklogTrackForIssue(issue, projectById) === track)
    .sort((left, right) =>
      identifierNumber(left.identifier) - identifierNumber(right.identifier)
      || String(left.createdAt ?? "").localeCompare(String(right.createdAt ?? ""))
    );
}
