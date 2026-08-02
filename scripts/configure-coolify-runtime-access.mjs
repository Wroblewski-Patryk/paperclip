import { normalizeKey, secretForKey } from "./lib/secret-aliases.mjs";

const apiBase = process.env.PAPERCLIP_API_URL ?? "http://127.0.0.1:3200";
const companyNameAliases = [
  process.env.SOFTWAREHOUSE_COMPANY_NAME,
  process.env.PAPERCLIP_COMPANY_NAME,
  "LuckySparrow",
  "LuckySparrow Software House",
].filter(Boolean);
const companyId = process.env.PAPERCLIP_COMPANY_ID ?? null;
const apply = process.argv.includes("--apply");

const coolifyEnv = {
  COOLIFY_BASE_URL: "coolify_base_url",
  COOLIFY_API_TOKEN: "coolify_api_token",
  COOLIFY_TOKEN: "coolify_api_token",
  COOLIFY_TEAM_ID: "coolify_team_id",
  COOLIFY_SOAR_TEAM_ID: "coolify_soar_team_id",
  COOLIFY_SOAR_PROJECT_ID: "coolify_soar_project_id",
  COOLIFY_SOAR_PROJECT_UUID: "coolify_soar_project_uuid",
  COOLIFY_SOAR_PRODUCTION_ENVIRONMENT: "coolify_soar_production_environment",
  COOLIFY_SOAR_APP_ID: "coolify_soar_app_id",
  COOLIFY_SOAR_API_APP_ID: "coolify_soar_api_app_id",
  COOLIFY_SOAR_WEB_APP_ID: "coolify_soar_web_app_id",
  COOLIFY_SOAR_WORKER_BACKTEST_APP_ID: "coolify_soar_worker_backtest_app_id",
  COOLIFY_SOAR_WORKER_EXECUTION_APP_ID: "coolify_soar_worker_execution_app_id",
  COOLIFY_SOAR_WORKER_MARKET_DATA_APP_ID: "coolify_soar_worker_market_data_app_id",
  COOLIFY_SOAR_WORKER_MARKET_STREAM_APP_ID: "coolify_soar_worker_market_stream_app_id",
  COOLIFY_SOAR_POSTGRES_RESOURCE_ID: "coolify_soar_postgres_resource_id",
  COOLIFY_SOAR_REDIS_RESOURCE_ID: "coolify_soar_redis_resource_id",
  COOLIFY_ROOST_APP_ID: "coolify_roost_app_id",
};

const coolifyLoginEnv = {
  COOLIFY_LOGIN_EMAIL: "coolify_login_email",
  COOLIFY_LOGIN_PASSWORD: "coolify_login_password",
};

const soarSmokeEnv = {
  SOAR_PROD_TEST_BASE_URL: "soar_prod_base_url",
  SOAR_PROD_TEST_API_BASE_URL: "soar_api_base_url",
  SOAR_PROD_TEST_EMAIL: "soar_prod_test_email",
  SOAR_PROD_TEST_PASSWORD: "soar_prod_test_password",
  SOAR_PROD_ADMIN_SMOKE_EMAIL: "soar_prod_admin_smoke_email",
  SOAR_PROD_ADMIN_SMOKE_PASSWORD: "soar_prod_admin_smoke_password",
};

const roostSmokeEnv = {
  ROOST_API_BASE_URL: "roost_api_base_url",
  ROOST_PROD_TEST_BASE_URL: "roost_prod_base_url",
  ROOST_PROD_TEST_API_BASE_URL: "roost_api_base_url",
  ROOST_PROD_TEST_EMAIL: "roost_prod_test_email",
  ROOST_PROD_TEST_PASSWORD: "roost_prod_test_password",
  ROOST_PROD_TEST_WORKSPACE_NAME: "roost_prod_test_workspace_name",
};

const agentPlans = [
  {
    names: ["09 DRE (Deployment & Reliability Engineer)"],
    env: { ...coolifyEnv, ...coolifyLoginEnv, ...soarSmokeEnv, ...roostSmokeEnv },
  },
  {
    names: ["10 SPA (Security & Privacy Auditor)"],
    env: { ...coolifyEnv, ...coolifyLoginEnv },
  },
  {
    names: [
      "09 CTO (Chief Technology Officer)",
      "09 TSA (Technical Solution Architect)",
      "11 IPM (Innovation Portfolio Manager)",
    ],
    env: coolifyEnv,
  },
  {
    names: [
      "09 QVE (QA & Verification Engineer)",
      "09 TAE (Test Automation Engineer)",
    ],
    env: { ...coolifyEnv, ...soarSmokeEnv, ...roostSmokeEnv },
  },
  {
    names: ["11 SPM (Soar Product Manager)"],
    env: { ...coolifyEnv, ...soarSmokeEnv },
  },
  {
    names: ["11 RPM (Roost Project Manager)"],
    env: { ...coolifyEnv, ...roostSmokeEnv },
  },
];

const routinePlans = [
  {
    titleIncludes: [
      "Coolify",
      "production deploy",
      "deploy health",
      "production health",
      "Release and deploy governance",
      "Autonomy governor",
      "Gate freshness watcher",
    ],
    env: coolifyEnv,
  },
];

