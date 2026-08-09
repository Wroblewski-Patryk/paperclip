import {
  buildOpenIssueTitles,
  classifyLearningGapFromIssues,
  collectTransitiveBlockerRelatedIssues,
  findInReviewIssuesWithoutStructuredDecisionPath,
  findActiveRunCoveredOpsReleaseBlockerChain,
  findBoardAuthorizationWaitChain,
  findCompletedBlockerDelegatedRecoveryChain,
  findCompliantFailedReleasePermitRecoveryChain,
  findCompliantOpsReleaseBlockerChain,
  findControlPlaneWriteBoundaryRecoveryChain,
  findCoveredProtectedCapabilityCredentialChain,
  findPausedOwnerDelegatedRoutingRepairChain,
  findProjectMutationSourceControlGuardChain,
  findProtectedCoolifyVpsBindingWaitChain,
  findQaToolingProofBlockedChain,
  findStaleNonReleaseRootProtectedBacklogChain,
  findSuppressibleV1LearningDuplicate,
  findSuppressibleV2ReviewDecisionPathDuplicate,
  findSuppressibleV2WorkerFanoutDuplicate,
  resolveLearningOwner,
} from "./lib/softwarehouse-learning-loop.mjs";
import {
  formatWeakTrackSummary,
  formatWorkerFanoutContract,
  summarizeWorkerBacklogTracks,
} from "./lib/softwarehouse-worker-backlog-tracks.mjs";
import { loadTrackTruthByTrack } from "./lib/softwarehouse-track-truth.mjs";
import {
  approvalRows,
  interactionRows,
} from "./lib/softwarehouse-routine-gates.mjs";
import {
  findByOrganizationalDedupeKey,
  isUuid,
  normalizeApiCollection,
  prepareOrganizationalPayload,
} from "./lib/organizational-memory.mjs";

const apiBase = process.env.PAPERCLIP_API_URL ?? "http://127.0.0.1:3200";
const companyName = "LuckySparrow";
const companyId = process.env.PAPERCLIP_COMPANY_ID ?? null;
const apply = process.argv.includes("--apply");
const requestTimeoutMs = Number(process.env.SOFTWAREHOUSE_LEARNING_REQUEST_TIMEOUT_MS ?? 30_000);
const minRepeatedBlocked = Number(process.env.SOFTWAREHOUSE_LEARNING_MIN_REPEATED_BLOCKED ?? 3);
const maxBlockedGroups = Number(process.env.SOFTWAREHOUSE_LEARNING_MAX_BLOCKED_GROUPS ?? 2);
const maxEnrichmentSourceIssues = Number(process.env.SOFTWAREHOUSE_LEARNING_MAX_ENRICHMENT_SOURCE_ISSUES ?? 25);
const maxLearningObservationBackfill = Number(process.env.SOFTWAREHOUSE_LEARNING_OBSERVATION_BACKFILL_LIMIT ?? 12);
const terminalStatuses = new Set(["done", "cancelled"]);
const activeIssueStatuses = ["backlog", "todo", "in_progress", "in_review", "blocked"];
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
  if (!response.ok) throw new Error(`${method} ${route} failed with ${response.status}: ${text}`);
  return data;
}

function isRequestTimeoutError(error) {
  return error instanceof Error && error.name === "TimeoutError";
}

function byName(items, name) {
  return items.find((item) => item.name === name);
}

