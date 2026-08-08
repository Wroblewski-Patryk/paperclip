import { readFile } from "node:fs/promises";
import { rootBlockerIdentifierFor } from "./lib/issue-blockers.mjs";
import { resolveIssuesByIdentifier } from "./lib/issue-discovery.mjs";
import { normalizeKey } from "./lib/secret-aliases.mjs";
import { gateFreshnessObservation } from "./lib/gate-freshness.mjs";
import { softwarehouseGateSpecs } from "./lib/softwarehouse-gates.mjs";
import {
  collectNonTerminalBlockerLeaves,
  knownGateRootIdentifiers,
} from "./lib/delivery-blocker-graph.mjs";
import {
  approvalRows,
  hasPendingIssueApproval,
  hasPendingReviewInteraction,
  interactionRows,
} from "./lib/softwarehouse-routine-gates.mjs";
import { canonicalSoftwarehouseRoutineTitle } from "./lib/softwarehouse-active-routines.mjs";

const apiBase = process.env.PAPERCLIP_API_URL ?? "http://127.0.0.1:3200";
const companyNames = [
  process.env.SOFTWAREHOUSE_COMPANY_NAME,
  process.env.PAPERCLIP_COMPANY_NAME,
  "LuckySparrow",
  "LuckySparrow Software House",
].filter(Boolean);
const companyId = process.env.PAPERCLIP_COMPANY_ID ?? null;
const currentGovernorRunId = process.env.PAPERCLIP_RUN_ID ?? null;
const requestTimeoutMs = Number(process.env.SOFTWAREHOUSE_AUTONOMY_GOVERNOR_REQUEST_TIMEOUT_MS ?? 30_000);
const issuePageSize = Number(process.env.SOFTWAREHOUSE_AUTONOMY_GOVERNOR_ISSUE_PAGE_SIZE ?? 50);
const requestRetryCount = Number(process.env.SOFTWAREHOUSE_AUTONOMY_GOVERNOR_REQUEST_RETRIES ?? 1);
const requestRetryBaseDelayMs = Number(process.env.SOFTWAREHOUSE_AUTONOMY_GOVERNOR_RETRY_BASE_DELAY_MS ?? 500);
const deliveryParentIdentifier = process.env.SOFTWAREHOUSE_DELIVERY_PARENT_IDENTIFIER ?? "LUC-25";

const terminalStatuses = new Set(["done", "cancelled"]);
const runnableStatuses = new Set(["todo", "backlog"]);
const configuredGateRootIdentifiers = new Set(softwarehouseGateSpecs.map((spec) => spec.rootBlocker));
const safeNonProductionLaneTitle = "[Soar][Safe Lane] Non-production architecture/status refresh while gate is blocked";
const triageTargetPattern = /^\[Softwarehouse\]\[Blocked Triage\] Classify ([^\s]+) and produce next legal action$/;
const safeNonProductionCooldownMs = 6 * 60 * 60 * 1000;
const noEvidenceSafeLaneCooldownMs = 24 * 60 * 60 * 1000;
const governorSelfSupervisionMinAgeMs = Number.parseInt(
  process.env.SOFTWAREHOUSE_GOVERNOR_SELF_SUPERVISION_MIN_AGE_MS ?? `${90 * 1000}`,
  10,
);
const terminalTriageCooldownMs = Number.parseInt(
  process.env.SOFTWAREHOUSE_BLOCKED_TRIAGE_COOLDOWN_MS ?? `${24 * 60 * 60 * 1000}`,
  10,
);
const controlledProjectNames = new Set(
  (process.env.SOFTWAREHOUSE_LOCAL_REPAIR_PROJECTS ?? "Soar,Roost,Featherly,Softwarehouse Operating System")
    .split(",")
    .map((name) => name.trim())
    .filter(Boolean),
);
const projectAliases = new Map([
  ["Soar", ["Soar", "11 Innovation: Soar"]],
  ["Roost", ["Roost", "11 Innovation: Roost"]],
  ["Featherly", ["Featherly", "11 Innovation: Featherly"]],
  ["Softwarehouse Operating System", ["Softwarehouse Operating System", "00 General: Softwarehouse"]],
  ["Aviary", ["Aviary", "Personality"]],
]);
const staleBlockerRepairs = new Map([
  ["LUC-12", { staleBlocker: "LUC-45", replacementBlocker: "LUC-241" }],
]);
const gateSecretKeys = new Map(softwarehouseGateSpecs.map((spec) => [spec.rootBlocker, spec.secretKeys]));
function issueKey(issue) {
  return issue?.identifier ?? issue?.id ?? null;
}

function isKnownIntentionalBlockedIssue(issue) {
  const title = String(issue.title ?? "");
  const description = String(issue.description ?? "");
  const labels = (issue.labels ?? []).map((label) => String(label.name ?? "").toLowerCase());
  const architectureArbLane = /\[Soar\]\[ARB-\d+\]/i.test(title)
    && labels.includes("architecture")
    && labels.includes("delivery");
  const protectedEvidenceOpsLane = /\[Soar\]\[ARB-\d+\]\[Ops\]/i.test(title)
    && /protected evidence|input readiness|fail-closed/i.test(`${title}\n${description}`);
  const explicitlyDecisionBound = /decision|required input|once .* active|dependency|blocked_on_inputs|protected inputs/i.test(description);
  return (architectureArbLane && explicitlyDecisionBound) || protectedEvidenceOpsLane;
}

