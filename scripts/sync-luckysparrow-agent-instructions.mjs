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
const requestedInstructionFiles = new Set(
  process.argv
    .filter((arg) => arg.startsWith("--file="))
    .flatMap((arg) => arg.slice("--file=".length).split(","))
    .map((value) => value.trim().replaceAll("\\", "/"))
    .filter(Boolean),
);
const incrementalFileSync = requestedInstructionFiles.size > 0;

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
  const { PAPERCLIP_SOFTWAREHOUSE_ROOT: _legacySoftwarehouseRoot, ...preservedEnv } = existingEnv;
  return {
    ...existingConfig,
    command: localCodexCommand,
    cwd: workspaceCwd(definition),
    env: {
      ...preservedEnv,
      LUCKYSPARROW_SOFTWAREHOUSE_ROOT: root,
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
      "- The tracked Paperclip workflow is at `Join-Path $env:LUCKYSPARROW_SOFTWAREHOUSE_ROOT 'skills/paperclip/SKILL.md'`; the safe update helper is at `Join-Path $env:LUCKYSPARROW_SOFTWAREHOUSE_ROOT 'skills/paperclip/scripts/paperclip-issue-update.mjs'`.",
      "- On Windows, never invoke a `.js`, `.mjs`, `.cjs`, or `.ts` path directly: file associations can open an editor instead of running the script. Execute JavaScript helpers with `node <absolute-script-path>` and TypeScript with the owning repo's `pnpm exec tsx <script-path>`.",
      "- Example: `$helper = Join-Path $env:LUCKYSPARROW_SOFTWAREHOUSE_ROOT 'skills/paperclip/scripts/paperclip-issue-update.mjs'`; then run `node $helper --issue-id $env:PAPERCLIP_TASK_ID --status in_review --comment-file .\\closeout.md`.",
      "- When work produces a durable assumption, commitment, decision, outcome, causal finding, external signal, or reusable learning, use `node skills/paperclip/scripts/paperclip-organizational-memory.mjs <record|observe> --input-file <json> --dedupe-key <stable-key>`; do not copy routine progress or secrets into organizational memory.",
      "- For inspectable files, use `$upload = Join-Path $env:LUCKYSPARROW_SOFTWAREHOUSE_ROOT 'skills/paperclip/scripts/paperclip-upload-artifact.mjs'`; then run `node $upload .\\path\\to\\artifact.md --title 'Artifact title'`.",
      "- Do not recursively scan `.paperclip`, `.codex`, `.git`, `node_modules`, managed runtime homes, or archived logs to discover the issue API or completion payload.",
      "- On Windows, prefer the tracked helper or one direct `Invoke-RestMethod` call with a hashtable and `ConvertTo-Json`. Avoid nested here-strings, mixed shell wrappers, and broad recursive searches.",
      "- This runtime is one bounded Windows workstation. Never spawn a fallback Paperclip/Soar/Roost instance, broad-kill Node/PowerShell/Postgres processes, enumerate the full Win32_Process table, or overlap repo-wide validation lanes.",
      "- Canonical roots are Paperclip_Softwarehouse, Soar, and Roost under `C:\\Personal\\Projekty\\Aplikacje`; Paperclip is fixed to port 3200 and its embedded PostgreSQL to 54329. Run `pnpm run softwarehouse:runtime-topology-audit` from the Softwarehouse root when topology is in doubt.",
      "- For Windows embedded-PostgreSQL tests, protect the live canonical database from the current 54329 listener, terminate only the fixture-owned PID tree, rescan that tree for late reparented `io_worker` descendants, and require repeated no-listener snapshots before reusing a port. Never kill every `postgres.exe` by name.",
      "- In Node child-process code, launch pnpm through `process.execPath` plus `process.env.npm_execpath`; if that entrypoint is unavailable, use a deliberately scoped Windows shell fallback. A bare `spawnSync('pnpm', ...)` is not portable proof.",
      "- Repository state files may be append-heavy and larger than one megabyte. Inspect size first; for files above 250 KB read at most the first 200 lines, then use `rg -n` for the current issue/path/capability and a small surrounding range. Never concatenate several large state files into one `Get-Content` command.",
      "- Never run a repository-root `rg` for generic task terms across `.agents/state`, `history`, `docs/status`, or `docs/graphs`. Start in the expected source/test/docs directory; when a generated JSON/CSV index is the target, parse only the exact identifier or row with a structured reader.",
      "- A line-count cap is not a byte cap for wide generated JSON/CSV records. Do not rely on `Get-Content -TotalCount` or `Select-Object -First`; parse the exact record structurally, project only needed fields, truncate returned strings to 4 KB, and keep total command output below 50 KB unless the issue explicitly requires a larger artifact.",
      "- Keep source-control inspection bounded too: begin with `git status --short`, `git diff --stat`, and `git diff --numstat`; inspect authored paths individually and validate generated groups by producer command plus focused excerpts. Do not dump a repository-wide generated diff into the transcript.",
      "- Keep redaction checks bounded: prefer the repo secret scanner; otherwise use only high-confidence signatures and return capped file names/counts. Never scan generic secret words or pipe a full generated diff across generated graphs, status indexes, or append-heavy state files.",
      "- The assigned execution workspace (`cwd`) is this run's write boundary. Reading a shared tool from another allowed root is permitted, but modifying another repo requires a separately assigned linked issue bound to that repo's project and primary workspace. Never expand scope by adding a foreign path to your own task packet.",
      "- If a cross-repo defect is discovered, record a linked handoff and leave the foreign repo untouched. Do not close done while the assigned repo or any repo touched by the run is dirty unless an open source-control closure issue or exact no-commit blocker preserves ownership.",
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

  if (!incrementalFileSync) {
    await syncAgentRuntime(agent, definition);
    await syncAgentPermissions(agent, definition);
    await request("PATCH", `/api/agents/${agent.id}/instructions-bundle?companyId=${company.id}`, {
      mode: "managed",
      entryFile: "AGENTS.md",
      clearLegacyPromptTemplate: true,
    });
  }
  const bundle = await request("GET", `/api/agents/${agent.id}/instructions-bundle?companyId=${company.id}`);
  if (!incrementalFileSync) {
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
  }
  const bundleFiles = await buildInstructions(definition, bundle.rootPath);
  const selectedBundleFiles = incrementalFileSync
    ? Array.from(requestedInstructionFiles, (filePath) => {
        if (!Object.hasOwn(bundleFiles, filePath)) {
          throw new Error(`Unknown generated instruction file: ${filePath}`);
        }
        return [filePath, bundleFiles[filePath]];
      })
    : Object.entries(bundleFiles);
  for (const [filePath, content] of selectedBundleFiles) {
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
  requestedInstructionFiles: Array.from(requestedInstructionFiles),
  mode: incrementalFileSync ? "incremental_files" : "full",
  updated,
}, null, 2));