function rootBlockerKey(issue) {
  if (issue.terminalBlockers?.[0]?.identifier) return issue.terminalBlockers[0].identifier;
  if (issue.blockedBy?.[0]?.identifier) return issue.blockedBy[0].identifier;
  if (issue.blockedBy?.[0]?.terminalBlockers?.[0]?.identifier) {
    return issue.blockedBy[0].terminalBlockers[0].identifier;
  }
  if (issue.blockerAttention?.sampleBlockerIdentifier) return issue.blockerAttention.sampleBlockerIdentifier;
  return issue.identifier;
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

async function ensureLabel(companyId, labelsByName, name, color) {
  const existing = labelsByName.get(name);
  if (existing) return existing;
  const created = await request("POST", `/api/companies/${companyId}/labels`, { name, color });
  labelsByName.set(name, created);
  return created;
}

async function resolveCompany() {
  if (companyId) return { id: companyId, source: "PAPERCLIP_COMPANY_ID" };

  const companies = await request("GET", "/api/companies");
  const company = companies.find((candidate) => candidate.name === companyName);
  if (!company) throw new Error(`Company not found: ${companyName}`);
  return { id: company.id, source: "company_name" };
}

const company = await resolveCompany();

let agents;
let projects;
let initialIssues;
let labels;
let goals;
let liveRuns;
try {
  [agents, projects, initialIssues, labels, goals, liveRuns] = await Promise.all([
    request("GET", `/api/companies/${company.id}/agents`),
    request("GET", `/api/companies/${company.id}/projects`),
    request("GET", `/api/companies/${company.id}/issues?status=${activeIssueStatuses.join(",")}&limit=2000`),
    request("GET", `/api/companies/${company.id}/labels`),
    request("GET", `/api/companies/${company.id}/goals`),
    request("GET", `/api/companies/${company.id}/live-runs`),
  ]);
} catch (error) {
  if (!isRequestTimeoutError(error)) throw error;
  console.log(JSON.stringify({
    apiBase,
    company: { id: company.id, name: company.name ?? companyName },
    mode: apply ? "apply" : "dry-run",
    requestTimeoutMs,
    candidateScanStatus: "timed_out",
    minRepeatedBlocked,
    blockedGroupCount: null,
    eligibleBlockedGroupCount: null,
    processedBlockedGroupCount: 0,
    skippedBlockedGroupCount: 0,
    actionCount: 1,
    actions: [{
      action: "skip_learning_loop_candidate_scan_timeout",
      status: "degraded",
      reason: "candidate_scan_timeout",
      ownerAction: "Restore local Paperclip API issue-list responsiveness, then rerun node scripts/run-softwarehouse-learning-loop.mjs --apply or node scripts/run-softwarehouse-control-tick.mjs.",
    }],
  }, null, 2));
  process.exit(0);
}

let issues = initialIssues;
const targetedLearningIssues = await Promise.all([
  request("GET", `/api/companies/${company.id}/issues?q=${encodeURIComponent("[Softwarehouse][Learning]")}&limit=500`),
  request("GET", `/api/companies/${company.id}/issues?q=${encodeURIComponent("[Softwarehouse][Learning] Worker queue fan-out capability gap")}&limit=50`),
  request("GET", `/api/companies/${company.id}/issues?q=${encodeURIComponent("[Softwarehouse][Learning] In-review decision path capability gap")}&limit=50`),
]);
const issueById = new Map(issues.map((issue) => [issue.id, issue]));
for (const issue of targetedLearningIssues.flat()) issueById.set(issue.id, issue);
issues = [...issueById.values()];

const activeAgents = agents.filter((agent) => agent.status !== "terminated");
const agentByName = new Map(activeAgents.map((agent) => [agent.name, agent]));
const defaultLearningOwner = resolveLearningOwner(activeAgents, "Portfolio Director", [
  "Engineering Delivery Lead",
  "CTO Architect",
  "Chief Operating Officer",
]);
const projectByName = new Map(projects.map((project) => [project.name, project]));
const operating = byName(projects, "Softwarehouse Operating System")
  ?? byName(projects, "Paperclip")
  ?? byName(projects, "Softwarehouse")
  ?? projects.find((project) => !project.archivedAt)
  ?? null;
if (!operating) throw new Error("No active project found for Softwarehouse learning issues.");
const goal = goals.find((candidate) => candidate.title === "Softwarehouse operating cadence") ?? null;

const labelsByName = new Map(labels.map((label) => [label.name, label]));
for (const [name, color] of [
  ["learning", "#65a30d"],
  ["capability-gap", "#ca8a04"],
  ["softwarehouse", "#334155"],
]) {
  await ensureLabel(company.id, labelsByName, name, color);
}
const labelIds = ["learning", "capability-gap", "softwarehouse"]
  .map((name) => labelsByName.get(name)?.id)
  .filter(Boolean);

const openIssues = issues.filter((issue) => !terminalStatuses.has(issue.status));
const activeProjectIds = new Set(projects.filter((project) => !project.archivedAt).map((project) => project.id));
const agentById = new Map(activeAgents.map((agent) => [agent.id, agent]));
const plannedIssues = openIssues.filter((issue) =>
  activeProjectIds.has(issue.projectId)
  && plannedStatuses.has(issue.status)
  && issue.assigneeAgentId
  && issue.originKind !== "routine_execution"
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
  trackTruthByTrack: await loadTrackTruthByTrack(),
});
const liveIssueIds = new Set((liveRuns ?? []).map((run) => run.issueId).filter(Boolean));
const weakTrackLines = trackBacklog.weakTracks.map(formatWeakTrackSummary);
const blockedGroups = new Map();
for (const issue of openIssues.filter((issue) => issue.status === "blocked")) {
  const key = rootBlockerKey(issue);
  if (!blockedGroups.has(key)) blockedGroups.set(key, []);
  blockedGroups.get(key).push(issue);
}
const eligibleBlockedGroups = [...blockedGroups.entries()]
  .filter(([, groupedIssues]) => groupedIssues.length >= minRepeatedBlocked)
  .sort(([leftKey, leftIssues], [rightKey, rightIssues]) =>
    rightIssues.length - leftIssues.length || leftKey.localeCompare(rightKey)
  );
const processedBlockedGroups = maxBlockedGroups > 0
  ? eligibleBlockedGroups.slice(0, maxBlockedGroups)
  : eligibleBlockedGroups;
const skippedBlockedGroupCount = eligibleBlockedGroups.length - processedBlockedGroups.length;

