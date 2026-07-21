import { hasStructuredInReviewDecisionPath } from "./in-review-decision-path.mjs";

export function buildOpenIssueTitles(issues, terminalStatuses) {
  const openTitles = new Set();
  for (const issue of issues) {
    if (terminalStatuses.has(issue.status)) continue;
    if (!issue.title) continue;
    openTitles.add(issue.title);
  }
  return openTitles;
}

const legacyOwnerAliases = new Map([
  [
    "ops release lead",
    [
      "09 DRE (Deployment & Reliability Engineer)",
      "Deployment and Reliability Engineer",
      "deployment-reliability-engineer",
      "09-dre-deployment-reliability-engineer",
    ],
  ],
  [
    "security review lead",
    [
      "10 SPA (Security & Privacy Auditor)",
      "Security & Privacy Auditor",
      "security-privacy-auditor",
      "10-spa-security-privacy-auditor",
    ],
  ],
]);

function normalizedOwnerKey(value) {
  return String(value ?? "").trim().toLowerCase();
}

function agentOwnerKeys(agent) {
  return [
    agent?.name,
    agent?.title,
    agent?.role,
    agent?.urlKey,
    agent?.metadata?.rosterKey,
    agent?.metadata?.luckysparrowFinalRole,
  ]
    .map(normalizedOwnerKey)
    .filter(Boolean);
}

export function resolveLearningOwner(agents, ownerName, fallbackOwnerNames = []) {
  const activeAgents = agents.filter((agent) => agent.status !== "terminated");
  const byKey = new Map();
  for (const agent of activeAgents) {
    for (const key of agentOwnerKeys(agent)) {
      if (!byKey.has(key)) byKey.set(key, agent);
    }
  }

  const requestedKey = normalizedOwnerKey(ownerName);
  const ownerCandidates = [
    ...(legacyOwnerAliases.get(requestedKey) ?? []),
    ownerName,
    ...fallbackOwnerNames,
  ];

  for (const candidate of ownerCandidates) {
    const agent = byKey.get(normalizedOwnerKey(candidate));
    if (agent) return agent;
  }

  return null;
}

export function classifyLearningGapFromIssues(key, issues) {
  const text = issues.map((issue) => `${issue.title}\n${issue.description ?? ""}`).join("\n").toLowerCase();
  if (/auth|secret|credential|token|permission|account|security/.test(text)) return {
    area: "security-credentials",
    owner: "Security Review Lead",
    title: `[Softwarehouse][Learning] Security/credential blocker pattern ${key}`,
    boundary: "credential/account proof and least-privilege unblock path",
  };
  if (/deploy|coolify|vps|smoke|runtime|restart/.test(text)) return {
    area: "ops-release",
    owner: "Ops Release Lead",
    title: `[Softwarehouse][Learning] Ops/release blocker pattern ${key}`,
    boundary: "release/deploy evidence, rollback, and protected gate contract",
  };
  if (/test|qa|regression|e2e|smoke|proof|evidence/.test(text)) return {
    area: "qa-proof",
    owner: "QA Regression Lead",
    title: `[Softwarehouse][Learning] QA/evidence blocker pattern ${key}`,
    boundary: "repeatable proof command and regression guard ownership",
  };
  if (/architecture|graph|map|trace|dependency|entity/.test(text)) return {
    area: "architecture-awareness",
    owner: "CTO Architect",
    title: `[Softwarehouse][Learning] Architecture-awareness blocker pattern ${key}`,
    boundary: "canonical graph/entity/status mapping and task linkage",
  };
  return {
    area: "project-management",
    owner: "Portfolio Director",
    title: `[Softwarehouse][Learning] Project-management blocker pattern ${key}`,
    boundary: "smaller ownership, clearer handoff, and issue disposition rules",
  };
}

function learningField(description, label) {
  const match = String(description ?? "").match(new RegExp(`^${label}:\\s*(.+)$`, "im"));
  return match?.[1]?.trim() ?? null;
}

function learningSignature(input) {
  return [
    input.rootBlocker,
    input.area,
    input.boundary,
  ].map((value) => String(value ?? "").trim().toLowerCase()).join("\n");
}

export function parseV1LearningSignature(issue) {
  const description = String(issue?.description ?? "");
  if (!description.includes("softwarehouse-learning-loop:v1")) return null;
  const rootBlocker = learningField(description, "Root/blocker key");
  const area = learningField(description, "Area");
  const boundary = learningField(description, "Smallest responsibility boundary");
  if (!rootBlocker || !area || !boundary) return null;
  return {
    rootBlocker,
    area,
    boundary,
    signature: learningSignature({ rootBlocker, area, boundary }),
  };
}

function numericLearningField(description, label) {
  const raw = learningField(description, label);
  if (raw === null) return null;
  const value = Number(raw);
  return Number.isFinite(value) ? value : null;
}

function fanoutLearningSignature(input) {
  return [
    input.title,
    "worker-fanout",
    input.plannedWorkerIssueCount,
    input.plannedSupervisorIssueCount,
    input.plannedIssueCount,
    ...(input.weakTrackSummaries ?? []).slice().sort(),
  ].map((value) => String(value ?? "").trim().toLowerCase()).join("\n");
}

function fanoutWeakTrackNames(weakTrackSummaries = []) {
  return weakTrackSummaries
    .map((summary) => String(summary ?? "").split(":", 1)[0].trim().toLowerCase())
    .filter(Boolean)
    .sort();
}

function sameStringArray(left = [], right = []) {
  return left.length === right.length && left.every((value, index) => value === right[index]);
}

function reviewDecisionPathLearningSignature(input) {
  return [
    input.title,
    "review-decision-path",
    ...(input.sourceIssueIdentifiers ?? []),
  ].map((value) => String(value ?? "").trim().toLowerCase()).join("\n");
}

export function parseV2WorkerFanoutLearningSignature(issue) {
  const description = String(issue?.description ?? "");
  if (!description.includes("softwarehouse-learning-loop:v2")) return null;
  const title = String(issue?.title ?? "").trim();
  if (title !== "[Softwarehouse][Learning] Worker queue fan-out capability gap") return null;
  const plannedWorkerIssueCount = numericLearningField(description, "Planned worker issue count");
  const plannedSupervisorIssueCount = numericLearningField(description, "Planned supervisor issue count");
  const plannedIssueCount = numericLearningField(description, "Planned issue count");
  const weakTrackSummaries = [...description.matchAll(/^- ([A-Za-z0-9_-]+: planned worker=\d+, planned supervisor=\d+, open=\d+, blocked=\d+)$/gm)]
    .map((match) => match[1])
    .sort();
  if (
    plannedWorkerIssueCount === null
    || plannedSupervisorIssueCount === null
    || plannedIssueCount === null
  ) return null;
  return {
    title,
    area: "worker-fanout",
    plannedWorkerIssueCount,
    plannedSupervisorIssueCount,
    plannedIssueCount,
    weakTrackSummaries,
    weakTrackNames: fanoutWeakTrackNames(weakTrackSummaries),
    signature: fanoutLearningSignature({
      title,
      plannedWorkerIssueCount,
      plannedSupervisorIssueCount,
      plannedIssueCount,
      weakTrackSummaries,
    }),
  };
}

