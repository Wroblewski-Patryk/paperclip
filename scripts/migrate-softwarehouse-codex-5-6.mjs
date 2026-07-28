import { readFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { resolveLocalCodexCommand } from "./lib/local-codex-command.mjs";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(__dirname, "..");
const apiBase = (process.env.PAPERCLIP_API_URL ?? "http://127.0.0.1:3200").replace(/\/$/, "");
const configuredCompanyId = process.env.PAPERCLIP_COMPANY_ID ?? null;
const apply = process.argv.includes("--apply");
const roster = JSON.parse(await readFile(path.join(root, "softwarehouse", "agent-roster.json"), "utf8"));
const localCodexCommand = resolveLocalCodexCommand(root);

async function request(method, route, body) {
  const response = await fetch(`${apiBase}${route}`, {
    method,
    headers: { "content-type": "application/json" },
    body: body === undefined ? undefined : JSON.stringify(body),
  });
  const text = await response.text();
  if (!response.ok) throw new Error(`${method} ${route} failed with ${response.status}: ${text}`);
  return text ? JSON.parse(text) : null;
}

const companies = await request("GET", "/api/companies");
const company = configuredCompanyId
  ? companies.find((candidate) => candidate.id === configuredCompanyId)
  : companies.find((candidate) => candidate.name === roster.company.name)
    ?? companies.find((candidate) => /^LuckySparrow\b/i.test(candidate.name));
if (!company) throw new Error("LuckySparrow company not found");

const definitionsByKey = new Map(roster.agents.map((definition) => [definition.key, definition]));
const definitionsByName = new Map(roster.agents.map((definition) => [definition.name, definition]));
const agents = await request("GET", `/api/companies/${company.id}/agents`);
const changes = [];

for (const agent of agents.filter((candidate) => candidate.adapterType === "codex_local" && candidate.status !== "terminated")) {
  const definition = definitionsByKey.get(agent.metadata?.rosterKey) ?? definitionsByName.get(agent.name);
  if (!definition) {
    changes.push({ agent: agent.name, action: "skipped", reason: "not present in softwarehouse roster" });
    continue;
  }
  const lane = roster.modelPolicy[definition.modelLane];
  if (!lane) throw new Error(`Missing model lane ${definition.modelLane} for ${definition.name}`);

  const adapterConfig = {
    ...(agent.adapterConfig ?? {}),
    command: localCodexCommand,
    model: lane.model,
    modelReasoningEffort: lane.modelReasoningEffort,
    fastMode: false,
  };
  const cheapProfile = agent.runtimeConfig?.modelProfiles?.cheap ?? {};
  const cheapAdapterConfig = {
    ...(cheapProfile.adapterConfig ?? agent.adapterConfig ?? {}),
    command: localCodexCommand,
    model: roster.modelPolicy.fastTriage.model,
    modelReasoningEffort: roster.modelPolicy.fastTriage.modelReasoningEffort,
    fastMode: false,
  };
  const runtimeConfig = {
    ...(agent.runtimeConfig ?? {}),
    modelProfiles: {
      ...(agent.runtimeConfig?.modelProfiles ?? {}),
      cheap: {
        ...cheapProfile,
        enabled: true,
        label: cheapProfile.label ?? "Fast triage",
        adapterConfig: cheapAdapterConfig,
      },
    },
  };

  const changed = adapterConfig.command !== agent.adapterConfig?.command
    || adapterConfig.model !== agent.adapterConfig?.model
    || adapterConfig.modelReasoningEffort !== agent.adapterConfig?.modelReasoningEffort
    || adapterConfig.fastMode !== agent.adapterConfig?.fastMode
    || cheapAdapterConfig.command !== cheapProfile.adapterConfig?.command
    || cheapAdapterConfig.model !== cheapProfile.adapterConfig?.model
    || cheapAdapterConfig.modelReasoningEffort !== cheapProfile.adapterConfig?.modelReasoningEffort
    || cheapAdapterConfig.fastMode !== cheapProfile.adapterConfig?.fastMode;
  if (!changed) continue;

  changes.push({
    agent: agent.name,
    action: apply ? "updated" : "would_update",
    primary: `${agent.adapterConfig?.model ?? "unset"} -> ${adapterConfig.model}`,
    cheap: `${cheapProfile.adapterConfig?.model ?? "unset"} -> ${cheapAdapterConfig.model}`,
    command: localCodexCommand,
  });
  if (apply) {
    await request("PATCH", `/api/agents/${agent.id}`, {
      adapterConfig,
      runtimeConfig,
      replaceAdapterConfig: true,
    });
  }
}

console.log(JSON.stringify({
  mode: apply ? "apply" : "dry-run",
  company: { id: company.id, name: company.name },
  codexCommand: localCodexCommand,
  changedCount: changes.filter((entry) => entry.action !== "skipped").length,
  changes,
}, null, 2));
