import { access, readFile, stat } from "node:fs/promises";
import path from "node:path";
import { rootBlockerIdentifierFor, terminalBlockersFor } from "./lib/issue-blockers.mjs";
import { normalizeKey, uniqueSecretsForKeys } from "./lib/secret-aliases.mjs";
import { softwarehouseGateSpecsByRootBlocker } from "./lib/softwarehouse-gates.mjs";
import {
  approvalRows,
  hasPendingIssueApproval,
  hasPendingReviewInteraction,
  interactionRows,
} from "./lib/softwarehouse-routine-gates.mjs";

const apiBase = process.env.PAPERCLIP_API_URL ?? "http://127.0.0.1:3200";
const companyName = "LuckySparrow Software House";
const companyAliases = [companyName, "LuckySparrow"];
const companyId = process.env.PAPERCLIP_COMPANY_ID ?? null;
const appsRoot = process.env.LUCKYSPARROW_APPS_ROOT ?? "C:/Personal/Projekty/Aplikacje";
const safeNonProductionLaneTitle = "[Soar][Safe Lane] Non-production architecture/status refresh while gate is blocked";
const safeNonProductionCooldownMs = 6 * 60 * 60 * 1000;
const noEvidenceSafeLaneCooldownMs = 24 * 60 * 60 * 1000;
const unblockPacketFreshnessMs = 60 * 60 * 1000;
const liveRunTailWarningAgeMs = Number(process.env.SOFTWAREHOUSE_AUDIT_LIVE_RUN_TAIL_WARNING_MS ?? 90_000);
const runningInsideControlTick = process.env.SOFTWAREHOUSE_CONTROL_TICK_RUNNING === "1";
const takeoverTitlePattern = /^\[(?<project>.+?)\] Full takeover audit and operating baseline$/;
async function request(method, route, body) {
  const response = await fetch(`${apiBase}${route}`, {
    method,
    headers: { "content-type": "application/json" },
    body: body === undefined ? undefined : JSON.stringify(body),
  });
  const text = await response.text();
  const data = text ? JSON.parse(text) : null;
  if (!response.ok) throw new Error(`${method} ${route} failed with ${response.status}: ${text}`);
  return data;
}

function countBy(items, keyFn) {
  return items.reduce((acc, item) => {
    const key = keyFn(item) ?? "unknown";
    acc[key] = (acc[key] ?? 0) + 1;
    return acc;
  }, {});
}

function groupBy(items, keyFn) {
  return items.reduce((acc, item) => {
    const key = keyFn(item) ?? "unknown";
    if (!acc.has(key)) acc.set(key, []);
    acc.get(key).push(item);
    return acc;
  }, new Map());
}

function normalizeText(value) {
  return String(value ?? "").toLowerCase();
}

function ageMs(timestamp) {
  return timestamp ? Date.now() - new Date(timestamp).getTime() : Number.POSITIVE_INFINITY;
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

function isApprovalOrOperatorGate(issue, recentComments = []) {
  if (issue.status !== "blocked") return false;
  const text = normalizeText([
    issue.title,
    issue.description,
    issue.blockerAttention?.sampleBlockerIdentifier,
    issue.blockerAttention?.sampleBlockerTitle,
    ...recentComments.map((comment) => comment.body),
  ].join("\n"));

  const hasProductionGate = [
    "explicit approval",
    "approval",
    "release permit",
    "production mutation",
    "do not restart",
    "do not redeploy",
    "do not deploy",
    "operator",
    "coolify operator",
    "release controller",
    "deeper-blocker decision",
    "fail-closed",
  ].some((token) => text.includes(token));

  const hasUnblockContract = [
    "required unblock evidence",
    "unblock owner/action",
    "accepted deeper-blocker decision",
    "recovery/readiness proof",
    "closure packet",
    "root-cause packet",
  ].some((token) => text.includes(token));

  return hasProductionGate && hasUnblockContract;
}

function issueLabel(issue) {
  return issue.identifier ?? issue.title ?? issue.id;
}

function agentEnvKeys(agent) {
  return new Set(Object.keys(agent?.adapterConfig?.env ?? {}));
}

function processAppearsAlive(pid) {
  if (!Number.isInteger(pid) || pid <= 0) return null;
  try {
    process.kill(pid, 0);
    return true;
  } catch (error) {
    if (error?.code === "ESRCH") return false;
    if (error?.code === "EPERM") return true;
    return null;
  }
}

function isSourceControlClosureIssue(issue, comments = []) {
  const text = normalizeText([
    issue?.title,
    issue?.description,
    ...comments.map((comment) => comment.body),
  ].join("\n"));
  return text.includes("[source control closure]")
    || text.includes("source-control closure")
    || text.includes("local source-control closure")
    || text.includes("commit/no-commit decision");
}

function liveRunLastActivityAt(run) {
  return run.lastOutputAt ?? run.updatedAt ?? run.startedAt ?? run.createdAt ?? null;
}

function isFreshLiveRunTail(run) {
  return ageMs(liveRunLastActivityAt(run)) < liveRunTailWarningAgeMs;
}

function issueRequiresCoolifyBindings(issue) {
  const title = normalizeText(issue.title);
  const text = normalizeText([
    issue.title,
    issue.description,
  ].join("\n"));

  if (title.includes("subscription business readiness controller")) return false;
  if (/(coolify|vps|deploy|redeploy|restart|rollback|production health|deploy health|server health)/.test(title)) return true;
  return [
    "workers-market-stream",
    "temp stack",
    "temp-stack",
    "temp-domain",
    "coolify resource",
    "coolify project",
    "coolify team",
    "coolify binding",
    "coolify read-only",
    "read-only coolify",
    "requires coolify",
  ].some((token) => text.includes(token));
}

function requiredRuntimeBindingGroupsForIssue(issue, comments = []) {
  const text = normalizeText([
    issue.title,
    issue.description,
    ...comments.map((comment) => comment.body),
  ].join("\n"));
  const groups = [];
  if (issueRequiresCoolifyBindings(issue)) {
    groups.push({
      name: "coolify",
      anyOf: [["COOLIFY_BASE_URL", "COOLIFY_API_TOKEN"]],
    });
  }
  if (
    text.includes("workers/ready")
    || text.includes("smoke principal")
    || text.includes("smoke_auth")
  ) {
    groups.push({
      name: "soar_smoke_principal",
      anyOf: [
        ["SMOKE_AUTH_TOKEN"],
        ["SMOKE_AUTH_EMAIL", "SMOKE_AUTH_PASSWORD"],
      ],
    });
  }
  if (
    text.includes("companycore_api_key")
    || text.includes("aog:deploy-smoke")
    || text.includes("protected deploy smoke")
  ) {
    groups.push({
      name: "roost_protected_smoke",
      anyOf: [["COMPANYCORE_BASE_URL", "COMPANYCORE_API_KEY"]],
    });
  }
  return groups;
}

function missingRuntimeBindingGroups(envKeys, groups) {
  return groups.filter((group) =>
    !group.anyOf.some((requiredSet) => requiredSet.every((key) => envKeys.has(key)))
  );
}

function secretKeysForGateRoot(rootBlocker) {
  return softwarehouseGateSpecsByRootBlocker.get(rootBlocker)?.secretKeys ?? [];
}

async function resolveCompany() {
  if (companyId) return { id: companyId, source: "PAPERCLIP_COMPANY_ID" };

  const companies = await request("GET", "/api/companies");
  const company = companies.find((candidate) => companyAliases.includes(candidate.name));
  if (!company) throw new Error(`Company not found: ${companyName}`);
  return { id: company.id, source: "company_name" };
}

const company = await resolveCompany();

const [health, agents, projects, routines, issues, liveRuns, secrets] = await Promise.all([
  request("GET", "/api/health"),
  request("GET", `/api/companies/${company.id}/agents`),
  request("GET", `/api/companies/${company.id}/projects`),
  request("GET", `/api/companies/${company.id}/routines`),
  request("GET", `/api/companies/${company.id}/issues?limit=2000`),
  request("GET", `/api/companies/${company.id}/live-runs`),
  request("GET", `/api/companies/${company.id}/secrets`),
]);

const activeAgents = agents.filter((agent) => agent.status !== "terminated");
const activeAgentById = new Map(activeAgents.map((agent) => [agent.id, agent]));
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
  "ui-visual-designer",
  "ux-web-designer",
  "code-review-specialist",
]);
const supervisorRosterKeys = new Set([
  "ai-assistant",
  "chief-strategy-officer",
  "chief-product-officer",
  "chief-operating-officer",
  "delivery-project-manager",
  "chief-technology-officer",
  "technical-solution-architect",
  "qa-verification-engineer",
  "chief-innovation-officer",
  "innovation-portfolio-manager",
  "soar-product-manager",
  "roost-product-manager",
  "aviary-product-manager",
  "nest-product-manager",
  "featherly-platform-manager",
  "web-product-manager",
  "chief-executive-officer",
]);
const agentRosterKey = (agent) => agent?.metadata?.rosterKey ?? agent?.urlKey ?? agent?.name ?? null;
const isWorkerAgent = (agent) => workerRosterKeys.has(agentRosterKey(agent));
const isSupervisorAgent = (agent) => supervisorRosterKeys.has(agentRosterKey(agent));
const activeProjects = projects.filter((project) => !project.archivedAt);
const activeProjectIds = new Set(activeProjects.map((project) => project.id));
const projectById = new Map(projects.map((project) => [project.id, project]));
const activeDeliveryPilotProjectNames = new Set(["Soar", "Roost"]);
const activeDeliveryPilotsInPreparationOnly = activeProjects.filter((project) =>
  activeDeliveryPilotProjectNames.has(project.name)
  && project.executionWorkspacePolicy?.runtimePolicy?.preparationOnly
);
const orphanActiveWorkIssues = issues.filter((issue) =>
  !issue.projectId
  && ["todo", "in_progress", "in_review", "blocked"].includes(issue.status)
);
const openIssues = issues.filter((issue) =>
  activeProjectIds.has(issue.projectId)
  && !["done", "cancelled"].includes(issue.status)
);
const duplicateTakeoverGroups = Array.from(groupBy(
  openIssues.filter((issue) => takeoverTitlePattern.test(issue.title ?? "")),
  (issue) => {
    const match = takeoverTitlePattern.exec(issue.title ?? "");
    return `${issue.projectId}:${match?.groups?.project ?? issue.title}`;
  },
).entries())
  .filter(([, items]) => items.length > 1)
  .map(([, items]) => {
    const project = projectById.get(items[0]?.projectId);
    return {
      project: project?.name ?? null,
      title: items[0]?.title ?? null,
      count: items.length,
      issues: items.map((issue) => ({
        identifier: issue.identifier,
        status: issue.status,
        assigneeAgentId: issue.assigneeAgentId ?? null,
      })),
    };
  });
