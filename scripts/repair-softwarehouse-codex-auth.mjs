const apiBase = process.env.PAPERCLIP_API_URL ?? "http://127.0.0.1:3200";
const companyName = "LuckySparrow Software House";
const companyId = process.env.PAPERCLIP_COMPANY_ID ?? null;
const blockerTitle = "[Softwarehouse][Blocker] Configure OpenAI runtime auth for Codex agents";
const targetModel = process.env.SOFTWAREHOUSE_CODEX_MODEL ?? "gpt-5.5";
const targetCheapModel = process.env.SOFTWAREHOUSE_CODEX_CHEAP_MODEL ?? "gpt-5.4";
const unsupportedChatGptModels = new Set(["gpt-5", "gpt-5-mini", "gpt-5.3-codex"]);

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

function findErrorCheck(result) {
  return result.checks?.find((check) => check.level === "error") ?? null;
}

function supportedModel(model) {
  if (typeof model !== "string" || !model.trim()) return targetModel;
  if (unsupportedChatGptModels.has(model) || model.includes("spark")) return targetModel;
  return model;
}

function supportedCheapModel(model) {
  if (typeof model !== "string" || !model.trim()) return targetCheapModel;
  if (unsupportedChatGptModels.has(model) || model.includes("spark")) return targetCheapModel;
  return model;
}

function normalizeAgentModelConfig(agent) {
  const adapterConfig = {
    ...(agent.adapterConfig ?? {}),
    model: supportedModel(agent.adapterConfig?.model),
  };
  const cheapProfile = agent.runtimeConfig?.modelProfiles?.cheap;
  const runtimeConfig = {
    ...(agent.runtimeConfig ?? {}),
    modelProfiles: {
      ...(agent.runtimeConfig?.modelProfiles ?? {}),
      ...(cheapProfile
        ? {
            cheap: {
              ...cheapProfile,
              enabled: true,
              label: "Fast triage",
              adapterConfig: {
                ...(cheapProfile.adapterConfig ?? {}),
                model: supportedCheapModel(cheapProfile.adapterConfig?.model),
                ...(supportedCheapModel(cheapProfile.adapterConfig?.model) === "gpt-5.4" ? { fastMode: true } : {}),
              },
            },
          }
        : {}),
    },
  };
  return { adapterConfig, runtimeConfig };
}

async function resolveCompany() {
  if (companyId) return { id: companyId, source: "PAPERCLIP_COMPANY_ID" };

  const companies = await request("GET", "/api/companies");
  const company = companies.find((candidate) => candidate.name === companyName)
    ?? companies.find((candidate) => candidate.name === "LuckySparrow")
    ?? companies.find((candidate) => /^LuckySparrow\b/i.test(candidate.name));
  if (!company) throw new Error(`Company not found: ${companyName}`);
  return { id: company.id, source: "company_name" };
}

const company = await resolveCompany();

const [agents, issues, liveRuns] = await Promise.all([
  request("GET", `/api/companies/${company.id}/agents/`),
  request("GET", `/api/companies/${company.id}/issues`),
  request("GET", `/api/companies/${company.id}/live-runs`),
]);

const normalizedAgents = [];
for (const agent of agents.filter((entry) => entry.adapterType === "codex_local" && entry.status !== "terminated")) {
  const { adapterConfig, runtimeConfig } = normalizeAgentModelConfig(agent);
  if (
    adapterConfig.model !== agent.adapterConfig?.model
    || runtimeConfig.modelProfiles?.cheap?.enabled !== agent.runtimeConfig?.modelProfiles?.cheap?.enabled
    || runtimeConfig.modelProfiles?.cheap?.label !== agent.runtimeConfig?.modelProfiles?.cheap?.label
    || runtimeConfig.modelProfiles?.cheap?.adapterConfig?.model !== agent.runtimeConfig?.modelProfiles?.cheap?.adapterConfig?.model
  ) {
    const updated = await request("PATCH", `/api/agents/${agent.id}?companyId=${company.id}`, {
      adapterConfig,
      runtimeConfig,
    });
    normalizedAgents.push({
      name: updated.name,
      model: updated.adapterConfig?.model,
      cheapModel: updated.runtimeConfig?.modelProfiles?.cheap?.adapterConfig?.model,
    });
  }
}

const refreshedAgents = normalizedAgents.length > 0
  ? await request("GET", `/api/companies/${company.id}/agents/`)
  : agents;
const codexAgent = refreshedAgents.find((agent) => agent.adapterType === "codex_local" && agent.status !== "terminated");
if (!codexAgent) throw new Error("No codex_local agent found.");

const smoke = await request("POST", `/api/companies/${company.id}/adapters/${codexAgent.adapterType}/test-environment`, {
  adapterConfig: codexAgent.adapterConfig ?? {},
});
const failingCheck = findErrorCheck(smoke);
if (smoke.status === "fail" || failingCheck) {
  throw new Error(
    `Codex auth smoke test failed for ${codexAgent.name}: ${failingCheck?.code ?? smoke.status} ${failingCheck?.detail ?? ""}`.trim(),
  );
}

const liveRunAgentIds = new Set(liveRuns.map((run) => run.agentId).filter(Boolean));
const repairedAgents = [];
if (liveRuns.length === 0) {
  for (const agent of refreshedAgents.filter((entry) => entry.status === "error" && entry.status !== "terminated")) {
    if (liveRunAgentIds.has(agent.id)) continue;
    await request("PATCH", `/api/agents/${agent.id}?companyId=${company.id}`, { status: "idle" });
    repairedAgents.push(agent.name);
  }
}

const blocker = issues.find((issue) => issue.title === blockerTitle);
let blockerResult = null;
if (blocker) {
  blockerResult = await request("PATCH", `/api/issues/${blocker.id}`, {
    status: "done",
    description: [
      blocker.description ?? "",
      "",
      "Repair proof:",
      `- ${new Date().toISOString()}: Codex adapter smoke test passed for ${codexAgent.name}.`,
      liveRuns.length === 0
        ? "- Stale agent error statuses were cleared with no live runs active."
        : `- Stale agent error status repair was skipped because ${liveRuns.length} live run(s) are active.`,
    ].join("\n"),
  });
}

console.log(JSON.stringify({
  apiBase,
  smoke: {
    agent: codexAgent.name,
    model: codexAgent.adapterConfig?.model ?? null,
    status: smoke.status,
    nonInfoChecks: smoke.checks?.filter((check) => check.level !== "info").map((check) => ({
      level: check.level,
      code: check.code,
      message: check.message,
    })) ?? [],
  },
  normalizedAgents,
  repairedAgents,
  statusRepairSkipped: liveRuns.length > 0,
  blocker: blockerResult ? {
    identifier: blockerResult.identifier,
    title: blockerResult.title,
    status: blockerResult.status,
  } : null,
}, null, 2));