export function parseV2ReviewDecisionPathLearningSignature(issue) {
  const description = String(issue?.description ?? "");
  if (!description.includes("softwarehouse-learning-loop:v2")) return null;
  const title = String(issue?.title ?? "").trim();
  if (title !== "[Softwarehouse][Learning] In-review decision path capability gap") return null;
  const sourceIssueIdentifiers = [...description.matchAll(/^- ([A-Z]+-\d+):/gm)]
    .map((match) => match[1])
    .sort();
  if (sourceIssueIdentifiers.length === 0) return null;
  return {
    title,
    area: "review-decision-path",
    sourceIssueIdentifiers,
    signature: reviewDecisionPathLearningSignature({
      title,
      sourceIssueIdentifiers,
    }),
  };
}

function issueTimestamp(issue) {
  const raw = issue.updatedAt ?? issue.completedAt ?? issue.createdAt ?? null;
  const time = raw ? Date.parse(raw) : NaN;
  return Number.isFinite(time) ? time : 0;
}

export function findInReviewIssuesWithoutStructuredDecisionPath(
  issues,
  {
    liveIssueIds = new Set(),
    issueStateById = new Map(),
  } = {},
) {
  return issues.filter((issue) => {
    if (issue?.status !== "in_review") return false;
    const state = issueStateById.get(issue.id) ?? {};
    return !hasStructuredInReviewDecisionPath(issue, {
      liveIssueIds,
      interactions: state.interactions ?? [],
      approvals: state.approvals ?? [],
    });
  });
}

function latestIssue(issues) {
  return issues.reduce((latest, issue) => {
    if (!latest) return issue;
    return issueTimestamp(issue) > issueTimestamp(latest) ? issue : latest;
  }, null);
}

function sourceHasNewDelta(sourceIssues, latestLearningIssue) {
  const latestLearningAt = issueTimestamp(latestLearningIssue);
  return sourceIssues.some((issue) => issueTimestamp(issue) > latestLearningAt);
}

function sourceHasMissingBlockerDisposition(sourceIssues) {
  return sourceIssues.some((issue) => {
    if (issue.status !== "blocked") return true;
    if (!issue.assigneeAgentId && !issue.assigneeUserId) return true;
    const text = `${issue.title ?? ""}\n${issue.description ?? ""}`.toLowerCase();
    return !/(acceptance|goal|blocked|blocker|unblock|handoff|next)/.test(text);
  });
}

function hasNamedUnblockPacket(issue) {
  if (!issue.assigneeAgentId && !issue.assigneeUserId) return false;
  const text = `${issue.title ?? ""}\n${issue.description ?? ""}`.toLowerCase();
  return /(blocked|blocker|unblock|owner|action|next|handoff|acceptance|redaction|credential|secret|board)/.test(text);
}

function isOperatorProtectedBindingWait(issue) {
  if (issue?.status !== "in_review") return false;
  if (!issue.assigneeUserId && !issue.assigneeAgentId) return false;
  const text = `${issue.title ?? ""}\n${issue.description ?? ""}`.toLowerCase();
  const protectedRunnerBinding = /protected/.test(text)
    && /(prod_db_check|production_db_check|accepted .*input|accepted .*family|runner|env refs?|secret refs?)/.test(text);
  const protectedSmokePrincipal = /(protected|production-smoke|smoke)/.test(text)
    && /(auth|principal|session|token|smoke_auth|workers\/ready)/.test(text)
    && /(secret-store|secret store|approved path|paperclip secrets|encrypted local secret store)/.test(text);
  const protectedSecretCoordination = /companycore_api_key|companycore api key/.test(text)
    && /(board approval is accepted|approval is accepted|request-confirmation|request confirmation|board-only|secret-management|secret management|protected-binding coordination lane)/.test(text)
    && /(secret refs?|protected bindings?|no raw secret|no-secret|without raw secret disclosure|never request, print, store, paste, or attach raw secret values)/.test(text);
  return (protectedRunnerBinding || protectedSmokePrincipal || protectedSecretCoordination)
    && /(bind|binding|bound|propagat|inject|provision|rotate)/.test(text)
    && /(without exposing|no raw secret|no secret values|redacted|redaction)/.test(text)
    && /(do not deploy|no deploy|do not .*restart|no .*restart|do not .*production mutation|no .*production mutation|do not .*db write|no .*db write|do not .*migrations|no .*migrations|no .*repo mutation|no push|do not .*push|no raw secret disclosure)/.test(text);
}

function isOpsReleaseIssue(issue) {
  const text = `${issue.title ?? ""}\n${issue.description ?? ""}`.toLowerCase();
  return /deploy|coolify|vps|smoke|runtime|restart|release|production|protected|gate/.test(text);
}

function isDocumentationProcessIssue(issue) {
  const text = `${issue?.title ?? ""}\n${issue?.description ?? ""}`.toLowerCase();
  return /\[(docs|documentation|docs\/memory)\]/.test(text)
    || /(source of truth|source-of-truth|docs\/memory|documentation|publish accepted .*bundle)/.test(text);
}

function isStaleActiveReleaseGate(issue) {
  return issue?.status === "in_progress"
    && isOpsReleaseIssue(issue)
    && !isDocumentationProcessIssue(issue);
}

function blockerKeys(issue) {
  return [
    ...(issue.blockedBy ?? []),
    ...(issue.terminalBlockers ?? []),
    ...(issue.blockedBy ?? []).flatMap((blocker) => blocker.terminalBlockers ?? []),
    issue.blockerAttention?.sampleBlockerIdentifier
      ? { identifier: issue.blockerAttention.sampleBlockerIdentifier }
      : null,
  ]
    .filter(Boolean)
    .flatMap((blocker) => [blocker.identifier, blocker.id])
    .filter(Boolean);
}

function issueMatchesKey(issue, key) {
  return Boolean(key) && (issue.identifier === key || issue.id === key);
}

function issueHasActiveRunCoverage(issue) {
  return Boolean(issue?.executionRunId || issue?.checkoutRunId);
}

function blockerAttentionCoversRoot(issue, rootKey) {
  const attention = issue?.blockerAttention;
  return attention?.state === "covered"
    && (attention.reason === "active_child" || attention.reason === "active_dependency")
    && (!rootKey || attention.sampleBlockerIdentifier === rootKey);
}

function blockerAttentionReferencesRoot(issue, rootKey) {
  const attention = issue?.blockerAttention;
  return Boolean(rootKey) && attention?.sampleBlockerIdentifier === rootKey;
}

