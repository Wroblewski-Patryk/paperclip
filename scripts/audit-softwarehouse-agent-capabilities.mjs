import {
  asRecord,
  agentRosterDiff,
  capabilityExpectations,
  cheapAdapterConfig,
  hasMcpServer,
  loadRosterAgentNames,
  skillPolicyDiff,
} from "./lib/softwarehouse-agent-capabilities.mjs";

const apiBase = (process.env.PAPERCLIP_API_URL ?? "http://127.0.0.1:3200").replace(/\/+$/, "");
const companyId = process.env.PAPERCLIP_COMPANY_ID ?? "ae26bb8b-8f5f-4a85-b341-78d4e1985975";

async function request(route) {
  const response = await fetch(`${apiBase}${route}`);
  const text = await response.text();
  if (!response.ok) throw new Error(`GET ${route} failed with ${response.status}: ${text.slice(0, 1_000)}`);
  return text ? JSON.parse(text) : null;
}

const agents = await request(`/api/companies/${companyId}/agents`);
const rows = [];
const findings = [];
const rosterAgentNames = await loadRosterAgentNames();
const rosterDrift = agentRosterDiff(agents, rosterAgentNames);
if (rosterDrift.missing.length > 0 || rosterDrift.unexpected.length > 0 || rosterDrift.duplicates.length > 0) {
  findings.push({ agentId: null, agent: null, mismatch: ["roster"], ...rosterDrift });
}

for (const agent of agents) {
  const skillSnapshot = await request(`/api/agents/${agent.id}/skills`);
  const expectations = capabilityExpectations(agent.name);
  const primary = asRecord(agent.adapterConfig);
  const cheap = asRecord(cheapAdapterConfig(agent));
  // The adapter snapshot may merge runtime-required skills into desiredSkills.
  // Governance is about the explicit per-agent preference persisted by Paperclip.
  const configuredSkills = asRecord(primary.paperclipSkillSync).desiredSkills ?? [];
  const skills = skillPolicyDiff(agent.name, configuredSkills);
  const runtimeSkills = skillPolicyDiff(agent.name, skillSnapshot.desiredSkills ?? []);
  const requiredSkills = (skillSnapshot.entries ?? [])
    .filter((entry) => entry.required === true)
    .map((entry) => entry.key)
    .sort();
  const actual = {
    browserPrimary: hasMcpServer(primary, "playwright"),
    browserCheap: hasMcpServer(cheap, "playwright"),
    companycorePrimary: hasMcpServer(primary, "companycore"),
    companycoreCheap: hasMcpServer(cheap, "companycore"),
    webSearchPrimary: primary.search === true,
    webSearchCheap: cheap.search === true,
  };

  const mismatch = [];
  if (actual.browserPrimary !== expectations.browser || actual.browserCheap !== expectations.browser) {
    mismatch.push("browser_mcp");
  }
  if (actual.companycorePrimary !== expectations.companycore || actual.companycoreCheap !== expectations.companycore) {
    mismatch.push("companycore_mcp");
  }
  if (actual.webSearchPrimary !== expectations.webSearch || actual.webSearchCheap) {
    mismatch.push("web_search");
  }
  if (skills.missing.length > 0 || skills.unexpected.length > 0) mismatch.push("skill_policy");
  if (runtimeSkills.missing.length > 0 || runtimeSkills.unexpected.length > 0) mismatch.push("skill_runtime_policy");
  if (JSON.stringify(requiredSkills) !== JSON.stringify(["paperclipai/paperclip/paperclip"])) {
    mismatch.push("skill_required_policy");
  }
  if ((skillSnapshot.warnings ?? []).length > 0) mismatch.push("skill_runtime_warning");
  if (skillSnapshot.supported !== true) mismatch.push("skill_runtime_unsupported");

  if (mismatch.length > 0) {
    findings.push({
      agentId: agent.id,
      agent: agent.name,
      mismatch,
      missingSkills: skills.missing,
      unexpectedSkills: skills.unexpected,
      runtimeMissingSkills: runtimeSkills.missing,
      runtimeUnexpectedSkills: runtimeSkills.unexpected,
      requiredSkills,
      warnings: skillSnapshot.warnings ?? [],
    });
  }
  rows.push({
    agentId: agent.id,
    agent: agent.name,
    status: agent.status,
    skillCount: configuredSkills.length,
    expectations,
    actual,
    mismatch,
  });
}

console.log(JSON.stringify({
  ok: findings.length === 0,
  checkedAt: new Date().toISOString(),
  apiBase,
  companyId,
  counts: {
    agents: rows.length,
    findings: findings.length,
    browserCapable: rows.filter((row) => row.actual.browserPrimary).length,
    companycoreCapable: rows.filter((row) => row.actual.companycorePrimary).length,
    webSearchCapable: rows.filter((row) => row.actual.webSearchPrimary).length,
  },
  findings,
  rows,
}, null, 2));

if (findings.length > 0) process.exitCode = 1;
