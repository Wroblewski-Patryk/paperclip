const apiBase = process.env.PAPERCLIP_API_URL ?? "http://127.0.0.1:3200";
const companyName = "LuckySparrow Software House";

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

function byName(items, name) {
  return items.find((item) => item.name === name);
}

function normalizeSecretKey(key) {
  return key.toLowerCase();
}

async function ensureSecret(companyId, secretsByKey, input) {
  const secretKey = normalizeSecretKey(input.key);
  const existing = secretsByKey.get(secretKey);
  if (existing) {
    const updated = await request("PATCH", `/api/secrets/${existing.id}`, {
      name: input.name,
      key: secretKey,
      description: input.description,
      status: "active",
    });
    secretsByKey.set(secretKey, updated);
    return updated;
  }
  const created = await request("POST", `/api/companies/${companyId}/secrets`, {
    name: input.name,
    key: secretKey,
    description: input.description,
    value: input.placeholderValue,
  });
  secretsByKey.set(secretKey, created);
  return created;
}

async function bindAgentEnv(companyId, agent, secretByKey, keys) {
  const existingEnv = agent.adapterConfig?.env && typeof agent.adapterConfig.env === "object"
    ? agent.adapterConfig.env
    : {};
  const env = { ...existingEnv };
  for (const key of keys) {
    const sourceKey = secretAliasByEnvKey[key] ?? key;
    const secret = secretByKey.get(normalizeSecretKey(sourceKey));
    if (!secret) throw new Error(`Secret not found for ${key} (source ${sourceKey})`);
    env[key] = { type: "secret_ref", secretId: secret.id, version: "latest" };
  }
  await request("PATCH", `/api/agents/${agent.id}?companyId=${companyId}`, {
    adapterConfig: { env },
  });
}

