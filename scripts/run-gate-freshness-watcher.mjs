import { normalizeKey } from "./lib/secret-aliases.mjs";
import { resolveIssuesByIdentifier } from "./lib/issue-discovery.mjs";
import { gateFreshnessObservation } from "./lib/gate-freshness.mjs";
import { softwarehouseGateSpecs } from "./lib/softwarehouse-gates.mjs";
import { agentWipBlockerFor, fetchAgentWipState, summarizeAgentWip } from "./lib/agent-wip-guard.mjs";

const apiBase = process.env.PAPERCLIP_API_URL ?? "http://127.0.0.1:3200";
const companyName = "LuckySparrow Software House";
const companyNameAliases = [companyName, "LuckySparrow"];
const apply = process.argv.includes("--apply");
const currentWatcherRunId = process.env.PAPERCLIP_RUN_ID ?? null;
const heartbeatCompanyId = process.env.PAPERCLIP_COMPANY_ID ?? null;
const heartbeatAgentId = process.env.PAPERCLIP_AGENT_ID ?? null;
const apiKey = process.env.PAPERCLIP_API_KEY ?? null;
const requestTimeoutMs = Number(process.env.SOFTWAREHOUSE_GATE_FRESHNESS_REQUEST_TIMEOUT_MS ?? 15_000);

async function request(method, route, body) {
  const headers = { "content-type": "application/json" };
  if (apiKey) {
    headers.authorization = `Bearer ${apiKey}`;
  }
  if (currentWatcherRunId && ["POST", "PATCH", "PUT", "DELETE"].includes(method)) {
    headers["x-paperclip-run-id"] = currentWatcherRunId;
  }
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), requestTimeoutMs);
  try {
    const response = await fetch(`${apiBase}${route}`, {
      method,
      headers,
      body: body === undefined ? undefined : JSON.stringify(body),
      signal: controller.signal,
    });
    const text = await response.text();
    const data = text ? JSON.parse(text) : null;
    if (!response.ok) throw new Error(`${method} ${route} failed with ${response.status}: ${text}`);
    return data;
  } catch (error) {
    if (error?.name === "AbortError") {
      throw new Error(`${method} ${route} timed out after ${requestTimeoutMs}ms`);
    }
    throw error;
  } finally {
    clearTimeout(timeout);
  }
}

async function captureRequest(name, method, route, body) {
  try {
    return { name, ok: true, data: await request(method, route, body) };
  } catch (error) {
    return { name, ok: false, error: error instanceof Error ? error.message : String(error) };
  }
}

async function captureSecretsMetadata(resolvedCompanyId) {
  const metadata = await captureRequest("secrets", "GET", `/api/companies/${resolvedCompanyId}/secrets/metadata`);
  if (metadata.ok || !/\b404\b/.test(metadata.error ?? "")) return metadata;
  const legacy = await captureRequest("secrets", "GET", `/api/companies/${resolvedCompanyId}/secrets`);
  if (!legacy.ok) return metadata;
  return {
    ...legacy,
    routeFallback: "/secrets",
  };
}

function dataOrFallback(result, fallback) {
  return result.ok ? result.data : fallback;
}

async function resolveCompany() {
  if (heartbeatCompanyId) {
    return { id: heartbeatCompanyId, name: companyName, source: "PAPERCLIP_COMPANY_ID" };
  }

  const companies = await request("GET", "/api/companies");
  const company = companies.find((candidate) => companyNameAliases.includes(candidate.name));
  if (!company) throw new Error(`Company not found: ${companyName}`);
  return { ...company, source: "/api/companies" };
}

async function captureCompanyResolution() {
  try {
    return { ok: true, data: await resolveCompany() };
  } catch (error) {
    return {
      ok: false,
      error: error instanceof Error ? error.message : String(error),
      data: { id: heartbeatCompanyId, name: companyName, source: "unresolved" },
    };
  }
}

function isCurrentWatcherRun(run) {
  return Boolean(currentWatcherRunId && run?.id === currentWatcherRunId);
}

function blockingActiveRunCountFor({ activeRunCount, liveRuns }) {
  const selfRunCount = liveRuns.filter((run) => isCurrentWatcherRun(run)).length;
  return Math.max(0, activeRunCount - selfRunCount);
}

function duplicateAssigneeActionFor(actionsToCheck) {
  const seen = new Set();
  for (const action of actionsToCheck) {
    const assignee = action.assigneeAgentId;
    if (!assignee) continue;
    if (seen.has(assignee)) return action;
    seen.add(assignee);
  }
  return null;
}