function isProductivityReviewIssue(issue) {
  const title = String(issue.title ?? "").toLowerCase();
  return title.startsWith("review productivity for ")
    || issue.originKind === "issue_productivity_review";
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

async function request(method, route) {
  let lastError = null;
  for (let attempt = 0; attempt <= requestRetryCount; attempt += 1) {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), requestTimeoutMs);
    try {
      const response = await fetch(`${apiBase}${route}`, {
        method,
        headers: { "content-type": "application/json" },
        signal: controller.signal,
      });
      const text = await response.text();
      const data = text ? JSON.parse(text) : null;
      if (!response.ok) {
        const error = new Error(`${method} ${route} failed with ${response.status}: ${text}`);
        error.status = response.status;
        throw error;
      }
      return data;
    } catch (error) {
      lastError = error?.name === "AbortError"
        ? new Error(`${method} ${route} timed out after ${requestTimeoutMs}ms`)
        : error;
      const retryable = error?.name === "AbortError" || error?.status === 429 || error?.status >= 500;
      if (!retryable || attempt >= requestRetryCount) throw lastError;
      await new Promise((resolve) => setTimeout(resolve, requestRetryBaseDelayMs * (attempt + 1)));
    } finally {
      clearTimeout(timeout);
    }
  }
  throw lastError;
}

function isRequestTimeoutError(error) {
  return error instanceof Error && /timed out after \d+ms/.test(error.message);
}

async function requestAllPages(route, { limit = issuePageSize } = {}) {
  const rows = [];
  for (let offset = 0; ; offset += limit) {
    const separator = route.includes("?") ? "&" : "?";
    const page = await request("GET", `${route}${separator}limit=${limit}&offset=${offset}`);
    if (!Array.isArray(page)) {
      throw new Error(`Expected paginated route to return an array: ${route}`);
    }
    rows.push(...page);
    if (page.length < limit) return rows;
  }
}

function uniqueIssues(sets) {
  const byId = new Map();
  for (const issue of sets.flat()) {
    if (issue?.id) byId.set(issue.id, issue);
  }
  return Array.from(byId.values());
}

async function requestGovernorIssues(resolvedCompanyId) {
  const openStatuses = "todo,backlog,in_progress,in_review,blocked";
  const terminalStatusesQuery = "done,cancelled";
  const terminalTriageQuery = encodeURIComponent("[Softwarehouse][Blocked Triage]");
  const safeLaneQuery = encodeURIComponent(safeNonProductionLaneTitle);
  const [openIssues, recentTerminalIssues, terminalTriageIssues, safeLaneIssues] = await Promise.all([
    requestAllPages(`/api/companies/${resolvedCompanyId}/issues?status=${openStatuses}`),
    request("GET", `/api/companies/${resolvedCompanyId}/issues?status=${terminalStatusesQuery}&limit=${issuePageSize}&offset=0`),
    request("GET", `/api/companies/${resolvedCompanyId}/issues?status=${terminalStatusesQuery}&q=${terminalTriageQuery}&limit=${issuePageSize}&offset=0`),
    request("GET", `/api/companies/${resolvedCompanyId}/issues?q=${safeLaneQuery}&limit=${issuePageSize}&offset=0`),
  ]);
  return uniqueIssues([openIssues, recentTerminalIssues, terminalTriageIssues, safeLaneIssues]);
}

async function requestSecretsMetadata(resolvedCompanyId) {
  try {
    return {
      secrets: await request("GET", `/api/companies/${resolvedCompanyId}/secrets/metadata`),
      unavailable: false,
      fallbackRoute: null,
    };
  } catch (error) {
    if (error?.status !== 404) throw error;
  }
  return {
    secrets: await request("GET", `/api/companies/${resolvedCompanyId}/secrets`),
    unavailable: false,
    fallbackRoute: "/secrets",
  };
}

function ageMs(timestamp) {
  return timestamp ? Date.now() - new Date(timestamp).getTime() : Number.POSITIVE_INFINITY;
}

function isCurrentGovernorRun(run) {
  return Boolean(currentGovernorRunId && run?.id === currentGovernorRunId);
}

function blockingActiveRunCountFor({ activeRunCount, liveRuns }) {
  const selfRunCount = liveRuns.filter((run) => isCurrentGovernorRun(run)).length;
  return Math.max(0, activeRunCount - selfRunCount);
}

async function existingGateRecheckChildFor(issue, rootBlocker, allIssues, resolvedCompanyId) {
  if (!issue) return null;
  const expectedTitle = new RegExp(`^\\[Gate recheck\\]\\[${rootBlocker.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}\\] `);
  const localMatch = allIssues.find((candidate) =>
    candidate.parentId === issue.id
    && !terminalStatuses.has(candidate.status)
    && expectedTitle.test(candidate.title ?? "")
  ) ?? null;
  if (localMatch) return localMatch;

  const children = await request(
    "GET",
    `/api/companies/${resolvedCompanyId}/issues?parentId=${encodeURIComponent(issue.id)}&limit=100`,
  )
    .then((result) => result.value ?? result ?? [])
    .catch(() => []);
  return children.find((candidate) =>
    candidate.parentId === issue.id
    && !terminalStatuses.has(candidate.status)
    && expectedTitle.test(candidate.title ?? "")
  ) ?? null;
}

async function readLatestSourceControlPacket() {
  const packetPath = "report/softwarehouse-source-control.latest.json";
  try {
    const raw = await readFile(packetPath, "utf8");
    const packet = JSON.parse(raw);
    const maxAgeMs = 15 * 60 * 1000;
    if (ageMs(packet.generatedAt) > maxAgeMs) {
      return {
        stale: true,
        generatedAt: packet.generatedAt ?? null,
        dirtyProjectRepos: [],
        dirtyOperatingRepos: [],
      };
    }

    const dirtyRepos = (packet.repos ?? []).filter((repo) => repo.clean === false);
    return {
      stale: false,
      generatedAt: packet.generatedAt ?? null,
      dirtyProjectRepos: dirtyRepos.filter((repo) => repo.name !== "Paperclip_Softwarehouse"),
      dirtyOperatingRepos: dirtyRepos.filter((repo) => repo.name === "Paperclip_Softwarehouse"),
    };
  } catch {
    return {
      stale: true,
      generatedAt: null,
      dirtyProjectRepos: [],
      dirtyOperatingRepos: [],
    };
  }
}

