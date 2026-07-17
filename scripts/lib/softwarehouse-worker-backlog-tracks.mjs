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

export function formatTrackDispositionSummary(trackSummary) {
  return `${trackSummary.track}: ${trackSummary.disposition} (worker-ready=${trackSummary.workerReadyLaneCount}/${trackSummary.targetWorkerReadyLaneCount}, named blockers=${trackSummary.namedBlockedLaneCount}, missing=${trackSummary.missingWorkerReadyLaneCount})`;
}

export function formatWorkerFanoutContract() {
  return [
    "Contract:",
    "- fan out per controlled track, not company-wide totals; evaluate Soar and Roost independently;",
    "- each worker-ready lane must end in ready, blocked, or needs-another-child;",
    "- each lane must name project, scope, affected files/entities, acceptance criteria, local proof, blocker policy, and handoff owner;",
    "- bind every product lane to the matching active project and primary workspace; never run Soar or Roost work from the Softwarehouse workspace;",
    "- source-control closure outranks fan-out: do not create or resume repo-mutating lanes while any controlled repo is dirty;",
    "- one shared workspace permits at most one active repo writer; additional writers stay queued unless isolated worktrees and disjoint file sets are proven;",
    "- accounting, review, and governance lanes do not mutate code unless their issue names the exact module, behavior, and verification contract;",
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
  hasNamedBlocker = (issue) => Array.isArray(issue?.blockedBy) && issue.blockedBy.length > 0,
  targetWorkerReadyLaneCount = 3,
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
    namedBlockedLaneCount: 0,
    inProgressIssueCount: 0,
    inProgressWorkerIssueCount: 0,
    targetWorkerReadyLaneCount,
    workerReadyLaneCount: 0,
    missingWorkerReadyLaneCount: targetWorkerReadyLaneCount,
    disposition: "needs-another-child",
  }));
  const summaryByTrack = new Map(trackSummaries.map((summary) => [summary.track, summary]));

  for (const issue of issues) {
    if (terminalStatuses.has(issue.status)) continue;
    const track = workerBacklogTrackForIssue(issue, projectById);
    if (!track || !summaryByTrack.has(track)) continue;
    const summary = summaryByTrack.get(track);
    summary.openIssueCount += 1;
    if (issue.status === "blocked") {
      summary.blockedIssueCount += 1;
      if (hasNamedBlocker(issue)) summary.namedBlockedLaneCount += 1;
    }
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

  for (const summary of trackSummaries) {
    summary.workerReadyLaneCount = summary.plannedWorkerIssueCount;
    summary.missingWorkerReadyLaneCount = Math.max(0, targetWorkerReadyLaneCount - summary.workerReadyLaneCount);
    if (summary.missingWorkerReadyLaneCount === 0) {
      summary.disposition = "ready";
    } else if (
      summary.blockedIssueCount === 0
      && summary.openIssueCount > 0
      && summary.openIssueCount === summary.inProgressWorkerIssueCount
    ) {
      summary.disposition = "ready";
      summary.dispositionReason = "active_worker_owns_entire_track_backlog";
    } else if (summary.namedBlockedLaneCount >= summary.missingWorkerReadyLaneCount) {
      summary.disposition = "blocked";
    } else {
      summary.disposition = "needs-another-child";
    }
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
    trackDispositions: trackSummaries.map((summary) => ({
      track: summary.track,
      disposition: summary.disposition,
      dispositionReason: summary.dispositionReason ?? null,
      targetWorkerReadyLaneCount: summary.targetWorkerReadyLaneCount,
      workerReadyLaneCount: summary.workerReadyLaneCount,
      missingWorkerReadyLaneCount: summary.missingWorkerReadyLaneCount,
      namedBlockedLaneCount: summary.namedBlockedLaneCount,
      plannedWorkerIssueCount: summary.plannedWorkerIssueCount,
      plannedSupervisorIssueCount: summary.plannedSupervisorIssueCount,
      openIssueCount: summary.openIssueCount,
      blockedIssueCount: summary.blockedIssueCount,
    })),
    weakTracks,
  };
}
