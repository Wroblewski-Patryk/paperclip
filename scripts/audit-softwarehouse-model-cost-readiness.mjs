const apiBase = process.env.PAPERCLIP_API_URL ?? "http://127.0.0.1:3200";
const companyId = process.env.PAPERCLIP_COMPANY_ID ?? "ae26bb8b-8f5f-4a85-b341-78d4e1985975";
const quotaHoldPercent = Number(process.env.PAPERCLIP_CODEX_LOCAL_QUOTA_HOLD_USED_PERCENT ?? 75);
const longWindowHoldPercent = Number(process.env.PAPERCLIP_CODEX_LOCAL_QUOTA_LONG_WINDOW_HOLD_USED_PERCENT ?? 90);
const shortWindowMaxMs = Number(process.env.PAPERCLIP_CODEX_LOCAL_QUOTA_SHORT_WINDOW_MAX_MS ?? 24 * 60 * 60 * 1000);

async function request(route) {
  const response = await fetch(`${apiBase}${route}`, {
    headers: { "content-type": "application/json" },
  });
  const text = await response.text();
  const data = text ? JSON.parse(text) : null;
  if (!response.ok) throw new Error(`GET ${route} failed with ${response.status}: ${text}`);
  return Array.isArray(data) ? data : data?.value ?? data;
}

async function optionalRequest(route) {
  try {
    return await request(route);
  } catch (error) {
    return { error: error instanceof Error ? error.message : String(error) };
  }
}

function countBy(items, selector) {
  const counts = {};
  for (const item of items) {
    const key = selector(item) ?? "unknown";
    counts[key] = (counts[key] ?? 0) + 1;
  }
  return Object.fromEntries(Object.entries(counts).sort(([left], [right]) => left.localeCompare(right)));
}

function asRecord(value) {
  return value && typeof value === "object" && !Array.isArray(value) ? value : {};
}

function envHasKey(agent, key) {
  return Object.prototype.hasOwnProperty.call(asRecord(agent.adapterConfig?.env), key);
}

function isConsumableQuotaWindow(window) {
  return !/remaining|credit/i.test(`${window.label ?? ""} ${window.valueLabel ?? ""}`);
}

function isShortQuotaWindow(window, now = new Date()) {
  if (!window.resetsAt) return true;
  const reset = new Date(window.resetsAt);
  if (Number.isNaN(reset.getTime())) return true;
  const resetInMs = reset.getTime() - now.getTime();
  return resetInMs > 0 && resetInMs <= shortWindowMaxMs;
}

function hardHoldThresholdForWindow(window) {
  return isShortQuotaWindow(window) ? quotaHoldPercent : longWindowHoldPercent;
}

function summarizeQuota(providerResult) {
  return {
    provider: providerResult.provider,
    source: providerResult.source ?? null,
    ok: Boolean(providerResult.ok),
    error: providerResult.error ?? null,
    windows: (providerResult.windows ?? []).map((window) => ({
      label: window.label,
      usedPercent: window.usedPercent ?? null,
      resetsAt: window.resetsAt ?? null,
      valueLabel: window.valueLabel ?? null,
      hardHoldThreshold: isConsumableQuotaWindow(window) ? hardHoldThresholdForWindow(window) : null,
      overShortHoldThreshold:
        typeof window.usedPercent === "number" &&
        window.usedPercent >= quotaHoldPercent &&
        isConsumableQuotaWindow(window),
      overHardHoldThreshold:
        typeof window.usedPercent === "number" &&
        window.usedPercent >= hardHoldThresholdForWindow(window) &&
        isConsumableQuotaWindow(window),
    })),
  };
}

function summarizeAgents(agents) {
  const active = agents.filter((agent) => agent.status !== "terminated");
  const codex = active.filter((agent) => agent.adapterType === "codex_local");
  const apiKeyAgents = codex.filter((agent) => envHasKey(agent, "OPENAI_API_KEY"));
  const cheapEqualsPrimary = codex.filter((agent) => {
    if (agent.metadata?.modelLane === "fastTriage") return false;
    const primary = agent.adapterConfig?.model ?? null;
    const cheap = agent.runtimeConfig?.modelProfiles?.cheap?.adapterConfig?.model ?? null;
    return primary && cheap && primary === cheap;
  });

  return {
    total: active.length,
    byStatus: countBy(active, (agent) => agent.status),
    byAdapterType: countBy(active, (agent) => agent.adapterType),
    codexLocal: {
      count: codex.length,
      byPrimaryModel: countBy(codex, (agent) => agent.adapterConfig?.model),
      byCheapModel: countBy(codex, (agent) => agent.runtimeConfig?.modelProfiles?.cheap?.adapterConfig?.model),
      cheapEqualsPrimaryCount: cheapEqualsPrimary.length,
      cheapFastModeCount: codex.filter((agent) => agent.runtimeConfig?.modelProfiles?.cheap?.adapterConfig?.fastMode === true).length,
      openAiApiKeyConfiguredCount: apiKeyAgents.length,
      apiKeyConfiguredAgentNames: apiKeyAgents.map((agent) => agent.name).sort(),
    },
  };
}

