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

function projectTruthSourceItemId(issue) {
  const match = String(issue?.description ?? "").match(/(?:\u0007)?(api_endpoint|pi_endpoint|route|component):[A-Za-z0-9_./:[\]-]+/i);
  if (!match) return null;
  return match[0]
    .replace(/^\u0007/i, "")
    .replace(/^pi_endpoint:/i, "api_endpoint:");
}

export function filterSupersededProjectTruthLanes({ issues, projects, currentGapIdsByTrack }) {
  const projectById = new Map(projects.map((project) => [project.id, project]));
  return issues.filter((issue) => {
    if (!/\[Project Truth\]\[App Completion\]/i.test(String(issue?.title ?? ""))) return true;
    const track = workerBacklogTrackForIssue(issue, projectById);
    const currentGapIds = track ? currentGapIdsByTrack.get(track) : null;
    if (!(currentGapIds instanceof Set)) return true;
    if (currentGapIds.size === 0) return false;
    const sourceItemId = projectTruthSourceItemId(issue);
    return sourceItemId ? currentGapIds.has(sourceItemId) : true;
  });
}

export function formatWeakTrackSummary(trackSummary) {
  return `${trackSummary.track}: runnable worker=${trackSummary.runnableWorkerIssueCount}, planned worker=${trackSummary.plannedWorkerIssueCount}, planned supervisor=${trackSummary.plannedSupervisorIssueCount}, open=${trackSummary.openIssueCount}, blocked=${trackSummary.blockedIssueCount}`;
}

export function formatTrackDispositionSummary(trackSummary) {
  return `${trackSummary.track}: ${trackSummary.disposition} (runnable=${trackSummary.runnableWorkerIssueCount}/${trackSummary.targetRunnableWorkerLaneCount}, planned=${trackSummary.plannedWorkerIssueCount}/${trackSummary.targetPlannedWorkerLaneCount}, named blockers=${trackSummary.namedBlockedLaneCount})`;
}

function laneReferenceForIssue(issue, assignee) {
  return {
    id: issue.id ?? null,
    identifier: issue.identifier ?? null,
    title: issue.title ?? null,
    status: issue.status ?? null,
    assigneeAgentId: issue.assigneeAgentId ?? null,
    assigneeName: assignee?.name ?? null,
    priority: issue.priority ?? null,
    updatedAt: issue.updatedAt ?? null,
  };
}

export function formatWorkerFanoutContract() {
  return [
    "Contract:",
    "- fan out per controlled track, not company-wide totals; evaluate Soar and Roost independently;",
    "- maintain a rolling queue per active track: at least one runnable worker `todo` plus three planned worker lanes total; `backlog` is reserve inventory and never counts as runnable;",
    "- promote an existing backlog lane before creating a duplicate, and replenish the reserve after each completion or durable blocker;",
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
  runnableStatuses = new Set(["todo"]),
  hasNamedBlocker = (issue) => Array.isArray(issue?.blockedBy) && issue.blockedBy.length > 0,
  targetPlannedWorkerLaneCount = 3,
  targetRunnableWorkerLaneCount = 1,
}) {
  const projectById = new Map(projects.map((project) => [project.id, project]));
  const activeTracks = activeControlledProjectTracks(projects);
  const trackSummaries = activeTracks.map((track) => ({
    track,
    openIssueCount: 0,
    plannedIssueCount: 0,
    plannedWorkerIssueCount: 0,
    plannedSupervisorIssueCount: 0,
    runnableWorkerIssueCount: 0,
    blockedIssueCount: 0,
    namedBlockedLaneCount: 0,
    inProgressIssueCount: 0,
    inProgressWorkerIssueCount: 0,
    runnableWorkerIssues: [],
    plannedWorkerIssues: [],
    promotableBacklogWorkerIssues: [],
    targetPlannedWorkerLaneCount,
    targetRunnableWorkerLaneCount,
    // Compatibility aliases for existing report consumers. "Ready" now means
    // Paperclip-runnable (`todo`), never merely planned (`backlog`).
    targetWorkerReadyLaneCount: targetRunnableWorkerLaneCount,
    workerReadyLaneCount: 0,
    missingWorkerReadyLaneCount: targetRunnableWorkerLaneCount,
    missingPlannedWorkerLaneCount: targetPlannedWorkerLaneCount,
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
    if (isWorker(assignee)) {
      summary.plannedWorkerIssueCount += 1;
      const lane = laneReferenceForIssue(issue, assignee);
      summary.plannedWorkerIssues.push(lane);
      if (runnableStatuses.has(issue.status)) summary.runnableWorkerIssueCount += 1;
      if (runnableStatuses.has(issue.status)) summary.runnableWorkerIssues.push(lane);
      if (issue.status === "backlog") summary.promotableBacklogWorkerIssues.push(lane);
    }
    if (isSupervisor(assignee)) summary.plannedSupervisorIssueCount += 1;
  }

  for (const summary of trackSummaries) {
    summary.workerReadyLaneCount = summary.runnableWorkerIssueCount;
    summary.missingWorkerReadyLaneCount = Math.max(0, targetRunnableWorkerLaneCount - summary.runnableWorkerIssueCount);
    summary.missingPlannedWorkerLaneCount = Math.max(0, targetPlannedWorkerLaneCount - summary.plannedWorkerIssueCount);
    if (summary.missingWorkerReadyLaneCount === 0 && summary.missingPlannedWorkerLaneCount === 0) {
      summary.disposition = "ready";
    } else if (
      summary.blockedIssueCount === 0
      && summary.openIssueCount > 0
      && summary.openIssueCount === summary.inProgressWorkerIssueCount
    ) {
      summary.disposition = "ready";
      summary.dispositionReason = "active_worker_owns_entire_track_backlog";
    } else if (
      Math.max(summary.missingWorkerReadyLaneCount, summary.missingPlannedWorkerLaneCount) > 0
      && summary.namedBlockedLaneCount >= Math.max(
        summary.missingWorkerReadyLaneCount,
        summary.missingPlannedWorkerLaneCount,
      )
    ) {
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
    return summary.disposition === "needs-another-child";
  });

  return {
    activeTracks,
    trackSummaries,
    trackDispositions: trackSummaries.map((summary) => ({
      track: summary.track,
      disposition: summary.disposition,
      dispositionReason: summary.dispositionReason ?? null,
      targetPlannedWorkerLaneCount: summary.targetPlannedWorkerLaneCount,
      targetRunnableWorkerLaneCount: summary.targetRunnableWorkerLaneCount,
      targetWorkerReadyLaneCount: summary.targetWorkerReadyLaneCount,
      workerReadyLaneCount: summary.workerReadyLaneCount,
      missingWorkerReadyLaneCount: summary.missingWorkerReadyLaneCount,
      missingPlannedWorkerLaneCount: summary.missingPlannedWorkerLaneCount,
      namedBlockedLaneCount: summary.namedBlockedLaneCount,
      runnableWorkerIssueCount: summary.runnableWorkerIssueCount,
      plannedWorkerIssueCount: summary.plannedWorkerIssueCount,
      plannedSupervisorIssueCount: summary.plannedSupervisorIssueCount,
      openIssueCount: summary.openIssueCount,
      blockedIssueCount: summary.blockedIssueCount,
      runnableWorkerIssues: summary.runnableWorkerIssues,
      plannedWorkerIssues: summary.plannedWorkerIssues,
      promotableBacklogWorkerIssues: summary.promotableBacklogWorkerIssues,
    })),
    weakTracks,
  };
}
