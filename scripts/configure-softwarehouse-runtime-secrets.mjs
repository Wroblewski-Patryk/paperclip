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

async function bindOpenAiKey(companyId, agent, openAiSecret) {
  const adapterConfig = agent.adapterConfig && typeof agent.adapterConfig === "object"
    ? agent.adapterConfig
    : {};
  const env = adapterConfig.env && typeof adapterConfig.env === "object"
    ? adapterConfig.env
    : {};

  await request("PATCH", `/api/agents/${agent.id}?companyId=${companyId}`, {
    adapterConfig: {
      ...adapterConfig,
      env: {
        ...env,
        OPENAI_API_KEY: {
          type: "secret_ref",
          secretId: openAiSecret.id,
          version: "latest",
        },
      },
    },
  });
}

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
const openAiSecret = await ensureSecret(company.id, secretsByKey, {
  key: "OPENAI_API_KEY",
  name: "OpenAI API key for local Codex agents",
  description: [
    "OpenAI API key used by Paperclip's local Codex agents.",
    "Paperclip resolves this through encrypted secrets and writes a per-run CODEX_HOME/auth.json for Codex CLI.",
    "Keep this scoped to agent runtime only; never paste the value into issues, docs, logs, or repository files.",
  ].join(" "),
  placeholderValue: "REPLACE_ME_OPENAI_API_KEY",
});

const codexAgents = agents.filter((agent) => agent.adapterType === "codex_local" && agent.status !== "terminated");
for (const agent of codexAgents) {
  await bindOpenAiKey(company.id, agent, openAiSecret);
}

console.log(JSON.stringify({
  apiBase,
  company: { id: company.id, name: company.name },
  secret: { id: openAiSecret.id, key: openAiSecret.key, name: openAiSecret.name, status: openAiSecret.status },
  boundCodexAgents: codexAgents.map((agent) => agent.name).sort(),
}, null, 2));
