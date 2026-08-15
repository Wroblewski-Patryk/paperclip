import {
  WEB_SEARCH_AGENT_NAMES,
  asRecord,
  agentRosterDiff,
  cheapAdapterConfig,
  desiredSkillsForAgent,
  loadRosterAgentNames,
} from "./lib/softwarehouse-agent-capabilities.mjs";

const apiBase = (process.env.PAPERCLIP_API_URL ?? "http://127.0.0.1:3200").replace(/\/+$/, "");
const companyId = process.env.PAPERCLIP_COMPANY_ID ?? "ae26bb8b-8f5f-4a85-b341-78d4e1985975";
const apply = process.argv.includes("--apply");

async function request(method, route, body) {
  const response = await fetch(`${apiBase}${route}`, {
    method,
    headers: { "content-type": "application/json" },
    body: body === undefined ? undefined : JSON.stringify(body),
  });
  const text = await response.text();
  if (!response.ok) throw new Error(`${method} ${route} failed with ${response.status}: ${text.slice(0, 1_000)}`);
  return text ? JSON.parse(text) : null;
}

const agents = await request("GET", `/api/companies/${companyId}/agents`);
const liveRuns = await request("GET", `/api/companies/${companyId}/live-runs`);
const rosterAgentNames = await loadRosterAgentNames();
const rosterDrift = agentRosterDiff(agents, rosterAgentNames);
if (rosterDrift.missing.length > 0 || rosterDrift.unexpected.length > 0 || rosterDrift.duplicates.length > 0) {
  throw new Error(`Agent roster drift: ${JSON.stringify(rosterDrift)}`);
}
const liveAgentIds = new Set(liveRuns.map((run) => run.agentId));
const rows = [];

for (const agent of agents) {
  const desiredSkills = desiredSkillsForAgent(agent.name);
  const persistedDesiredSkills = ["paperclipai/paperclip/paperclip", ...desiredSkills].sort();
  const search = WEB_SEARCH_AGENT_NAMES.includes(agent.name);
  const currentSkills = asRecord(agent.adapterConfig).paperclipSkillSync?.desiredSkills ?? [];
  const currentSearch = asRecord(agent.adapterConfig).search === true;
  const currentCheapSearch = asRecord(cheapAdapterConfig(agent)).search === true;
  const skillsChanged = JSON.stringify([...currentSkills].sort()) !== JSON.stringify(persistedDesiredSkills);
  const settingsChanged = currentSearch !== search || currentCheapSearch;
  const changed = skillsChanged || settingsChanged;

  if (apply && changed && liveAgentIds.has(agent.id)) {
    throw new Error(`Refusing to reconfigure ${agent.name} while its heartbeat is active`);
  }

  if (apply && changed) {
    const assertTargetIdle = async () => {
      const currentLiveRuns = await request("GET", `/api/companies/${companyId}/live-runs`);
      if (currentLiveRuns.some((run) => run.agentId === agent.id)) {
        throw new Error(`Refusing to reconfigure ${agent.name} while its heartbeat is active`);
      }
    };

    if (settingsChanged) {
      await assertTargetIdle();
      const currentAgents = await request("GET", `/api/companies/${companyId}/agents`);
      const currentAgent = currentAgents.find((candidate) => candidate.id === agent.id);
      if (!currentAgent) throw new Error(`Agent disappeared during configuration: ${agent.name}`);
      const runtimeConfig = asRecord(currentAgent.runtimeConfig);
      const modelProfiles = asRecord(runtimeConfig.modelProfiles);
      const cheap = asRecord(modelProfiles.cheap);
      await request("PATCH", `/api/agents/${agent.id}?companyId=${companyId}`, {
        adapterConfig: { ...asRecord(currentAgent.adapterConfig), search },
        runtimeConfig: {
          ...runtimeConfig,
          modelProfiles: {
            ...modelProfiles,
            cheap: {
              ...cheap,
              adapterConfig: { ...asRecord(cheap.adapterConfig), search: false },
            },
          },
        },
      });
    }
    if (skillsChanged) {
      await assertTargetIdle();
      await request("POST", `/api/agents/${agent.id}/skills/sync`, { desiredSkills });
    }

    const persistedAgents = await request("GET", `/api/companies/${companyId}/agents`);
    const persistedAgent = persistedAgents.find((candidate) => candidate.id === agent.id);
    if (!persistedAgent) throw new Error(`Agent disappeared after configuration: ${agent.name}`);
    const persistedSkills = asRecord(persistedAgent.adapterConfig).paperclipSkillSync?.desiredSkills ?? [];
    const persistedCheapSearch = asRecord(cheapAdapterConfig(persistedAgent)).search === true;
    if (JSON.stringify([...persistedSkills].sort()) !== JSON.stringify(persistedDesiredSkills)
      || (asRecord(persistedAgent.adapterConfig).search === true) !== search
      || persistedCheapSearch) {
      throw new Error(`Post-apply capability verification failed for ${agent.name}`);
    }
  }

  rows.push({
    agentId: agent.id,
    agent: agent.name,
    live: liveAgentIds.has(agent.id),
    changed,
    desiredSkillCount: desiredSkills.length + 1,
    webSearch: search,
  });
}

console.log(JSON.stringify({
  ok: true,
  mode: apply ? "apply" : "dry-run",
  companyId,
  agents: rows.length,
  changed: rows.filter((row) => row.changed).length,
  webSearchAgents: rows.filter((row) => row.webSearch).length,
  minDesiredSkills: Math.min(...rows.map((row) => row.desiredSkillCount)),
  maxDesiredSkills: Math.max(...rows.map((row) => row.desiredSkillCount)),
  rows,
}, null, 2));