async function request(method, route, body) {
  const headers = { "content-type": "application/json" };
  if (process.env.PAPERCLIP_API_KEY) headers.authorization = `Bearer ${process.env.PAPERCLIP_API_KEY}`;
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

function envEntryMatches(entry, secret) {
  return entry?.type === "secret_ref"
    && entry.secretId === secret.id
    && (entry.version === "latest" || entry.version === undefined);
}

function buildEnvPatch(existingEnv, secretByKey, envPlan) {
  const env = existingEnv && typeof existingEnv === "object" && !Array.isArray(existingEnv)
    ? { ...existingEnv }
    : {};
  const changed = [];
  const missingSecrets = [];

  for (const [envKey, sourceKey] of Object.entries(envPlan)) {
    const secret = secretForKey(secretByKey, sourceKey);
    if (!secret) {
      missingSecrets.push({ envKey, sourceKey: normalizeKey(sourceKey) });
      continue;
    }
    if (envEntryMatches(env[envKey], secret)) continue;
    env[envKey] = { type: "secret_ref", secretId: secret.id, version: "latest" };
    changed.push({ envKey, sourceSecretKey: normalizeKey(secret.key) });
  }

  return { env, changed, missingSecrets };
}

function routineMatchesPlan(routine, plan) {
  const haystack = `${routine.title ?? ""}\n${routine.description ?? ""}`.toLowerCase();
  return plan.titleIncludes.some((needle) => haystack.includes(needle.toLowerCase()));
}

const company = await resolveCompany();
const [secrets, agents, routines] = await Promise.all([
  request("GET", `/api/companies/${company.id}/secrets`),
  request("GET", `/api/companies/${company.id}/agents`),
  request("GET", `/api/companies/${company.id}/routines`),
]);

const secretByKey = new Map(secrets.map((secret) => [normalizeKey(secret.key), secret]));
const agentsByName = new Map(agents.map((agent) => [agent.name, agent]));
const actions = [];
const skipped = [];

for (const plan of agentPlans) {
  for (const name of plan.names) {
    const agent = agentsByName.get(name);
    if (!agent || agent.status === "terminated") {
      skipped.push({ targetType: "agent", name, reason: "missing_or_terminated" });
      continue;
    }
    const adapterConfig = agent.adapterConfig && typeof agent.adapterConfig === "object"
      ? agent.adapterConfig
      : {};
    const patch = buildEnvPatch(adapterConfig.env, secretByKey, plan.env);
    if (patch.missingSecrets.length > 0) {
      skipped.push({ targetType: "agent", name, reason: "missing_secrets", missingSecrets: patch.missingSecrets });
      continue;
    }
    if (patch.changed.length === 0) {
      skipped.push({ targetType: "agent", name, reason: "already_current" });
      continue;
    }
    actions.push({
      targetType: "agent",
      id: agent.id,
      name,
      changedEnvKeys: patch.changed.map((item) => item.envKey).sort(),
      sourceSecretKeys: [...new Set(patch.changed.map((item) => item.sourceSecretKey))].sort(),
      payload: { adapterConfig: { ...adapterConfig, env: patch.env } },
    });
  }
}

for (const routine of routines.filter((entry) => entry.status !== "paused")) {
  for (const plan of routinePlans) {
    if (!routineMatchesPlan(routine, plan)) continue;
    const detail = await request("GET", `/api/routines/${routine.id}`);
    const patch = buildEnvPatch(detail.env, secretByKey, plan.env);
    if (patch.missingSecrets.length > 0) {
      skipped.push({ targetType: "routine", title: routine.title, reason: "missing_secrets", missingSecrets: patch.missingSecrets });
      continue;
    }
    if (patch.changed.length === 0) {
      skipped.push({ targetType: "routine", title: routine.title, reason: "already_current" });
      continue;
    }
    actions.push({
      targetType: "routine",
      id: routine.id,
      title: routine.title,
      changedEnvKeys: patch.changed.map((item) => item.envKey).sort(),
      sourceSecretKeys: [...new Set(patch.changed.map((item) => item.sourceSecretKey))].sort(),
      payload: { env: patch.env },
    });
    break;
  }
}

const applied = [];
if (apply) {
  for (const action of actions) {
    if (action.targetType === "agent") {
      await request("PATCH", `/api/agents/${action.id}?companyId=${company.id}`, action.payload);
      applied.push({
        targetType: action.targetType,
        name: action.name,
        changedEnvKeys: action.changedEnvKeys,
      });
    } else {
      await request("PATCH", `/api/routines/${action.id}`, action.payload);
      applied.push({
        targetType: action.targetType,
        title: action.title,
        changedEnvKeys: action.changedEnvKeys,
      });
    }
  }
}

console.log(JSON.stringify({
  apiBase,
  company: { id: company.id, name: company.name ?? null },
  mode: apply ? "apply" : "dry-run",
  actionCount: actions.length,
  appliedCount: applied.length,
  actions: actions.map((action) => ({
    targetType: action.targetType,
    name: action.name ?? action.title,
    changedEnvKeys: action.changedEnvKeys,
    sourceSecretKeys: action.sourceSecretKeys,
  })),
  skipped,
  applied,
}, null, 2));