const companyResolutionResult = await captureCompanyResolution();
const company = companyResolutionResult.data;
const companyIdAvailable = Boolean(company.id);

const missingCompanyTelemetry = (name) => ({
  name,
  ok: false,
  error: companyResolutionResult.ok
    ? "company_id_unavailable"
    : `company_resolution_failed: ${companyResolutionResult.error}`,
});

const telemetry = await Promise.all([
  captureRequest("health", "GET", "/api/health"),
  companyIdAvailable
    ? captureSecretsMetadata(company.id)
    : missingCompanyTelemetry("secrets"),
  companyIdAvailable
    ? captureRequest("liveRuns", "GET", `/api/companies/${company.id}/live-runs`)
    : missingCompanyTelemetry("liveRuns"),
  companyIdAvailable
    ? captureRequest("agents", "GET", `/api/companies/${company.id}/agents`)
    : missingCompanyTelemetry("agents"),
]);
const telemetryByName = new Map(telemetry.map((result) => [result.name, result]));
const healthResult = telemetryByName.get("health");
const secretsResult = telemetryByName.get("secrets");
const liveRunsResult = telemetryByName.get("liveRuns");
const agentsResult = telemetryByName.get("agents");
const apiErrors = telemetry
  .filter((result) => !result.ok)
  .map((result) => ({ name: result.name, error: result.error }));
const requiredTelemetryErrors = [healthResult, secretsResult, liveRunsResult]
  .filter((result) => !result?.ok)
  .map((result) => ({ name: result.name, error: result.error }));
const requiredTelemetryAvailable = Boolean(
  healthResult?.ok
  && secretsResult?.ok
  && liveRunsResult?.ok
);
const agentRosterAvailable = Boolean(agentsResult?.ok);
const health = dataOrFallback(healthResult, {});
const issues = [];
const secrets = dataOrFallback(secretsResult, []);
const liveRuns = dataOrFallback(liveRunsResult, []);
const agents = dataOrFallback(agentsResult, []);

const activeRunCount = requiredTelemetryAvailable
  ? health.devServer?.activeRunCount ?? liveRuns.length
  : null;
const agentWip = summarizeAgentWip({ activeRunCount, liveRuns });
const nonBlockingSelfRunCount = liveRuns.filter((run) => isCurrentWatcherRun(run)).length;
const blockingActiveRunCount = activeRunCount == null
  ? null
  : blockingActiveRunCountFor({ activeRunCount, liveRuns });
const secretByKey = new Map(secrets.map((secret) => [normalizeKey(secret.key), secret]));
const agentByName = new Map(agents.map((agent) => [agent.name, agent]));
const actions = [];
const observations = [];
const terminalStatuses = new Set(["done", "cancelled"]);

function localExistingRecheckChildFor(action) {
  return issues.find((issue) =>
    issue.parentId === action.issueId
    && issue.title === action.childTitle
    && !terminalStatuses.has(issue.status)
  ) ?? null;
}

async function existingRecheckChildFor(action) {
  const localMatch = localExistingRecheckChildFor(action);
  if (localMatch) return localMatch;

  const children = await request(
    "GET",
    `/api/companies/${company.id}/issues?parentId=${encodeURIComponent(action.issueId)}&limit=100`,
  )
    .then((result) => result.value ?? result ?? [])
    .catch(() => []);
  return children.find((issue) =>
    issue.parentId === action.issueId
    && issue.title === action.childTitle
    && !terminalStatuses.has(issue.status)
  ) ?? null;
}