const existingLearningTitles = buildOpenIssueTitles(issues, terminalStatuses);
const existingLearningIssueByTitle = new Map(
  openIssues
    .filter((issue) => typeof issue.title === "string" && issue.title.length > 0)
    .map((issue) => [issue.title, issue]),
);
const actions = [];
let learningObservations = [];
let learningObservationReadAvailable = true;
try {
  learningObservations = normalizeApiCollection(await request(
    "GET",
    `/api/companies/${company.id}/organizational-observations?kind=learning&limit=500`,
  ));
} catch (error) {
  learningObservationReadAvailable = false;
  actions.push({
    action: "skip_learning_observation_sync",
    status: "degraded",
    reason: "organizational_observation_read_failed",
    error: error instanceof Error ? error.message : String(error),
  });
}

async function ensureLearningObservation(issue, input, action = {}) {
  if (!issue?.id || !learningObservationReadAvailable) return null;
  const dedupeKey = `softwarehouse-learning-issue:${issue.id}`;
  const existing = findByOrganizationalDedupeKey(
    learningObservations,
    dedupeKey,
    "provenance",
  );
  if (existing) {
    const ownerAgentId = isUuid(issue.assigneeAgentId) ? issue.assigneeAgentId : null;
    if (ownerAgentId && !existing.agentId) {
      if (!apply) {
        actions.push({
          ...action,
          action: "would_assign_learning_observation_owner",
          issue: issue.identifier ?? issue.id,
          observationId: existing.id,
          agentId: ownerAgentId,
          title: input.title ?? issue.title,
        });
        return existing;
      }
      const assigned = await request(
        "PATCH",
        `/api/organizational-observations/${existing.id}`,
        { agentId: ownerAgentId },
      );
      const observationIndex = learningObservations.findIndex((observation) => observation.id === existing.id);
      if (observationIndex >= 0) learningObservations[observationIndex] = assigned;
      actions.push({
        ...action,
        action: "assigned_learning_observation_owner",
        issue: issue.identifier ?? issue.id,
        observationId: assigned.id,
        agentId: ownerAgentId,
        title: input.title ?? issue.title,
      });
      return assigned;
    }
    actions.push({
      ...action,
      action: "noop_existing_learning_observation",
      issue: issue.identifier ?? issue.id,
      observationId: existing.id,
      title: input.title ?? issue.title,
    });
    return existing;
  }

  const payload = prepareOrganizationalPayload({
    mode: "observe",
    dedupeKey,
    payload: {
      kind: "learning",
      title: input.title ?? issue.title,
      summary: input.description ?? issue.description ?? "Softwarehouse learning signal recorded from an issue.",
      sourceClass: "softwarehouse_learning_loop",
      confidence: 80,
    },
    context: {
      issue,
      agentId: isUuid(issue.assigneeAgentId) ? issue.assigneeAgentId : null,
    },
    now: issue.updatedAt ?? issue.createdAt ?? new Date().toISOString(),
  });
  if (!apply) {
    actions.push({
      ...action,
      action: "would_create_learning_observation",
      issue: issue.identifier ?? issue.id,
      title: payload.title,
    });
    return null;
  }

  const created = await request(
    "POST",
    `/api/companies/${company.id}/organizational-observations`,
    payload,
  );
  learningObservations.push(created);
  actions.push({
    ...action,
    action: "created_learning_observation",
    issue: issue.identifier ?? issue.id,
    observationId: created.id,
    title: created.title,
  });
  return created;
}

async function createLearningIssue(input, action) {
  if (existingLearningTitles.has(input.title)) {
    actions.push({
      ...action,
      action: "noop_existing_learning_issue",
      title: input.title,
    });
    const existingIssue = existingLearningIssueByTitle.get(input.title) ?? null;
    if (existingIssue) await ensureLearningObservation(existingIssue, input, { source: "existing_learning_issue" });
    return existingIssue;
  }
  const executableWithoutOwner = ["todo", "in_progress"].includes(input.status) && !isUuid(input.assigneeAgentId);
  const normalizedInput = executableWithoutOwner
    ? defaultLearningOwner
      ? { ...input, assigneeAgentId: defaultLearningOwner.id }
      : { ...input, status: "backlog", assigneeAgentId: null }
    : input;
  actions.push({
    ...action,
    action: apply ? action.action : action.action.replace(/^created_/, "would_create_"),
    title: input.title,
    ownerFallback: executableWithoutOwner
      ? defaultLearningOwner?.name ?? "backlog_pending_native_routing"
      : null,
  });
  if (!apply) return null;
  const created = await request("POST", `/api/companies/${company.id}/issues`, normalizedInput);
  actions.at(-1).identifier = created.identifier;
  actions.at(-1).status = created.status;
  existingLearningTitles.add(input.title);
  existingLearningIssueByTitle.set(input.title, created);
  await ensureLearningObservation(created, input, { source: "new_learning_issue" });
  return created;
}

async function searchIssues(query) {
  return request("GET", `/api/companies/${company.id}/issues?q=${encodeURIComponent(query)}&limit=50`)
    .then((result) => result?.value ?? result ?? [])
    .catch(() => []);
}

async function getIssue(key) {
  return request("GET", `/api/issues/${encodeURIComponent(key)}`)
    .catch(() => null);
}