const dormantBacklogIntakeIssues = issues.filter((issue) => {
  const project = projectById.get(issue.projectId);
  return issue.status === "backlog" && project?.archivedAt;
});

const routinesWithTriggers = [];
const routinesWithoutTriggers = [];
for (const routine of routines) {
  const detail = await request("GET", `/api/routines/${routine.id}`);
  const triggers = detail.triggers ?? [];
  const entry = {
    title: routine.title,
    status: routine.status,
    triggerCount: triggers.length,
    enabledTriggerCount: triggers.filter((trigger) => trigger.enabled).length,
  };
  if (triggers.length === 0) routinesWithoutTriggers.push(entry);
  else routinesWithTriggers.push(entry);
}

const liveAgentIds = new Set(liveRuns.map((run) => run.agentId).filter(Boolean));
const liveRunDetails = await Promise.all(liveRuns.map((run) =>
  request("GET", `/api/heartbeat-runs/${run.id}`).catch(() => run)
));
const liveRunsByAgentId = groupBy(
  liveRuns.filter((run) => run.agentId),
  (run) => run.agentId,
);
const agentsWithMultipleLiveRuns = Array.from(liveRunsByAgentId.entries())
  .filter(([, runsForAgent]) => runsForAgent.length > 1)
  .map(([agentId, runsForAgent]) => ({
    agentId,
    agentName: activeAgentById.get(agentId)?.name ?? null,
    runCount: runsForAgent.length,
    issues: runsForAgent.map((run) => {
      const issue = issues.find((candidate) => candidate.id === run.issueId);
      return issue?.identifier ?? issue?.title ?? run.issueId ?? run.id;
    }),
  }));
const detachedProcessRuns = liveRunDetails
  .filter((run) => {
    const missingPid = run.processPid && processAppearsAlive(run.processPid) === false;
    return missingPid
      || run.errorCode === "process_detached"
      || normalizeText(run.error).includes("lost in-memory process handle");
  })
  .map((run) => {
    const issueId = run.issueId ?? run.contextSnapshot?.issueId ?? run.contextSnapshot?.taskId ?? null;
    const issue = issues.find((candidate) => candidate.id === issueId);
    const liveRun = liveRuns.find((candidate) => candidate.id === run.id);
    return {
      runId: run.id,
      issue: issue?.identifier ?? issue?.title ?? issueId,
      agentId: run.agentId ?? null,
      agentName: activeAgentById.get(run.agentId)?.name ?? null,
      processPid: run.processPid ?? null,
      processAlive: processAppearsAlive(run.processPid) ?? null,
      lastOutputAt: run.lastOutputAt ?? null,
      silenceLevel: liveRun?.outputSilence?.level ?? null,
      errorCode: run.errorCode ?? null,
      error: run.error ?? null,
    };
  });
const closedIssueLiveRuns = liveRuns
  .map((run) => {
    const issue = issues.find((candidate) => candidate.id === run.issueId);
    if (!issue || !["done", "cancelled"].includes(issue.status)) return null;
    return {
      runId: run.id,
      issue: issue.identifier ?? issue.title ?? issue.id,
      issueStatus: issue.status,
      agentId: run.agentId ?? null,
      agentName: activeAgentById.get(run.agentId)?.name ?? null,
      lastOutputAt: run.lastOutputAt ?? null,
      silenceLevel: run.outputSilence?.level ?? null,
    };
  })
  .filter(Boolean);
const liveRunsOnNonProgressIssues = liveRuns
  .map((run) => {
    const issue = issues.find((candidate) => candidate.id === run.issueId);
    if (!issue || ["in_progress", "done", "cancelled"].includes(issue.status)) return null;
    return {
      runId: run.id,
      issue: issue.identifier ?? issue.title ?? issue.id,
      issueStatus: issue.status,
      agentId: run.agentId ?? null,
      agentName: activeAgentById.get(run.agentId)?.name ?? null,
      lastOutputAt: liveRunLastActivityAt(run),
      silenceLevel: run.outputSilence?.level ?? null,
      freshTail: isFreshLiveRunTail(run),
    };
  })
  .filter(Boolean);