function issueLookup(issues) {
  const lookup = new Map();
  for (const issue of issues) {
    if (issue.identifier) lookup.set(issue.identifier, issue);
    if (issue.id) lookup.set(issue.id, issue);
  }
  return lookup;
}

function blockerPath(issue, targetKey, lookup, seen = new Set()) {
  const currentKey = issue.identifier ?? issue.id;
  if (currentKey && seen.has(currentKey)) return null;
  if (currentKey) seen.add(currentKey);

  for (const key of blockerKeys(issue)) {
    const blocker = lookup.get(key);
    if (!blocker) continue;
    if (issueMatchesKey(blocker, targetKey)) return [blocker];
    const childPath = blockerPath(blocker, targetKey, lookup, seen);
    if (childPath) return [blocker, ...childPath];
  }
  return null;
}

export function collectTransitiveBlockerRelatedIssues({ issues, rootKey, sourceIssues }) {
  const lookup = issueLookup(issues);
  const related = new Map();
  const visit = (issue) => {
    if (!issue) return;
    const key = issue.id ?? issue.identifier;
    if (!key || related.has(key)) return;
    related.set(key, issue);
    for (const blockerKey of blockerKeys(issue)) visit(lookup.get(blockerKey));
  };

  for (const issue of sourceIssues ?? []) visit(issue);
  visit(lookup.get(rootKey));
  return [...related.values()];
}

export function findActiveRunCoveredOpsReleaseBlockerChain({
  rootBlocker,
  sourceIssues,
  relatedIssues,
}) {
  const lookup = issueLookup(relatedIssues);
  const rootIssue = lookup.get(rootBlocker);
  if (!rootIssue) return null;
  if (rootIssue.status !== "in_progress") return null;
  if (!issueHasActiveRunCoverage(rootIssue)) return null;
  if (!isOpsReleaseIssue(rootIssue)) return null;

  const rootKey = rootIssue.identifier ?? rootIssue.id;
  const blockedSources = sourceIssues.filter((issue) => issue.status === "blocked");
  if (blockedSources.length !== sourceIssues.length) return null;

  const everySourceCovered = blockedSources.every((issue) => {
    if (issue.identifier === rootIssue.identifier || issue.id === rootIssue.id) return true;
    if (blockerPath(issue, rootKey, lookup)) return true;
    return blockerAttentionCoversRoot(issue, rootKey);
  });
  if (!everySourceCovered) return null;

  return rootIssue;
}

export function findCompliantOpsReleaseBlockerChain({
  rootBlocker,
  sourceIssues,
  relatedIssues,
  terminalStatuses,
}) {
  const lookup = issueLookup(relatedIssues);
  const sourceKeys = new Set((sourceIssues ?? []).flatMap((issue) => [issue.identifier, issue.id]).filter(Boolean));
  const candidates = relatedIssues
    .filter((issue) => (issue.status === "blocked" && hasNamedUnblockPacket(issue)) || isOperatorProtectedBindingWait(issue))
    .filter((issue) => issueMatchesKey(issue, rootBlocker) || !sourceKeys.has(issue.identifier ?? issue.id))
    .map((issue) => {
      const paths = sourceIssues.map((source) => {
        return compliantPathToRoot(source, issue, lookup);
      });
      if (paths.some((path) => path === null)) return null;
      return {
        issue,
        depth: Math.max(...paths.map((path) => path.length)),
        terminalRoot: blockerKeys(issue).length === 0,
      };
    })
    .filter(Boolean)
    .sort((a, b) => Number(b.terminalRoot) - Number(a.terminalRoot) || b.depth - a.depth);
  const rootIssue = candidates[0]?.issue ?? null;
  if (!rootIssue) return null;
  const rootIsBlockedPacket = rootIssue.status === "blocked" && hasNamedUnblockPacket(rootIssue);
  const rootIsOperatorWait = isOperatorProtectedBindingWait(rootIssue);
  if (!rootIsBlockedPacket && !rootIsOperatorWait) return null;

  const blockedSources = sourceIssues.filter((issue) => issue.status === "blocked");
  if (blockedSources.length !== sourceIssues.length) return null;
  if (blockedSources.some((issue) => {
    if (issue.identifier === rootIssue.identifier || issue.id === rootIssue.id) return !hasNamedUnblockPacket(issue);
    return !compliantPathToRoot(issue, rootIssue, lookup);
  })) return null;

  const staleActiveReleaseGate = relatedIssues.some(isStaleActiveReleaseGate);
  if (staleActiveReleaseGate) return null;

  const rootKey = rootIssue.identifier ?? rootIssue.id;
  const rootPathKeys = new Set([rootKey]);
  for (const source of blockedSources) {
    rootPathKeys.add(source.identifier ?? source.id);
    if (source.identifier === rootIssue.identifier || source.id === rootIssue.id) continue;
    const path = compliantPathToRoot(source, rootIssue, lookup);
    for (const pathIssue of path ?? []) {
      rootPathKeys.add(pathIssue.identifier ?? pathIssue.id);
    }
  }
  const invalidRelatedIssue = relatedIssues.some((issue) => {
    if (!rootPathKeys.has(issue.identifier ?? issue.id)) return false;
    if (terminalStatuses.has(issue.status) || issue.status === "blocked" || issue.status === "done") {
      return false;
    }
    if (issueMatchesKey(issue, rootKey) && isOperatorProtectedBindingWait(issue)) {
      return false;
    }
    if ((issue.status === "todo" || issue.status === "backlog") && blockerPath(issue, rootKey, lookup)) {
      return false;
    }
    return true;
  });
  if (invalidRelatedIssue) return null;

  return rootIssue;
}

function hasReleasePermitStopPacket(issue) {
  const text = `${issue?.title ?? ""}\n${issue?.description ?? ""}`.toLowerCase();
  return /release permit|permit|rollback|redeploy|restart|controlled/.test(text)
    && /stop condition|do not chain|forbidden|separate .*permit|no additional|at most one/.test(text);
}

function isRecoveryRepairEvidence(issue) {
  const text = `${issue?.title ?? ""}\n${issue?.description ?? ""}`.toLowerCase();
  return /fix|repair|investigat|root cause|startup|wrapper|runtime|crash|frontend|backend|image/.test(text);
}

function isNonReleaseRootEvidence(issue) {
  const text = `${issue?.title ?? ""}\n${issue?.description ?? ""}`.toLowerCase();
  return /source-level|source map|source-map|source control|source-control|backend|api|auth map|fix-lane stub/.test(text)
    && !/release permit|redeploy|restart|coolify|vps|rollback|production proof packet|protected journey proof/.test(text);
}

function isProtectedBacklogOrGate(issue) {
  const text = `${issue?.title ?? ""}\n${issue?.description ?? ""}`.toLowerCase();
  return /protected|smoke|credential|secret|auth|gate|proof backlog|operator/.test(text);
}