if (learningObservationReadAvailable && maxLearningObservationBackfill > 0) {
  const candidatesById = new Map();
  for (const issue of targetedLearningIssues.flat()) {
    if (!issue?.id || !/softwarehouse-learning-loop:v[12]/i.test(issue.description ?? "")) continue;
    candidatesById.set(issue.id, issue);
  }
  const candidates = [...candidatesById.values()]
    .sort((left, right) => String(right.updatedAt ?? right.createdAt ?? "").localeCompare(
      String(left.updatedAt ?? left.createdAt ?? ""),
    ))
    .slice(0, maxLearningObservationBackfill);
  for (const issue of candidates) {
    await ensureLearningObservation(issue, issue, { source: "bounded_recent_learning_backfill" });
  }
}

function blockerRefs(issue) {
  return [
    ...(issue?.blockedBy ?? []),
    ...(issue?.terminalBlockers ?? []),
    ...(issue?.blockedBy ?? []).flatMap((blocker) => blocker.terminalBlockers ?? []),
  ];
}

async function enrichIssuesForBlockerChain(baseIssues, rootKey, sourceIssues) {
  const byId = new Map(baseIssues.map((issue) => [issue.id, issue]));
  const byIdentifier = new Map(baseIssues.filter((issue) => issue.identifier).map((issue) => [issue.identifier, issue]));
  const addIssue = (issue) => {
    if (!issue?.id) return;
    byId.set(issue.id, issue);
    if (issue.identifier) byIdentifier.set(issue.identifier, issue);
  };
  const pending = [
    rootKey,
    ...(sourceIssues ?? []).flatMap((issue) => [issue.identifier, issue.id]),
    ...(sourceIssues ?? []).flatMap((issue) => blockerRefs(issue).flatMap((blocker) => [blocker.identifier, blocker.id])),
  ].filter(Boolean);
  const seen = new Set();
  while (pending.length > 0) {
    const key = pending.shift();
    if (!key || seen.has(key)) continue;
    seen.add(key);
    let issue = byIdentifier.get(key) ?? byId.get(key);
    const needsExactIssue = !issue
      || !Array.isArray(issue.blockedBy)
      || (issue.status === "blocked" && blockerRefs(issue).length === 0);
    if (needsExactIssue) {
      issue = await getIssue(key);
      if (!issue) {
        const matches = await searchIssues(key);
        issue = matches.find((candidate) => candidate.identifier === key || candidate.id === key) ?? null;
      }
      if (issue) addIssue(issue);
    }
    for (const blocker of blockerRefs(issue)) {
      if (blocker.identifier) pending.push(blocker.identifier);
      if (blocker.id) pending.push(blocker.id);
    }
  }
  return [...byId.values()];
}