const secretDefinitions = [
  {
    key: "SOAR_LIVE_BASE_URL",
    name: "Soar live base URL",
    description: "Live Soar URL used by browser/live smoke agents. Default placeholder should be rotated to https://soar.luckysparrow.ch if changed.",
    placeholderValue: "https://soar.luckysparrow.ch",
  },
  {
    key: "SOAR_TEST_EMAIL",
    name: "Soar AI/test account email",
    description: "Least-privilege Soar production test account email for browser smoke checks.",
    placeholderValue: "REPLACE_ME_SOAR_TEST_EMAIL",
  },
  {
    key: "SOAR_TEST_PASSWORD",
    name: "Soar AI/test account password",
    description: "Password for the least-privilege Soar production test account. Rotate before use.",
    placeholderValue: "REPLACE_ME_SOAR_TEST_PASSWORD",
  },
  {
    key: "SOAR_REAL_USER_EMAIL",
    name: "Soar real user account email",
    description: "User real account email for explicitly approved narrow validation only.",
    placeholderValue: "REPLACE_ME_SOAR_REAL_USER_EMAIL",
  },
  {
    key: "SOAR_REAL_USER_PASSWORD",
    name: "Soar real user account password",
    description: "User real account password for explicitly approved narrow validation only. Do not use for destructive checks.",
    placeholderValue: "REPLACE_ME_SOAR_REAL_USER_PASSWORD",
  },
  {
    key: "PROD_UI_AUDIT_WEB_BASE_URL",
    name: "Soar production UI audit web base URL",
    description: "Web base URL used by protected production UI/browser proof runners.",
    placeholderValue: "https://soar.luckysparrow.ch",
  },
  {
    key: "PROD_UI_AUDIT_API_BASE_URL",
    name: "Soar production UI audit API base URL",
    description: "API base URL used by protected production UI/browser proof runners.",
    placeholderValue: "https://api.soar.luckysparrow.ch",
  },
  {
    key: "PROD_UI_AUDIT_EXPECTED_SHA",
    name: "Soar production UI audit expected SHA",
    description: "Expected deployed git SHA for production UI/browser proof. Update before proof reruns.",
    placeholderValue: "REPLACE_ME_PROD_UI_AUDIT_EXPECTED_SHA",
  },
  {
    key: "PROD_UI_AUDIT_AUTH_TOKEN",
    name: "Soar production dashboard audit auth token",
    description: "Optional dashboard/session token for protected production UI proof. Prefer least-privilege test account when possible.",
    placeholderValue: "REPLACE_ME_PROD_UI_AUDIT_AUTH_TOKEN",
  },
  {
    key: "PROD_UI_AUDIT_AUTH_EMAIL",
    name: "Soar production dashboard audit email",
    description: "Dashboard/test account email for protected production UI proof.",
    placeholderValue: "REPLACE_ME_PROD_UI_AUDIT_AUTH_EMAIL",
  },
  {
    key: "PROD_UI_AUDIT_AUTH_PASSWORD",
    name: "Soar production dashboard audit password",
    description: "Dashboard/test account password for protected production UI proof.",
    placeholderValue: "REPLACE_ME_PROD_UI_AUDIT_AUTH_PASSWORD",
  },
  {
    key: "PROD_UI_AUDIT_ADMIN_TOKEN",
    name: "Soar production admin audit auth token",
    description: "Optional admin/session token for protected production admin UI proof. Use only for read/proof flows.",
    placeholderValue: "REPLACE_ME_PROD_UI_AUDIT_ADMIN_TOKEN",
  },
  {
    key: "PROD_UI_AUDIT_ADMIN_EMAIL",
    name: "Soar production admin audit email",
    description: "Admin account email for protected production admin UI proof.",
    placeholderValue: "REPLACE_ME_PROD_UI_AUDIT_ADMIN_EMAIL",
  },
  {
    key: "PROD_UI_AUDIT_ADMIN_PASSWORD",
    name: "Soar production admin audit password",
    description: "Admin account password for protected production admin UI proof. Use only for read/proof flows.",
    placeholderValue: "REPLACE_ME_PROD_UI_AUDIT_ADMIN_PASSWORD",
  },
  {
    key: "PROD_UI_AUDIT_OPS_HEADER_NAME",
    name: "Soar production ops header name",
    description: "Optional private ops header name accepted by protected readiness endpoints. Use only for read/proof flows.",
    placeholderValue: "REPLACE_ME_PROD_UI_AUDIT_OPS_HEADER_NAME",
  },
  {
    key: "PROD_UI_AUDIT_OPS_HEADER_VALUE",
    name: "Soar production ops header value",
    description: "Optional private ops header value accepted by protected readiness endpoints. Keep secret and use only for read/proof flows.",
    placeholderValue: "REPLACE_ME_PROD_UI_AUDIT_OPS_HEADER_VALUE",
  },
  {
    key: "PROD_UI_AUDIT_OPS_BASIC_USER",
    name: "Soar production ops basic auth user",
    description: "Optional private ops basic-auth username accepted by protected readiness endpoints. Use only for read/proof flows.",
    placeholderValue: "REPLACE_ME_PROD_UI_AUDIT_OPS_BASIC_USER",
  },
  {
    key: "PROD_UI_AUDIT_OPS_BASIC_PASSWORD",
    name: "Soar production ops basic auth password",
    description: "Optional private ops basic-auth password accepted by protected readiness endpoints. Keep secret and use only for read/proof flows.",
    placeholderValue: "REPLACE_ME_PROD_UI_AUDIT_OPS_BASIC_PASSWORD",
  },
  {
    key: "COOLIFY_BASE_URL",
    name: "Coolify base URL",
    description: "Coolify instance URL for Soar deploy/status checks.",
    placeholderValue: "REPLACE_ME_COOLIFY_BASE_URL",
  },
  {
    key: "COOLIFY_API_TOKEN",
    name: "Coolify API token",
    description: "Least-privilege Coolify API token. Prefer read/status/logs scope unless a release issue explicitly approves deploy actions.",
    placeholderValue: "REPLACE_ME_COOLIFY_API_TOKEN",
  },
  {
    key: "COOLIFY_LOGIN_EMAIL",
    name: "Coolify login email",
    description: "Coolify UI login email for Ops/Security read-only navigation when API token is not enough.",
    placeholderValue: "REPLACE_ME_COOLIFY_LOGIN_EMAIL",
  },
  {
    key: "COOLIFY_LOGIN_PASSWORD",
    name: "Coolify login password",
    description: "Coolify UI login password for Ops/Security read-only navigation. Never print or paste into issues.",
    placeholderValue: "REPLACE_ME_COOLIFY_LOGIN_PASSWORD",
  },
  {
    key: "COOLIFY_SOAR_PROJECT_ID",
    name: "Coolify Soar project ID",
    description: "Coolify project id that contains the Soar production environment. A Coolify project can contain multiple environments and resources.",
    placeholderValue: "REPLACE_ME_COOLIFY_SOAR_PROJECT_ID",
  },
  {
    key: "COOLIFY_TEAM_ID",
    name: "Coolify team ID",
    description: "Coolify team/workspace id used to verify that Soar production checks run under the expected Coolify team.",
    placeholderValue: "REPLACE_ME_COOLIFY_TEAM_ID",
  },
  {
    key: "COOLIFY_SOAR_TEAM_ID",
    name: "Coolify Soar team ID",
    description: "Coolify team/workspace id expected for Soar project and production environment reconciliation.",
    placeholderValue: "REPLACE_ME_COOLIFY_SOAR_TEAM_ID",
  },
  {
    key: "COOLIFY_SOAR_PRODUCTION_ENVIRONMENT",
    name: "Coolify Soar production environment",
    description: "Coolify environment name or id for Soar production inside the Coolify project, usually production.",
    placeholderValue: "production",
  },
  {
    key: "COOLIFY_SOAR_APP_ID",
    name: "Coolify Soar legacy application/resource ID",
    description: "Legacy single-resource id. Prefer COOLIFY_SOAR_PROJECT_ID plus environment/resource inventory because Soar production contains multiple apps/services.",
    placeholderValue: "REPLACE_ME_COOLIFY_SOAR_APP_ID",
  },
  {
    key: "COOLIFY_SOAR_API_APP_ID",
    name: "Coolify Soar API application ID",
    description: "Optional Coolify resource id for the Soar API app inside the production environment.",
    placeholderValue: "REPLACE_ME_COOLIFY_SOAR_API_APP_ID",
  },
  {
    key: "COOLIFY_SOAR_WEB_APP_ID",
    name: "Coolify Soar web application ID",
    description: "Optional Coolify resource id for the Soar web app inside the production environment.",
    placeholderValue: "REPLACE_ME_COOLIFY_SOAR_WEB_APP_ID",
  },
  {
    key: "COOLIFY_SOAR_POSTGRES_RESOURCE_ID",
    name: "Coolify Soar Postgres resource ID",
    description: "Optional Coolify resource id for the Soar production Postgres service.",
    placeholderValue: "REPLACE_ME_COOLIFY_SOAR_POSTGRES_RESOURCE_ID",
  },
  {
    key: "COOLIFY_SOAR_REDIS_RESOURCE_ID",
    name: "Coolify Soar Redis resource ID",
    description: "Optional Coolify resource id for the Soar production Redis service.",
    placeholderValue: "REPLACE_ME_COOLIFY_SOAR_REDIS_RESOURCE_ID",
  },
  {
    key: "VPS_HOST",
    name: "VPS host",
    description: "VPS host used by Ops for approved deploy/log/health checks.",
    placeholderValue: "REPLACE_ME_VPS_HOST",
  },
  {
    key: "VPS_SSH_USER",
    name: "VPS SSH user",
    description: "Least-privilege SSH user for approved Ops checks.",
    placeholderValue: "REPLACE_ME_VPS_SSH_USER",
  },
  {
    key: "VPS_SSH_PRIVATE_KEY",
    name: "VPS SSH private key",
    description: "SSH private key for approved Ops checks. Prefer read/log/status scope and rotate if exposed.",
    placeholderValue: "REPLACE_ME_VPS_SSH_PRIVATE_KEY",
  },
];