function isProjectMutationSourceControlGuard(issue) {
  const text = `${issue?.title ?? ""}\n${issue?.description ?? ""}`.toLowerCase();
  const isSourceControlSignature = /source-control|source control|dirty path|dirty file|protected project changes|sample dirty path/.test(text);
  return (
    issue?.status === "blocked"
    && (
      /project mutation guard/.test(text)
      || /project_source_control_gate_blocked/.test(text)
      || (/protected project changes/.test(text) && /gated\/non-delivery|non-delivery lane|source-control classification/.test(text))
    )
    && isSourceControlSignature
  ) || isProjectMutationBoardAccessCancelledIssue(issue);
}

function isProjectMutationBoardAccessCancelledIssue(issue) {
  const text = `${issue?.title ?? ""}\n${issue?.description ?? ""}`.toLowerCase();
  return issue?.status === "cancelled"
    && /project mutation guard/.test(text)
    && /board[-\s]?access/.test(text);
}

function isProjectMutationSourceControlGuardCandidate(issue) {
  if (!issue) return false;
  if (issue.status === "blocked") return true;
  return isProjectMutationBoardAccessCancelledIssue(issue);
}

function isQaToolingProofRoot(issue, terminalStatuses) {
  if (!issue) return false;
  if (terminalStatuses.has(issue.status)) return false;
  if (!issue.assigneeAgentId && !issue.assigneeUserId) return false;
  if (issue.status !== "todo" && issue.status !== "backlog" && issue.status !== "in_progress") return false;
  if (hasFirstClassUnresolvedBlocker(issue, terminalStatuses)) return false;
  const text = `${issue.title ?? ""}\n${issue.description ?? ""}`.toLowerCase();
  return /(qa|test|vitest|playwright|regression|proof|evidence|tooling|startup|local)/.test(text)
    && /(repair|fix|unblock|restore|startup|proof|regression|tooling)/.test(text)
    && !hasHardReleaseFailureEvidence(issue)
    && !/(coolify|vps|release permit|rollback)/.test(text);
}

function isBoardAuthorizationWaitRoot(issue, terminalStatuses) {
  if (!issue) return false;
  if (terminalStatuses.has(issue.status)) return false;
  if (issue.status !== "in_review" && issue.status !== "blocked" && issue.status !== "todo") return false;
  if (!issue.assigneeUserId) return false;
  const text = `${issue.title ?? ""}\n${issue.description ?? ""}`.toLowerCase();
  return /(board|operator|local-board|authorized actor|authorization|permission)/.test(text)
    && /(outside .*authorization boundary|authorization boundary|scoped .*permission|grant .*permission|authorized actor path|board .*apply|operator .*apply)/.test(text)
    && /(routing|reassign|blockedbyissueids|blocker|control-plane|control plane|mutation)/.test(text)
    && !hasHardReleaseFailureEvidence(issue);
}

function isControlPlaneWriteBoundaryRecoveryRoot(issue, terminalStatuses) {
  if (!issue) return false;
  if (terminalStatuses.has(issue.status)) return false;
  if (issue.status !== "blocked") return false;
  if (!issue.assigneeAgentId && !issue.assigneeUserId) return false;
  const recovery = issue.activeRecoveryAction ?? {};
  const hasRecoveryOwnerPath = recovery.kind === "stranded_assigned_issue"
    || recovery.wakePolicy?.type === "wake_owner"
    || issue.scheduledRetry?.wakePolicy?.type === "wake_owner";
  if (!hasRecoveryOwnerPath) return false;
  const text = `${issue.title ?? ""}\n${issue.description ?? ""}`.toLowerCase();
  return /(control-plane|control plane|authorization|authorized|permission|write-boundary|write boundary|authorization boundary)/.test(text)
    && /(repair|recovery|recover|restore|runtime|adapter|execution path|write boundary|write-boundary|authorization boundary|outside .*authorization boundary)/.test(text)
    && /(blockedbyissueids|blocker|routing|reassign|mutation|write|issue update|issue mutation|control-plane|control plane)/.test(text)
    && !hasHardReleaseFailureEvidence(issue);
}

function isProtectedCoolifyVpsBindingWaitRoot(issue, terminalStatuses) {
  if (!issue) return false;
  if (terminalStatuses.has(issue.status)) return false;
  if (issue.status !== "blocked" && issue.status !== "todo") return false;
  if (!issue.assigneeAgentId && !issue.assigneeUserId) return false;
  const text = `${issue.title ?? ""}\n${issue.description ?? ""}`.toLowerCase();
  return /coolify/.test(text)
    && /(vps|watch)/.test(text)
    && /(bind|binding|bindings|inject|runner|runtime|environment|secret-store|secret store)/.test(text)
    && /(read-only|names-only|names only|redaction-safe|redaction safe|without exposing|no secret values)/.test(text)
    && /(board|operator|secret-store|secret store|approved|unblock owner\/action|owner\/action|missing .*owner\/action|required .*binding names|restore .*binding names)/.test(text)
    && /(no deploy|do not deploy|no .*restart|do not .*restart|no .*rollback|do not .*rollback|no .*production mutation|do not .*production mutation|no .*secret value|no .*secret disclosure|without exposing values)/.test(text)
    && !hasHardReleaseFailureEvidence(issue);
}

function hasReleaseFailureEvidence(issue) {
  const text = `${issue?.title ?? ""}\n${issue?.description ?? ""}`.toLowerCase();
  return /release permit|rollback/.test(text)
    || /(protected\s+)?smoke[^.\n]*(fail|failed|failure|error|timeout)/.test(text)
    || /deploy[^.\n]*(fail|failed|failure|error|timeout)/.test(text)
    || /restart[^.\n]*(fail|failed|failure|error|timeout)/.test(text)
    || /coolify[^.\n]*(fail|failed|failure|error|timeout)/.test(text);
}

function hasHardReleaseFailureEvidence(issue) {
  const text = `${issue?.title ?? ""}\n${issue?.description ?? ""}`.toLowerCase();
  return /(protected\s+)?smoke[^.\n]*(fail|failed|failure|error|timeout)/.test(text)
    || /deploy[^.\n]*(fail|failed|failure|error|timeout)/.test(text)
    || /restart[^.\n]*(fail|failed|failure|error|timeout)/.test(text)
    || /coolify[^.\n]*(fail|failed|failure|error|timeout)/.test(text);
}

function hasExplicitFailedReleaseGateEvidence(issue) {
  const text = `${issue?.title ?? ""}\n${issue?.description ?? ""}`.toLowerCase();
  return /(release|gate|rollback|smoke|deploy|restart|coolify|vps|production)[^.\n]*(failed|failure|error|timeout)/.test(text)
    || /(failed|failure|error|timeout)[^.\n]*(release|gate|rollback|smoke|deploy|restart|coolify|vps|production)/.test(text);
}