for (const [key, groupedIssues] of processedBlockedGroups) {
  const sourceRoot = issues.find((issue) => issue.identifier === key || issue.id === key);
  const classificationIssues = sourceRoot && !groupedIssues.some((issue) => issue.id === sourceRoot.id)
    ? [sourceRoot, ...groupedIssues]
    : groupedIssues;
  const gap = classifyLearningGapFromIssues(key, classificationIssues);
  const owner = resolveLearningOwner(activeAgents, gap.owner, ["Portfolio Director"]);
  const sourceProjects = [...new Set(groupedIssues.map((issue) => projectByName.get(issue.projectId)?.name ?? "unknown"))];
  const sourceList = groupedIssues
    .slice(0, 12)
    .map((issue) => `- ${issue.identifier}: ${issue.title} (${projectByName.get(issue.projectId)?.name ?? "unknown"})`)
    .join("\n");
  const input = {
    title: gap.title,
    description: [
      "softwarehouse-learning-loop:v1",
      "",
      "Observed repeated blocker pattern. This is not implementation work; it is an organizational learning task.",
      "",
      `Root/blocker key: ${key}`,
      `Area: ${gap.area}`,
      `Smallest responsibility boundary: ${gap.boundary}`,
      `Observed issue count: ${groupedIssues.length}`,
      `Projects: ${sourceProjects.join(", ")}`,
      "",
      "Observed issues:",
      sourceList,
      "",
      "Required output:",
      "- state the failure signal in one sentence;",
      "- decide whether this needs a role instruction update, routine update, guardrail command, project template feedback, or no change;",
      "- create at most one follow-up process/instruction issue if needed;",
      "- record the retirement/merge-back condition so learning does not become permanent noise.",
      "",
      "Do not modify application code, push, deploy, restart, mutate production, or access secrets from this issue.",
    ].join("\n"),
    status: "todo",
    priority: groupedIssues.some((issue) => issue.priority === "critical") ? "critical" : "high",
    projectId: operating.id,
    goalId: goal?.id ?? null,
    assigneeAgentId: owner?.id ?? null,
    requestDepth: 2,
    labelIds,
    acceptanceCriteria: [
      "The repeated failure signal is named with evidence.",
      "The smallest useful process/instruction/template change is proposed or explicitly rejected.",
      "No application production mutation occurs.",
      "The learning has a retirement or merge-back condition.",
    ],
  };

  const duplicate = findSuppressibleV1LearningDuplicate({
    issues,
    terminalStatuses,
    rootBlocker: key,
    area: gap.area,
    boundary: gap.boundary,
    sourceIssues: groupedIssues,
  });
  if (duplicate) {
    actions.push({
      action: "suppressed_duplicate_learning_issue",
      rootBlocker: key,
      assignee: owner?.name ?? null,
      observedIssueCount: groupedIssues.length,
      title: input.title,
      duplicateOf: duplicate.identifier ?? duplicate.id ?? null,
      duplicateStatus: duplicate.status,
    });
    continue;
  }

  let enrichedIssues = issues;
  let enrichedGroupedIssues = groupedIssues;
  let relatedIssues = [];
  const blockerAttentionGroup = groupedIssues.some((issue) =>
    issue?.blockerAttention?.sampleBlockerIdentifier === key
  );
  if (
    (gap.area === "ops-release" || gap.area === "security-credentials")
    && (groupedIssues.length <= maxEnrichmentSourceIssues || blockerAttentionGroup)
  ) {
    enrichedIssues = await enrichIssuesForBlockerChain(issues, key, groupedIssues);
    const enrichedIssueById = new Map(enrichedIssues.map((issue) => [issue.id, issue]));
    const enrichedIssueByIdentifier = new Map(enrichedIssues.filter((issue) => issue.identifier).map((issue) => [issue.identifier, issue]));
    enrichedGroupedIssues = groupedIssues.map((issue) =>
      enrichedIssueById.get(issue.id) ?? enrichedIssueByIdentifier.get(issue.identifier) ?? issue
    );
    relatedIssues = collectTransitiveBlockerRelatedIssues({
      issues: enrichedIssues,
      rootKey: key,
      sourceIssues: enrichedGroupedIssues,
    });
  }
  const activeRunCoveredOpsReleaseRoot = gap.area === "ops-release"
    ? findActiveRunCoveredOpsReleaseBlockerChain({
        rootBlocker: key,
        sourceIssues: enrichedGroupedIssues,
        relatedIssues,
      })
    : null;
  if (activeRunCoveredOpsReleaseRoot) {
    actions.push({
      action: "suppressed_active_run_covered_ops_release_blocker_chain",
      rootBlocker: key,
      assignee: owner?.name ?? null,
      observedIssueCount: groupedIssues.length,
      title: input.title,
      rootStatus: activeRunCoveredOpsReleaseRoot.status,
      rootExecutionRunId: activeRunCoveredOpsReleaseRoot.executionRunId ?? null,
      rootCheckoutRunId: activeRunCoveredOpsReleaseRoot.checkoutRunId ?? null,
    });
    continue;
  }
  const completedBlockerRecoverySearchIssues = gap.area === "ops-release"
    ? await searchIssues(key)
    : [];
  const completedBlockerRecovery = gap.area === "ops-release"
    ? findCompletedBlockerDelegatedRecoveryChain({
        rootBlocker: key,
        sourceIssues: enrichedGroupedIssues,
        relatedIssues,
        allIssues: [...enrichedIssues, ...completedBlockerRecoverySearchIssues],
        terminalStatuses,
      })
    : null;
  if (completedBlockerRecovery) {
    actions.push({
      action: "suppressed_completed_blocker_delegated_recovery_chain",
      rootBlocker: key,
      assignee: owner?.name ?? null,
      observedIssueCount: groupedIssues.length,
      title: input.title,
      rootStatus: completedBlockerRecovery.rootIssue.status,
      completedBlockers: completedBlockerRecovery.completedBlockers
        .map((issue) => issue.identifier ?? issue.id ?? null)
        .filter(Boolean),
      delegatedRecoveryIssue: completedBlockerRecovery.recoveryIssue.identifier
        ?? completedBlockerRecovery.recoveryIssue.id
        ?? null,
      delegatedRecoveryStatus: completedBlockerRecovery.recoveryIssue.status,
    });
    continue;
  }
  const pausedOwnerRoutingRepair = gap.area === "ops-release"
    ? findPausedOwnerDelegatedRoutingRepairChain({
        rootBlocker: key,
        sourceIssues: enrichedGroupedIssues,
        relatedIssues,
        allIssues: [...enrichedIssues, ...completedBlockerRecoverySearchIssues],
        terminalStatuses,
      })
    : null;
  if (pausedOwnerRoutingRepair) {
    actions.push({
      action: "suppressed_paused_owner_delegated_routing_repair",
      rootBlocker: key,
      assignee: owner?.name ?? null,
      observedIssueCount: groupedIssues.length,
      title: input.title,
      rootStatus: pausedOwnerRoutingRepair.rootIssue.status,
      delegatedRepairIssue: pausedOwnerRoutingRepair.repairIssue.identifier
        ?? pausedOwnerRoutingRepair.repairIssue.id
        ?? null,
      delegatedRepairStatus: pausedOwnerRoutingRepair.repairIssue.status,
    });
    continue;
  }
  const compliantOpsReleaseRoot = gap.area === "ops-release"
    ? findCompliantOpsReleaseBlockerChain({
        rootBlocker: key,
        sourceIssues: enrichedGroupedIssues,
        relatedIssues,
        terminalStatuses,
      })
    : null;
  if (compliantOpsReleaseRoot) {
    actions.push({
      action: "suppressed_compliant_ops_release_blocker_chain",
      rootBlocker: key,
      assignee: owner?.name ?? null,
      observedIssueCount: groupedIssues.length,
      title: input.title,
      rootStatus: compliantOpsReleaseRoot.status,
    });
    continue;
  }
  const compliantFailedReleasePermitRoot = gap.area === "ops-release"
    ? findCompliantFailedReleasePermitRecoveryChain({
        rootBlocker: key,
        sourceIssues: enrichedGroupedIssues,
        relatedIssues,
        terminalStatuses,
      })
    : null;
  if (compliantFailedReleasePermitRoot) {
    actions.push({
      action: "suppressed_compliant_failed_release_permit_recovery_chain",
      rootBlocker: key,
      assignee: owner?.name ?? null,
      observedIssueCount: groupedIssues.length,
      title: input.title,
      rootStatus: compliantFailedReleasePermitRoot.status,
    });
    continue;
  }
  const staleNonReleaseRootProtectedBacklog = gap.area === "ops-release"
    ? findStaleNonReleaseRootProtectedBacklogChain({
        rootBlocker: key,
        sourceIssues: enrichedGroupedIssues,
        relatedIssues,
        terminalStatuses,
      })
    : null;
  if (staleNonReleaseRootProtectedBacklog) {
    actions.push({
      action: "suppressed_non_release_root_protected_backlog_chain",
      rootBlocker: key,
      assignee: owner?.name ?? null,
      observedIssueCount: groupedIssues.length,
      title: input.title,
      protectedBacklogRoot: staleNonReleaseRootProtectedBacklog.identifier
        ?? staleNonReleaseRootProtectedBacklog.id
        ?? null,
      protectedBacklogStatus: staleNonReleaseRootProtectedBacklog.status,
    });
    continue;
  }
  const projectMutationSourceControlGuardRoot = gap.area === "ops-release"
    ? findProjectMutationSourceControlGuardChain({
        rootBlocker: key,
        sourceIssues: enrichedGroupedIssues,
        relatedIssues,
        terminalStatuses,
      })
    : null;
  if (projectMutationSourceControlGuardRoot) {
    actions.push({
      action: "suppressed_project_mutation_source_control_guard",
      rootBlocker: key,
      assignee: owner?.name ?? null,
      observedIssueCount: groupedIssues.length,
      title: input.title,
      guardRoot: projectMutationSourceControlGuardRoot.identifier
        ?? projectMutationSourceControlGuardRoot.id
        ?? null,
      guardRootStatus: projectMutationSourceControlGuardRoot.status,
      routedArea: "source-control",
    });
    continue;
  }
  const qaToolingProofRoot = gap.area === "ops-release"
    ? findQaToolingProofBlockedChain({
        rootBlocker: key,
        sourceIssues: enrichedGroupedIssues,
        relatedIssues,
        terminalStatuses,
      })
    : null;
  if (qaToolingProofRoot) {
    actions.push({
      action: "suppressed_qa_tooling_proof_blocker_chain",
      rootBlocker: key,
      assignee: owner?.name ?? null,
      observedIssueCount: groupedIssues.length,
      title: input.title,
      proofRoot: qaToolingProofRoot.identifier
        ?? qaToolingProofRoot.id
        ?? null,
      proofRootStatus: qaToolingProofRoot.status,
      routedArea: "qa-proof",
    });
    continue;
  }
  const boardAuthorizationWaitRoot = gap.area === "ops-release"
    ? findBoardAuthorizationWaitChain({
        rootBlocker: key,
        sourceIssues: enrichedGroupedIssues,
        relatedIssues,
        terminalStatuses,
      })
    : null;
  if (boardAuthorizationWaitRoot) {
    actions.push({
      action: "suppressed_board_authorization_wait_chain",
      rootBlocker: key,
      assignee: owner?.name ?? null,
      observedIssueCount: groupedIssues.length,
      title: input.title,
      authorizationRoot: boardAuthorizationWaitRoot.identifier
        ?? boardAuthorizationWaitRoot.id
        ?? null,
      authorizationRootStatus: boardAuthorizationWaitRoot.status,
      routedArea: "control-plane-authorization",
    });
    continue;
  }
  const controlPlaneWriteBoundaryRecoveryRoot = gap.area === "ops-release"
    ? findControlPlaneWriteBoundaryRecoveryChain({
        rootBlocker: key,
        sourceIssues: enrichedGroupedIssues,
        relatedIssues,
        terminalStatuses,
      })
    : null;
  if (controlPlaneWriteBoundaryRecoveryRoot) {
    actions.push({
      action: "suppressed_control_plane_write_boundary_recovery_chain",
      rootBlocker: key,
      assignee: owner?.name ?? null,
      observedIssueCount: groupedIssues.length,
      title: input.title,
      recoveryRoot: controlPlaneWriteBoundaryRecoveryRoot.identifier
        ?? controlPlaneWriteBoundaryRecoveryRoot.id
        ?? null,
      recoveryRootStatus: controlPlaneWriteBoundaryRecoveryRoot.status,
      routedArea: "control-plane-recovery",
    });
    continue;
  }
  const protectedCoolifyVpsBindingWaitRoot = gap.area === "ops-release"
    ? findProtectedCoolifyVpsBindingWaitChain({
        rootBlocker: key,
        sourceIssues: enrichedGroupedIssues,
        relatedIssues,
        terminalStatuses,
      })
    : null;
  if (protectedCoolifyVpsBindingWaitRoot) {
    actions.push({
      action: "suppressed_protected_coolify_vps_binding_wait_chain",
      rootBlocker: key,
      assignee: owner?.name ?? null,
      observedIssueCount: groupedIssues.length,
      title: input.title,
      bindingRoot: protectedCoolifyVpsBindingWaitRoot.identifier
        ?? protectedCoolifyVpsBindingWaitRoot.id
        ?? null,
      bindingRootStatus: protectedCoolifyVpsBindingWaitRoot.status,
      routedArea: "protected-runtime-binding",
    });
    continue;
  }
  const coveredProtectedCapabilityCredentialRoot = gap.area === "security-credentials"
    ? findCoveredProtectedCapabilityCredentialChain({
        rootBlocker: key,
        sourceIssues: enrichedGroupedIssues,
        relatedIssues,
        terminalStatuses,
      })
    : null;
  if (coveredProtectedCapabilityCredentialRoot) {
    actions.push({
      action: "suppressed_covered_protected_capability_credential_chain",
      rootBlocker: key,
      assignee: owner?.name ?? null,
      observedIssueCount: groupedIssues.length,
      title: input.title,
      capabilityRoot: coveredProtectedCapabilityCredentialRoot.identifier
        ?? coveredProtectedCapabilityCredentialRoot.id
        ?? null,
      capabilityRootStatus: coveredProtectedCapabilityCredentialRoot.status,
      routedArea: "security-credentials",
    });
    continue;
  }

  await createLearningIssue(input, {
    action: "created_learning_issue",
    rootBlocker: key,
    assignee: owner?.name ?? null,
    observedIssueCount: groupedIssues.length,
  });
}