async function hasNoEvidenceClosure(issue) {
  if (!issue || issue.status !== "cancelled") return false;
  const comments = await request("GET", `/api/issues/${issue.id}/comments?order=desc&limit=8`)
    .catch(() => []);
  return comments.some((comment) =>
    /\bno[- ]evidence\b/i.test(comment.body ?? "")
    || /without evidence/i.test(comment.body ?? "")
    || /bez dowodu/i.test(comment.body ?? "")
  );
}

async function resolveCompany() {
  if (companyId) return { id: companyId, source: "PAPERCLIP_COMPANY_ID" };

  const companies = await request("GET", "/api/companies");
  const company = companies.find((candidate) => companyNames.includes(candidate.name));
  if (!company) throw new Error(`Company not found. Tried: ${companyNames.join(", ")}`);
  return { id: company.id, source: "company_name" };
}

const company = await resolveCompany();

let health;
let projects;
let issues;
let liveRuns;
let secrets;
let secretsMetadataFallbackRoute = null;
let secretsMetadataUnavailable = false;
try {
  [health, projects, issues, liveRuns] = await Promise.all([
    request("GET", "/api/health"),
    request("GET", `/api/companies/${company.id}/projects`),
    requestGovernorIssues(company.id),
    request("GET", `/api/companies/${company.id}/live-runs`),
  ]);
  try {
    const metadata = await requestSecretsMetadata(company.id);
    secrets = metadata.secrets;
    secretsMetadataFallbackRoute = metadata.fallbackRoute;
  } catch (error) {
    if (error?.status !== 404) throw error;
    secrets = [];
    secretsMetadataUnavailable = true;
  }
} catch (error) {
  if (!isRequestTimeoutError(error)) throw error;
  console.log(JSON.stringify({
    apiBase,
    company: { id: company.id, source: company.source },
    decision: "api_scan_degraded",
    recommendedAction: "Restore local Paperclip API issue-list responsiveness, then rerun node scripts/run-autonomy-governor.mjs or pnpm softwarehouse:control-tick.",
    operatingPosture: "control_tick_failed",
    candidateScanStatus: "timed_out",
    requestTimeoutMs,
    requestRetryCount,
    issuePageSize,
    activeRunCount: null,
    allowedWhileBlocked: ["verify and commit/classify Paperclip OS changes"],
    forbiddenWhileBlocked: ["push", "deploy", "production mutation", "secret disclosure", "duplicate source-control cleanup"],
    counts: {
      runnableIssues: null,
      blockedIssues: null,
      freshGateActions: null,
    },
    actions: [{
      action: "skip_autonomy_governor_candidate_scan_timeout",
      status: "degraded",
      ownerAction: "Restore local Paperclip API issue-list responsiveness; issue scans timed out before the governor could safely classify runnable work.",
    }],
  }, null, 2));
  process.exit(0);
}

const activeRunCount = health.devServer?.activeRunCount ?? liveRuns.length;
const activeProjectById = new Map(projects.filter((project) => !project.archivedAt).map((project) => [project.id, project]));
const controlledProjectIdToName = new Map();
for (const name of controlledProjectNames) {
  const aliases = projectAliases.get(name) ?? [name];
  for (const alias of aliases) {
    const project = projects.find((candidate) => candidate.name === alias && !candidate.archivedAt);
    if (project) controlledProjectIdToName.set(project.id, name);
  }
}
const activeProjectIds = new Set(projects.filter((project) => !project.archivedAt).map((project) => project.id));
const issueByIdentifier = new Map(issues.map((issue) => [issue.identifier, issue]));
const gateIssueByIdentifier = await resolveIssuesByIdentifier({
  companyId: company.id,
  identifiers: Array.from(configuredGateRootIdentifiers),
  issues,
  request,
});
const deliveryParentIssueByIdentifier = await resolveIssuesByIdentifier({
  companyId: company.id,
  identifiers: [deliveryParentIdentifier],
  issues,
  request,
});
const deliveryParentIssueSummary = deliveryParentIssueByIdentifier.get(deliveryParentIdentifier) ?? null;
// Issue list rows omit blocker relationships, so traverse from the full issue detail.
const deliveryParentIssue = deliveryParentIssueSummary
  ? await request("GET", `/api/issues/${encodeURIComponent(deliveryParentIdentifier)}`)
  : null;
const deliveryBlockerGraph = deliveryParentIssue && !terminalStatuses.has(deliveryParentIssue.status)
  ? await collectNonTerminalBlockerLeaves({
    rootIssue: deliveryParentIssue,
    terminalStatuses,
    loadIssue: (identifier) => request("GET", `/api/issues/${encodeURIComponent(identifier)}`),
  })
  : { leaves: [], visitedCount: 0, truncated: false };
const gateRootIdentifiers = knownGateRootIdentifiers({
  configuredRootIdentifiers: configuredGateRootIdentifiers,
  protectedDeliveryBlockers: deliveryBlockerGraph.leaves,
  deliveryParentIdentifier,
  truncated: deliveryBlockerGraph.truncated,
});
const terminalTriageByTarget = terminalTriageByTargetFor(issues);
const secretByKey = new Map(secrets.map((secret) => [normalizeKey(secret.key), secret]));
const openActiveIssues = issues.filter((issue) =>
  activeProjectIds.has(issue.projectId)
  && !terminalStatuses.has(issue.status)
);
const liveIssueIds = new Set(liveRuns.map((run) => run.issueId).filter(Boolean));
const issueById = new Map(issues.map((issue) => [issue.id, issue]));
const liveIssueIdentifiers = new Set([...liveIssueIds]
  .map((issueId) => issueById.get(issueId)?.identifier)
  .filter(Boolean));
