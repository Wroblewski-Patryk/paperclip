const apiBase = process.env.PAPERCLIP_API_URL ?? "http://127.0.0.1:3200";
const companyNameAliases = [
  process.env.SOFTWAREHOUSE_COMPANY_NAME,
  process.env.PAPERCLIP_COMPANY_NAME,
  "LuckySparrow",
  "LuckySparrow Software House",
].filter(Boolean);
const companyId = process.env.PAPERCLIP_COMPANY_ID ?? null;
const apply = process.argv.includes("--apply");

const protectedEnvPlan = [
  {
    label: "Coolify deploy token",
    envKeys: ["COOLIFY_DEPLOY_API_TOKEN"],
    allowedAgentNames: ["09 DRE (Deployment & Reliability Engineer)"],
  },
  {
    label: "VPS SSH material",
    envKeys: [
      "VPS_HOST",
      "VPS_SSH_HOST",
      "VPS_SSH_PORT",
      "VPS_SSH_USER",
      "VPS_SSH_PRIVATE_KEY",
      "VPS_SSH_PRIVATE_KEY_PATH",
      "VPS_SSH_PRIVATE_KEY_PASSPHRASE",
      "VPS_SSH_PASSWORD",
      "VPS_SSH_KNOWN_HOSTS",
    ],
    allowedAgentNames: ["09 DRE (Deployment & Reliability Engineer)"],
  },
];

const zeroRefAliasSecretKeys = [
  "vps_host",
  "vps_ssh_private_key",
];

function wantsJson() {
  return process.argv.includes("--json");
}

function hasOwn(object, key) {
  return Object.prototype.hasOwnProperty.call(object, key);
}

async function request(method, route, body) {
  const headers = {};
  if (process.env.PAPERCLIP_API_KEY && process.env.PAPERCLIP_USE_AUTH === "true") {
    headers.authorization = `Bearer ${process.env.PAPERCLIP_API_KEY}`;
  }
  if (body !== undefined) headers["content-type"] = "application/json";
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

async function resolveCompany() {
  if (companyId) return { id: companyId, source: "PAPERCLIP_COMPANY_ID" };
  const companies = await request("GET", "/api/companies");
  const company = companies.find((candidate) => companyNameAliases.includes(candidate.name))
    ?? companies.find((candidate) => /^LuckySparrow\b/i.test(candidate.name));
  if (!company) throw new Error(`Company not found; tried aliases: ${companyNameAliases.join(", ")}`);
  return { id: company.id, name: company.name, source: "company_alias" };
}

function summarizeAgents(agents) {
  const summaries = [];
  for (const plan of protectedEnvPlan) {
    for (const agent of agents) {
      const env = agent.adapterConfig?.env ?? {};
      const presentEnvKeys = plan.envKeys.filter((key) => hasOwn(env, key));
      if (presentEnvKeys.length === 0) continue;
      summaries.push({
        label: plan.label,
        agentName: agent.name,
        allowed: plan.allowedAgentNames.includes(agent.name),
        presentEnvKeys,
      });
    }
  }
  return summaries.sort((left, right) => left.agentName.localeCompare(right.agentName) || left.label.localeCompare(right.label));
}

function buildActions(agents) {
  const actionByAgentId = new Map();
  for (const plan of protectedEnvPlan) {
    for (const agent of agents) {
      if (plan.allowedAgentNames.includes(agent.name)) continue;
      const adapterConfig = agent.adapterConfig && typeof agent.adapterConfig === "object"
        ? agent.adapterConfig
        : {};
      const existingEnv = adapterConfig.env && typeof adapterConfig.env === "object"
        ? adapterConfig.env
        : {};
      const removableEnvKeys = plan.envKeys.filter((key) => hasOwn(existingEnv, key));
      if (removableEnvKeys.length === 0) continue;
      const existingAction = actionByAgentId.get(agent.id);
      const nextEnv = existingAction?.payload?.adapterConfig?.env
        ? { ...existingAction.payload.adapterConfig.env }
        : { ...existingEnv };
      for (const key of removableEnvKeys) {
        delete nextEnv[key];
      }
      actionByAgentId.set(agent.id, {
        agentId: agent.id,
        agentName: agent.name,
        labels: [...(existingAction?.labels ?? []), plan.label],
        removableEnvKeys: [...new Set([...(existingAction?.removableEnvKeys ?? []), ...removableEnvKeys])].sort(),
        payload: {
          adapterConfig: {
            ...(existingAction?.payload?.adapterConfig ?? adapterConfig),
            env: nextEnv,
          },
        },
      });
    }
  }
  return [...actionByAgentId.values()].sort((left, right) => left.agentName.localeCompare(right.agentName));
}

function summarizeZeroRefAliases(secrets) {
  return zeroRefAliasSecretKeys.map((key) => {
    const secret = secrets.find((entry) => entry.key === key);
    return {
      key,
      status: secret?.status ?? "missing",
      referenceCount: secret?.referenceCount ?? null,
      classifiedAs: secret?.referenceCount === 0 ? "zero_ref_alias" : "still_referenced",
    };
  });
}

const company = await resolveCompany();
const beforeAgents = await request("GET", `/api/companies/${company.id}/agents`);
const beforeSecrets = await request("GET", `/api/companies/${company.id}/secrets`);
const beforeSummary = summarizeAgents(beforeAgents);
const actions = buildActions(beforeAgents);

const applied = [];
if (apply) {
  for (const action of actions) {
    await request("PATCH", `/api/agents/${action.agentId}?companyId=${company.id}`, action.payload);
    applied.push({
      labels: action.labels,
      agentName: action.agentName,
      removedEnvKeys: action.removableEnvKeys,
    });
  }
}

const afterAgents = apply
  ? await request("GET", `/api/companies/${company.id}/agents`)
  : beforeAgents;
const afterSecrets = apply
  ? await request("GET", `/api/companies/${company.id}/secrets`)
  : beforeSecrets;
const afterSummary = summarizeAgents(afterAgents);

const result = {
  apiBase,
  company: { id: company.id, name: company.name ?? null, source: company.source ?? null },
  mode: apply ? "apply" : "dry-run",
  allowedAgentNames: [...new Set(protectedEnvPlan.flatMap((plan) => plan.allowedAgentNames))].sort(),
  before: {
    protectedBindings: beforeSummary,
    zeroRefAliasSecrets: summarizeZeroRefAliases(beforeSecrets),
  },
  plannedActions: actions.map((action) => ({
    labels: action.labels,
    agentName: action.agentName,
    removedEnvKeys: action.removableEnvKeys,
  })),
  applied,
  after: {
    protectedBindings: afterSummary,
    zeroRefAliasSecrets: summarizeZeroRefAliases(afterSecrets),
  },
};

if (wantsJson()) {
  console.log(JSON.stringify(result, null, 2));
} else {
  console.log(JSON.stringify(result, null, 2));
}