const engineeringLead = resolveLearningOwner(activeAgents, "Engineering Delivery Lead", ["CTO Architect", "Portfolio Director"]);
const workerFanoutWeak = trackBacklog.weakTracks.length > 0;
if (workerFanoutWeak) {
  const duplicate = findSuppressibleV2WorkerFanoutDuplicate({
    issues,
    terminalStatuses,
    plannedWorkerIssueCount: plannedWorkerIssues.length,
    plannedSupervisorIssueCount: plannedSupervisorIssues.length,
    plannedIssueCount: plannedIssues.length,
    weakTrackSummaries: weakTrackLines,
    sourceIssues: plannedIssues,
  });
  if (duplicate) {
    actions.push({
      action: "suppressed_duplicate_learning_issue",
      area: "worker-fanout",
      assignee: engineeringLead?.name ?? null,
      plannedWorkerIssueCount: plannedWorkerIssues.length,
      plannedSupervisorIssueCount: plannedSupervisorIssues.length,
      plannedIssueCount: plannedIssues.length,
      title: "[Softwarehouse][Learning] Worker queue fan-out capability gap",
      duplicateOf: duplicate.identifier ?? duplicate.id ?? null,
      duplicateStatus: duplicate.status,
    });
  } else {
    await createLearningIssue({
      title: "[Softwarehouse][Learning] Worker queue fan-out capability gap",
      description: [
        "softwarehouse-learning-loop:v2",
        "",
        "Observed process gap: runnable work is concentrated above the leaf worker layer.",
        "",
        `Planned supervisor issue count: ${plannedSupervisorIssues.length}`,
        `Planned worker issue count: ${plannedWorkerIssues.length}`,
        `Planned issue count: ${plannedIssues.length}`,
        "",
        "Weak tracks:",
        ...weakTrackLines.map((line) => `- ${line}`),
        "",
        "Capability gap:",
        "- managers/leads are not consistently turning parent intent into narrow worker-ready issues;",
        "- aggregate worker counts can hide a starved Soar or Roost track;",
        "- this can make the softwarehouse look busy while implementation workers remain idle.",
        "",
        formatWorkerFanoutContract(),
        "",
        "Required proposal:",
        "- decide whether this needs a role instruction update, dispatch routine, or measured new role proposal;",
        "- name the approving owner: CTO Architect for technical delivery/process roles, Portfolio Director for company/project roles;",
        "- create at most one follow-up process/instruction issue if needed;",
        "- do not create active agents silently.",
        "",
        "Trial proof:",
        "- for one active project, promote or create the single smallest justified runnable worker todo, or record the exact legal blocker; do not manufacture reserve inventory to satisfy a count.",
        "",
        "Retirement condition:",
        "- remove or narrow this learning rule after three consecutive control ticks show worker backlog depth is sufficient or all missing lanes have legal blockers.",
      ].join("\n"),
      status: "todo",
      priority: "high",
      projectId: operating.id,
      goalId: goal?.id ?? null,
      assigneeAgentId: engineeringLead?.id ?? null,
      requestDepth: 2,
      labelIds,
      acceptanceCriteria: [
        "The fan-out gap is described with current worker/supervisor queue counts.",
        "The proposal selects instruction update, routine update, role proposal, or no-change with evidence.",
        "Any new role remains a proposal until the correct approver accepts it.",
        "A measured trial and retirement condition are recorded.",
      ],
    }, {
      action: "created_learning_issue",
      area: "worker-fanout",
      assignee: engineeringLead?.name ?? null,
      plannedWorkerIssueCount: plannedWorkerIssues.length,
      plannedSupervisorIssueCount: plannedSupervisorIssues.length,
      weakTracks: weakTrackLines,
    });
  }
}

