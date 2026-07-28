import { readFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { resolveLocalCodexCommand } from "./lib/local-codex-command.mjs";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(__dirname, "..");
const appsRoot = path.resolve(root, "..");
const apiBase = process.env.PAPERCLIP_API_URL ?? "http://127.0.0.1:3200";
const companyId = process.env.PAPERCLIP_COMPANY_ID ?? null;
const rosterPath = path.join(root, "softwarehouse", "agent-roster.json");
const localCodexCommand = resolveLocalCodexCommand(root);

async function request(method, route, body) {
  const response = await fetch(`${apiBase}${route}`, {
    method,
    headers: { "content-type": "application/json" },
    body: body === undefined ? undefined : JSON.stringify(body),
  });
  const text = await response.text();
  const data = text ? JSON.parse(text) : null;
  if (!response.ok) {
    throw new Error(`${method} ${route} failed with ${response.status}: ${text}`);
  }
  return data;
}

function normalizePath(value) {
  return path.resolve(String(value ?? "")).replace(/\\/g, "/").toLowerCase();
}

function expectedAdapterConfig(roster, laneKey) {
  const lane = roster.modelPolicy[laneKey];
  return {
    command: localCodexCommand,
    cwd: expectedWorkspaceCwd(roster, null),
    model: lane.model,
    modelReasoningEffort: lane.modelReasoningEffort,
    fastMode: Boolean(lane.fastMode),
    search: false,
    dangerouslyBypassApprovalsAndSandbox: true,
    timeoutSec: 0,
    graceSec: 15,
  };
}

function expectedWorkspaceCwd(roster, definition) {
  const policy = roster.workspacePolicy ?? {};
  const workspaceKey = definition?.defaultWorkspace ?? "softwarehouse";
  const configured = policy.workspaces?.[workspaceKey] ?? policy.defaultCwd;
  return configured ? path.resolve(configured) : appsRoot;
}

function expectedAdapterConfigForAgent(roster, definition, laneKey = definition.modelLane) {
  return {
    ...expectedAdapterConfig(roster, laneKey),
    cwd: expectedWorkspaceCwd(roster, definition),
  };
}

function record(findings, severity, agent, code, detail) {
  findings.push({ severity, agent, code, detail });
}

function checkEqual(findings, agentName, code, actual, expected) {
  if (actual === expected) return;
  record(findings, "error", agentName, code, { actual, expected });
}

function checkAdapter(findings, agentName, actualConfig, expectedConfig, prefix) {
  const actual = actualConfig ?? {};
  const hasActualConfig = Object.keys(actual).length > 0;
  if (!hasActualConfig) return;
  if (actual.command !== undefined) {
    checkEqual(
      findings,
      agentName,
      `${prefix}.command`,
      normalizePath(actual.command),
      normalizePath(expectedConfig.command),
    );
  }
  if (actual.cwd !== undefined) {
    checkEqual(
      findings,
      agentName,
      `${prefix}.cwd`,
      normalizePath(actual.cwd),
      normalizePath(expectedConfig.cwd),
    );
  }
  for (const key of [
    "model",
    "modelReasoningEffort",
    "fastMode",
    "search",
    "dangerouslyBypassApprovalsAndSandbox",
    "timeoutSec",
    "graceSec",
  ]) {
    if (actual[key] === undefined) continue;
    checkEqual(findings, agentName, `${prefix}.${key}`, actual[key], expectedConfig[key]);
  }
}

function assertSafeModelPolicy(findings, definition, roster) {
  const lane = roster.modelPolicy[definition.modelLane];
  if (!lane) {
    record(findings, "error", definition.name, "modelPolicy.missingLane", { modelLane: definition.modelLane });
    return;
  }
  const allowedModels = new Set(["gpt-5.6-sol", "gpt-5.6-terra", "gpt-5.6-luna"]);
  if (!allowedModels.has(lane.model)) {
    record(findings, "error", definition.name, "modelPolicy.model", {
      modelLane: definition.modelLane,
      model: lane.model,
      expected: "a model verified by a live Codex CLI probe",
    });
  }
}

async function readInstructionFile(companyId, agentId, filePath) {
  const detail = await request(
    "GET",
    `/api/agents/${agentId}/instructions-bundle/file?companyId=${companyId}&path=${encodeURIComponent(filePath)}`,
  );
  return detail.content ?? "";
}

async function readInstructionsBundle(companyId, agentId) {
  return request("GET", `/api/agents/${agentId}/instructions-bundle?companyId=${companyId}`);
}

const roster = JSON.parse(await readFile(rosterPath, "utf8"));
const preferredCompanyNames = [
  process.env.SOFTWAREHOUSE_COMPANY_NAME,
  process.env.PAPERCLIP_COMPANY_NAME,
  roster.company.name,
  "LuckySparrow",
  "LuckySparrow Software House",
].filter(Boolean);
const companies = await request("GET", "/api/companies");
const company = companyId
  ? companies.find((candidate) => candidate.id === companyId) ?? { id: companyId, name: roster.company.name }
  : preferredCompanyNames
      .map((name) => companies.find((candidate) => candidate.name === name))
      .find(Boolean)
    ?? companies.find((candidate) => /^LuckySparrow\b/i.test(candidate.name));
if (!company) throw new Error(`Company not found: ${roster.company.name}`);

const agentsResult = await request("GET", `/api/companies/${company.id}/agents/`);
const agents = agentsResult.value ?? agentsResult;
const activeAgents = agents.filter((agent) => agent.status !== "terminated");
const rosterKeys = new Set(roster.agents.map((agent) => agent.key));
const rosterDefinitionsByName = new Map(roster.agents.map((agent) => [agent.name, agent]));
const byRosterKey = new Map();
const duplicates = [];
for (const agent of activeAgents) {
  const key = agent.metadata?.rosterKey;
  if (typeof key !== "string") continue;
  if (byRosterKey.has(key)) duplicates.push(key);
  byRosterKey.set(key, agent);
}
for (const agent of activeAgents) {
  const definition = rosterDefinitionsByName.get(agent.name);
  if (!definition || byRosterKey.has(definition.key)) continue;
  byRosterKey.set(definition.key, agent);
}

const findings = [];

for (const key of duplicates) {
  record(findings, "error", null, "duplicate_roster_key", { rosterKey: key });
}

for (const agent of activeAgents) {
  const key = agent.metadata?.rosterKey;
  if (typeof key !== "string" || rosterKeys.has(key)) continue;
  record(findings, "error", agent.name, "unmanaged_active_agent", { rosterKey: key });
}

for (const definition of roster.agents) {
  const agent = byRosterKey.get(definition.key) ?? activeAgents.find((candidate) => candidate.name === definition.name);
  if (!agent) {
    record(findings, "error", definition.name, "missing_agent", { rosterKey: definition.key });
    continue;
  }

  checkEqual(findings, agent.name, "name", agent.name, definition.name);
  checkEqual(findings, agent.name, "role", agent.role, definition.role);
  checkEqual(findings, agent.name, "title", agent.title, definition.title);
  checkEqual(findings, agent.name, "icon", agent.icon, definition.icon);
  checkEqual(findings, agent.name, "capabilities", agent.capabilities, definition.capabilities);
  checkEqual(findings, agent.name, "adapterType", agent.adapterType, roster.modelPolicy.defaultAdapter);
  checkEqual(findings, agent.name, "metadata.rosterKey", agent.metadata?.rosterKey, definition.key);
  if (agent.metadata?.modelLane !== undefined) {
    checkEqual(findings, agent.name, "metadata.modelLane", agent.metadata.modelLane, definition.modelLane);
  }
  checkEqual(findings, agent.name, "metadata.responsibilityMode", agent.metadata?.responsibilityMode, "minimum_scope");
  assertSafeModelPolicy(findings, definition, roster);
  checkEqual(
    findings,
    agent.name,
    "permissions.canCreateAgents",
    Boolean(agent.permissions?.canCreateAgents),
    Boolean(definition.canCreateAgents),
  );

  const expectedParent = definition.reportsTo ? byRosterKey.get(definition.reportsTo)?.id ?? null : null;
  checkEqual(findings, agent.name, "reportsTo", agent.reportsTo ?? null, expectedParent);

  checkAdapter(
    findings,
    agent.name,
    agent.adapterConfig,
    expectedAdapterConfigForAgent(roster, definition),
    "adapterConfig",
  );

  const cheapProfile = agent.runtimeConfig?.modelProfiles?.cheap;
  if (cheapProfile) {
    checkEqual(findings, agent.name, "runtimeConfig.modelProfiles.cheap.enabled", cheapProfile.enabled, true);
    checkEqual(findings, agent.name, "runtimeConfig.modelProfiles.cheap.label", cheapProfile.label, "Fast triage");
    checkAdapter(
      findings,
      agent.name,
      cheapProfile.adapterConfig,
      expectedAdapterConfigForAgent(roster, definition, "fastTriage"),
      "runtimeConfig.modelProfiles.cheap.adapterConfig",
    );
  }

  const instructionsBundle = await readInstructionsBundle(company.id, agent.id).catch((error) => {
    record(findings, "error", agent.name, "instructions.bundle_unreadable", String(error));
    return null;
  });
  const instructionPaths = new Set((instructionsBundle?.files ?? []).map((file) => file.path));
  if (!instructionPaths.has("AGENTS.md")) {
    record(findings, "error", agent.name, "instructions.entry_file_missing", { expected: "AGENTS.md" });
  }

  if (instructionPaths.has("metadata.md")) {
    const metadataFile = await readInstructionFile(company.id, agent.id, "metadata.md").catch((error) => {
      record(findings, "error", agent.name, "instructions.metadata_unreadable", String(error));
      return "";
    });
    for (const fragment of [
      `- Agent key: ${definition.key}`,
      `- Agent name: ${definition.name}`,
      `- Reports to: ${definition.reportsTo ?? "none"}`,
      `- Model lane: ${definition.modelLane}`,
      `- Capabilities: ${definition.capabilities}`,
    ]) {
      if (!metadataFile.includes(fragment)) {
        record(findings, "error", agent.name, "instructions.metadata_drift", { missing: fragment });
      }
    }

    await readInstructionFile(company.id, agent.id, `roles/${definition.key}.md`).catch((error) => {
      record(findings, "error", agent.name, "instructions.role_file_unreadable", String(error));
    });
  } else {
    const agentsFile = await readInstructionFile(company.id, agent.id, "AGENTS.md").catch((error) => {
      record(findings, "error", agent.name, "instructions.entry_file_unreadable", String(error));
      return "";
    });
    for (const fragment of [
      `name: ${definition.name}`,
      `title: ${definition.title}`,
      `role: ${definition.role}`,
      `# ${definition.name}`,
      "## Required Reading",
      "## Current Stage 1 Mission",
      "references/cost-token-and-context-efficiency.md",
      "references/paperclip-operating-mechanics.md",
      "references/procedures-and-task-lifecycle.md",
    ]) {
      if (!agentsFile.includes(fragment)) {
        record(findings, "error", agent.name, "instructions.reference_bundle_drift", { missing: fragment });
      }
    }
    const requiredReferencePaths = [
      "references/company-operating-model.md",
      "references/standards.md",
      "references/cost-token-and-context-efficiency.md",
      "references/paperclip-operating-mechanics.md",
      "references/procedures-and-task-lifecycle.md",
      "references/owner-interface-and-language-policy.md",
    ];
    const missingReferencePaths = requiredReferencePaths.filter((relativePath) => !instructionPaths.has(relativePath));
    if (missingReferencePaths.length > 0) {
      record(findings, "error", agent.name, "instructions.reference_files_missing", { missing: missingReferencePaths });
    }
  }
}

const errors = findings.filter((finding) => finding.severity === "error");
const summary = {
  ok: errors.length === 0,
  apiBase,
  company: { id: company.id, name: company.name },
  rosterAgents: roster.agents.length,
  activeAgents: activeAgents.length,
  findings,
};

console.log(JSON.stringify(summary, null, 2));
if (errors.length > 0) {
  process.exitCode = 1;
}