async function summarizeErrorAgentRuns(agents) {
  const errorAgents = agents.filter((agent) => agent.status === "error");
  const rows = [];
  for (const agent of errorAgents) {
    const data = await optionalRequest(
      `/api/companies/${companyId}/heartbeat-runs?agentId=${agent.id}&limit=5`,
    );
    const runs = Array.isArray(data) ? data : data?.runs ?? data?.items ?? [];
    const latest = runs[0] ?? null;
    const recentText = JSON.stringify(runs.map((run) => ({
      status: run.status,
      error: run.error,
      errorCode: run.errorCode,
      scheduledRetryReason: run.scheduledRetryReason,
    })));
    rows.push({
      agentId: agent.id,
      agentName: agent.name,
      latestRunStatus: latest?.status ?? null,
      latestScheduledRetryAt: latest?.scheduledRetryAt ?? null,
      latestScheduledRetryReason: latest?.scheduledRetryReason ?? null,
      hasQuotaLimitFailure:
        /usage limit|quota|rate limit/i.test(recentText) ||
        runs.some((run) => run.errorCode === "codex_transient_upstream"),
      hasInvalidApiKeyFailure:
        /incorrect api key|401 unauthorized/i.test(recentText),
    });
  }
  return rows;
}

function summarizeBudgetPolicies(overview) {
  const policies = overview?.policies ?? [];
  const companyPolicies = policies.filter((policy) => policy.scopeType === "company");
  const agentPolicies = policies.filter((policy) => policy.scopeType === "agent");
  return {
    policyCount: policies.length,
    companyPolicies: companyPolicies.map((policy) => ({
      scopeName: policy.scopeName,
      amount: policy.amount,
      observedAmount: policy.observedAmount,
      utilizationPercent: policy.utilizationPercent,
      status: policy.status,
      hardStopEnabled: policy.hardStopEnabled,
    })),
    agentPolicyCount: agentPolicies.length,
    activeIncidentCount: overview?.activeIncidents?.length ?? 0,
    pausedAgentCount: overview?.pausedAgentCount ?? 0,
  };
}

const [quotaWindows, costSummary, budgetOverview, agents] = await Promise.all([
  request(`/api/companies/${companyId}/costs/quota-windows`),
  request(`/api/companies/${companyId}/costs/summary`),
  request(`/api/companies/${companyId}/budgets/overview`),
  request(`/api/companies/${companyId}/agents`),
]);

const quota = quotaWindows.map(summarizeQuota);
const agentSummary = summarizeAgents(agents);
const errorAgentRuns = await summarizeErrorAgentRuns(agents);
const anyHardQuotaHold = quota.some((provider) => provider.windows.some((window) => window.overHardHoldThreshold));
const anyLongWindowPressure = quota.some((provider) =>
  provider.windows.some((window) => window.overShortHoldThreshold && !window.overHardHoldThreshold)
);

const risks = [];
if (anyHardQuotaHold) {
  risks.push({
    code: "provider_quota_hold_expected",
    level: "info",
    summary: `A consumable provider quota window is at or above its hard threshold; queued codex_local runs should defer instead of starting.`,
  });
}
if (anyLongWindowPressure) {
  risks.push({
    code: "provider_quota_long_window_pressure",
    level: "info",
    summary: `A long provider quota window is above ${quotaHoldPercent}% but below the hard long-window hold (${longWindowHoldPercent}%); continue slowly instead of starting a broad fanout.`,
  });
}
if (agentSummary.codexLocal.cheapEqualsPrimaryCount > 0) {
  risks.push({
    code: "cheap_profile_not_diversified",
    level: "warning",
    summary: `${agentSummary.codexLocal.cheapEqualsPrimaryCount} codex_local agents still have the same primary and cheap model.`,
  });
}
if (agentSummary.codexLocal.openAiApiKeyConfiguredCount === 0) {
  risks.push({
    code: "openai_api_lane_not_configured",
    level: "info",
    summary: "No codex_local agents currently use OPENAI_API_KEY. Before enabling API-backed GPT lanes, run one metered smoke and verify cost_events records non-zero or intentionally configured cost.",
  });
} else if (costSummary.spendCents === 0) {
  risks.push({
    code: "api_metering_unverified",
    level: "warning",
    summary: "OPENAI_API_KEY is configured on at least one agent, but recorded spend is still zero. Verify adapter costUsd or explicit price mapping before broad API work.",
  });
}
const quotaRetryErrorAgents = errorAgentRuns.filter((row) =>
  row.latestRunStatus === "scheduled_retry" &&
  row.hasQuotaLimitFailure &&
  row.latestScheduledRetryAt
);
if (quotaRetryErrorAgents.length > 0) {
  risks.push({
    code: "agent_error_status_quota_retry",
    level: "info",
    summary: `${quotaRetryErrorAgents.length} error-status agents currently have scheduled retries after quota-limit failures; avoid manual reset unless the retry gets stale.`,
  });
}
const invalidApiKeyErrorAgents = errorAgentRuns.filter((row) => row.hasInvalidApiKeyFailure);
if (invalidApiKeyErrorAgents.length > 0) {
  risks.push({
    code: "recent_invalid_openai_api_key_failures",
    level: "warning",
    summary: `${invalidApiKeyErrorAgents.length} error-status agents have recent invalid OpenAI API key failures. Confirm managed Codex auth has no placeholder values before retrying API-backed lanes.`,
  });
}

console.log(JSON.stringify({
  checkedAt: new Date().toISOString(),
  apiBase,
  companyId,
  quotaHoldPercent,
  longWindowHoldPercent,
  shortWindowMaxMs,
  costSummary,
  budget: summarizeBudgetPolicies(budgetOverview),
  quota,
  agents: agentSummary,
  errorAgentRuns,
  risks,
}, null, 2));