const blockedIssueLiveRuns = liveRuns
  .map((run) => {
    const issue = issues.find((candidate) => candidate.id === run.issueId);
    if (!issue || issue.status !== "blocked") return null;
    return {
      runId: run.id,
      issue: issue.identifier ?? issue.title ?? issue.id,
      issueStatus: issue.status,
      agentId: run.agentId ?? null,
      agentName: activeAgentById.get(run.agentId)?.name ?? null,
      lastOutputAt: liveRunLastActivityAt(run),
      silenceLevel: run.outputSilence?.level ?? null,
      freshTail: isFreshLiveRunTail(run),
    };
  })
  .filter(Boolean);
const staleLiveRunsOnNonProgressIssues = liveRunsOnNonProgressIssues.filter((run) => !run.freshTail);
const staleBlockedIssueLiveRuns = blockedIssueLiveRuns.filter((run) => !run.freshTail);
const staleErrorAgents = [];
const adapterProbeCache = new Map();
for (const agent of activeAgents.filter((entry) => entry.status === "error" && !liveAgentIds.has(entry.id))) {
  const probeKey = JSON.stringify({
    adapterType: agent.adapterType,
    command: agent.adapterConfig?.command ?? null,
    model: agent.adapterConfig?.model ?? null,
    effort: agent.adapterConfig?.modelReasoningEffort ?? null,
  });
  let result = adapterProbeCache.get(probeKey);
  if (!result) {
    try {
      result = await request("POST", `/api/companies/${company.id}/adapters/${agent.adapterType}/test-environment`, {
        adapterConfig: agent.adapterConfig ?? {},
      });
    } catch (error) {
      result = {
        status: "fail",
        checks: [{
          level: "error",
          code: "adapter_test_request_failed",
          detail: error instanceof Error ? error.message : String(error),
        }],
      };
    }
    adapterProbeCache.set(probeKey, result);
  }
  staleErrorAgents.push({
    name: agent.name,
    adapterType: agent.adapterType,
    environmentStatus: result.status,
    failingCheck: result.checks?.find((check) => check.level === "error")?.code ?? null,
    failingDetail: result.checks?.find((check) => check.level === "error")?.detail ?? null,
  });
}

const projectManagers = activeAgents.filter((agent) =>
  agent.name.endsWith("Project Manager")
  || /\b(Project|Platform|Portfolio|Product|Delivery|Operating) Manager\)/.test(agent.name)
  || agent.metadata?.rosterKey === "ai-assistant"
  || agent.metadata?.rosterKey?.endsWith("project-manager")
  || agent.metadata?.rosterKey?.endsWith("product-manager")
  || agent.metadata?.rosterKey === "featherly-platform-manager"
  || agent.metadata?.rosterKey === "innovation-portfolio-manager"
  || agent.metadata?.rosterKey === "delivery-project-manager"
  || agent.metadata?.rosterKey === "chief-operating-officer"
);
const activeProjectsWithoutPm = activeProjects.filter((project) => {
  if (project.name === "Softwarehouse Operating System") return false;
  return !projectManagers.some((agent) => project.leadAgentId === agent.id);
});

const openIssuesWithoutAssignee = openIssues.filter((issue) => !issue.assigneeAgentId && !issue.assigneeUserId);
const blockedIssuesWithoutOwner = openIssues.filter((issue) => issue.status === "blocked" && !issue.assigneeAgentId && !issue.assigneeUserId);
const projectsWithActiveIssueStatusDrift = activeProjects.filter((project) =>
  project.status !== "in_progress"
  && openIssues.some((issue) =>
    issue.projectId === project.id
    && issue.status === "in_progress"
  )
);
const blockedIssues = openIssues.filter((issue) => issue.status === "blocked");
const blockedIssueAnalyses = [];
for (const issue of blockedIssues) {
  const [detail, comments] = await Promise.all([
    request("GET", `/api/issues/${issue.id}`).catch(() => issue),
    request("GET", `/api/issues/${issue.id}/comments?order=desc&limit=5`)
      .then((result) => result.value ?? result ?? [])
      .catch(() => []),
  ]);
  blockedIssueAnalyses.push({
    issue: detail ?? issue,
    comments,
    rootBlocker: rootBlockerIdentifierFor(detail ?? issue),
  });
}
const blockedIssueRootCounts = countBy(blockedIssueAnalyses, (analysis) => analysis.rootBlocker);
const openRoutineDuplicateGroups = Array.from(groupBy(
  openIssues.filter((issue) => issue.originKind === "routine_execution"),
  (issue) => `${issue.originId ?? "unknown-routine"}|${issue.title}`,
).values())
  .filter((group) => group.length > 1)
  .map((group) => ({
    title: group[0]?.title ?? "unknown",
    originId: group[0]?.originId ?? null,
    count: group.length,
    identifiers: group.map((issue) => issue.identifier ?? issue.title),
    rootBlocker: group[0]?.blockerAttention?.sampleBlockerIdentifier ?? null,
  }));
const blockedGateDetails = [];
const activeRecoveryActions = [];
for (const { issue, comments, rootBlocker } of blockedIssueAnalyses) {
  if (issue.activeRecoveryAction?.id) {
    activeRecoveryActions.push({
      identifier: issue.identifier,
      title: issue.title,
      status: issue.status,
      rootBlocker,
      recoveryActionId: issue.activeRecoveryAction.id,
      recoveryKind: issue.activeRecoveryAction.kind,
      recoveryStatus: issue.activeRecoveryAction.status,
      recoveryOwnerAgentId: issue.activeRecoveryAction.ownerAgentId ?? null,
      recoveryNextAction: issue.activeRecoveryAction.nextAction ?? null,
      recoveryUpdatedAt: issue.activeRecoveryAction.updatedAt ?? null,
    });
  }
  if (!isApprovalOrOperatorGate(issue, comments)) continue;
  blockedGateDetails.push({
    identifier: issue.identifier,
    title: issue.title,
    assigneeAgentId: issue.assigneeAgentId ?? null,
    rootBlocker,
    gate: "approval_or_operator_decision_required",
  });
}
const coolifyBindingDrift = [];
for (const issue of openIssues) {
  if (!issueRequiresCoolifyBindings(issue)) continue;
  if (issue.status === "blocked") continue;
  const assignee = activeAgentById.get(issue.assigneeAgentId);
  const envKeys = agentEnvKeys(assignee);
  const missingEnvKeys = ["COOLIFY_BASE_URL", "COOLIFY_API_TOKEN"].filter((key) => !envKeys.has(key));
  if (missingEnvKeys.length === 0) continue;
  coolifyBindingDrift.push({
    identifier: issue.identifier,
    title: issue.title,
    status: issue.status,
    assigneeAgentId: issue.assigneeAgentId ?? null,
    assigneeName: assignee?.name ?? null,
    missingEnvKeys,
  });
}
const runtimeBindingGaps = [];
for (const issue of openIssues) {
  const blockedAnalysis = blockedIssueAnalyses.find((analysis) => analysis.issue.id === issue.id);
  if (isSourceControlClosureIssue(issue, blockedAnalysis?.comments ?? [])) continue;
  const requiredGroups = requiredRuntimeBindingGroupsForIssue(issue, blockedAnalysis?.comments ?? []);
  if (requiredGroups.length === 0) continue;
  if (issue.status === "blocked" && softwarehouseGateSpecsByRootBlocker.has(issue.identifier)) continue;
  const assignee = activeAgentById.get(issue.assigneeAgentId);
  const envKeys = agentEnvKeys(assignee);
  const missingGroups = missingRuntimeBindingGroups(envKeys, requiredGroups);
  if (missingGroups.length === 0) continue;
  runtimeBindingGaps.push({
    identifier: issue.identifier,
    title: issue.title,
    status: issue.status,
    assigneeAgentId: issue.assigneeAgentId ?? null,
    assigneeName: assignee?.name ?? null,
    missingGroups: missingGroups.map((group) => ({
      name: group.name,
      satisfiesAnyOf: group.anyOf,
    })),
  });
}
const pendingDecisionGates = [];
for (const issue of openIssues) {
  const [interactions, approvals] = await Promise.all([
    request("GET", `/api/issues/${issue.id}/interactions`)
      .then(interactionRows)
      .catch(() => []),
    request("GET", `/api/issues/${issue.id}/approvals`)
      .then(approvalRows)
      .catch(() => []),
  ]);
  if (hasPendingIssueApproval(approvals)) {
    for (const approval of approvals.filter((candidate) => candidate.status === "pending")) {
      pendingDecisionGates.push({
        identifier: issue.identifier,
        title: issue.title,
        status: issue.status,
        assigneeAgentId: issue.assigneeAgentId ?? null,
        approvalId: approval.id,
        approvalType: approval.type ?? null,
        approvalTitle: approval.payload?.title ?? null,
        decisionPath: "pending_issue_approval",
      });
    }
  }
  if (!hasPendingReviewInteraction(interactions)) continue;
  const pendingReviewInteractions = interactions.filter((interaction) =>
    ["request_confirmation", "request_checkbox_confirmation", "ask_user_questions", "suggest_tasks"].includes(interaction.kind)
    && interaction.status === "pending"
  );
  for (const interaction of pendingReviewInteractions) {
    pendingDecisionGates.push({
      identifier: issue.identifier,
      title: issue.title,
      status: issue.status,
      assigneeAgentId: issue.assigneeAgentId ?? null,
      interactionId: interaction.id,
      interactionKind: interaction.kind,
      interactionTitle: interaction.title ?? null,
      idempotencyKey: interaction.idempotencyKey ?? null,
      prompt: interaction.payload?.prompt ?? null,
      continuationPolicy: interaction.continuationPolicy ?? null,
    });
  }
}

