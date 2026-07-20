const apiBase = process.env.PAPERCLIP_API_URL ?? "http://127.0.0.1:3200";
const companyName = "LuckySparrow Software House";
const companyId = process.env.PAPERCLIP_COMPANY_ID ?? null;
const blockerTitle = "[Softwarehouse][Blocker] Configure OpenAI runtime auth for Codex agents";
const targetModel = process.env.SOFTWAREHOUSE_CODEX_MODEL ?? "gpt-5.5";
const targetCheapModel = process.env.SOFTWAREHOUSE_CODEX_CHEAP_MODEL ?? "gpt-5.4";
const unsupportedChatGptModels = new Set(["gpt-5", "gpt-5-mini", "gpt-5.3-codex"]);
const args = new Set(process.argv.slice(2));
const helpRequested = args.has("--help") || args.has("-h");
const dryRun = args.has("--dry-run");

if (helpRequested) {
  console.log(`Usage: node scripts/repair-softwarehouse-codex-auth.mjs [--dry-run]

Repairs safe LuckySparrow codex_local drift:
- normalizes unsupported/Spark primary models to SOFTWAREHOUSE_CODEX_MODEL
- normalizes cheap profile models to SOFTWAREHOUSE_CODEX_CHEAP_MODEL
- probes Codex auth before clearing stale non-running error agents
- closes the Codex auth blocker only after the probe passes

Options:
  --dry-run  Probe and report intended changes without patching agents or issues.
  -h, --help Show this help without touching the Paperclip API.`);
  process.exit(0);
}

async function request(method, route, body) {
  const headers = { "content-type": "application/json" };
  if (process.env.PAPERCLIP_RUN_ID && method !== "GET") headers["x-paperclip-run-id"] = process.env.PAPERCLIP_RUN_ID;
  const response = await fetch(`${apiBase}${route}`, {
    method,
    headers,
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
const plannedNormalizedAgents = [];
for (const agent of agents.filter((entry) => entry.adapterType === "codex_local" && entry.status !== "terminated")) {
  const { adapterConfig, runtimeConfig } = normalizeAgentModelConfig(agent);
  if (
    adapterConfig.model !== agent.adapterConfig?.model
    || runtimeConfig.modelProfiles?.cheap?.enabled !== agent.runtimeConfig?.modelProfiles?.cheap?.enabled
    || runtimeConfig.modelProfiles?.cheap?.label !== agent.runtimeConfig?.modelProfiles?.cheap?.label
    || runtimeConfig.modelProfiles?.cheap?.adapterConfig?.model !== agent.runtimeConfig?.modelProfiles?.cheap?.adapterConfig?.model
  ) {
    if (dryRun) {
      plannedNormalizedAgents.push({
        name: agent.name,
        fromModel: agent.adapterConfig?.model ?? null,
        toModel: adapterConfig.model,
        fromCheapModel: agent.runtimeConfig?.modelProfiles?.cheap?.adapterConfig?.model ?? null,
        toCheapModel: runtimeConfig.modelProfiles?.cheap?.adapterConfig?.model ?? null,
      });
      continue;
    }
    const updated = await request("PATCH", `/api/agents/${agent.id}?companyId=${company.id}`, { adapterConfig, runtimeConfig });
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
const plannedRepairedAgents = [];
const skippedAgentsWithLiveRuns = [];
const skippedAgentsWithUnhealthyEnvironment = [];
for (const agent of refreshedAgents.filter((entry) => entry.status === "error" && entry.status !== "terminated")) {
  if (liveRunAgentIds.has(agent.id)) {
    skippedAgentsWithLiveRuns.push(agent.name);
    continue;
  }
  const agentSmoke = await request(
    "POST",
    `/api/companies/${company.id}/adapters/${agent.adapterType}/test-environment`,
    { adapterConfig: agent.adapterConfig ?? {} },
  ).catch((error) => ({
    status: "fail",
    checks: [{ code: "environment_probe_request_failed", level: "error" }],
    error: error instanceof Error ? error.message : String(error),
  }));
  const agentFailingCheck = findErrorCheck(agentSmoke);
  if (agentSmoke.status !== "pass" || agentFailingCheck) {
    skippedAgentsWithUnhealthyEnvironment.push({
      name: agent.name,
      status: agentSmoke.status ?? "unknown",
      code: agentFailingCheck?.code ?? "environment_not_passed",
    });
    continue;
  }
  if (dryRun) {
    plannedRepairedAgents.push(agent.name);
  } else {
    await request("PATCH", `/api/agents/${agent.id}?companyId=${company.id}`, { status: "idle" });
    repairedAgents.push(agent.name);
  }
}

const blocker = issues.find((issue) => issue.title === blockerTitle);
let blockerResult = null;
if (blocker) {
  if (dryRun) {
    blockerResult = {
      identifier: blocker.identifier,
      title: blocker.title,
      status: blocker.status,
      plannedStatus: "done",
    };
  } else {
    blockerResult = await request("PATCH", `/api/issues/${blocker.id}`, {
      status: "done",
      description: [
        blocker.description ?? "",
        "",
        "Repair proof:",
        `- ${new Date().toISOString()}: Codex adapter smoke test passed for ${codexAgent.name}.`,
        repairedAgents.length > 0
          ? `- Stale agent error statuses were cleared for agents with no live run: ${repairedAgents.join(", ")}.`
          : "- No stale agent error statuses needed clearing.",
        skippedAgentsWithLiveRuns.length > 0
          ? `- Stale agent error status repair was skipped for agents with live runs: ${skippedAgentsWithLiveRuns.join(", ")}.`
          : "- No stale error agents were skipped for live-run safety.",
        skippedAgentsWithUnhealthyEnvironment.length > 0
          ? `- Stale agent error status repair remained fail-closed for unhealthy environments: ${skippedAgentsWithUnhealthyEnvironment.map((entry) => `${entry.name} (${entry.code})`).join(", ")}.`
          : "- Every non-running error agent considered for repair passed its own environment probe.",
      ].join("\n"),
    });
  }
}

console.log(JSON.stringify({
  apiBase,
  dryRun,
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
  plannedNormalizedAgents,
  normalizedAgents,
  plannedRepairedAgents,
  repairedAgents,
  skippedAgentsWithLiveRuns,
  skippedAgentsWithUnhealthyEnvironment,
  statusRepairSkipped: skippedAgentsWithLiveRuns.length > 0 || skippedAgentsWithUnhealthyEnvironment.length > 0,
  blocker: blockerResult ? {
    identifier: blockerResult.identifier,
    title: blockerResult.title,
    status: blockerResult.status,
    plannedStatus: blockerResult.plannedStatus ?? null,
  } : null,
}, null, 2));
