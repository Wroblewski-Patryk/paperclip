const apiBase = process.env.PAPERCLIP_API_URL ?? "http://127.0.0.1:3200";
const companyName = "LuckySparrow Software House";
const companyId = process.env.PAPERCLIP_COMPANY_ID ?? null;

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
    const secret = secretByKey.get(normalizeSecretKey(key));
    if (!secret) throw new Error(`Secret not found for ${key}`);
    env[key] = { type: "secret_ref", secretId: secret.id, version: "latest" };
  }
  await request("PATCH", `/api/agents/${agent.id}?companyId=${companyId}`, {
    adapterConfig: { env },
  });
}

const secretDefinitions = [
  {
    key: "COMPANYCORE_BASE_URL",
    name: "Roost/CompanyCore API base URL",
    description: "Production or protected-smoke API base URL for Roost/CompanyCore deploy smoke checks.",
    placeholderValue: "https://api.roost.luckysparrow.ch",
  },
  {
    key: "COMPANYCORE_API_KEY",
    name: "Roost/CompanyCore protected smoke API key",
    description: "Approved least-privilege key for Roost protected deploy smoke. Never print this value in issues, logs, docs, or commits.",
    placeholderValue: "REPLACE_ME_COMPANYCORE_API_KEY",
  },
];

async function resolveCompany() {
  if (companyId) return { id: companyId, source: "PAPERCLIP_COMPANY_ID" };

  const companies = await request("GET", "/api/companies");
  const company = companies.find((candidate) => candidate.name === companyName);
  if (!company) throw new Error(`Company not found: ${companyName}`);
  return { id: company.id, source: "company_name" };
}

const company = await resolveCompany();

const [existingSecrets, agents] = await Promise.all([
  request("GET", `/api/companies/${company.id}/secrets`),
  request("GET", `/api/companies/${company.id}/agents`),
]);

const secretsByKey = new Map(existingSecrets.map((secret) => [normalizeSecretKey(secret.key), secret]));
const secrets = [];
for (const definition of secretDefinitions) {
  secrets.push(await ensureSecret(company.id, secretsByKey, definition));
}

const roostPm = agents.find((agent) => agent.name === "Roost Project Manager");
if (!roostPm) throw new Error("Roost Project Manager agent not found");

await bindAgentEnv(company.id, roostPm, secretsByKey, secretDefinitions.map((definition) => definition.key));

console.log(JSON.stringify({
  apiBase,
  company: { id: company.id, name: company.name },
  secrets: secrets.map((secret) => ({
    id: secret.id,
    key: secret.key,
    name: secret.name,
    status: secret.status,
  })),
  boundAgents: [{
    agentName: roostPm.name,
    envKeys: secretDefinitions.map((definition) => definition.key),
  }],
}, null, 2));