const liveIssueIds = new Set(liveRuns.map((run) => run.issueId).filter(Boolean));
const statusSyncChurnIssues = [];
for (const issue of openIssues) {
  if (!liveIssueIds.has(issue.id) && !["todo", "in_progress"].includes(issue.status)) continue;
  const comments = await request("GET", `/api/issues/${issue.id}/comments?order=desc&limit=12`)
    .catch(() => []);
  const recentStatusSyncComments = comments.filter((comment) => {
    const createdAtMs = new Date(comment.createdAt ?? 0).getTime();
    const ageMs = Date.now() - createdAtMs;
    if (!Number.isFinite(ageMs) || ageMs > 15 * 60 * 1000) return false;
    const body = normalizeText(comment.body);
    return body.includes("status-sync")
      || body.includes("reaffirmed")
      || body.includes("active run remains non-terminal")
      || body.includes("no code changes required in this wake");
  });
  if (recentStatusSyncComments.length < 4) continue;
  statusSyncChurnIssues.push({
    identifier: issue.identifier,
    title: issue.title,
    status: issue.status,
    recentStatusSyncCommentCount: recentStatusSyncComments.length,
    latestCommentAt: recentStatusSyncComments[0]?.createdAt ?? null,
  });
}

const staleInProgressIssues = openIssues.filter((issue) =>
  issue.status === "in_progress"
  && !liveIssueIds.has(issue.id)
);
const agentsWithSparkModel = activeAgents.filter((agent) =>
  JSON.stringify({
    adapterConfig: agent.adapterConfig ?? {},
    runtimeConfig: agent.runtimeConfig ?? {},
  }).toLowerCase().includes("spark")
);

const forbiddenInstructionFragments = [
  "C:/Personal/Projekty/Aplikacje/companycore",
  "C:/Personal/Projekty/Aplikacje/companycore/Roost - docs",
  "Roost - docs",
];
const instructionBundleDrift = [];
for (const agent of activeAgents) {
  const filesToCheck = ["shared/00-current-pilot.md"];
  if (agent.metadata?.rosterKey === "roost-product-manager" || agent.name === "11 RPM (Roost Project Manager)") {
    filesToCheck.push("roles/roost-product-manager.md");
  }
  for (const filePath of filesToCheck) {
    const detail = await request("GET", `/api/agents/${agent.id}/instructions-bundle/file?companyId=${company.id}&path=${encodeURIComponent(filePath)}`)
      .catch((error) => ({
        content: null,
        error: error instanceof Error ? error.message : String(error),
      }));
    if (detail.error) {
      instructionBundleDrift.push({
        agent: agent.name,
        file: filePath,
        reason: "instruction_file_unreadable",
        detail: detail.error,
      });
      continue;
    }
    const content = detail.content ?? "";
    const staleFragments = forbiddenInstructionFragments.filter((fragment) => content.includes(fragment));
    if (staleFragments.length === 0) continue;
    instructionBundleDrift.push({
      agent: agent.name,
      file: filePath,
      reason: "stale_roost_path_contract",
      staleFragments,
    });
  }
}

async function pathExists(filePath) {
  try {
    await access(filePath);
    return true;
  } catch {
    return false;
  }
}

async function fileInfo(filePath) {
  try {
    const info = await stat(filePath);
    return {
      exists: true,
      updatedAt: info.mtime.toISOString(),
      ageMs: Date.now() - info.mtime.getTime(),
    };
  } catch {
    return {
      exists: false,
      updatedAt: null,
      ageMs: Number.POSITIVE_INFINITY,
    };
  }
}

const rootPortfolioDrift = [];
const applicationsIndexPath = path.join(appsRoot, "APPLICATIONS_INDEX.md");
const applicationsCsvPath = path.join(appsRoot, "APPLICATIONS_INDEX.csv");
const applicationsUpdaterPath = path.join(appsRoot, "scripts", "update-applications-index.ps1");
if (!(await pathExists(applicationsIndexPath))) {
  rootPortfolioDrift.push({
    file: applicationsIndexPath,
    reason: "missing_root_index",
  });
}
if (!(await pathExists(applicationsCsvPath))) {
  rootPortfolioDrift.push({
    file: applicationsCsvPath,
    reason: "missing_root_csv",
  });
}
if (!(await pathExists(applicationsUpdaterPath))) {
  rootPortfolioDrift.push({
    file: applicationsUpdaterPath,
    reason: "missing_root_index_updater",
  });
}
if (await pathExists(applicationsIndexPath)) {
  const indexText = await readFile(applicationsIndexPath, "utf8");
  const forbiddenPortfolioFragments = [
    "companycore/Roost",
    "Roost - docs",
    "| companycore |",
    "| companycore-drive-fix |",
    "| scripts |",
  ];
  const staleFragments = forbiddenPortfolioFragments.filter((fragment) => indexText.includes(fragment));
  if (staleFragments.length > 0) {
    rootPortfolioDrift.push({
      file: applicationsIndexPath,
      reason: "stale_root_index_entries",
      staleFragments,
    });
  }
  if (!indexText.includes("| Roost | [Roost](Roost)")) {
    rootPortfolioDrift.push({
      file: applicationsIndexPath,
      reason: "missing_canonical_roost_entry",
    });
  }
}

