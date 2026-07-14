const controlledProjectAliases = new Map([
  ["Soar", ["Soar", "11 Innovation: Soar"]],
  ["Roost", ["Roost", "11 Innovation: Roost"]],
]);

function normalizeText(value) {
  return String(value ?? "").trim().toLowerCase();
}

export function controlledProjectNameFor(name) {
  const normalizedName = normalizeText(name);
  if (!normalizedName) return null;
  for (const [canonicalName, aliases] of controlledProjectAliases.entries()) {
    if ([canonicalName, ...aliases].some((alias) => normalizeText(alias) === normalizedName)) {
      return canonicalName;
    }
  }
  return null;
}

export function activeControlledProjectTracks(projects) {
  return [...new Set(
    projects
      .filter((project) => !project.archivedAt && project.status === "in_progress")
      .map((project) => controlledProjectNameFor(project.name))
      .filter(Boolean),
  )];
}

export function workerBacklogTrackForIssue(issue, projectById) {
  const titleMatch = String(issue?.title ?? "").match(/^\[(?<track>[^\]]+)\]/);
  const titleTrack = controlledProjectNameFor(titleMatch?.groups?.track);
  if (titleTrack) return titleTrack;
  return controlledProjectNameFor(projectById.get(issue?.projectId)?.name);
}

export function formatWeakTrackSummary(trackSummary) {
  return `${trackSummary.track}: planned worker=${trackSummary.plannedWorkerIssueCount}, planned supervisor=${trackSummary.plannedSupervisorIssueCount}, open=${trackSummary.openIssueCount}, blocked=${trackSummary.blockedIssueCount}`;
}

export function formatWorkerFanoutContract() {
  return [
    "Contract:",
    "- fan out per controlled track, not company-wide totals; evaluate Soar and Roost independently;",
    "- each worker-ready lane must end in ready, blocked, or needs-another-child;",
    "- each lane must name project, scope, affected files/entities, acceptance criteria, local proof, blocker policy, and handoff owner;",
    "- do not create agents silently; if new capacity is required, surface it as a separate governed issue.",
  ].join("\n");
}

export function summarizeWorkerBacklogTracks({
  issues,
  projects,
  agentById,
  isWorker,
  isSupervisor,
  terminalStatuses,
  plannedStatuses,
}) {
  const projectById = new Map(projects.map((project) => [project.id, project]));
  const activeTracks = activeControlledProjectTracks(projects);
  const trackSummaries = activeTracks.map((track) => ({
    track,
    openIssueCount: 0,
    plannedIssueCount: 0,
    plannedWorkerIssueCount: 0,
    plannedSupervisorIssueCount: 0,
    blockedIssueCount: 0,
    inProgressIssueCount: 0,
    inProgressWorkerIssueCount: 0,
  }));
  const summaryByTrack = new Map(trackSummaries.map((summary) => [summary.track, summary]));

  for (const issue of issues) {
    if (terminalStatuses.has(issue.status)) continue;
    const track = workerBacklogTrackForIssue(issue, projectById);
    if (!track || !summaryByTrack.has(track)) continue;
    const summary = summaryByTrack.get(track);
    summary.openIssueCount += 1;
    if (issue.status === "blocked") summary.blockedIssueCount += 1;
    if (issue.status === "in_progress") summary.inProgressIssueCount += 1;
    const assignee = agentById.get(issue.assigneeAgentId);
    if (issue.status === "in_progress" && isWorker(assignee)) {
      summary.inProgressWorkerIssueCount += 1;
    }
    if (!plannedStatuses.has(issue.status) || !issue.assigneeAgentId) continue;
    summary.plannedIssueCount += 1;
    if (isWorker(assignee)) summary.plannedWorkerIssueCount += 1;
    if (isSupervisor(assignee)) summary.plannedSupervisorIssueCount += 1;
  }

  const weakTracks = trackSummaries.filter((summary) => {
    if (summary.openIssueCount === 0) return false;
    if (
      summary.blockedIssueCount === 0
      && summary.openIssueCount === summary.inProgressWorkerIssueCount
    ) return false;
    if (summary.plannedWorkerIssueCount >= 3) return false;
    return summary.plannedSupervisorIssueCount > summary.plannedWorkerIssueCount
      || summary.blockedIssueCount > 0
      || summary.openIssueCount > summary.plannedWorkerIssueCount;
  });

  return {
    activeTracks,
    trackSummaries,
    weakTracks,
  };
}