const liveProjectIds = new Set(liveRuns
  .map((run) => issueById.get(run.issueId)?.projectId)
  .filter(Boolean));
const busyAgentIds = new Set(liveRuns.map((run) => run.agentId).filter(Boolean));
const isProtectedGateRootIssue = (issue) =>
  gateRootIdentifiers.has(issue.identifier)
  || gateRootIdentifiers.has(rootBlockerIdentifierFor(issue));
const recurringRoutineIssues = openActiveIssues.filter((issue) =>
  issue.originKind === "routine_execution"
);
const runnableIssues = openActiveIssues.filter((issue) =>
  runnableStatuses.has(issue.status)
  && !liveIssueIds.has(issue.id)
  && !isProtectedGateRootIssue(issue)
  && issue.originKind !== "routine_execution"
);
const protectedGateRunnableIssues = openActiveIssues.filter((issue) =>
  runnableStatuses.has(issue.status)
  && !liveIssueIds.has(issue.id)
  && isProtectedGateRootIssue(issue)
);
const independentRunnableIssues = runnableIssues.filter((issue) =>
  !liveProjectIds.has(issue.projectId)
  && (!issue.assigneeAgentId || !busyAgentIds.has(issue.assigneeAgentId))
);
const eligibleRunnableIssues = independentRunnableIssues.filter((issue) =>
  controlledProjectIdToName.has(issue.projectId)
  && Boolean(issue.assigneeAgentId)
);
const assignableRunnableIssues = independentRunnableIssues.filter((issue) =>
  controlledProjectIdToName.has(issue.projectId)
  && !issue.assigneeAgentId
  && !issue.assigneeUserId
);
const blockedIssues = openActiveIssues.filter((issue) => issue.status === "blocked");
const pendingReviewInteractionIssueIds = new Set();
const pendingReviewApprovalIssueIds = new Set();
for (const issue of openActiveIssues.filter((entry) => entry.status === "in_review")) {
  const [interactions, approvals] = await Promise.all([
    request("GET", `/api/issues/${issue.id}/interactions`)
      .then(interactionRows)
      .catch(() => []),
    request("GET", `/api/issues/${issue.id}/approvals`)
      .then(approvalRows)
      .catch(() => []),
  ]);
  if (hasPendingReviewInteraction(interactions)) pendingReviewInteractionIssueIds.add(issue.id);
  if (hasPendingIssueApproval(approvals)) pendingReviewApprovalIssueIds.add(issue.id);
}
const pendingReviewInteractionIdentifiers = new Set(openActiveIssues
  .filter((issue) => pendingReviewInteractionIssueIds.has(issue.id) || pendingReviewApprovalIssueIds.has(issue.id))
  .map((issue) => issue.identifier)
  .filter(Boolean));
const reviewIssuesWithoutPendingDecision = openActiveIssues.filter((issue) =>
  issue.status === "in_review"
  && !liveIssueIds.has(issue.id)
  && !pendingReviewInteractionIssueIds.has(issue.id)
  && !pendingReviewApprovalIssueIds.has(issue.id)
);
const liveRunIssuePairs = liveRuns.map((run) => ({ run, issue: issueById.get(run.issueId) ?? null }));
const unknownActiveRunCount = Math.max(0, activeRunCount - liveRuns.length);
const nonBlockingSelfRunCount = liveRuns.filter((run) => isCurrentGovernorRun(run)).length;
const blockingActiveRunCount = blockingActiveRunCountFor({ activeRunCount, liveRuns });
const activeControlledProjectNames = new Set(liveRunIssuePairs
  .map(({ issue }) => controlledProjectIdToName.get(issue?.projectId))
  .filter(Boolean));
const closedIssueLiveRuns = liveRunIssuePairs.filter(({ issue }) =>
  issue && terminalStatuses.has(issue.status)
);
const governorSelfSupervisionRuns = liveRunIssuePairs.filter(({ issue, run }) =>
  issue
  && canonicalSoftwarehouseRoutineTitle(issue.title) === "11 Innovation: Autonomy Governor"
  && issue.status === "in_progress"
  && ageMs(run.lastOutputAt ?? run.startedAt ?? run.createdAt) >= governorSelfSupervisionMinAgeMs
);
const soarProject = projects.find((project) => project.name === "Soar" && !project.archivedAt);
const soarOpenIssues = soarProject
  ? openActiveIssues.filter((issue) => issue.projectId === soarProject.id)
  : [];
const existingSafeNonProductionLane = openActiveIssues.find((issue) => issue.title === safeNonProductionLaneTitle);
const recentCompletedSafeNonProductionLane = issues
  .filter((issue) => issue.title === safeNonProductionLaneTitle && terminalStatuses.has(issue.status))
  .sort((left, right) => String(right.updatedAt).localeCompare(String(left.updatedAt)))[0] ?? null;
const safeNonProductionCooldownActive = Boolean(
  recentCompletedSafeNonProductionLane
  && ageMs(recentCompletedSafeNonProductionLane.updatedAt) < safeNonProductionCooldownMs
);
const recentSafeLaneWasNoEvidence = await hasNoEvidenceClosure(recentCompletedSafeNonProductionLane);
const noEvidenceSafeLaneCooldownActive = Boolean(
  recentCompletedSafeNonProductionLane
  && recentSafeLaneWasNoEvidence
  && ageMs(recentCompletedSafeNonProductionLane.updatedAt) < noEvidenceSafeLaneCooldownMs
);
const blockedIssueDetails = new Map(await Promise.all(
  blockedIssues
    .filter((issue) => staleBlockerRepairs.has(issue.identifier))
    .map(async (issue) => [issue.identifier, await request("GET", `/api/issues/${issue.identifier}`)]),
));