function compliantPathToRoot(source, rootIssue, lookup) {
  const rootKey = rootIssue.identifier ?? rootIssue.id;
  if (source.identifier === rootIssue.identifier || source.id === rootIssue.id) return [];
  const path = blockerPath(source, rootKey, lookup);
  if (path) return path;
  const attentionKey = source?.blockerAttention?.sampleBlockerIdentifier;
  const attentionRoot = attentionKey ? lookup.get(attentionKey) : null;
  if (attentionRoot) {
    if (issueMatchesKey(attentionRoot, rootKey)) return [attentionRoot];
    const attentionPath = blockerPath(attentionRoot, rootKey, lookup);
    if (attentionPath) return [attentionRoot, ...attentionPath];
  }
  const rootText = `${rootIssue?.title ?? ""}\n${rootIssue?.description ?? ""}`.toLowerCase();
  if (
    (/protected/.test(rootText) || /(smoke|workers\/ready)/.test(rootText))
    && /input|credential|secret|principal|auth|permission/.test(rootText)
    && /propagat|bind|inject|runner|session|smoke|authorize|authorization|access/.test(rootText)
    && source.status === "blocked"
    && blockerAttentionReferencesRoot(source, rootKey)
  ) {
    return [];
  }
  return null;
}

export function findCompliantFailedReleasePermitRecoveryChain({
  rootBlocker,
  sourceIssues,
  relatedIssues,
  terminalStatuses,
}) {
  const lookup = issueLookup(relatedIssues);
  const rootIssue = lookup.get(rootBlocker);
  if (!rootIssue) return null;
  if (rootIssue.status !== "blocked") return null;
  if (!isOpsReleaseIssue(rootIssue)) return null;
  if (!hasNamedUnblockPacket(rootIssue)) return null;
  if (!hasReleasePermitStopPacket(rootIssue)) return null;

  const rootKey = rootIssue.identifier ?? rootIssue.id;
  const blockedSources = sourceIssues.filter((issue) => issue.status === "blocked");
  if (blockedSources.length !== sourceIssues.length) return null;

  const rootBlockers = blockerKeys(rootIssue).map((key) => lookup.get(key)).filter(Boolean);
  if (rootBlockers.length === 0) return null;
  const allRootBlockersTerminal = rootBlockers.every((issue) => terminalStatuses.has(issue.status));
  if (!allRootBlockersTerminal) return null;
  if (!rootBlockers.some(isRecoveryRepairEvidence)) return null;

  const staleActiveReleaseGate = relatedIssues.some(isStaleActiveReleaseGate);
  if (staleActiveReleaseGate) return null;

  const everySourceCovered = blockedSources.every((issue) => {
    if (issue.identifier === rootIssue.identifier || issue.id === rootIssue.id) return true;
    if (blockerPath(issue, rootKey, lookup)) return true;
    return blockerAttentionReferencesRoot(issue, rootKey);
  });
  if (!everySourceCovered) return null;

  return rootIssue;
}

function isDelegatedCompletedBlockerRecoveryIssue(issue, rootKey) {
  if (!issue?.assigneeAgentId && !issue?.assigneeUserId) return false;
  if (/^\[softwarehouse\]\[(learning|runtime)\]/i.test(String(issue?.title ?? ""))) return false;
  const text = `${issue?.title ?? ""}\n${issue?.description ?? ""}`.toLowerCase();
  return text.includes(String(rootKey ?? "").toLowerCase())
    && /(recovery|recover|recovered|resume|re-block|reblock|disposition|apply)/.test(text)
    && /(completed|resolved|done|cleared|stale|after resolved|after cleared)/.test(text);
}

function delegatedRecoveryStatusRank(issue) {
  if (issue.status === "todo" || issue.status === "in_progress") return 0;
  if (issue.status === "in_review") return 1;
  if (issue.status === "blocked") return 2;
  return 3;
}

function isPausedOwnerRoutingRepairIssue(issue, rootKey) {
  if (!issue?.assigneeAgentId && !issue?.assigneeUserId) return false;
  if (/^\[softwarehouse\]\[(learning|runtime)\]/i.test(String(issue?.title ?? ""))) return false;
  const text = `${issue?.title ?? ""}\n${issue?.description ?? ""}`.toLowerCase();
  return text.includes(String(rootKey ?? "").toLowerCase())
    && /paused/.test(text)
    && /(owner|assignee|assignment|routing|control-plane|control plane|authorized)/.test(text)
    && /(reassign|release|unpause|resume|block|blocker|repair|correct)/.test(text);
}

function isRunnablePausedOwnerRoot(issue, terminalStatuses) {
  if (!issue) return false;
  if (terminalStatuses.has(issue.status)) return false;
  if (issue.status !== "todo" && issue.status !== "backlog") return false;
  if (!issue.assigneeAgentId && !issue.assigneeUserId) return false;
  if (issueHasActiveRunCoverage(issue)) return false;
  if (hasFirstClassUnresolvedBlocker(issue, terminalStatuses)) return false;
  return true;
}

export function findPausedOwnerDelegatedRoutingRepairChain({
  rootBlocker,
  sourceIssues,
  relatedIssues,
  allIssues,
  terminalStatuses,
}) {
  const lookup = issueLookup([...(relatedIssues ?? []), ...(allIssues ?? [])]);
  const rootIssue = lookup.get(rootBlocker);
  if (!isRunnablePausedOwnerRoot(rootIssue, terminalStatuses)) return null;

  const rootKey = rootIssue.identifier ?? rootIssue.id;
  const blockedSources = sourceIssues.filter((issue) => issue.status === "blocked");
  if (blockedSources.length !== sourceIssues.length) return null;

  const everySourceCovered = blockedSources.every((issue) => {
    if (issue.identifier === rootIssue.identifier || issue.id === rootIssue.id) return true;
    if (blockerPath(issue, rootKey, lookup)) return true;
    return blockerAttentionReferencesRoot(issue, rootKey);
  });
  if (!everySourceCovered) return null;

  const staleActiveReleaseGate = relatedIssues.some((issue) =>
    isStaleActiveReleaseGate(issue)
    && !issueMatchesKey(issue, rootKey)
  );
  if (staleActiveReleaseGate) return null;

  const trueReleaseFailure = relatedIssues.some((issue) =>
    !terminalStatuses.has(issue.status)
    && !issueMatchesKey(issue, rootKey)
    && hasHardReleaseFailureEvidence(issue)
  );
  if (trueReleaseFailure) return null;

  const repairIssue = (allIssues ?? relatedIssues)
    .filter((issue) =>
      !terminalStatuses.has(issue.status)
      && !issueMatchesKey(issue, rootKey)
      && isPausedOwnerRoutingRepairIssue(issue, rootKey)
    )
    .sort((a, b) => delegatedRecoveryStatusRank(a) - delegatedRecoveryStatusRank(b))[0] ?? null;
  if (!repairIssue) return null;

  return {
    rootIssue,
    repairIssue,
  };
}

