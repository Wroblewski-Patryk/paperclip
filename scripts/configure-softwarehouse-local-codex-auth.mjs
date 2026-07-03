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

function withoutOpenAiKeyEnv(adapterConfig) {
  const config = adapterConfig && typeof adapterConfig === "object" ? adapterConfig : {};
  const env = config.env && typeof config.env === "object" ? { ...config.env } : {};
  delete env.OPENAI_API_KEY;
  return { ...config, env };
}

async function resolveCompany() {
  if (companyId) return { id: companyId, source: "PAPERCLIP_COMPANY_ID" };

  const companies = await request("GET", "/api/companies");
  const company = companies.find((candidate) => candidate.name === companyName);
  if (!company) throw new Error(`Company not found: ${companyName}`);
  return { id: company.id, source: "company_name" };
}

const company = await resolveCompany();

const agents = await request("GET", `/api/companies/${company.id}/agents`);
const codexAgents = agents.filter((agent) => agent.adapterType === "codex_local" && agent.status !== "terminated");
const updatedAgents = [];

for (const agent of codexAgents) {
  if (!agent.adapterConfig?.env?.OPENAI_API_KEY) continue;
  const adapterConfig = withoutOpenAiKeyEnv(agent.adapterConfig);
  const updated = await request("PATCH", `/api/agents/${agent.id}?companyId=${company.id}`, {
    adapterConfig,
  });
  updatedAgents.push(updated.name);
}

console.log(JSON.stringify({
  apiBase,
  company: { id: company.id, name: company.name },
  authMode: "local_codex_login",
  updatedAgents: updatedAgents.sort(),
  note: "Paperclip will seed managed CODEX_HOME from the local Codex home. Run `codex login`/`codex auth` first if ~/.codex/auth.json is missing.",
}, null, 2));
