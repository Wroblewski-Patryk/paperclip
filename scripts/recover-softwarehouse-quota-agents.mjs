import {
  quotaAgentRecoveryDecision,
  quotaWindowsFromResult,
} from "./lib/softwarehouse-quota-agent-recovery.mjs";

const apiBase = process.env.PAPERCLIP_API_URL ?? "http://127.0.0.1:3200";
const requestedCompanyId = process.env.PAPERCLIP_COMPANY_ID ?? null;
const preferredCompanyNames = [
  process.env.SOFTWAREHOUSE_COMPANY_NAME,
  process.env.PAPERCLIP_COMPANY_NAME,
  "LuckySparrow",
  "LuckySparrow Software House",
].filter(Boolean);
const fallbackModel = process.env.SOFTWAREHOUSE_QUOTA_FALLBACK_MODEL ?? "gpt-5.6-luna";
const apply = process.argv.includes("--apply");

async function request(method, route, body) {
  const response = await fetch(`${apiBase}${route}`, {
    method,
    headers: { "content-type": "application/json" },
    body: body === undefined ? undefined : JSON.stringify(body),
  });
  const text = await response.text();
  let data = null;
  try {
    data = text ? JSON.parse(text) : null;
  } catch {
    data = null;
  }
  if (!response.ok) {
    const error = new Error(`${method} ${route} failed with HTTP ${response.status}`);
    error.status = response.status;
    throw error;
  }
  return data;
}

async function resolveCompany() {
  if (requestedCompanyId) return { id: requestedCompanyId, source: "PAPERCLIP_COMPANY_ID" };
  const companies = await request("GET", "/api/companies");
  const company = preferredCompanyNames
    .map((name) => companies.find((candidate) => candidate.name === name))
    .find(Boolean)
    ?? companies.find((candidate) => /^LuckySparrow\b/i.test(candidate.name));
  if (!company) throw new Error("LuckySparrow company was not found.");
  return { id: company.id, source: "company_name" };
}

async function probe(companyId, agent, adapterConfig) {
  try {
    return await request(
      "POST",
      `/api/companies/${companyId}/adapters/${agent.adapterType}/test-environment`,
      { adapterConfig },
    );
  } catch (error) {
    return {
      status: "fail",
      checks: [{
        level: "error",
        code: Number.isFinite(error?.status) ? `adapter_test_http_${error.status}` : "adapter_test_request_failed",
      }],
    };
  }
}

function probeCacheKey(agent, adapterConfig) {
  return JSON.stringify({
    adapterType: agent.adapterType,
    command: adapterConfig?.command ?? null,
    cwd: adapterConfig?.cwd ?? null,
    model: adapterConfig?.model ?? null,
    effort: adapterConfig?.modelReasoningEffort ?? null,
    fastMode: adapterConfig?.fastMode ?? null,
  });
}

function compactProbe(result) {
  return {
    status: result?.status ?? "unknown",
    errorCodes: (result?.checks ?? [])
      .filter((check) => check?.level === "error")
      .map((check) => check?.code ?? "unknown_error"),
  };
}

const company = await resolveCompany();
const [agents, liveRuns, quotaResult] = await Promise.all([
  request("GET", `/api/companies/${company.id}/agents`),
  request("GET", `/api/companies/${company.id}/live-runs`),
  request("GET", `/api/companies/${company.id}/costs/quota-windows`),
]);

const liveAgentIds = new Set((Array.isArray(liveRuns) ? liveRuns : []).map((run) => run.agentId).filter(Boolean));
const candidates = (Array.isArray(agents) ? agents : []).filter((agent) =>
  agent.adapterType === "codex_local"
  && agent.status === "error"
  && !liveAgentIds.has(agent.id)
);
const quotaWindows = quotaWindowsFromResult(quotaResult);
const probeCache = new Map();

async function cachedProbe(agent, adapterConfig) {
  const key = probeCacheKey(agent, adapterConfig);
  if (!probeCache.has(key)) probeCache.set(key, probe(company.id, agent, adapterConfig));
  return probeCache.get(key);
}

const decisions = [];
const recoveredAgents = [];
for (const agent of candidates) {
  const primaryConfig = agent.adapterConfig ?? {};
  const fallbackConfig = {
    ...primaryConfig,
    model: fallbackModel,
    modelReasoningEffort: "low",
    fastMode: false,
  };
  const primaryProbe = await cachedProbe(agent, primaryConfig);
  const fallbackProbe = await cachedProbe(agent, fallbackConfig);
  const decision = quotaAgentRecoveryDecision({ quotaWindows, primaryProbe, fallbackProbe });
  decisions.push({
    agent: agent.name,
    ...decision,
    primaryProbe: compactProbe(primaryProbe),
    fallbackProbe: compactProbe(fallbackProbe),
  });
  if (apply && decision.recover) {
    await request("PATCH", `/api/agents/${agent.id}?companyId=${company.id}`, { status: "idle" });
    recoveredAgents.push({ id: agent.id, name: agent.name });
  }
}

console.log(JSON.stringify({
  apiBase,
  companyId: company.id,
  apply,
  fallbackModel,
  candidateCount: candidates.length,
  decision: decisions.length === 0
    ? "no_candidates"
    : decisions.every((entry) => entry.recover)
      ? "recover_all_candidates"
      : decisions.some((entry) => entry.recover)
        ? "recover_eligible_candidates"
        : "hold_candidates",
  decisions,
  recoveredAgents,
}, null, 2));