const unblockPacketMarkdownPath = path.join("docs", "status", "softwarehouse-unblock-packet.md");
const unblockPacketJsonPath = path.join("report", "softwarehouse-unblock-packet.json");
const controlTickJsonPath = path.join("report", "softwarehouse-control-tick.latest.json");
const [unblockPacketMarkdownInfo, unblockPacketJsonInfo, controlTickJsonInfo] = await Promise.all([
  fileInfo(unblockPacketMarkdownPath),
  fileInfo(unblockPacketJsonPath),
  fileInfo(controlTickJsonPath),
]);
const unblockPacketStatus = {
  markdownPath: unblockPacketMarkdownPath,
  jsonPath: unblockPacketJsonPath,
  markdownExists: unblockPacketMarkdownInfo.exists,
  jsonExists: unblockPacketJsonInfo.exists,
  markdownUpdatedAt: unblockPacketMarkdownInfo.updatedAt,
  jsonUpdatedAt: unblockPacketJsonInfo.updatedAt,
  stale: unblockPacketMarkdownInfo.ageMs > unblockPacketFreshnessMs
    || unblockPacketJsonInfo.ageMs > unblockPacketFreshnessMs,
  freshnessMinutes: Math.round(Math.max(
    unblockPacketMarkdownInfo.ageMs,
    unblockPacketJsonInfo.ageMs,
  ) / 60000),
};
const controlTickStatus = {
  jsonPath: controlTickJsonPath,
  jsonExists: controlTickJsonInfo.exists,
  jsonUpdatedAt: controlTickJsonInfo.updatedAt,
  stale: controlTickJsonInfo.ageMs > unblockPacketFreshnessMs,
  freshnessMinutes: Math.round(controlTickJsonInfo.ageMs / 60000),
};
let latestControlTick = null;
if (controlTickJsonInfo.exists) {
  latestControlTick = await readFile(controlTickJsonPath, "utf8")
    .then((text) => JSON.parse(text))
    .catch(() => null);
}
const latestSourceControl = latestControlTick?.sourceControlRepos ?? [];
const dirtySourceControlRepos = latestSourceControl.filter((repo) => repo.clean === false);
const controlPostureStatus = latestControlTick ? {
  controlDecision: latestControlTick.controlDecision ?? null,
  controlBriefMode: latestControlTick.controlBrief?.mode ?? null,
  autonomyDisposition: latestControlTick.controlBrief?.autonomyDisposition ?? null,
  staleBlockedGateCount: latestControlTick.controlBrief?.staleBlockedGateCount ?? null,
  deliveryPermission: latestControlTick.controlBrief?.deliveryPermission ?? null,
  laneStartLikeActions: (latestControlTick.nextControlActions ?? []).filter((action) =>
    /^(start|resume|apply|run\b.*--apply\b)/i.test(String(action).trim())
  ),
  hasStaleGateOwnerAction: (latestControlTick.nextControlActions ?? []).some((action) =>
    String(action).startsWith("Stale gate owner action:")
  ),
  operatingPosture: latestControlTick.operatingPosture ?? null,
  readinessOperatingPosture: latestControlTick.readinessOperatingPosture ?? null,
  effectiveOperatingPosture: latestControlTick.effectiveOperatingPosture ?? null,
  postureConsistent: latestControlTick.postureConsistent ?? null,
  activeWorkOverlay: latestControlTick.activeWorkOverlay ?? null,
  nextControlActionStatus: latestControlTick.nextControlActionStatus ?? null,
  operatorActionPacketStatus: latestControlTick.operatorActionPacket?.status ?? null,
  operatorActionPacketBlockedGates: latestControlTick.operatorActionPacket?.blockedGates?.length ?? null,
  readinessOperatingConstraints: latestControlTick.readinessOperatingConstraints ?? [],
} : null;

const pendingDecisionIdentifiers = new Set(pendingDecisionGates.map((gate) => gate.identifier).filter(Boolean));
const pendingDecisionRootIdentifiers = new Set(pendingDecisionGates.map((gate) => gate.identifier).filter(Boolean));
const blockedByPendingDecision = blockedIssueAnalyses.filter((analysis) =>
  pendingDecisionRootIdentifiers.has(analysis.rootBlocker)
);
const knownGateRootIdentifiers = new Set(blockedGateDetails.map((gate) => gate.rootBlocker).filter(Boolean));
const secretByKey = new Map(secrets.map((secret) => [normalizeKey(secret.key), secret]));
const issueByIdentifier = new Map(issues.map((issue) => [issue.identifier, issue]));
const gateSecretFreshness = Array.from(knownGateRootIdentifiers)
  .map((rootBlocker) => {
    const keys = secretKeysForGateRoot(rootBlocker);
    const matchingSecrets = uniqueSecretsForKeys(secretByKey, keys);
    const trackedSecrets = matchingSecrets.map((secret) => ({
      key: secret.key,
      status: secret.status ?? null,
      updatedAt: secret.updatedAt ?? null,
      createdAt: secret.createdAt ?? null,
    }));
    const latestSecretUpdatedAt = matchingSecrets
      .map((secret) => secret.updatedAt ?? secret.createdAt)
      .filter(Boolean)
      .sort()
      .at(-1) ?? null;
    const rootIssue = issueByIdentifier.get(rootBlocker);
    return {
      rootBlocker,
      issueStatus: rootIssue?.status ?? null,
      issueUpdatedAt: rootIssue?.updatedAt ?? null,
      trackedSecretKeys: keys,
      trackedSecretCount: matchingSecrets.length,
      trackedSecrets,
      latestSecretUpdatedAt,
      secretUpdatedAfterIssue: Boolean(
        latestSecretUpdatedAt
        && rootIssue?.updatedAt
        && new Date(latestSecretUpdatedAt).getTime() > new Date(rootIssue.updatedAt).getTime()
      ),
    };
  })
  .filter((entry) => entry.trackedSecretKeys.length > 0);
const triageableBlockedIssues = blockedIssueAnalyses.filter((analysis) =>
  !knownGateRootIdentifiers.has(analysis.rootBlocker)
  && !pendingDecisionRootIdentifiers.has(analysis.rootBlocker)
);
const runnableIssueStatuses = new Set(["todo", "backlog"]);
const runnableIssues = openIssues.filter((issue) =>
  runnableIssueStatuses.has(issue.status)
  && !liveIssueIds.has(issue.id)
  && !pendingDecisionIdentifiers.has(issue.identifier)
);
const workerIssues = openIssues.filter((issue) =>
  isWorkerAgent(activeAgentById.get(issue.assigneeAgentId))
);
const supervisorIssues = openIssues.filter((issue) =>
  isSupervisorAgent(activeAgentById.get(issue.assigneeAgentId))
);
const plannedWorkerIssues = workerIssues.filter((issue) =>
  runnableIssueStatuses.has(issue.status)
  && !liveIssueIds.has(issue.id)
  && !pendingDecisionIdentifiers.has(issue.identifier)
);
const activeWorkerIssues = workerIssues.filter((issue) =>
  issue.status === "in_progress" || liveIssueIds.has(issue.id)
);
const plannedSupervisorIssues = supervisorIssues.filter((issue) =>
  runnableIssueStatuses.has(issue.status)
  && !liveIssueIds.has(issue.id)
  && !pendingDecisionIdentifiers.has(issue.identifier)
);
const activeWorkerRunCount = liveRuns.filter((run) =>
  isWorkerAgent(activeAgentById.get(run.agentId))
).length;
const activeSupervisorRunCount = liveRuns.filter((run) =>
  isSupervisorAgent(activeAgentById.get(run.agentId))
).length;
const plannedWorkerIssuesByAgent = Array.from(groupBy(plannedWorkerIssues, (issue) => {
  const agent = activeAgentById.get(issue.assigneeAgentId);
  return agent?.name ?? issue.assigneeAgentId ?? "unassigned";
}).entries()).map(([agentName, items]) => ({
  agentName,
  count: items.length,
  issues: items.slice(0, 10).map((issue) => ({
    identifier: issueLabel(issue),
    title: issue.title,
    status: issue.status,
    project: projectById.get(issue.projectId)?.name ?? null,
  })),
}));
const workerQueueHealth = {
  plannedWorkerIssueCount: plannedWorkerIssues.length,
  activeWorkerIssueCount: activeWorkerIssues.length,
  activeWorkerRunCount,
  plannedSupervisorIssueCount: plannedSupervisorIssues.length,
  activeSupervisorRunCount,
  workerAgentCount: activeAgents.filter(isWorkerAgent).length,
  idleWorkerAgentCount: activeAgents.filter((agent) => isWorkerAgent(agent) && agent.status === "idle").length,
  plannedWorkerIssuesByAgent,
  nextPlannedWorkerIssues: plannedWorkerIssues.slice(0, 20).map((issue) => ({
    identifier: issueLabel(issue),
    title: issue.title,
    status: issue.status,
    priority: issue.priority,
    project: projectById.get(issue.projectId)?.name ?? null,
    assigneeAgentName: activeAgentById.get(issue.assigneeAgentId)?.name ?? null,
  })),
};
const weakWorkerQueue = runnableIssues.length > 0
  && workerQueueHealth.plannedWorkerIssueCount < Math.min(3, runnableIssues.length)
  && workerQueueHealth.activeWorkerRunCount === 0
  && workerQueueHealth.plannedSupervisorIssueCount > workerQueueHealth.plannedWorkerIssueCount;
