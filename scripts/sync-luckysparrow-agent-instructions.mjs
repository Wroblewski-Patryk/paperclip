import { readdir, readFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(__dirname, "..");
const appsRoot = path.resolve(root, "..");
const apiBase = process.env.PAPERCLIP_API_URL ?? "http://127.0.0.1:3200";
const companyNames = ["LuckySparrow", "LuckySparrow Software House"];
const companyId = process.env.PAPERCLIP_COMPANY_ID ?? null;
const rosterPath = path.join(root, "softwarehouse", "agent-roster.json");
const sharedDir = path.join(root, "softwarehouse", "instructions", "shared");
const rolesDir = path.join(root, "softwarehouse", "instructions", "roles");
const localCodexCommand = path.join(root, "scripts", "codex.cmd");
const requestedAgentKeys = new Set(
  [
    ...process.argv
      .filter((arg) => arg.startsWith("--agent="))
      .flatMap((arg) => arg.slice("--agent=".length).split(",")),
    ...(process.env.SOFTWAREHOUSE_SYNC_AGENT_KEYS ?? "").split(","),
  ]
    .map((value) => value.trim())
    .filter(Boolean),
);

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

async function optionalRequest(method, route, body) {
  try {
    return await request(method, route, body);
  } catch (error) {
    if (error instanceof Error && /failed with 404\b/.test(error.message)) return null;
    throw error;
  }
}

function roleFileFor(definition) {
  return path.join(rolesDir, `${definition.key}.md`);
}

function workspaceCwd(definition) {
  const policy = roster.workspacePolicy ?? {};
  const workspaceKey = definition.defaultWorkspace ?? "softwarehouse";
  const configured = policy.workspaces?.[workspaceKey] ?? policy.defaultCwd;
  return configured ? path.resolve(configured) : appsRoot;
}

function adapterConfigFor(definition, laneKey = definition.modelLane, existingConfig = {}) {
  const lane = roster.modelPolicy[laneKey] ?? roster.modelPolicy.codingStrong;
  const existingEnv = existingConfig?.env && typeof existingConfig.env === "object"
    ? existingConfig.env
    : {};
  return {
    ...existingConfig,
    command: localCodexCommand,
    cwd: workspaceCwd(definition),
    env: {
      ...existingEnv,
      PAPERCLIP_SOFTWAREHOUSE_ROOT: root,
    },
    model: lane.model,
    modelReasoningEffort: lane.modelReasoningEffort,
    fastMode: Boolean(lane.fastMode),
    search: false,
    dangerouslyBypassApprovalsAndSandbox: true,
    timeoutSec: 0,
    graceSec: 15,
  };
}

async function syncAgentRuntime(agent, definition) {
  const adapterConfig = adapterConfigFor(definition, definition.modelLane, agent.adapterConfig);
  const existingCheapAdapterConfig = agent.runtimeConfig?.modelProfiles?.cheap?.adapterConfig ?? {};
  const runtimeConfig = {
    ...(agent.runtimeConfig ?? {}),
    heartbeat: {
      ...(agent.runtimeConfig?.heartbeat ?? {}),
      maxConcurrentRuns: 1,
    },
    modelProfiles: {
      ...(agent.runtimeConfig?.modelProfiles ?? {}),
      cheap: {
        ...(agent.runtimeConfig?.modelProfiles?.cheap ?? {}),
        enabled: true,
        label: "Fast triage",
        adapterConfig: adapterConfigFor(definition, "fastTriage", existingCheapAdapterConfig),
      },
    },
  };
  await request("PATCH", `/api/agents/${agent.id}?companyId=${company.id}`, {
    name: definition.name,
    role: definition.role,
    title: definition.title,
    icon: definition.icon,
    capabilities: definition.capabilities,
    adapterConfig,
    runtimeConfig,
    metadata: {
      ...(agent.metadata ?? {}),
      rosterKey: definition.key,
      modelLane: definition.modelLane,
      responsibilityMode: "minimum_scope",
      defaultWorkspace: definition.defaultWorkspace ?? "softwarehouse",
    },
  });
}

async function syncAgentPermissions(agent, definition) {
  const expected = Boolean(definition.canCreateAgents);
  const current = Boolean(agent.permissions?.canCreateAgents);
  if (current === expected) return;
  await request("PATCH", `/api/agents/${agent.id}/permissions?companyId=${company.id}`, {
    canCreateAgents: expected,
    canAssignTasks: Boolean(agent.permissions?.canAssignTasks),
  });
}

async function buildInstructions(definition, instructionsRoot) {
  const sharedFiles = (await readdir(sharedDir))
    .filter((file) => file.endsWith(".md"))
    .sort();
  const rolePath = `roles/${definition.key}.md`;
  return {
    "AGENTS.md": [
      "---",
      `name: ${definition.name}`,
      `title: ${definition.title}`,
      `role: ${definition.role}`,
      "---",
      "",
      "# LuckySparrow Software House Agent Instructions",
      "",
      "This is the bundle entry file. Before taking non-trivial action, read the shared contracts and your role file listed below.",
      "",
      "## Instruction Root",
      "",
      `- Absolute bundle root: \`${instructionsRoot}\``,
      "- Prefer the injected `PAPERCLIP_AGENT_INSTRUCTIONS_ROOT` environment variable instead of retyping this path. On PowerShell, read it as `$env:PAPERCLIP_AGENT_INSTRUCTIONS_ROOT`.",
      "- Resolve every `shared/...`, `roles/...`, and `metadata.md` path below against this bundle root, never against the application repository working directory.",
      "- On PowerShell, use `Join-Path` with the absolute bundle root before `Get-Content`.",
      "",
      "## Shared Contracts",
      "",
      ...sharedFiles.map((file) => `- \`shared/${file}\``),
      "",
      "## Role File",
      "",
      `- \`${rolePath}\``,
      "",
      "## Metadata",
      "",
      "- `metadata.md`",
      "",
      "## Tracker Boundary",
      "",
      "- `LUC-*` identifiers belong to the local Paperclip issue tracker, never to GitHub Issues.",
      "- Use the injected Paperclip API/helper for LUC state, comments, and completion evidence; a GitHub 404 is never a LUC blocker.",
      "",
      "## Runtime Fast Path",
      "",
      "- Before searching the workspace, use `$env:PAPERCLIP_TASK_ID`, `$env:PAPERCLIP_API_URL`, `$env:PAPERCLIP_API_KEY`, and `$env:PAPERCLIP_RUN_ID` to read the current Paperclip issue.",
      "- The tracked Paperclip workflow is at `Join-Path $env:PAPERCLIP_SOFTWAREHOUSE_ROOT 'skills/paperclip/SKILL.md'`; the safe update helper is at `Join-Path $env:PAPERCLIP_SOFTWAREHOUSE_ROOT 'skills/paperclip/scripts/paperclip-issue-update.mjs'`.",
      "- Do not recursively scan `.paperclip`, `.codex`, `.git`, `node_modules`, managed runtime homes, or archived logs to discover the issue API or completion payload.",
      "- On Windows, prefer the tracked helper or one direct `Invoke-RestMethod` call with a hashtable and `ConvertTo-Json`. Avoid nested here-strings, mixed shell wrappers, and broad recursive searches.",
      "",
      "The role file is the only agent-specific responsibility file. If a task needs more responsibility than this role owns, create or request a handoff instead of expanding the role silently.",
    ].join("\n"),
    ...Object.fromEntries(await Promise.all(sharedFiles.map(async (file) => [
      `shared/${file}`,
      (await readFile(path.join(sharedDir, file), "utf8")).trim() + "\n",
    ]))),
    [rolePath]: (await readFile(roleFileFor(definition), "utf8")).trim() + "\n",
    "metadata.md": [
      "# Role Metadata",
      "",
      `- Agent key: ${definition.key}`,
      `- Agent name: ${definition.name}`,
      `- Reports to: ${definition.reportsTo ?? "none"}`,
      `- Model lane: ${definition.modelLane}`,
      `- Capabilities: ${definition.capabilities}`,
      "",
      "Stay inside this role unless the issue explicitly asks for cross-role coordination.",
    ].join("\n"),
  };
}

const roster = JSON.parse(await readFile(rosterPath, "utf8"));
const rosterRoleFileNames = new Set(roster.agents.map((definition) => `${definition.key}.md`));
async function resolveCompany() {
  if (companyId) return { id: companyId, source: "PAPERCLIP_COMPANY_ID" };

  const companies = await request("GET", "/api/companies");
  const company = companies.find((candidate) => companyNames.includes(candidate.name));
  if (!company) throw new Error(`Company not found: ${companyNames.join(" or ")}`);
  return { id: company.id, source: "company_name" };
}

const company = await resolveCompany();

const agents = await request("GET", `/api/companies/${company.id}/agents`);
const agentsByRosterKey = new Map(
  agents
    .filter((agent) => typeof agent.metadata?.rosterKey === "string")
    .map((agent) => [agent.metadata.rosterKey, agent]),
);
let updated = 0;

for (const definition of roster.agents) {
  if (requestedAgentKeys.size > 0 && !requestedAgentKeys.has(definition.key)) continue;
  const agent = agentsByRosterKey.get(definition.key) ?? agents.find((candidate) => candidate.name === definition.name);
  if (!agent) {
    console.warn(`Agent missing, skipped: ${definition.name}`);
    continue;
  }

  await syncAgentRuntime(agent, definition);
  await syncAgentPermissions(agent, definition);
  await request("PATCH", `/api/agents/${agent.id}/instructions-bundle?companyId=${company.id}`, {
    mode: "managed",
    entryFile: "AGENTS.md",
    clearLegacyPromptTemplate: true,
  });
  const bundle = await request("GET", `/api/agents/${agent.id}/instructions-bundle?companyId=${company.id}`);
  const staleRoleFiles = (bundle.files ?? [])
    .map((file) => file.path)
    .filter((filePath) =>
      typeof filePath === "string"
      && filePath.startsWith("roles/")
      && filePath.endsWith(".md")
      && filePath !== `roles/${definition.key}.md`
      && !rosterRoleFileNames.has(filePath.slice("roles/".length))
    );
  for (const filePath of staleRoleFiles) {
    await optionalRequest(
      "DELETE",
      `/api/agents/${agent.id}/instructions-bundle/file?companyId=${company.id}&path=${encodeURIComponent(filePath)}`,
    );
  }
  const bundleFiles = await buildInstructions(definition, bundle.rootPath);
  for (const [filePath, content] of Object.entries(bundleFiles)) {
    await request("PUT", `/api/agents/${agent.id}/instructions-bundle/file?companyId=${company.id}`, {
      path: filePath,
      content,
      clearLegacyPromptTemplate: true,
    });
  }
  updated += 1;
}

console.log(JSON.stringify({
  apiBase,
  company: { id: company.id, name: company.name },
  requestedAgentKeys: Array.from(requestedAgentKeys),
  updated,
}, null, 2));