if (!requiredTelemetryAvailable) {
  for (const spec of softwarehouseGateSpecs) {
    observations.push({
      rootBlocker: spec.rootBlocker,
      state: "telemetry_unavailable",
      actionableFreshGateFact: false,
    });
  }
} else {
  const issueByIdentifier = await resolveIssuesByIdentifier({
    companyId: company.id,
    identifiers: softwarehouseGateSpecs.map((spec) => spec.rootBlocker),
    issues,
    request,
  });
  for (const spec of softwarehouseGateSpecs) {
    const issue = issueByIdentifier.get(spec.rootBlocker);
    if (!issue) {
      observations.push({ rootBlocker: spec.rootBlocker, state: "missing_issue" });
      continue;
    }
    const comments = await request("GET", `/api/issues/${issue.id}/comments?order=desc&limit=12`)
      .then((result) => result.value ?? result ?? [])
      .catch(() => []);
    const freshness = gateFreshnessObservation({
      issue,
      comments,
      secretByKey,
      secretKeys: spec.secretKeys,
    });

    const childTitle = `[Gate recheck][${spec.rootBlocker}] ${spec.project} protected recheck`;
    const action = {
      rootBlocker: spec.rootBlocker,
      issueId: issue.id,
      projectId: issue.projectId ?? null,
      goalId: issue.goalId ?? null,
      priority: issue.priority ?? "critical",
      assigneeAgentId: agentByName.get(spec.owner)?.id ?? issue.assigneeAgentId ?? null,
      title: issue.title,
      owner: spec.owner,
      comment: spec.resumeComment,
      childTitle,
      childDescription: [
        `Fresh protected gate fact detected by [LUC-2697](/LUC/issues/LUC-2697).`,
        "",
        `- Root blocker: [${spec.rootBlocker}](/LUC/issues/${spec.rootBlocker})`,
        `- Owner: ${spec.owner}`,
        `- Scope: ${spec.allowedAction}`,
        `- Forbidden: ${spec.forbiddenAction}`,
        `- Evidence expected: ${spec.evidenceRequired}`,
      ].join("\n"),
    };
    const existingRecheckChild = await existingRecheckChildFor(action);

    const observation = {
      rootBlocker: spec.rootBlocker,
      title: issue.title,
      status: issue.status,
      issueUpdatedAt: issue.updatedAt,
      trackedSecretCount: freshness.trackedSecretCount,
      latestSecretUpdatedAt: freshness.latestSecretUpdatedAt,
      secretUpdatedAfterIssue: freshness.secretUpdatedAfterIssue,
      hasSecretFreshnessSignal: freshness.hasSecretFreshnessSignal,
      actionableFreshGateFact: freshness.actionableFreshGateFact,
      hasExplicitApprovalOrEvidence: freshness.hasExplicitApprovalOrEvidence,
      latestCommentIsPlaceholderOnly: freshness.latestCommentIsPlaceholderOnly,
      existingRecheckChildIdentifier: existingRecheckChild?.identifier ?? null,
      existingRecheckChildStatus: existingRecheckChild?.status ?? null,
    };
    observations.push(observation);

    if (issue.status !== "blocked") continue;
    if (!freshness.actionableFreshGateFact) continue;
    if (freshness.latestCommentIsPlaceholderOnly) continue;
    if (existingRecheckChild) continue;
    actions.push(action);
  }
}

function isCrossAssigneeMutationError(error) {
  return error instanceof Error
    && (
      /Agent cannot mutate another agent's issue/i.test(error.message ?? "")
      || /Issue is outside this actor's authorization boundary/i.test(error.message ?? "")
    );
}

function isCrossAgentInvokeError(error) {
  return error instanceof Error
    && /Agent can only invoke itself/i.test(error.message ?? "");
}

async function createOrReuseRecheckChild(action) {
  const existing = await existingRecheckChildFor(action);
  if (existing) {
    return { issue: existing, created: false };
  }
  const issue = await request("POST", `/api/companies/${company.id}/issues`, {
    title: action.childTitle,
    description: action.childDescription,
    status: "todo",
    priority: action.priority,
    assigneeAgentId: action.assigneeAgentId,
    parentId: action.issueId,
    projectId: action.projectId,
    goalId: action.goalId,
  });
  return { issue, created: true };
}