const reviewIssuesWithoutPendingDecision = openIssues.filter((issue) =>
  issue.status === "in_review"
  && !pendingDecisionIdentifiers.has(issue.identifier)
);
const recentCompletedSafeNonProductionLane = issues
  .filter((issue) => issue.title === safeNonProductionLaneTitle && ["done", "cancelled"].includes(issue.status))
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

let autonomyState = "monitoring_only";
let recommendedNextAction = "No runnable issue is available; keep monitoring and wait for new operator input.";
if (runnableIssues.length > 0) {
  autonomyState = "can_start_parallel_lanes";
  recommendedNextAction = liveRuns.length > 0
    ? "Supervise live runs and wake only safe independent lanes with idle owners; keep owner, scope, evidence, and dependency contracts explicit."
    : "Start or resume the next highest-value independent lane with one accountable owner, one narrow scope, and an evidence contract.";
} else if (liveRuns.length > 0) {
  autonomyState = "active_work_running";
  recommendedNextAction = "Supervise active lanes, close stale board state, and avoid waking new work until each active owner has a clear next handoff.";
} else if (reviewIssuesWithoutPendingDecision.length > 0) {
  autonomyState = "needs_review_closure";
  recommendedNextAction = "Close or return in_review issues that are not waiting for a structured decision.";
} else if (pendingDecisionGates.length > 0) {
  autonomyState = "waiting_for_operator_gate";
  recommendedNextAction = "Do not restart or work around gated production lanes; keep safe non-production PM/status, graph, regression, gap-register, security/account-safety, and docs lanes moving while waiting for the pending review interaction.";
} else if (triageableBlockedIssues.length > 0) {
  autonomyState = "blocked_needs_triage";
  recommendedNextAction = "Triage one blocked issue that is not protected by a pending review interaction and write owner/action/evidence.";
} else if (blockedIssues.length > 0) {
  autonomyState = noEvidenceSafeLaneCooldownActive
    ? "safe_nonproduction_no_evidence_cooldown"
    : safeNonProductionCooldownActive
      ? "safe_nonproduction_cooldown"
      : "known_gates_only";
  recommendedNextAction = noEvidenceSafeLaneCooldownActive
    ? "All remaining blocked issues are covered by known gate roots, and the latest safe non-production lane was cancelled as no-evidence. Do not reseed the same lane until new evidence arrives, scope changes, or the longer no-evidence cooldown expires."
    : safeNonProductionCooldownActive
    ? "All remaining blocked issues are covered by known gate roots, and a safe non-production docs/status checkpoint completed recently. Do not churn gated lanes or seed another safe lane until new evidence arrives or the cooldown expires."
    : "All remaining blocked issues are covered by known gate roots; do not churn them. Let the gate freshness watcher detect newer credential/approval metadata before rechecking, or create a new explicitly assigned non-production lane.";
}