export function findCompletedBlockerDelegatedRecoveryChain({
  rootBlocker,
  sourceIssues,
  relatedIssues,
  allIssues,
  terminalStatuses,
}) {
  const lookup = issueLookup(relatedIssues);
  const rootIssue = lookup.get(rootBlocker);
  if (!rootIssue) return null;
  if (rootIssue.status !== "blocked") return null;
  if (!isOpsReleaseIssue(rootIssue)) return null;
  if (!hasNamedUnblockPacket(rootIssue)) return null;

  const rootKey = rootIssue.identifier ?? rootIssue.id;
  const blockedSources = sourceIssues.filter((issue) => issue.status === "blocked");
  if (blockedSources.length !== sourceIssues.length) return null;

  const rootBlockers = [...new Map(
    blockerKeys(rootIssue)
      .map((key) => lookup.get(key))
      .filter(Boolean)
      .map((issue) => [issue.identifier ?? issue.id, issue])
  ).values()];
  if (rootBlockers.length === 0) return null;
  const completedBlockers = rootBlockers.filter((issue) => terminalStatuses.has(issue.status));
  if (completedBlockers.length !== rootBlockers.length) return null;

  const staleActiveReleaseGate = relatedIssues.some(isStaleActiveReleaseGate);
  if (staleActiveReleaseGate) return null;

  const trueReleaseFailure = relatedIssues.some((issue) =>
    !terminalStatuses.has(issue.status)
    && !issueMatchesKey(issue, rootKey)
    && hasExplicitFailedReleaseGateEvidence(issue)
  );
  if (trueReleaseFailure) return null;

  const everySourceCovered = blockedSources.every((issue) => {
    if (issue.identifier === rootIssue.identifier || issue.id === rootIssue.id) return true;
    if (blockerPath(issue, rootKey, lookup)) return true;
    return blockerAttentionReferencesRoot(issue, rootKey);
  });
  if (!everySourceCovered) return null;

  const recoveryIssue = (allIssues ?? relatedIssues)
    .filter((issue) =>
      !terminalStatuses.has(issue.status)
      && !issueMatchesKey(issue, rootKey)
      && isDelegatedCompletedBlockerRecoveryIssue(issue, rootKey)
    )
    .sort((a, b) => delegatedRecoveryStatusRank(a) - delegatedRecoveryStatusRank(b))[0] ?? null;
  if (!recoveryIssue) return null;

  return {
    rootIssue,
    completedBlockers,
    recoveryIssue,
  };
}

export function findStaleNonReleaseRootProtectedBacklogChain({
  rootBlocker,
  sourceIssues,
  relatedIssues,
  terminalStatuses,
}) {
  const lookup = issueLookup(relatedIssues);
  const rootIssue = lookup.get(rootBlocker);
  if (!rootIssue) return null;
  if (terminalStatuses.has(rootIssue.status)) return null;
  if (!isNonReleaseRootEvidence(rootIssue)) return null;

  const blockedSources = sourceIssues.filter((issue) => issue.status === "blocked");
  if (blockedSources.length !== sourceIssues.length) return null;

  const staleActiveReleaseGate = relatedIssues.some(isStaleActiveReleaseGate);
  if (staleActiveReleaseGate) return null;

  const candidates = relatedIssues
    .filter((issue) => issue.status === "blocked" && hasNamedUnblockPacket(issue))
    .filter((issue) => !issueMatchesKey(issue, rootBlocker))
    .filter(isProtectedBacklogOrGate)
    .map((issue) => {
      const key = issue.identifier ?? issue.id;
      const paths = blockedSources.map((source) => blockerPath(source, key, lookup));
      if (paths.some((path) => path === null)) return null;
      return {
        issue,
        depth: Math.max(...paths.map((path) => path.length)),
      };
    })
    .filter(Boolean)
    .sort((a, b) => b.depth - a.depth);

  return candidates[0]?.issue ?? null;
}

export function findProjectMutationSourceControlGuardChain({
  rootBlocker,
  sourceIssues,
  relatedIssues,
  terminalStatuses,
}) {
  const lookup = issueLookup(relatedIssues);
  const blockedSources = sourceIssues.filter(isProjectMutationSourceControlGuardCandidate);
  if (blockedSources.length !== sourceIssues.length) return null;

  const guardRoots = relatedIssues.filter(isProjectMutationSourceControlGuard);
  const rootIssue = lookup.get(rootBlocker);
  const guardRoot = guardRoots.find((issue) => issueMatchesKey(issue, rootBlocker))
    ?? (rootIssue && isProjectMutationSourceControlGuard(rootIssue) ? rootIssue : null);
  if (!guardRoot) return null;

  const staleActiveReleaseGate = relatedIssues.some(isStaleActiveReleaseGate);
  if (staleActiveReleaseGate) return null;

  const trueReleaseFailure = relatedIssues.some((issue) =>
    !isProjectMutationSourceControlGuard(issue)
    && hasReleaseFailureEvidence(issue)
  );
  if (trueReleaseFailure) return null;

  const guardKey = guardRoot.identifier ?? guardRoot.id;
  const everySourceCovered = blockedSources.every((issue) => {
    if (issue.identifier === guardRoot.identifier || issue.id === guardRoot.id) return true;
    if (issue.status === "cancelled" && isProjectMutationBoardAccessCancelledIssue(issue)) return true;
    if (isProjectMutationSourceControlGuard(issue)) return true;
    if (blockerPath(issue, guardKey, lookup)) return true;
    return blockerAttentionReferencesRoot(issue, guardKey);
  });
  if (!everySourceCovered) return null;

  return guardRoot;
}

export function findQaToolingProofBlockedChain({
  rootBlocker,
  sourceIssues,
  relatedIssues,
  terminalStatuses,
}) {
  const lookup = issueLookup(relatedIssues);
  const rootIssue = lookup.get(rootBlocker);
  if (!isQaToolingProofRoot(rootIssue, terminalStatuses)) return null;

  const rootKey = rootIssue.identifier ?? rootIssue.id;
  const blockedSources = sourceIssues.filter((issue) => issue.status === "blocked");
  if (blockedSources.length !== sourceIssues.length) return null;

  const everySourceCovered = blockedSources.every((issue) => {
    if (issue.identifier === rootIssue.identifier || issue.id === rootIssue.id) return true;
    if (blockerPath(issue, rootKey, lookup)) return true;
    return blockerAttentionReferencesRoot(issue, rootKey);
  });
  if (!everySourceCovered) return null;

  const staleActiveReleaseGate = relatedIssues.some((issue) =>
    isStaleActiveReleaseGate(issue)
    && !issueMatchesKey(issue, rootKey)
    && !isQaToolingProofRoot(issue, terminalStatuses)
  );
  if (staleActiveReleaseGate) return null;

  const trueReleaseFailure = relatedIssues.some((issue) =>
    !terminalStatuses.has(issue.status)
    && !issueMatchesKey(issue, rootKey)
    && hasHardReleaseFailureEvidence(issue)
  );
  if (trueReleaseFailure) return null;

  return rootIssue;
}