const applied = [];
const skippedActions = [];
let applySkipped = null;
if (apply) {
  if (!requiredTelemetryAvailable) {
    applySkipped = {
      reason: "telemetry_unavailable",
      apiErrors: requiredTelemetryErrors,
      currentWatcherRunId,
    };
  }
  const freshWip = applySkipped
    ? null
    : await fetchAgentWipState({ request, companyId: company.id });
  const freshBlockingActiveRunCount = blockingActiveRunCountFor({
    activeRunCount: freshWip?.activeRunCount ?? 0,
    liveRuns: freshWip?.liveRuns ?? [],
  });
  if (!applySkipped && actions.length !== 1) {
    applySkipped = {
      reason: "expected_exactly_one_action",
      actionCount: actions.length,
      nextAction: "Run --apply only when the watcher reports exactly one fresh gate action.",
      currentWatcherRunId,
    };
  }
  if (!applySkipped && freshBlockingActiveRunCount > 0) {
    applySkipped = {
      reason: "blocking_active_runs_present",
      activeRunCount: freshWip.activeRunCount,
      liveRunCount: freshWip.liveRunCount,
      blockingActiveRunCount: freshBlockingActiveRunCount,
      unknownActiveRunCount: freshWip.unknownActiveRunCount,
      currentWatcherRunId,
      nextAction: "Supervise live runs only; do not wake a protected gate recheck until no other live runs remain.",
    };
  }
  if (!applySkipped && (freshWip?.unknownActiveRunCount ?? 0) > 0) {
    applySkipped = {
      reason: "unknown_active_run",
      activeRunCount: freshWip.activeRunCount,
      liveRunCount: freshWip.liveRunCount,
      blockingActiveRunCount: freshBlockingActiveRunCount,
      unknownActiveRunCount: freshWip.unknownActiveRunCount,
      currentWatcherRunId,
    };
  }
  let eligibleActions = actions;
  if (!applySkipped) {
    eligibleActions = [];
    for (const action of actions) {
      const wipBlocker = agentWipBlockerFor(action.assigneeAgentId, freshWip);
      if (wipBlocker) {
        skippedActions.push({
          rootBlocker: action.rootBlocker,
          reason: wipBlocker,
          assigneeAgentId: action.assigneeAgentId,
        });
      } else {
        eligibleActions.push(action);
      }
    }
  }
  const duplicateAssigneeAction = duplicateAssigneeActionFor(eligibleActions);
  if (!applySkipped && duplicateAssigneeAction) {
    applySkipped = {
      reason: "duplicate_target_assignee",
      rootBlocker: duplicateAssigneeAction.rootBlocker,
      issueId: duplicateAssigneeAction.issueId,
      assigneeAgentId: duplicateAssigneeAction.assigneeAgentId,
      nextAction: "Resolve one gate per target assignee so a single agent never receives parallel protected rechecks.",
      currentWatcherRunId,
    };
  }
  if (!applySkipped) {
    for (const action of eligibleActions) {
      let updated = null;
      let delegatedChild = null;
      try {
        updated = await request("PATCH", `/api/issues/${action.issueId}`, {
          status: "todo",
          comment: action.comment,
        });
      } catch (error) {
        if (!isCrossAssigneeMutationError(error)) throw error;
        delegatedChild = await createOrReuseRecheckChild(action);
        updated = delegatedChild.issue;
      }
      let wakeRun = null;
      let wakeError = null;
      if (action.assigneeAgentId) {
        try {
          wakeRun = await request("POST", `/api/agents/${action.assigneeAgentId}/heartbeat/invoke?companyId=${company.id}`, {
            reason: "gate_recheck_ready",
            payload: {
              issueId: updated.id ?? action.issueId,
              source: "softwarehouse-gate-freshness-watcher",
              rootBlocker: action.rootBlocker,
              rootIssueId: action.issueId,
              delegatedChild: Boolean(delegatedChild),
            },
            idempotencyKey: `softwarehouse-gate-recheck:${updated.id ?? action.issueId}:${updated.updatedAt ?? Date.now()}`,
          });
        } catch (error) {
          if (!isCrossAgentInvokeError(error)) throw error;
          wakeError = "cross_agent_invoke_forbidden";
        }
      }
      applied.push({
        rootBlocker: action.rootBlocker,
        status: updated.status,
        issueId: updated.id ?? action.issueId,
        delegatedChildCreated: delegatedChild?.created ?? false,
        delegatedChildReused: delegatedChild ? !delegatedChild.created : false,
        updatedAt: updated.updatedAt,
        wakeRunId: wakeRun?.id ?? null,
        wakeStatus: wakeRun?.status ?? wakeError,
      });
    }
  }
}

console.log(JSON.stringify({
  apiBase,
  requestTimeoutMs,
  company: { id: company.id, name: company.name },
  companyResolution: {
    ok: companyResolutionResult.ok,
    source: company.source,
    error: companyResolutionResult.ok ? null : companyResolutionResult.error,
  },
  mode: apply ? "apply" : "dry-run",
  telemetryAvailable: requiredTelemetryAvailable,
  apiErrors,
  requiredTelemetryErrors,
  agentRosterAvailable,
  activeRunCount,
  liveRunCount: liveRuns.length,
  blockingActiveRunCount,
  nonBlockingSelfRunCount,
  unknownActiveRunCount: agentWip.unknownActiveRunCount,
  currentWatcherRunId,
  heartbeatAgentId,
  observations,
  actionCount: actions.length,
  actions: actions.map((action) => ({
    rootBlocker: action.rootBlocker,
    title: action.title,
    owner: action.owner,
    assigneeAgentId: action.assigneeAgentId,
  })),
  applySkipped,
  skippedActions,
  applied,
}, null, 2));