const findings = [];
if (health.status !== "ok") findings.push({ severity: "critical", area: "health", message: "Paperclip API health is not ok." });
if (health.devServer?.restartRequired) findings.push({ severity: "warn", area: "health", message: "Dev server restart is required.", detail: health.devServer.reason });
if (activeDeliveryPilotsInPreparationOnly.length > 0) findings.push({
  severity: "warn",
  area: "project-policy",
  message: "Active delivery pilot projects are marked preparationOnly; this prevents full delivery even though the operating model expects active V1 work.",
  items: activeDeliveryPilotsInPreparationOnly.map((project) => ({
    name: project.name,
    status: project.status,
    workspacePolicyEnabled: project.executionWorkspacePolicy?.enabled ?? false,
    preparationOnly: project.executionWorkspacePolicy?.runtimePolicy?.preparationOnly ?? false,
  })),
});
if (activeProjectsWithoutPm.length > 0) findings.push({ severity: "critical", area: "project-management", message: "Active project without project manager lead.", items: activeProjectsWithoutPm.map((project) => project.name) });
if (orphanActiveWorkIssues.length > 0) findings.push({
  severity: "warn",
  area: "issues",
  message: "Runnable or blocked issues without a project are invisible to active-project autonomy; assign them to a canonical project/workspace or close them.",
  items: orphanActiveWorkIssues.map((issue) => ({
    identifier: issue.identifier,
    title: issue.title,
    status: issue.status,
    projectWorkspaceId: issue.projectWorkspaceId ?? null,
  })),
});
if (projectsWithActiveIssueStatusDrift.length > 0) findings.push({ severity: "warn", area: "project-management", message: "Projects have in-progress issues but project status is not in_progress.", items: projectsWithActiveIssueStatusDrift.map((project) => ({ name: project.name, status: project.status })) });
if (routinesWithoutTriggers.length > 0) findings.push({ severity: "warn", area: "routines", message: "Routines exist without triggers.", items: routinesWithoutTriggers.map((routine) => routine.title) });
if (detachedProcessRuns.length > 0) findings.push({
  severity: detachedProcessRuns.some((run) => run.silenceLevel === "critical" || run.silenceLevel === "suspicious") ? "critical" : "warn",
  area: "runs",
  message: "Live runs have detached process handles; supervise or recover before treating them as healthy autonomous work.",
  items: detachedProcessRuns,
});
if (closedIssueLiveRuns.length > 0) findings.push({
  severity: closedIssueLiveRuns.some((run) => run.silenceLevel === "critical" || run.silenceLevel === "suspicious") ? "critical" : "warn",
  area: "runs",
  message: "Live runs are still attached to closed issues; allow short completion tails, but recover if they persist.",
  items: closedIssueLiveRuns,
});
if (staleLiveRunsOnNonProgressIssues.length > 0) findings.push({
  severity: "warn",
  area: "runs",
  message: "Live runs are attached to non-in-progress issues; sync issue status before using runnable counts.",
  items: staleLiveRunsOnNonProgressIssues,
});
if (staleBlockedIssueLiveRuns.length > 0) findings.push({
  severity: staleBlockedIssueLiveRuns.some((run) => run.silenceLevel === "critical" || run.silenceLevel === "suspicious") ? "critical" : "warn",
  area: "runs",
  message: "Live runs are attached to blocked issues; cancel or unblock explicitly so blocked work cannot keep executing invisibly.",
  items: staleBlockedIssueLiveRuns,
});
if (staleErrorAgents.length > 0) findings.push({ severity: "warn", area: "agents", message: "Agents are in error while no live run exists.", items: staleErrorAgents });
if (openIssuesWithoutAssignee.length > 0) findings.push({ severity: "warn", area: "issues", message: "Open issues without owner.", items: openIssuesWithoutAssignee.map((issue) => issue.identifier ?? issue.title) });
if (blockedIssuesWithoutOwner.length > 0) findings.push({ severity: "critical", area: "issues", message: "Blocked issues without owner.", items: blockedIssuesWithoutOwner.map((issue) => issue.identifier ?? issue.title) });
if (openRoutineDuplicateGroups.length > 0) findings.push({ severity: "warn", area: "issues", message: "Open routine duplicates should be consolidated or cancelled.", items: openRoutineDuplicateGroups });
if (duplicateTakeoverGroups.length > 0) findings.push({
  severity: "warn",
  area: "intake",
  message: "Projects have duplicate open takeover baseline issues; keep one canonical intake lane per project.",
  items: duplicateTakeoverGroups,
});
if (staleInProgressIssues.length > 0) findings.push({ severity: "critical", area: "issues", message: "Issues are in progress without a live run.", items: staleInProgressIssues.map((issue) => issue.identifier ?? issue.title) });
if (reviewIssuesWithoutPendingDecision.length > 0) findings.push({
  severity: "warn",
  area: "issues",
  message: "Issues are in review without a structured decision path; close, block, delegate, or return them before treating autonomy as idle.",
  items: reviewIssuesWithoutPendingDecision.map((issue) => ({
    identifier: issue.identifier,
    title: issue.title,
    assigneeAgentId: issue.assigneeAgentId ?? null,
  })),
});
if (statusSyncChurnIssues.length > 0) findings.push({
  severity: "warn",
  area: "autonomy",
  message: "Issues show repeated status-sync comments without delivery evidence; stop the echo loop and require a new operational fact or a real lane handoff.",
  items: statusSyncChurnIssues,
});
if (weakWorkerQueue) findings.push({
  severity: process.env.SOFTWAREHOUSE_AUDIT_ENFORCE_WORKER_QUEUE === "1" ? "warn" : "info",
  area: "worker-backlog",
  message: "Runnable work is concentrated above the leaf worker layer; managers should split parent/controller work into worker-ready todo/backlog lanes before treating autonomy as healthy.",
  items: workerQueueHealth,
});
if (agentsWithMultipleLiveRuns.length > 0) findings.push({ severity: "critical", area: "wip", message: "Agents have more than one live run; enforce one-agent-one-active-lane.", items: agentsWithMultipleLiveRuns });
if (agentsWithSparkModel.length > 0) findings.push({ severity: "critical", area: "models", message: "Agents still reference Spark models.", items: agentsWithSparkModel.map((agent) => agent.name) });
if (instructionBundleDrift.length > 0) findings.push({ severity: "critical", area: "instructions", message: "Agent instruction bundles contain stale or inconsistent project context.", items: instructionBundleDrift });
if (rootPortfolioDrift.length > 0) findings.push({ severity: "warn", area: "portfolio-index", message: "Root /Aplikacje project index is missing, stale, or not refreshable.", items: rootPortfolioDrift });
if (coolifyBindingDrift.length > 0) findings.push({ severity: "critical", area: "ownership", message: "Coolify/runtime issues are assigned to agents without Coolify env bindings.", items: coolifyBindingDrift });
if (runtimeBindingGaps.length > 0) findings.push({
  severity: "warn",
  area: "secrets",
  message: "Runtime-gated issues are assigned to agents without the required secret/env bindings; keep them blocked or bind the secrets before expecting autonomous progress.",
  items: runtimeBindingGaps,
});
if (blockedIssues.length > 0 && (!unblockPacketStatus.markdownExists || !unblockPacketStatus.jsonExists)) findings.push({
  severity: "warn",
  area: "operator-unblock",
  message: "Blocked delivery gates exist but the generated unblock packet is missing.",
  items: unblockPacketStatus,
});
if (blockedIssues.length > 0 && unblockPacketStatus.markdownExists && unblockPacketStatus.jsonExists && unblockPacketStatus.stale) findings.push({
  severity: "warn",
  area: "operator-unblock",
  message: "Blocked delivery gates exist but the generated unblock packet is stale; refresh it before asking a PM or operator to act.",
  items: unblockPacketStatus,
});
if (!runningInsideControlTick && !controlTickStatus.jsonExists) findings.push({
  severity: "warn",
  area: "control-loop",
  message: "Latest softwarehouse control tick report is missing; run pnpm softwarehouse:control-tick before trusting autonomy posture.",
  items: controlTickStatus,
});
if (!runningInsideControlTick && controlTickStatus.jsonExists && controlTickStatus.stale) findings.push({
  severity: "warn",
  area: "control-loop",
  message: "Latest softwarehouse control tick report is stale; refresh it before starting or resuming work.",
  items: controlTickStatus,
});
if (!runningInsideControlTick && dirtySourceControlRepos.some((repo) => repo.name === "Paperclip_Softwarehouse")) findings.push({
  severity: "warn",
  area: "source-control",
  message: "Paperclip Softwarehouse has uncommitted changes in the latest control tick; commit or classify them before treating the operating system as stable.",
  items: dirtySourceControlRepos.filter((repo) => repo.name === "Paperclip_Softwarehouse"),
});
if (!runningInsideControlTick && controlPostureStatus && controlPostureStatus.postureConsistent === false) findings.push({
  severity: "critical",
  area: "control-loop",
  message: "Control tick posture is inconsistent; obey effectiveOperatingPosture and fix the governor/readiness mismatch before waking lanes.",
  items: controlPostureStatus,
});
if (!runningInsideControlTick && controlPostureStatus && !controlPostureStatus.effectiveOperatingPosture) findings.push({
  severity: "warn",
  area: "control-loop",
  message: "Control tick does not expose effectiveOperatingPosture; refresh or repair the control loop before trusting autonomous lane selection.",
  items: controlPostureStatus,
});
if (!runningInsideControlTick && blockedIssues.length > 0 && controlPostureStatus && !controlPostureStatus.operatorActionPacketStatus) findings.push({
  severity: "warn",
  area: "operator-unblock",
  message: "Control tick does not expose operatorActionPacket; blocked autonomy lacks a redacted operator-facing unblock summary.",
  items: controlPostureStatus,
});
if (!runningInsideControlTick && controlPostureStatus?.nextControlActionStatus?.empty) findings.push({
  severity: "critical",
  area: "control-loop",
  message: "Control tick emitted no nextControlActions; agents do not have an executable handoff.",
  items: controlPostureStatus,
});
if (!runningInsideControlTick && (controlPostureStatus?.nextControlActionStatus?.duplicateActions ?? []).length > 0) findings.push({
  severity: "warn",
  area: "control-loop",
  message: "Control tick emitted duplicate nextControlActions; consolidate the PM/operator handoff.",
  items: controlPostureStatus.nextControlActionStatus.duplicateActions,
});
if (
  !runningInsideControlTick
  && (controlPostureStatus?.staleBlockedGateCount ?? 0) > 0
  && !controlPostureStatus.hasStaleGateOwnerAction
) findings.push({
  severity: "critical",
  area: "control-loop",
  message: "Control tick reports stale blocked gates but no Stale gate owner action; PM escalation can be missed.",
  items: controlPostureStatus,
});
if (
  !runningInsideControlTick
  && controlPostureStatus?.deliveryPermission?.canStartNewLane === false
  && (controlPostureStatus.laneStartLikeActions ?? []).length > 0
) findings.push({
  severity: "critical",
  area: "control-loop",
  message: "Control tick forbids starting a new lane but nextControlActions include start/resume/apply language.",
  items: controlPostureStatus.laneStartLikeActions,
});
if (!runningInsideControlTick && controlPostureStatus && !controlPostureStatus.deliveryPermission) findings.push({
  severity: "warn",
  area: "control-loop",
  message: "Control tick does not expose controlBrief.deliveryPermission; agents cannot distinguish allowed supervision from protected delivery.",
  items: controlPostureStatus,
});
if (!runningInsideControlTick && controlPostureStatus && !controlPostureStatus.autonomyDisposition) findings.push({
  severity: "warn",
  area: "control-loop",
  message: "Control tick does not expose controlBrief.autonomyDisposition; agents cannot distinguish intentional gate hold from idle.",
  items: controlPostureStatus,
});
if (
  !runningInsideControlTick
  && controlPostureStatus?.controlBriefMode === "wait_for_gate_fact"
  && controlPostureStatus.autonomyDisposition !== "intentional_gate_hold"
) findings.push({
  severity: "critical",
  area: "control-loop",
  message: "Gate-wait control brief is not marked as intentional_gate_hold; fail closed before agents misread gated delivery as idle.",
  items: controlPostureStatus,
});
if (
  !runningInsideControlTick
  && controlPostureStatus?.controlBriefMode === "wait_for_gate_fact"
  && (
    controlPostureStatus.deliveryPermission?.protectedDeliveryAllowed
    || controlPostureStatus.deliveryPermission?.projectRepoMutationAllowed
    || controlPostureStatus.deliveryPermission?.canStartNewLane
  )
) findings.push({
  severity: "critical",
  area: "control-loop",
  message: "Gate-wait control brief permits delivery or repo mutation; fail closed before agents can start protected project work.",
  items: controlPostureStatus,
});