const gateObservations = [];
for (const identifier of gateRootIdentifiers) {
  const issue = gateIssueByIdentifier.get(identifier);
  const keys = gateSecretKeys.get(identifier) ?? [];
  const comments = issue
    ? await request("GET", `/api/issues/${issue.id}/comments?order=desc&limit=12`)
      .then((result) => result.value ?? result ?? [])
      .catch(() => [])
    : [];
  const freshness = gateFreshnessObservation({
    issue,
    comments,
    secretByKey,
    secretKeys: keys,
  });
  const existingRecheckChild = await existingGateRecheckChildFor(issue, identifier, issues, company.id);
  gateObservations.push({
    rootBlocker: identifier,
    status: issue?.status ?? null,
    issueUpdatedAt: issue?.updatedAt ?? null,
    trackedSecretCount: freshness.trackedSecretCount,
    latestSecretUpdatedAt: freshness.latestSecretUpdatedAt,
    secretUpdatedAfterIssue: freshness.secretUpdatedAfterIssue,
    hasSecretFreshnessSignal: freshness.hasSecretFreshnessSignal,
    actionableFreshGateFact: freshness.actionableFreshGateFact,
    hasExplicitApprovalOrEvidence: freshness.hasExplicitApprovalOrEvidence,
    latestCommentIsPlaceholderOnly: freshness.latestCommentIsPlaceholderOnly,
    existingRecheckChildIdentifier: existingRecheckChild?.identifier ?? null,
    existingRecheckChildStatus: existingRecheckChild?.status ?? null,
  });
}
const metadataUnavailableGateWarning = secretsMetadataUnavailable && gateRootIdentifiers.size > 0
  ? "Secret metadata endpoint is unavailable on this Paperclip instance; autonomous protected recheck freshness is disabled, but local non-secret delivery may continue."
  : null;
const freshGateActions = gateObservations.filter((gate) =>
  gate.status === "blocked"
  && gate.actionableFreshGateFact
  && !gate.latestCommentIsPlaceholderOnly
  && !gate.existingRecheckChildIdentifier
);
const sourceControlPacket = await readLatestSourceControlPacket();
const dirtyOperatingRepo = sourceControlPacket.dirtyOperatingRepos[0] ?? null;
const dirtyProjectRepo = sourceControlPacket.dirtyProjectRepos[0] ?? null;
const dirtyProjectRepoHasActiveWork = dirtyProjectRepo
  ? activeControlledProjectNames.has(dirtyProjectRepo.name)
  : false;
const dirtyProjectGroupSummary = dirtyProjectRepo
  ? (dirtyProjectRepo.dirtyGroups ?? [])
    .map((group) => `${group.group}:${group.count}`)
    .join(", ")
  : "";
const sourceControlIssueCandidates = dirtyProjectRepo
  ? openActiveIssues
    .filter((issue) => {
      const project = projects.find((candidate) => candidate.id === issue.projectId);
      const text = `${issue.title ?? ""}\n${issue.description ?? ""}`.toLowerCase();
      return project?.name === dirtyProjectRepo.name
        && /source[- ]control|uncommitted agent work|scm/i.test(text);
    })
    .sort((left, right) => {
      const leftGateScore = /queue executor gate/i.test(left.title ?? "") ? 0 : 1;
      const rightGateScore = /queue executor gate/i.test(right.title ?? "") ? 0 : 1;
      return leftGateScore - rightGateScore
        || String(right.updatedAt).localeCompare(String(left.updatedAt));
    })
  : [];
const sourceControlGateIssue = sourceControlIssueCandidates.find((issue) => issue.status === "blocked")
  ?? sourceControlIssueCandidates[0]
  ?? null;
const sourceControlGateRootBlocker = sourceControlGateIssue
  ? rootBlockerIdentifierFor(sourceControlGateIssue)
  : null;

const unknownBlockedIssues = blockedIssues
  .map((issue) => ({ issue, rootBlocker: rootBlockerIdentifierFor(issue) }))
  .filter(({ issue, rootBlocker }) =>
    !gateRootIdentifiers.has(rootBlocker)
    && !staleBlockerRepairs.has(issue.identifier)
    && !isKnownIntentionalBlockedIssue(issue)
    && !isProductivityReviewIssue(issue)
    && !pendingReviewInteractionIdentifiers.has(rootBlocker)
    && !liveIssueIdentifiers.has(rootBlocker)
    && !hasRecentTerminalTriageDisposition(issue, terminalTriageByTarget)
  );
const productivityReviewBlockedIssues = blockedIssues.filter(isProductivityReviewIssue);
const blockedIssuesWithRecentTerminalTriage = blockedIssues.filter((issue) =>
  hasRecentTerminalTriageDisposition(issue, terminalTriageByTarget)
);
const intentionallyBlockedIssues = blockedIssues.filter(isKnownIntentionalBlockedIssue);
const staleCancelledBlockers = blockedIssues
  .map((issue) => {
    const detailedIssue = blockedIssueDetails.get(issue.identifier) ?? issue;
    const repair = staleBlockerRepairs.get(issue.identifier);
    const staleBlocker = repair ? issueByIdentifier.get(repair.staleBlocker) : null;
    const replacementBlocker = repair ? issueByIdentifier.get(repair.replacementBlocker) : null;
    const hasStaleRelation = Boolean(
      staleBlocker && (detailedIssue.blockedBy ?? []).some((blocker) => blocker.id === staleBlocker.id),
    );
    return { issue, repair, staleBlocker, replacementBlocker, hasStaleRelation };
  })
  .filter(({ repair, staleBlocker, replacementBlocker, hasStaleRelation }) =>
    repair
    && hasStaleRelation
    && ["done", "cancelled"].includes(staleBlocker?.status)
    && replacementBlocker
  );
