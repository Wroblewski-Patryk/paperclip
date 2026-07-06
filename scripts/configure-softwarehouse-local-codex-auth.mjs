const apiBase = process.env.PAPERCLIP_API_URL ?? "http://127.0.0.1:3200";
const companyNames = ["LuckySparrow", "LuckySparrow Software House"];
const companyId = process.env.PAPERCLIP_COMPANY_ID ?? null;
const openAiAuthAgentNameFrags = ["09 CTO", "CTO Architect"];

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

function usableOpenAiApiKey(value) {
  if (typeof value !== "string") return null;
  const trimmed = value.trim();
  if (!trimmed) return null;
  const normalized = trimmed.toUpperCase();
  if (
    normalized.includes("REPLACE") ||
    normalized.includes("PLACEHOLDER") ||
    normalized.includes("YOUR_OPENAI_API_KEY") ||
    normalized.includes("INSERT_OPENAI_API_KEY") ||
    normalized.includes("PASTE_OPENAI_API_KEY") ||
    normalized.includes("********")
  ) {
    return null;
  }
  return trimmed;
}

function shouldKeepOpenAiApiKey(adapterAgent) {
  if (!adapterAgent?.name) return false;
  const openAiApiKey = usableOpenAiApiKey(adapterAgent.adapterConfig?.env?.OPENAI_API_KEY);
  if (!openAiApiKey) return false;
  return openAiAuthAgentNameFrags.some((fragment) => adapterAgent.name.includes(fragment));
}

async function resolveCompany() {
  if (companyId) return { id: companyId, source: "PAPERCLIP_COMPANY_ID" };

  const companies = await request("GET", "/api/companies");
  const company = companies.find((candidate) => companyNames.includes(candidate.name));
  if (!company) throw new Error(`Company not found: ${companyNames.join(" or ")}`);
  return { id: company.id, source: "company_name" };
}

const company = await resolveCompany();

const agents = await request("GET", `/api/companies/${company.id}/agents`);
const codexAgents = agents.filter((agent) => agent.adapterType === "codex_local" && agent.status !== "terminated");
const updatedAgents = [];
const preservedAgents = [];

for (const agent of codexAgents) {
  if (!agent.adapterConfig?.env?.OPENAI_API_KEY) continue;
  if (shouldKeepOpenAiApiKey(agent)) {
    preservedAgents.push(agent.name);
    continue;
  }
  const adapterConfig = withoutOpenAiKeyEnv(agent.adapterConfig);
  const updated = await request("PATCH", `/api/agents/${agent.id}?companyId=${company.id}`, {
    adapterConfig,
  });
  updatedAgents.push(updated.name);
}

console.log(JSON.stringify({
  apiBase,
  company: { id: company.id, name: company.name },
  authMode: "local_codex_login_with_openai_override",
  updatedAgents: updatedAgents.sort(),
  preservedAgents: preservedAgents.sort(),
  note: "Paperclip will seed managed CODEX_HOME from the local Codex home for non-OPENAI-auth Codex agents. Agents listed in preservedAgents keep OPENAI_API_KEY mode (and should be seeded separately as needed).",
}, null, 2));