const overall = findings.some((finding) => finding.severity === "critical")
  ? "fail"
  : findings.some((finding) => finding.severity === "warn")
    ? "warn"
    : "pass";

console.log(JSON.stringify({
  overall,
  apiBase,
  company: { id: company.id, name: company.name },
  health: health.devServer,
  activeProjects: activeProjects.map((project) => ({
    name: project.name,
    status: project.status,
    leadAgentId: project.leadAgentId,
    workspacePolicyEnabled: project.executionWorkspacePolicy?.enabled ?? false,
  })),
  counts: {
    agentsByStatus: countBy(activeAgents, (agent) => agent.status),
    issuesByStatus: countBy(openIssues, (issue) => issue.status),
    routinesByStatus: countBy(routines, (routine) => routine.status),
    liveRuns: liveRuns.length,
  },
  blockedIssueSummary: {
    count: blockedIssues.length,
    rootCounts: blockedIssueRootCounts,
    duplicateRoutineGroups: openRoutineDuplicateGroups,
    approvalOrOperatorGates: blockedGateDetails,
    pendingDecisionGates,
    coolifyBindingDrift,
    agentsWithMultipleLiveRuns,
    detachedProcessRuns,
    closedIssueLiveRuns,
    liveRunsOnNonProgressIssues,
    blockedIssueLiveRuns,
    activeRecoveryActions,
    gateSecretFreshness,
  },
  autonomyPosture: {
    state: autonomyState,
    recommendedNextAction,
    runnableIssueCount: runnableIssues.length,
    workerQueueHealth,
    reviewIssueWithoutPendingDecisionCount: reviewIssuesWithoutPendingDecision.length,
    blockedByPendingDecisionCount: blockedByPendingDecision.length,
    triageableBlockedIssueCount: triageableBlockedIssues.length,
    dormantBacklogIntakeCount: dormantBacklogIntakeIssues.length,
    nextRunnableIssues: runnableIssues.slice(0, 20).map((issue) => ({
      identifier: issueLabel(issue),
      title: issue.title,
      status: issue.status,
      priority: issue.priority,
      assigneeAgentId: issue.assigneeAgentId ?? null,
    })),
    reviewIssuesWithoutPendingDecision: reviewIssuesWithoutPendingDecision.slice(0, 20).map((issue) => ({
      identifier: issueLabel(issue),
      title: issue.title,
      assigneeAgentId: issue.assigneeAgentId ?? null,
    })),
    triageableBlockedIssues: triageableBlockedIssues.slice(0, 20).map(({ issue, rootBlocker }) => ({
      identifier: issueLabel(issue),
      title: issue.title,
      rootBlocker,
      assigneeAgentId: issue.assigneeAgentId ?? null,
    })),
    safeNonProductionCooldown: recentCompletedSafeNonProductionLane ? {
      active: safeNonProductionCooldownActive,
      noEvidenceActive: noEvidenceSafeLaneCooldownActive,
      noEvidenceClosure: recentSafeLaneWasNoEvidence,
      identifier: issueLabel(recentCompletedSafeNonProductionLane),
      status: recentCompletedSafeNonProductionLane.status,
      updatedAt: recentCompletedSafeNonProductionLane.updatedAt,
    } : null,
    dormantBacklogIntakeIssues: dormantBacklogIntakeIssues.slice(0, 20).map((issue) => {
      const project = projectById.get(issue.projectId);
      return {
        identifier: issueLabel(issue),
        title: issue.title,
        project: project?.name ?? null,
        projectStatus: project?.status ?? null,
        archivedAt: project?.archivedAt ?? null,
      };
    }),
  },
  routinesWithTriggers,
  routinesWithoutTriggers,
  duplicateTakeoverGroups,
  staleErrorAgents,
  openIssuesWithoutAssignee: openIssuesWithoutAssignee.map((issue) => ({
    identifier: issue.identifier,
    title: issue.title,
    status: issue.status,
  })),
  staleInProgressIssues: staleInProgressIssues.map((issue) => ({
    identifier: issue.identifier,
    title: issue.title,
    status: issue.status,
    assigneeAgentId: issue.assigneeAgentId,
  })),
  statusSyncChurnIssues,
  orphanActiveWorkIssues: orphanActiveWorkIssues.map((issue) => ({
    identifier: issue.identifier,
    title: issue.title,
    status: issue.status,
    projectWorkspaceId: issue.projectWorkspaceId ?? null,
  })),
  projectsWithActiveIssueStatusDrift: projectsWithActiveIssueStatusDrift.map((project) => ({
    name: project.name,
    status: project.status,
  })),
  agentsWithSparkModel: agentsWithSparkModel.map((agent) => ({
    name: agent.name,
    status: agent.status,
    model: agent.adapterConfig?.model ?? null,
    cheapModel: agent.runtimeConfig?.modelProfiles?.cheap?.adapterConfig?.model ?? null,
  })),
  instructionBundleDrift,
  rootPortfolioDrift,
  unblockPacketStatus,
  controlTickStatus,
  controlPostureStatus,
  sourceControlStatus: {
    clean: latestControlTick?.sourceControlClean ?? null,
    repos: latestSourceControl,
  },
  runtimeBindingGaps,
  findings,
}, null, 2));