const allSoarOpenBlockedByKnownGates = soarOpenIssues.length > 0
  && soarOpenIssues.every((issue) =>
    issue.status === "blocked" && gateRootIdentifiers.has(rootBlockerIdentifierFor(issue))
  );

let decision = "known_gates_only";
let recommendedAction = "Do not wake specialists. Let gate freshness watcher detect credential/approval changes, or wait for explicit new non-production work.";
let operatingPosture = "monitoring_only";
let allowedWhileBlocked = [
  "refresh control tick and unblock/source-control packets",
  "supervise live runs and stale tails",
  "wait for explicit new evidence or operator decision",
];
let forbiddenWhileBlocked = [
  "push",
  "deploy",
  "production mutation",
  "secret disclosure",
  "duplicate source-control cleanup",
];
if (closedIssueLiveRuns.length > 0 && closedIssueLiveRuns.length === liveRuns.length) {
  decision = "closed_issue_live_run_tail";
  recommendedAction = "Do not start work. Let the short completion tail clear; if it persists, cancel the heartbeat run without creating productivity-review work.";
  operatingPosture = "cleanup_tail_only";
} else if (governorSelfSupervisionRuns.length > 0 && liveRuns.length === governorSelfSupervisionRuns.length) {
  decision = "governor_self_supervision_loop";
  recommendedAction = "Cancel the governor self-supervision run and close the governor issue with a no-duplicate-work comment. Do not create productivity-review issues for the governor itself.";
  operatingPosture = "cleanup_self_supervision_only";
} else if (activeRunCount > 0 && unknownActiveRunCount > 0) {
  decision = "supervise_active_runs";
  recommendedAction = "Supervise active runs and do not start duplicate work; at least one active run is not represented in live-run metadata.";
  operatingPosture = "supervise_active_work";
} else if (freshGateActions.length > 0 && blockingActiveRunCount > 0) {
  decision = "supervise_active_runs";
  recommendedAction = `${freshGateActions.length} fresh gate recheck candidate(s) exist, but other active runs are still present. Supervise live work and do not run \`node scripts/run-gate-freshness-watcher.mjs --apply\` until no blocking active runs remain.`;
  operatingPosture = "supervise_active_work";
  allowedWhileBlocked = ["supervise live runs", "refresh gate freshness dry-run evidence"];
} else if (freshGateActions.length === 1) {
  decision = "gate_recheck_ready";
  recommendedAction = "Run `node scripts/run-gate-freshness-watcher.mjs --apply`; exactly one fresh gate action exists and no blocking active runs are present.";
  operatingPosture = "one_gate_recheck_allowed";
  allowedWhileBlocked = ["apply the single responsible gate recheck lane"];
} else if (freshGateActions.length > 1) {
  decision = "gate_recheck_selection_needed";
  recommendedAction = `${freshGateActions.length} fresh gate recheck candidates exist. Do not run \`node scripts/run-gate-freshness-watcher.mjs --apply\`; the watcher requires exactly one action, so keep gates blocked until a single candidate remains or add an explicit target selection path.`;
  operatingPosture = "monitoring_only";
  allowedWhileBlocked = ["refresh gate freshness dry-run evidence", "keep gate blockers fail-closed"];
} else if (dirtyOperatingRepo) {
  decision = "operating_source_control_closure_needed";
  recommendedAction = "Commit or explicitly classify Paperclip OS changes before treating the operating system as stable. Do not start broad delivery while the OS worktree is dirty.";
  operatingPosture = "operating_system_closure_required";
  allowedWhileBlocked = ["verify and commit/classify Paperclip OS changes"];
} else if (dirtyProjectRepo && !dirtyProjectRepoHasActiveWork && sourceControlGateIssue?.status === "blocked") {
  decision = "project_source_control_closure_needed";
  recommendedAction = `Route ${dirtyProjectRepo.name} through existing ${sourceControlGateIssue.identifier} for local source-control closure. The protected production gate ${sourceControlGateRootBlocker ?? "n/a"} still blocks deploy/restart/protected smoke, but it must not block local diff classification, validation, and commit/no-commit decisions.${dirtyProjectGroupSummary ? ` Dirty groups: ${dirtyProjectGroupSummary}.` : ""}`;
  operatingPosture = "project_source_control_closure_allowed";
  allowedWhileBlocked = [
    "refresh control tick, source-control packet, and unblock packet",
    "classify dirty project source-control lanes",
    "run local validation for changed files",
    "commit local project source-control closure when evidence supports it",
    "supervise live runs and stale board state",
    "update Paperclip OS process logic when the improvement is outside the blocked project repo",
    "wait for accepted gate freshness facts",
  ];
  forbiddenWhileBlocked = [
    "create duplicate source-control cleanup/commit issues",
    `push ${dirtyProjectRepo.name}`,
    "deploy or restart production",
    "protected smoke without fresh gate fact",
    "secret disclosure",
  ];
} else if (dirtyProjectRepo && !dirtyProjectRepoHasActiveWork && sourceControlGateIssue) {
  decision = "project_source_control_closure_needed";
  recommendedAction = `Route ${dirtyProjectRepo.name} through existing ${sourceControlGateIssue.identifier}. Inspect diffs, preserve agent work, decide commit/no-commit, and do not push without explicit approval.${dirtyProjectGroupSummary ? ` Dirty groups: ${dirtyProjectGroupSummary}.` : ""}`;
  operatingPosture = "project_source_control_closure_allowed";
} else if (dirtyProjectRepo && !dirtyProjectRepoHasActiveWork) {
  decision = "project_source_control_closure_needed";
  recommendedAction = `Route ${dirtyProjectRepo.name} through its PM/source-control closure lane. Inspect diffs, preserve agent work, decide commit/no-commit, and do not push without explicit approval.${dirtyProjectGroupSummary ? ` Dirty groups: ${dirtyProjectGroupSummary}.` : ""}`;
  operatingPosture = "project_source_control_closure_allowed";
} else if (eligibleRunnableIssues.length > 0) {
  decision = "runnable_work_available";
  recommendedAction = "Start or assign the highest-priority runnable active-project issue with one owner and one evidence contract.";
  operatingPosture = "runnable_work_allowed";
} else if (assignableRunnableIssues.length > 0) {
  decision = "runnable_work_assignment_needed";
  recommendedAction = "Runnable backlog exists, but no current controlled-project issue has both an owner and an execution lane. Assign one controlled-project issue to the correct PM before waking work.";
  operatingPosture = "assignment_required";
} else if (activeRunCount > 0 && dirtyProjectRepoHasActiveWork) {
  decision = "supervise_active_runs";
  recommendedAction = "Supervise active runs and do not start duplicate work for the same active project.";
  operatingPosture = "supervise_active_work";
} else if (reviewIssuesWithoutPendingDecision.length > 0) {
  decision = "needs_review_closure";
  recommendedAction = "Close or return in_review issues that do not have a structured reviewer, pending interaction, blocker, or explicit continuation path.";
  operatingPosture = "review_closure_allowed";
} else if (staleCancelledBlockers.length > 0) {
  decision = "stale_cancelled_blocker";
  recommendedAction = "Run `node scripts/repair-known-blocker-links.mjs`, then apply only if exactly one safe repair is listed.";
  operatingPosture = "blocker_link_repair_allowed";
} else if (allSoarOpenBlockedByKnownGates && noEvidenceSafeLaneCooldownActive) {
  decision = "safe_nonproduction_no_evidence_cooldown";
  recommendedAction = "The last safe docs/status lane was cancelled as no-evidence. Do not seed the same lane again until new evidence arrives, the scope changes, or the longer no-evidence cooldown expires.";
  operatingPosture = "known_gate_hold_no_evidence_cooldown";
} else if (allSoarOpenBlockedByKnownGates && !existingSafeNonProductionLane && !safeNonProductionCooldownActive) {
  decision = "safe_nonproduction_lane_needed";
  recommendedAction = "Run `node scripts/run-safe-nonproduction-lane-seeder.mjs`, then apply only if exactly one safe docs/status lane would be created.";
  operatingPosture = "safe_nonproduction_lane_allowed";
} else if (allSoarOpenBlockedByKnownGates && safeNonProductionCooldownActive) {
  decision = "safe_nonproduction_cooldown";
  recommendedAction = "A safe docs/status checkpoint completed recently. Do not seed another safe lane until new evidence arrives or the cooldown expires.";
  operatingPosture = "known_gate_hold_cooldown";
} else if (unknownBlockedIssues.length > 0) {
  decision = "blocked_needs_triage";
  recommendedAction = "Triage one blocked issue without a known gate root and write owner/action/evidence.";
  operatingPosture = "blocked_triage_allowed";
}