const secretAliasByEnvKey = {
  PROD_UI_AUDIT_WEB_BASE_URL: "SOAR_LIVE_BASE_URL",
  PROD_UI_AUDIT_AUTH_EMAIL: "SOAR_TEST_EMAIL",
  PROD_UI_AUDIT_AUTH_PASSWORD: "SOAR_TEST_PASSWORD",
  PROD_UI_AUDIT_ADMIN_EMAIL: "SOAR_REAL_USER_EMAIL",
  PROD_UI_AUDIT_ADMIN_PASSWORD: "SOAR_REAL_USER_PASSWORD",
  SMOKE_AUTH_TOKEN: "PROD_UI_AUDIT_ADMIN_TOKEN",
  SMOKE_AUTH_EMAIL: "PROD_UI_AUDIT_ADMIN_EMAIL",
  SMOKE_AUTH_PASSWORD: "PROD_UI_AUDIT_ADMIN_PASSWORD",
  SMOKE_OPS_AUTH_HEADER_NAME: "PROD_UI_AUDIT_OPS_HEADER_NAME",
  SMOKE_OPS_AUTH_HEADER_VALUE: "PROD_UI_AUDIT_OPS_HEADER_VALUE",
  SMOKE_OPS_BASIC_USER: "PROD_UI_AUDIT_OPS_BASIC_USER",
  SMOKE_OPS_BASIC_PASSWORD: "PROD_UI_AUDIT_OPS_BASIC_PASSWORD",
  COOLIFY_TOKEN: "COOLIFY_API_TOKEN",
};