export function findBoardAuthorizationWaitChain({
  rootBlocker,
  sourceIssues,
  relatedIssues,
  terminalStatuses,
}) {
  const lookup = issueLookup(relatedIssues);
  const rootIssue = lookup.get(rootBlocker);
  if (!isBoardAuthorizationWaitRoot(rootIssue, terminalStatuses)) return null;

  const rootKey = rootIssue.identifier ?? rootIssue.id;
  const blockedSources = sourceIssues.filter((issue) => issue.status === "blocked");
  if (blockedSources.length !== sourceIssues.length) return null;

  const everySourceCovered = blockedSources.every((issue) => {
    if (issue.identifier === rootIssue.identifier || issue.id === rootIssue.id) return true;
    if (blockerPath(issue, rootKey, lookup)) return true;
    return blockerAttentionReferencesRoot(issue, rootKey);
  });
  if (!everySourceCovered) return null;

  const staleActiveReleaseGate = relatedIssues.some((issue) =>
    isStaleActiveReleaseGate(issue)
    && !issueMatchesKey(issue, rootKey)
    && !isBoardAuthorizationWaitRoot(issue, terminalStatuses)
  );
  if (staleActiveReleaseGate) return null;

  const trueReleaseFailure = relatedIssues.some((issue) =>
    !terminalStatuses.has(issue.status)
    && !issueMatchesKey(issue, rootKey)
    && hasHardReleaseFailureEvidence(issue)
  );
  if (trueReleaseFailure) return null;

  return rootIssue;
}

export function findControlPlaneWriteBoundaryRecoveryChain({
  rootBlocker,
  sourceIssues,
  relatedIssues,
  terminalStatuses,
}) {
  const lookup = issueLookup(relatedIssues);
  const rootIssue = lookup.get(rootBlocker);
  if (!isControlPlaneWriteBoundaryRecoveryRoot(rootIssue, terminalStatuses)) return null;

  const rootKey = rootIssue.identifier ?? rootIssue.id;
  const blockedSources = sourceIssues.filter((issue) => issue.status === "blocked");
  if (blockedSources.length !== sourceIssues.length) return null;

  const everySourceCovered = blockedSources.every((issue) => {
    if (issue.identifier === rootIssue.identifier || issue.id === rootIssue.id) return true;
    if (blockerPath(issue, rootKey, lookup)) return true;
    return blockerAttentionReferencesRoot(issue, rootKey);
  });
  if (!everySourceCovered) return null;

  const staleActiveReleaseGate = relatedIssues.some((issue) =>
    isStaleActiveReleaseGate(issue)
    && !issueMatchesKey(issue, rootKey)
  );
  if (staleActiveReleaseGate) return null;

  const trueReleaseFailure = relatedIssues.some((issue) =>
    !terminalStatuses.has(issue.status)
    && !issueMatchesKey(issue, rootKey)
    && !blockerAttentionReferencesRoot(issue, rootKey)
    && hasHardReleaseFailureEvidence(issue)
  );
  if (trueReleaseFailure) return null;

  return rootIssue;
}

export function findProtectedCoolifyVpsBindingWaitChain({
  rootBlocker,
  sourceIssues,
  relatedIssues,
  terminalStatuses,
}) {
  const lookup = issueLookup(relatedIssues);
  const rootIssue = lookup.get(rootBlocker);
  if (!isProtectedCoolifyVpsBindingWaitRoot(rootIssue, terminalStatuses)) return null;

  const rootKey = rootIssue.identifier ?? rootIssue.id;
  const blockedSources = sourceIssues.filter((issue) => issue.status === "blocked");
  if (blockedSources.length !== sourceIssues.length) return null;

  const everySourceCovered = blockedSources.every((issue) => {
    if (issue.identifier === rootIssue.identifier || issue.id === rootIssue.id) return true;
    if (blockerPath(issue, rootKey, lookup)) return true;
    return blockerAttentionReferencesRoot(issue, rootKey);
  });
  if (!everySourceCovered) return null;

  const staleActiveReleaseGate = relatedIssues.some((issue) =>
    isStaleActiveReleaseGate(issue)
    && !issueMatchesKey(issue, rootKey)
  );
  if (staleActiveReleaseGate) return null;

  const trueReleaseFailure = relatedIssues.some((issue) =>
    !terminalStatuses.has(issue.status)
    && !issueMatchesKey(issue, rootKey)
    && !blockerAttentionReferencesRoot(issue, rootKey)
    && hasHardReleaseFailureEvidence(issue)
  );
  if (trueReleaseFailure) return null;

  return rootIssue;
}

function hasProtectedCapabilityCredentialMismatch(issue) {
  const text = `${issue?.title ?? ""}\n${issue?.description ?? ""}`.toLowerCase();
  const namesProtectedBoundary = /protected|coolify|vps|provider|credential|permission|capability|auth|token|secret/.test(text);
  const namesDeniedMutation = (
    /(missing required permissions?|missing .*permissions?|forbidden|denied|read-only|read only|403)/.test(text)
    && /(post|patch|put|delete|restart|deploy|mutation|action|api\/v1|provider)/.test(text)
  ) || /missing required permissions:\s*[a-z0-9_-]+/.test(text);
  const keepsEvidenceRedacted = /(redacted|value-free|value free|names-only|names only|without exposing|no secret values|no raw secret|do not print|do not paste|do not .*secret disclosure)/.test(text);
  const keepsLeastPrivilegeScope = /(least-privilege|least privilege|owner\/action|unblock owner\/action|required action|single .*owner action|narrow owner path)/.test(text);
  const forbidsBroaderSubstitute = /(no deploy|do not deploy|no .*rebuild|do not .*rebuild|no .*restart|do not .*restart|no .*production mutation|do not .*production mutation|no broader substitute|do not widen)/.test(text);
  return namesProtectedBoundary
    && namesDeniedMutation
    && keepsEvidenceRedacted
    && keepsLeastPrivilegeScope
    && forbidsBroaderSubstitute;
}

function rootPathIssuesForSource(rootIssue, source, lookup) {
  if (!rootIssue || !source) return null;
  const rootKey = rootIssue.identifier ?? rootIssue.id;
  if (source.identifier === rootIssue.identifier || source.id === rootIssue.id) return [rootIssue];
  const path = compliantPathToRoot(source, rootIssue, lookup);
  if (path) return [...path, rootIssue];
  if (blockerAttentionReferencesRoot(source, rootKey)) return [rootIssue];
  return null;
}