console.log(JSON.stringify({
  apiBase,
  requestTimeoutMs,
  company: { id: company.id, name: company.name },
  activeRunCount,
  decision,
  recommendedAction,
  operatingPosture,
  allowedWhileBlocked,
  forbiddenWhileBlocked,
  counts: {
    activeProjects: activeProjectIds.size,
    openActiveIssues: openActiveIssues.length,
    recurringRoutineIssues: recurringRoutineIssues.length,
    runnableIssues: runnableIssues.length,
    protectedGateRunnableIssues: protectedGateRunnableIssues.length,
    eligibleRunnableIssues: eligibleRunnableIssues.length,
    pendingReviewInteractionIssues: pendingReviewInteractionIssueIds.size,
    reviewIssuesWithoutPendingDecision: reviewIssuesWithoutPendingDecision.length,
    blockedIssues: blockedIssues.length,
    blockedIssuesWithRecentTerminalTriage: blockedIssuesWithRecentTerminalTriage.length,
    productivityReviewBlockedIssues: productivityReviewBlockedIssues.length,
    closedIssueLiveRuns: closedIssueLiveRuns.length,
    governorSelfSupervisionRuns: governorSelfSupervisionRuns.length,
    unknownActiveRunCount,
    blockingActiveRunCount,
    nonBlockingSelfRunCount,
    activeControlledProjects: activeControlledProjectNames.size,
    soarOpenIssues: soarOpenIssues.length,
    staleCancelledBlockers: staleCancelledBlockers.length,
    unknownBlockedIssues: unknownBlockedIssues.length,
    intentionallyBlockedIssues: intentionallyBlockedIssues.length,
    freshGateActions: freshGateActions.length,
    existingSafeNonProductionLane: existingSafeNonProductionLane ? 1 : 0,
    safeNonProductionCooldownActive: safeNonProductionCooldownActive ? 1 : 0,
    recentSafeLaneWasNoEvidence: recentSafeLaneWasNoEvidence ? 1 : 0,
    noEvidenceSafeLaneCooldownActive: noEvidenceSafeLaneCooldownActive ? 1 : 0,
    dirtyProjectRepos: sourceControlPacket.dirtyProjectRepos.length,
    dirtyOperatingRepos: sourceControlPacket.dirtyOperatingRepos.length,
    sourceControlIssueCandidates: sourceControlIssueCandidates.length,
  },
  sourceControl: {
    generatedAt: sourceControlPacket.generatedAt,
    stale: sourceControlPacket.stale,
    dirtyProjectRepos: sourceControlPacket.dirtyProjectRepos.map((repo) => ({
      name: repo.name,
      path: repo.path,
      branch: repo.branch ?? null,
      head: repo.head ?? null,
      dirtyCount: repo.dirtyCount ?? null,
      statusCounts: repo.statusCounts ?? {},
      dirtyGroups: repo.dirtyGroups ?? [],
      sample: repo.sample ?? [],
      nextAction: repo.nextAction ?? null,
    })),
    dirtyOperatingRepos: sourceControlPacket.dirtyOperatingRepos.map((repo) => ({
      name: repo.name,
      path: repo.path,
      branch: repo.branch ?? null,
      head: repo.head ?? null,
      dirtyCount: repo.dirtyCount ?? null,
      statusCounts: repo.statusCounts ?? {},
      sample: repo.sample ?? [],
      nextAction: repo.nextAction ?? null,
    })),
    candidateIssues: sourceControlIssueCandidates.slice(0, 10).map((issue) => ({
      identifier: issue.identifier,
      title: issue.title,
      status: issue.status,
      priority: issue.priority,
      assigneeAgentId: issue.assigneeAgentId ?? null,
      rootBlocker: rootBlockerIdentifierFor(issue),
      blockerAttention: issue.blockerAttention ?? null,
      updatedAt: issue.updatedAt ?? null,
    })),
  },
  hardDeliveryBlockerGraph: {
    deliveryParentIdentifier,
    visitedCount: deliveryBlockerGraph.visitedCount,
    truncated: deliveryBlockerGraph.truncated,
    activeLeafIdentifiers: deliveryBlockerGraph.leaves.map((issue) => issueKey(issue)).filter(Boolean),
    knownGateRootIdentifiers: Array.from(gateRootIdentifiers).sort(),
  },
  liveRuns: liveRuns.map((run) => ({
    id: run.id,
    issueId: run.issueId,
    issueIdentifier: issueById.get(run.issueId)?.identifier ?? null,
    issueStatus: issueById.get(run.issueId)?.status ?? null,
    issueTitle: issueById.get(run.issueId)?.title ?? null,
    status: run.status,
    lastOutputAt: run.lastOutputAt,
  })),
  gateObservations,
  secretMetadata: {
    unavailable: secretsMetadataUnavailable,
    warning: metadataUnavailableGateWarning,
    trackedMetadataCount: secrets.length,
    fallbackRoute: secretsMetadataFallbackRoute,
  },
  nextRunnableIssues: runnableIssues.slice(0, 10).map((issue) => ({
    identifier: issue.identifier,
    title: issue.title,
    status: issue.status,
    priority: issue.priority,
    assigneeAgentId: issue.assigneeAgentId ?? null,
    project: activeProjectById.get(issue.projectId)?.name ?? null,
    controlledProject: controlledProjectIdToName.get(issue.projectId) ?? null,
    eligible: eligibleRunnableIssues.some((candidate) => candidate.id === issue.id),
  })),
  protectedGateRunnableIssues: protectedGateRunnableIssues.slice(0, 10).map((issue) => ({
    identifier: issue.identifier,
    title: issue.title,
    status: issue.status,
    priority: issue.priority,
    assigneeAgentId: issue.assigneeAgentId ?? null,
    project: activeProjectById.get(issue.projectId)?.name ?? null,
    controlledProject: controlledProjectIdToName.get(issue.projectId) ?? null,
    rootBlocker: rootBlockerIdentifierFor(issue),
  })),
  reviewIssuesWithoutPendingDecision: reviewIssuesWithoutPendingDecision.slice(0, 10).map((issue) => ({
    identifier: issue.identifier,
    title: issue.title,
    status: issue.status,
    priority: issue.priority,
    assigneeAgentId: issue.assigneeAgentId ?? null,
  })),
  unknownBlockedIssues: unknownBlockedIssues.slice(0, 10).map(({ issue, rootBlocker }) => ({
    identifier: issue.identifier,
    title: issue.title,
    rootBlocker,
    assigneeAgentId: issue.assigneeAgentId ?? null,
  })),
  blockedIssuesWithRecentTerminalTriage: blockedIssuesWithRecentTerminalTriage.slice(0, 10).map((issue) => {
    const terminalTriage = terminalTriageByTarget.get(issue.identifier ?? issue.id);
    return {
      identifier: issue.identifier,
      title: issue.title,
      terminalTriageIdentifier: terminalTriage?.identifier ?? null,
      terminalTriageStatus: terminalTriage?.status ?? null,
      terminalTriageUpdatedAt: terminalTriage?.updatedAt ?? null,
    };
  }),
  productivityReviewBlockedIssues: productivityReviewBlockedIssues.slice(0, 10).map((issue) => ({
    identifier: issue.identifier,
    title: issue.title,
    status: issue.status,
    updatedAt: issue.updatedAt ?? null,
  })),
  staleCancelledBlockers: staleCancelledBlockers.slice(0, 10).map(({ issue, repair, staleBlocker, replacementBlocker }) => ({
    identifier: issue.identifier,
    title: issue.title,
    staleBlocker: repair.staleBlocker,
    staleBlockerStatus: staleBlocker.status,
    replacementBlocker: repair.replacementBlocker,
    replacementBlockerStatus: replacementBlocker.status,
  })),
  safeNonProductionLane: existingSafeNonProductionLane ? {
    identifier: existingSafeNonProductionLane.identifier,
    title: existingSafeNonProductionLane.title,
    status: existingSafeNonProductionLane.status,
    assigneeAgentId: existingSafeNonProductionLane.assigneeAgentId ?? null,
  } : recentCompletedSafeNonProductionLane ? {
    identifier: recentCompletedSafeNonProductionLane.identifier,
    title: recentCompletedSafeNonProductionLane.title,
    status: recentCompletedSafeNonProductionLane.status,
    updatedAt: recentCompletedSafeNonProductionLane.updatedAt,
    cooldownActive: safeNonProductionCooldownActive,
    noEvidenceCooldownActive: noEvidenceSafeLaneCooldownActive,
    assigneeAgentId: recentCompletedSafeNonProductionLane.assigneeAgentId ?? null,
  } : null,
}, null, 2));