const agentBindings = {
  "Soar Project Manager": ["SOAR_LIVE_BASE_URL"],
  "Frontend Engineer": [
    "SOAR_LIVE_BASE_URL",
    "PROD_UI_AUDIT_WEB_BASE_URL",
    "PROD_UI_AUDIT_API_BASE_URL",
    "PROD_UI_AUDIT_EXPECTED_SHA",
    "PROD_UI_AUDIT_AUTH_TOKEN",
    "PROD_UI_AUDIT_AUTH_EMAIL",
    "PROD_UI_AUDIT_AUTH_PASSWORD",
    "PROD_UI_AUDIT_ADMIN_TOKEN",
    "PROD_UI_AUDIT_ADMIN_EMAIL",
    "PROD_UI_AUDIT_ADMIN_PASSWORD",
    "SMOKE_AUTH_TOKEN",
    "SMOKE_AUTH_EMAIL",
    "SMOKE_AUTH_PASSWORD",
    "SMOKE_OPS_AUTH_HEADER_NAME",
    "SMOKE_OPS_AUTH_HEADER_VALUE",
    "SMOKE_OPS_BASIC_USER",
    "SMOKE_OPS_BASIC_PASSWORD",
  ],
  "QA Regression Lead": [
    "SOAR_LIVE_BASE_URL",
    "SOAR_TEST_EMAIL",
    "SOAR_TEST_PASSWORD",
    "SOAR_REAL_USER_EMAIL",
    "SOAR_REAL_USER_PASSWORD",
    "PROD_UI_AUDIT_WEB_BASE_URL",
    "PROD_UI_AUDIT_API_BASE_URL",
    "PROD_UI_AUDIT_EXPECTED_SHA",
    "PROD_UI_AUDIT_AUTH_TOKEN",
    "PROD_UI_AUDIT_AUTH_EMAIL",
    "PROD_UI_AUDIT_AUTH_PASSWORD",
    "PROD_UI_AUDIT_ADMIN_TOKEN",
    "PROD_UI_AUDIT_ADMIN_EMAIL",
    "PROD_UI_AUDIT_ADMIN_PASSWORD",
    "SMOKE_AUTH_TOKEN",
    "SMOKE_AUTH_EMAIL",
    "SMOKE_AUTH_PASSWORD",
    "SMOKE_OPS_AUTH_HEADER_NAME",
    "SMOKE_OPS_AUTH_HEADER_VALUE",
    "SMOKE_OPS_BASIC_USER",
    "SMOKE_OPS_BASIC_PASSWORD",
  ],
  "Test Automation Engineer": [
    "SOAR_LIVE_BASE_URL",
    "SOAR_TEST_EMAIL",
    "SOAR_TEST_PASSWORD",
    "PROD_UI_AUDIT_WEB_BASE_URL",
    "PROD_UI_AUDIT_API_BASE_URL",
    "PROD_UI_AUDIT_EXPECTED_SHA",
    "PROD_UI_AUDIT_AUTH_TOKEN",
    "PROD_UI_AUDIT_AUTH_EMAIL",
    "PROD_UI_AUDIT_AUTH_PASSWORD",
    "PROD_UI_AUDIT_ADMIN_TOKEN",
    "PROD_UI_AUDIT_ADMIN_EMAIL",
    "PROD_UI_AUDIT_ADMIN_PASSWORD",
    "SMOKE_AUTH_TOKEN",
    "SMOKE_AUTH_EMAIL",
    "SMOKE_AUTH_PASSWORD",
    "SMOKE_OPS_AUTH_HEADER_NAME",
    "SMOKE_OPS_AUTH_HEADER_VALUE",
    "SMOKE_OPS_BASIC_USER",
    "SMOKE_OPS_BASIC_PASSWORD",
  ],
  "Security Review Lead": [
    "SOAR_LIVE_BASE_URL",
    "SOAR_TEST_EMAIL",
    "SOAR_TEST_PASSWORD",
    "SOAR_REAL_USER_EMAIL",
    "SOAR_REAL_USER_PASSWORD",
    "PROD_UI_AUDIT_WEB_BASE_URL",
    "PROD_UI_AUDIT_API_BASE_URL",
    "PROD_UI_AUDIT_EXPECTED_SHA",
    "PROD_UI_AUDIT_AUTH_TOKEN",
    "PROD_UI_AUDIT_AUTH_EMAIL",
    "PROD_UI_AUDIT_AUTH_PASSWORD",
    "PROD_UI_AUDIT_ADMIN_TOKEN",
    "PROD_UI_AUDIT_ADMIN_EMAIL",
    "PROD_UI_AUDIT_ADMIN_PASSWORD",
    "SMOKE_AUTH_TOKEN",
    "SMOKE_AUTH_EMAIL",
    "SMOKE_AUTH_PASSWORD",
    "SMOKE_OPS_AUTH_HEADER_NAME",
    "SMOKE_OPS_AUTH_HEADER_VALUE",
    "SMOKE_OPS_BASIC_USER",
    "SMOKE_OPS_BASIC_PASSWORD",
    "COOLIFY_BASE_URL",
    "COOLIFY_API_TOKEN",
    "COOLIFY_TOKEN",
    "COOLIFY_LOGIN_EMAIL",
    "COOLIFY_LOGIN_PASSWORD",
    "COOLIFY_SOAR_PROJECT_ID",
    "COOLIFY_TEAM_ID",
    "COOLIFY_SOAR_TEAM_ID",
    "COOLIFY_SOAR_PRODUCTION_ENVIRONMENT",
    "COOLIFY_SOAR_APP_ID",
    "COOLIFY_SOAR_API_APP_ID",
    "COOLIFY_SOAR_WEB_APP_ID",
    "COOLIFY_SOAR_POSTGRES_RESOURCE_ID",
    "COOLIFY_SOAR_REDIS_RESOURCE_ID",
    "VPS_HOST",
    "VPS_SSH_USER",
    "VPS_SSH_PRIVATE_KEY",
  ],
  "Ops Release Lead": [
    "SOAR_LIVE_BASE_URL",
    "SOAR_TEST_EMAIL",
    "SOAR_TEST_PASSWORD",
    "SOAR_REAL_USER_EMAIL",
    "SOAR_REAL_USER_PASSWORD",
    "PROD_UI_AUDIT_WEB_BASE_URL",
    "PROD_UI_AUDIT_API_BASE_URL",
    "PROD_UI_AUDIT_EXPECTED_SHA",
    "PROD_UI_AUDIT_AUTH_TOKEN",
    "PROD_UI_AUDIT_AUTH_EMAIL",
    "PROD_UI_AUDIT_AUTH_PASSWORD",
    "PROD_UI_AUDIT_ADMIN_TOKEN",
    "PROD_UI_AUDIT_ADMIN_EMAIL",
    "PROD_UI_AUDIT_ADMIN_PASSWORD",
    "SMOKE_AUTH_TOKEN",
    "SMOKE_AUTH_EMAIL",
    "SMOKE_AUTH_PASSWORD",
    "SMOKE_OPS_AUTH_HEADER_NAME",
    "SMOKE_OPS_AUTH_HEADER_VALUE",
    "SMOKE_OPS_BASIC_USER",
    "SMOKE_OPS_BASIC_PASSWORD",
    "COOLIFY_BASE_URL",
    "COOLIFY_API_TOKEN",
    "COOLIFY_TOKEN",
    "COOLIFY_LOGIN_EMAIL",
    "COOLIFY_LOGIN_PASSWORD",
    "COOLIFY_SOAR_PROJECT_ID",
    "COOLIFY_TEAM_ID",
    "COOLIFY_SOAR_TEAM_ID",
    "COOLIFY_SOAR_PRODUCTION_ENVIRONMENT",
    "COOLIFY_SOAR_APP_ID",
    "COOLIFY_SOAR_API_APP_ID",
    "COOLIFY_SOAR_WEB_APP_ID",
    "COOLIFY_SOAR_POSTGRES_RESOURCE_ID",
    "COOLIFY_SOAR_REDIS_RESOURCE_ID",
    "VPS_HOST",
    "VPS_SSH_USER",
    "VPS_SSH_PRIVATE_KEY",
  ],
};