export function findCoveredProtectedCapabilityCredentialChain({
  rootBlocker,
  sourceIssues,
  relatedIssues,
  terminalStatuses,
}) {
  const lookup = issueLookup(relatedIssues);
  const rootIssue = lookup.get(rootBlocker);
  if (!rootIssue) return null;
  if (terminalStatuses.has(rootIssue.status)) return null;
  if (rootIssue.status !== "blocked" && rootIssue.status !== "todo" && rootIssue.status !== "in_review") return null;
  if (!hasProtectedCapabilityCredentialMismatch(rootIssue)) return null;

  const blockedSources = sourceIssues.filter((issue) => issue.status === "blocked");
  if (blockedSources.length !== sourceIssues.length) return null;

  const sourcePaths = blockedSources.map((issue) => rootPathIssuesForSource(rootIssue, issue, lookup));
  if (sourcePaths.some((path) => path === null)) return null;

  const pathIssues = new Map();
  for (const path of sourcePaths) {
    for (const issue of path ?? []) {
      pathIssues.set(issue.identifier ?? issue.id, issue);
    }
  }

  const staleActiveReleaseGate = relatedIssues.some((issue) =>
    isStaleActiveReleaseGate(issue)
    && !pathIssues.has(issue.identifier ?? issue.id)
  );
  if (staleActiveReleaseGate) return null;

  const trueReleaseFailure = relatedIssues.some((issue) =>
    !terminalStatuses.has(issue.status)
    && !pathIssues.has(issue.identifier ?? issue.id)
    && hasHardReleaseFailureEvidence(issue)
  );
  if (trueReleaseFailure) return null;

  const everyPathContractCompliant = [...pathIssues.values()].every((issue) => {
    if (issueMatchesKey(issue, rootBlocker)) return hasProtectedCapabilityCredentialMismatch(issue);
    if (terminalStatuses.has(issue.status)) return true;
    if (issue.status === "in_review" && issue.assigneeUserId) return true;
    return issue.status === "blocked"
      || blockerAttentionReferencesRoot(issue, rootIssue.identifier ?? rootIssue.id);
  });
  if (!everyPathContractCompliant) return null;

  return rootIssue;
}

export function findSuppressibleV1LearningDuplicate({
  issues,
  terminalStatuses,
  rootBlocker,
  area,
  boundary,
  sourceIssues,
  now = new Date(),
  minimumRepeatIntervalMs = 24 * 60 * 60 * 1000,
}) {
  const signature = learningSignature({ rootBlocker, area, boundary });
  const matches = issues.filter((issue) => parseV1LearningSignature(issue)?.signature === signature);
  if (matches.length === 0) return null;

  const openMatch = matches.find((issue) => !terminalStatuses.has(issue.status));
  if (openMatch) return null;

  const latest = latestIssue(matches);
  if (!latest || latest.status !== "done") return null;
  const latestUpdatedAt = Date.parse(latest.updatedAt ?? latest.createdAt ?? "");
  const nowTime = now instanceof Date ? now.getTime() : Date.parse(String(now));
  if (
    Number.isFinite(latestUpdatedAt)
    && Number.isFinite(nowTime)
    && nowTime - latestUpdatedAt < minimumRepeatIntervalMs
  ) {
    return latest;
  }
  if (sourceHasNewDelta(sourceIssues, latest)) return null;
  if (sourceHasMissingBlockerDisposition(sourceIssues)) return null;

  return latest;
}

function hasFirstClassUnresolvedBlocker(issue, terminalStatuses) {
  return (issue.blockedBy ?? []).some((blocker) => !terminalStatuses.has(blocker.status));
}

export function findSuppressibleV2WorkerFanoutDuplicate({
  issues,
  terminalStatuses,
  plannedWorkerIssueCount,
  plannedSupervisorIssueCount,
  plannedIssueCount,
  weakTrackSummaries = [],
  sourceIssues,
  now = new Date(),
  minimumRepeatIntervalMs = 24 * 60 * 60 * 1000,
}) {
  const title = "[Softwarehouse][Learning] Worker queue fan-out capability gap";
  const signature = fanoutLearningSignature({
    title,
    plannedWorkerIssueCount,
    plannedSupervisorIssueCount,
    plannedIssueCount,
    weakTrackSummaries,
  });
  const currentWeakTrackNames = fanoutWeakTrackNames(weakTrackSummaries);
  const parsedIssues = issues
    .map((issue) => ({ issue, parsed: parseV2WorkerFanoutLearningSignature(issue) }))
    .filter((entry) => entry.parsed);
  const recentFamilyMatch = latestIssue(parsedIssues
    .filter(({ parsed }) => currentWeakTrackNames.length > 0
      && sameStringArray(parsed.weakTrackNames, currentWeakTrackNames))
    .map(({ issue }) => issue));
  if (recentFamilyMatch && !terminalStatuses.has(recentFamilyMatch.status)) return recentFamilyMatch;
  if (recentFamilyMatch?.status === "done") {
    const latestUpdatedAt = issueTimestamp(recentFamilyMatch);
    const nowTime = now instanceof Date ? now.getTime() : Date.parse(String(now));
    if (
      Number.isFinite(latestUpdatedAt)
      && Number.isFinite(nowTime)
      && nowTime - latestUpdatedAt < minimumRepeatIntervalMs
    ) return recentFamilyMatch;
  }

  const matches = parsedIssues.filter(({ parsed }) => {
    if (parsed.signature === signature) return true;
    if (weakTrackSummaries.length > 0) {
      const parsedWeakTracks = parsed.weakTrackSummaries ?? [];
      if (parsedWeakTracks.length === 0) return false;
      const parsedWeakTrackSet = new Set(parsedWeakTracks.map((item) => item.toLowerCase()));
      const allWeakTracksCovered = weakTrackSummaries.every((item) =>
        parsedWeakTrackSet.has(String(item).toLowerCase())
      );
      if (!allWeakTracksCovered) return false;
    }
    return parsed.plannedWorkerIssueCount >= plannedWorkerIssueCount
      && parsed.plannedSupervisorIssueCount >= plannedSupervisorIssueCount
      && parsed.plannedIssueCount >= plannedIssueCount;
  }).map(({ issue }) => issue);
  if (matches.length === 0) return null;

  const openOwner = matches.find((issue) =>
    !terminalStatuses.has(issue.status)
    && issue.status !== "blocked"
  );
  if (openOwner) return openOwner;

  const latest = latestIssue(matches);
  if (!latest) return null;
  if (latest.status === "done") return latest;
  if (latest.status === "blocked" && !hasFirstClassUnresolvedBlocker(latest, terminalStatuses)) {
    return latest;
  }

  return null;
}

export function findSuppressibleV2ReviewDecisionPathDuplicate({
  issues,
  terminalStatuses,
  sourceIssueIdentifiers,
}) {
  const title = "[Softwarehouse][Learning] In-review decision path capability gap";
  const signature = reviewDecisionPathLearningSignature({
    title,
    sourceIssueIdentifiers: sourceIssueIdentifiers.slice().sort(),
  });
  const matches = issues.filter((issue) =>
    parseV2ReviewDecisionPathLearningSignature(issue)?.signature === signature
  );
  if (matches.length === 0) return null;

  const openOwner = matches.find((issue) => !terminalStatuses.has(issue.status));
  if (openOwner) return openOwner;

  const latest = latestIssue(matches);
  return latest?.status === "done" ? latest : null;
}