const reviewIssueStateById = new Map(
  await Promise.all(
    openIssues
      .filter((issue) => issue.status === "in_review")
      .map(async (issue) => {
        const [interactions, approvals] = await Promise.all([
          request("GET", `/api/issues/${issue.id}/interactions`)
            .then(interactionRows)
            .catch(() => []),
          request("GET", `/api/issues/${issue.id}/approvals`)
            .then(approvalRows)
            .catch(() => []),
        ]);
        return [issue.id, { interactions, approvals }];
      }),
  ),
);
const reviewIssuesWithoutDecision = findInReviewIssuesWithoutStructuredDecisionPath(openIssues, {
  liveIssueIds,
  issueStateById: reviewIssueStateById,
});
if (reviewIssuesWithoutDecision.length > 0) {
  const portfolioDirector = resolveLearningOwner(activeAgents, "Portfolio Director", ["Engineering Delivery Lead", "CTO Architect"]);
  const sourceIssueIdentifiers = reviewIssuesWithoutDecision
    .map((issue) => issue.identifier)
    .filter(Boolean)
    .sort();
  const reviewDuplicateSearchIssues = await searchIssues("[Softwarehouse][Learning] In-review decision path capability gap");
  const duplicate = findSuppressibleV2ReviewDecisionPathDuplicate({
    issues: [...issues, ...reviewDuplicateSearchIssues],
    terminalStatuses,
    sourceIssueIdentifiers,
  });
  if (duplicate) {
    actions.push({
      action: "suppressed_duplicate_learning_issue",
      area: "review-decision-path",
      assignee: portfolioDirector?.name ?? null,
      observedIssueCount: reviewIssuesWithoutDecision.length,
      sourceIssueIdentifiers,
      title: "[Softwarehouse][Learning] In-review decision path capability gap",
      duplicateOf: duplicate.identifier ?? duplicate.id ?? null,
      duplicateStatus: duplicate.status,
    });
  } else {
    await createLearningIssue({
    title: "[Softwarehouse][Learning] In-review decision path capability gap",
    description: [
      "softwarehouse-learning-loop:v2",
      "",
      "Observed process gap: issues reached in_review without a clear structured decision path.",
      "",
      `Observed issue count: ${reviewIssuesWithoutDecision.length}`,
      "",
      "Observed issues:",
      ...reviewIssuesWithoutDecision.slice(0, 12).map((issue) =>
        `- ${issue.identifier}: ${issue.title} (${projectByName.get(issue.projectId)?.name ?? "unknown"})`
      ),
      "",
      "Required proposal:",
      "- define the minimum review handoff fields: reviewer, decision options, evidence, deadline/cooldown, and next owner;",
      "- decide whether to update role instructions, issue templates, janitor behavior, or no-change;",
      "- do not close or mutate the source issues from this learning task.",
      "",
      "Retirement condition:",
      "- three consecutive audits report zero in_review issues without a decision path.",
    ].join("\n"),
    status: "todo",
    priority: "high",
    projectId: operating.id,
    goalId: goal?.id ?? null,
    assigneeAgentId: portfolioDirector?.id ?? null,
    requestDepth: 2,
    labelIds,
    acceptanceCriteria: [
      "The missing review-decision fields are named.",
      "The proposed process change has a single owner.",
      "No source issue is closed by this learning task.",
      "A retirement condition is recorded.",
    ],
  }, {
    action: "created_learning_issue",
    area: "review-decision-path",
    assignee: portfolioDirector?.name ?? null,
    observedIssueCount: reviewIssuesWithoutDecision.length,
  });
  }
}

console.log(JSON.stringify({
  apiBase,
  company: { id: company.id, name: company.name },
  mode: apply ? "apply" : "dry-run",
  minRepeatedBlocked,
  blockedGroupCount: blockedGroups.size,
  eligibleBlockedGroupCount: eligibleBlockedGroups.length,
  processedBlockedGroupCount: processedBlockedGroups.length,
  skippedBlockedGroupCount,
  learningObservationCount: learningObservations.length,
  learningObservationReadAvailable,
  maxLearningObservationBackfill,
  actionCount: actions.length,
  actions,
}, null, 2));