const companies = await request("GET", "/api/companies");
const company = byName(companies, companyName);
if (!company) throw new Error(`Company not found: ${companyName}`);

const [existingSecrets, agents] = await Promise.all([
  request("GET", `/api/companies/${company.id}/secrets`),
  request("GET", `/api/companies/${company.id}/agents`),
]);

const secretsByKey = new Map(existingSecrets.map((secret) => [normalizeSecretKey(secret.key), secret]));
const ensuredSecrets = [];
for (const definition of secretDefinitions) {
  ensuredSecrets.push(await ensureSecret(company.id, secretsByKey, definition));
}

const refreshedSecrets = await request("GET", `/api/companies/${company.id}/secrets`);
const secretByKey = new Map(refreshedSecrets.map((secret) => [normalizeSecretKey(secret.key), secret]));
const boundAgents = [];
for (const [agentName, keys] of Object.entries(agentBindings)) {
  const agent = byName(agents, agentName);
  if (!agent) throw new Error(`Agent not found: ${agentName}`);
  await bindAgentEnv(company.id, agent, secretByKey, keys);
  boundAgents.push({ agentName, envKeys: keys });
}

console.log(JSON.stringify({
  apiBase,
  company: { id: company.id, name: company.name },
  secrets: ensuredSecrets.map((secret) => ({ id: secret.id, key: secret.key, name: secret.name, status: secret.status })),
  boundAgents,
}, null, 2));
