import { access, readdir, readFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(__dirname, "..");
const appsRoot = path.resolve(root, "..");
const apiBase = process.env.PAPERCLIP_API_URL ?? "http://127.0.0.1:3200";
const companyName = "LuckySparrow Software House";
const companyId = process.env.PAPERCLIP_COMPANY_ID ?? null;
const rosterPath = path.join(root, "softwarehouse", "agent-roster.json");
const sharedDir = path.join(root, "softwarehouse", "instructions", "shared");
const rolesDir = path.join(root, "softwarehouse", "instructions", "roles");
const localCodexCommand = path.join(root, "scripts", "codex.cmd");
const roostRoot = path.join(appsRoot, "Roost");
const roostDocsRoot = path.join(roostRoot, "docs");

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

async function pathExists(targetPath) {
  try {
    await access(targetPath);
    return true;
  } catch {
    return false;
  }
}

function byName(items, name) {
  return items.find((item) => item.name === name);
}

function byTitle(items, title) {
  return items.find((item) => item.title === title);
}

function adapterConfigForLane(roster, laneKey) {
  const lane = roster.modelPolicy[laneKey] ?? roster.modelPolicy.generalReasoning;
  return {
    command: localCodexCommand,
    cwd: appsRoot,
    model: lane.model,
    modelReasoningEffort: lane.modelReasoningEffort,
    search: false,
    dangerouslyBypassApprovalsAndSandbox: true,
    timeoutSec: 0,
    graceSec: 15,
  };
}

async function buildInstructions(definition) {
  const sharedFiles = (await readdir(sharedDir))
    .filter((file) => file.endsWith(".md"))
    .sort();
  const rolePath = `roles/${definition.key}.md`;
  const files = {
    "AGENTS.md": [
      "# LuckySparrow Software House Agent Instructions",
      "",
      "This is the bundle entry file. Before taking non-trivial action, read the shared contracts and your role file listed below.",
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
      "The role file is the only agent-specific responsibility file. If a task needs more responsibility than this role owns, create or request a handoff instead of expanding the role silently.",
    ].join("\n"),
  };

  for (const file of sharedFiles) {
    files[`shared/${file}`] = `${(await readFile(path.join(sharedDir, file), "utf8")).trim()}\n`;
  }
  files[rolePath] = `${(await readFile(path.join(rolesDir, `${definition.key}.md`), "utf8")).trim()}\n`;
  files["metadata.md"] = [
    "# Role Metadata",
    "",
    `- Agent key: ${definition.key}`,
    `- Agent name: ${definition.name}`,
    `- Reports to: ${definition.reportsTo ?? "none"}`,
    `- Model lane: ${definition.modelLane}`,
    `- Capabilities: ${definition.capabilities}`,
    "",
    "Stay inside this role unless the issue explicitly asks for cross-role coordination.",
  ].join("\n");

  return { entryFile: "AGENTS.md", files };
}

async function ensureLabel(companyId, labelsByName, name, color) {
  const existing = labelsByName.get(name);
  if (existing) return existing;
  const created = await request("POST", `/api/companies/${companyId}/labels`, { name, color });
  labelsByName.set(name, created);
  return created;
}

async function ensureGoal(companyId, goalsByTitle, input) {
  const existing = goalsByTitle.get(input.title);
  if (existing) {
    const updated = await request("PATCH", `/api/goals/${existing.id}`, input);
    goalsByTitle.set(input.title, updated);
    return updated;
  }
  const created = await request("POST", `/api/companies/${companyId}/goals`, input);
  goalsByTitle.set(input.title, created);
  return created;
}

async function ensureAgent(companyId, roster, agents, definition) {
  const agentsByRosterKey = new Map(
    agents
      .filter((agent) => typeof agent.metadata?.rosterKey === "string")
      .map((agent) => [agent.metadata.rosterKey, agent]),
  );
  const existing = agentsByRosterKey.get(definition.key) ?? byName(agents, definition.name);
  const instructionsBundle = await buildInstructions(definition);
  const payload = {
    name: definition.name,
    role: definition.role,
    title: definition.title,
    icon: definition.icon,
    capabilities: definition.capabilities,
    adapterType: roster.modelPolicy.defaultAdapter,
    adapterConfig: adapterConfigForLane(roster, definition.modelLane),
    instructionsBundle,
    runtimeConfig: {
      modelProfiles: {
        cheap: {
          enabled: true,
          label: "Fast triage",
          adapterConfig: adapterConfigForLane(roster, "fastTriage"),
        },
      },
    },
    budgetMonthlyCents: 0,
    metadata: {
      ...(existing?.metadata ?? {}),
      rosterKey: definition.key,
      modelLane: definition.modelLane,
      responsibilityMode: "minimum_scope",
      projectScope: "Roost/companycore active delivery",
    },
    replaceAdapterConfig: true,
  };

  const result = existing
    ? await request("PATCH", `/api/agents/${existing.id}`, payload)
    : await request("POST", `/api/companies/${companyId}/agents`, {
        ...payload,
        permissions: { canCreateAgents: Boolean(definition.canCreateAgents) },
      });
  const resolvedAgent = result.agent ?? result;

  await request("PATCH", `/api/agents/${resolvedAgent.id}/instructions-bundle?companyId=${companyId}`, {
    mode: "managed",
    entryFile: "AGENTS.md",
    clearLegacyPromptTemplate: true,
  });
  for (const [filePath, content] of Object.entries(instructionsBundle.files)) {
    await request("PUT", `/api/agents/${resolvedAgent.id}/instructions-bundle/file?companyId=${companyId}`, {
      path: filePath,
      content,
      clearLegacyPromptTemplate: true,
    });
  }

  return resolvedAgent;
}

async function ensureReportsTo(agent, reportsToAgent) {
  const expected = reportsToAgent?.id ?? null;
  if ((agent.reportsTo ?? null) === expected) return agent;
  return request("PATCH", `/api/agents/${agent.id}`, { reportsTo: expected });
}

async function ensureProject(companyId, projectsByName, input) {
  const existing = projectsByName.get(input.name);
  if (existing) {
    const updated = await request("PATCH", `/api/projects/${existing.id}`, input);
    projectsByName.set(input.name, updated);
    return updated;
  }
  const created = await request("POST", `/api/companies/${companyId}/projects`, input);
  projectsByName.set(input.name, created);
  return created;
}

async function ensurePrimaryWorkspace(projectId, input) {
  const workspaces = await request("GET", `/api/projects/${projectId}/workspaces`);
  const existing = workspaces.find((workspace) => workspace.name === input.name) ?? workspaces.find((workspace) => workspace.isPrimary);
  if (existing) return request("PATCH", `/api/projects/${projectId}/workspaces/${existing.id}`, input);
  return request("POST", `/api/projects/${projectId}/workspaces`, { ...input, isPrimary: true });
}

async function ensureIssue(companyId, issuesByTitle, input) {
  const existing = issuesByTitle.get(input.title);
  if (existing) {
    const patch = ["done", "cancelled", "blocked", "in_progress"].includes(existing.status)
      ? { ...input, status: existing.status }
      : input;
    const updated = await request("PATCH", `/api/issues/${existing.id}`, patch);
    issuesByTitle.set(input.title, updated);
    return updated;
  }
  const created = await request("POST", `/api/companies/${companyId}/issues`, input);
  issuesByTitle.set(input.title, created);
  return created;
}

if (!(await pathExists(roostRoot))) {
  throw new Error(`Roost workspace not found: ${roostRoot}`);
}
if (!(await pathExists(roostDocsRoot))) {
  throw new Error(`Roost docs path not found: ${roostDocsRoot}`);
}

const roster = JSON.parse(await readFile(rosterPath, "utf8"));
const roostDefinition = roster.agents.find((agent) => agent.key === "roost-product-manager");
if (!roostDefinition) throw new Error("Missing roost-product-manager in softwarehouse/agent-roster.json");

async function resolveCompany() {
  if (companyId) return { id: companyId, source: "PAPERCLIP_COMPANY_ID" };

  const companies = await request("GET", "/api/companies");
  const company = companies.find((candidate) => candidate.name === companyName);
  if (!company) throw new Error(`Company not found: ${companyName}`);
  return { id: company.id, source: "company_name" };
}

const company = await resolveCompany();

const [agents, projects, labels, goals, issues] = await Promise.all([
  request("GET", `/api/companies/${company.id}/agents`),
  request("GET", `/api/companies/${company.id}/projects`),
  request("GET", `/api/companies/${company.id}/labels`),
  request("GET", `/api/companies/${company.id}/goals`),
  request("GET", `/api/companies/${company.id}/issues?limit=1000`),
]);

const portfolio =
  agents.find((agent) => agent.metadata?.rosterKey === "innovation-portfolio-manager")
  ?? agents.find((agent) => agent.metadata?.rosterKey === "chief-innovation-officer")
  ?? agents.find((agent) => agent.metadata?.rosterKey === "ai-assistant")
  ?? byName(agents, "11 IPM (Innovation Portfolio Manager)")
  ?? byName(agents, "11 CINO (Chief Innovation Officer)");
const roostPm = await ensureReportsTo(
  await ensureAgent(company.id, roster, agents, roostDefinition),
  portfolio,
);
const docsMemory = agents.find((agent) => agent.metadata?.rosterKey === "documentation-steward") ?? byName(agents, "04 DSM (Documentation Steward)") ?? roostPm;
const deliveryLead = agents.find((agent) => agent.metadata?.rosterKey === "delivery-project-manager") ?? byName(agents, "04 DPM (Delivery Project Manager)") ?? roostPm;

const labelsByName = new Map(labels.map((label) => [label.name, label]));
const labelSpecs = [
  ["roost", "#0f766e"],
  ["companycore", "#2563eb"],
  ["project-intake", "#7c3aed"],
  ["known-state", "#7c3aed"],
  ["architecture", "#475569"],
  ["docs", "#64748b"],
];
for (const [name, color] of labelSpecs) await ensureLabel(company.id, labelsByName, name, color);
const labelIds = (...names) => names.map((name) => labelsByName.get(name)?.id).filter(Boolean);

const goalsByTitle = new Map(goals.map((goal) => [goal.title, goal]));
const roostGoal = await ensureGoal(company.id, goalsByTitle, {
  title: "Roost/companycore autonomous delivery and takeover",
  description: [
    "Operate Roost/companycore as an active LuckySparrow Software House project.",
    "Build a known-state baseline, verify docs/code/index/tooling shape, split safe local specialist lanes, and keep protected production actions gate-checked.",
  ].join("\n"),
  level: "team",
  status: "active",
  ownerAgentId: roostPm.id,
});

const projectsByName = new Map(projects.map((project) => [project.name, project]));
const roostProject = await ensureProject(company.id, projectsByName, {
  name: "Roost",
  description: [
    "Prepared second application lane for LuckySparrow Software House.",
    "Source project: Roost.",
    "Legacy/product alias: companycore.",
    "Docs: Roost/docs.",
    "Current mode: active delivery enabled; protected production gates still require fresh operator/credential facts.",
  ].join("\n"),
  status: "planned",
  leadAgentId: roostPm.id,
  goalIds: [roostGoal.id],
  color: "#0f766e",
  executionWorkspacePolicy: {
    enabled: true,
    defaultMode: "shared_workspace",
    allowIssueOverride: true,
    workspaceStrategy: {
      type: "project_primary",
      branchTemplate: "agent/{issueIdentifier}-{slug}",
    },
    branchPolicy: {
      requireCleanWorktreeCheck: true,
      commitPerCompletedTask: true,
    },
    runtimePolicy: {
      evidenceRequiredBeforeDone: true,
      preparationOnly: false,
    },
  },
});

const roostWorkspace = await ensurePrimaryWorkspace(roostProject.id, {
  name: "Roost local workspace",
  sourceType: "local_path",
  cwd: roostRoot,
  isPrimary: true,
  visibility: "default",
  metadata: {
    projectAlias: "Roost/companycore",
    docsRoot: roostDocsRoot,
    workspaceBoundaryAudit: "pnpm run softwarehouse:workspace-boundary-audit",
    preparationOnly: false,
  },
  runtimeConfig: {
    desiredState: "manual",
    workspaceRuntime: {
      evidenceRequiredBeforeDone: true,
        preparationOnly: false,
    },
  },
});

const companycoreProject = projectsByName.get("companycore");
if (companycoreProject) {
  await request("PATCH", `/api/projects/${companycoreProject.id}`, {
    description: [
      companycoreProject.description ?? "CompanyCore source project.",
      "",
      "Paperclip note: canonical softwarehouse intake lane is `Roost`; workspace points to this companycore repository.",
    ].join("\n").trim(),
    status: companycoreProject.status === "in_progress" ? "planned" : companycoreProject.status,
  });
}

const issuesByTitle = new Map(issues.map((issue) => [issue.title, issue]));
const prepIssue = await ensureIssue(company.id, issuesByTitle, {
  title: "[Roost] Takeover readiness and known-state baseline",
  description: [
    "Prepare Roost/companycore as the second Softwarehouse project.",
    "",
    "Mode: active local delivery. Build, validate, and split specialist repair batches when legal; protected production actions still require fresh approval/evidence.",
    "",
    "Read first:",
    "- C:/Personal/Projekty/Aplikacje/Roost/AGENTS.md",
    "- C:/Personal/Projekty/Aplikacje/Roost/README.md",
    "- C:/Personal/Projekty/Aplikacje/Roost/package.json",
    "- C:/Personal/Projekty/Aplikacje/Roost/docs",
    "- C:/Personal/Projekty/Aplikacje/Paperclip_Softwarehouse/softwarehouse/operating-processes.md",
    "- C:/Personal/Projekty/Aplikacje/Paperclip_Softwarehouse/softwarehouse/architectural-awareness-layer.md",
    "",
    "Output required:",
    "- product purpose and current target version;",
    "- codebase structure and main runtime entry points;",
    "- docs inventory and canonical/stale docs split;",
    "- existing architecture graph/index tooling;",
    "- validation/test/build scripts and current confidence;",
    "- deploy/runtime surfaces and secret boundaries;",
    "- missing source-of-truth files or stale docs;",
    "- recommended first active takeover lanes;",
    "- explicit proof status for every important claim.",
    "",
    "Use statuses: implemented and verified, implemented but not verified, present in code behavior unknown, missing, blocked by error.",
  ].join("\n"),
  status: "todo",
  priority: "high",
  assigneeAgentId: roostPm.id,
  projectId: roostProject.id,
  goalId: roostGoal.id,
  requestDepth: 2,
  labelIds: labelIds("roost", "companycore", "project-intake", "known-state", "architecture", "docs"),
  executionWorkspacePreference: "shared_workspace",
  executionWorkspaceId: roostWorkspace.id,
  executionWorkspaceSettings: {
    mode: "shared_workspace",
    workspaceRuntime: {
      evidenceRequiredBeforeDone: true,
      preparationOnly: false,
    },
  },
  acceptanceCriteria: [
    "Known-state baseline names exact files, docs, scripts, and blockers.",
    "No implementation/deploy/push/production mutation is performed.",
    "Future specialist lanes are proposed with owner, scope, proof, and dependency order.",
    "Roost/companycore remains active for local delivery while protected production actions stay gate-checked.",
  ],
});

const followupIssues = [];
followupIssues.push(await ensureIssue(company.id, issuesByTitle, {
  title: "[Roost][Prep] Reconcile stale companycore path contracts",
  description: [
    "Resolve the source-of-truth drift found by LUC-183 without starting implementation work.",
    "",
    "Scope:",
    "- Search Roost and Paperclip instructions for stale local path references that point to C:/Personal/Projekty/Aplikacje/companycore or old `Roost - docs` locations.",
    "- Confirm the canonical workspace is C:/Personal/Projekty/Aplikacje/Roost and the canonical docs root is C:/Personal/Projekty/Aplikacje/Roost/docs.",
    "- Update only documentation/instruction/index files that encode the old path contract.",
    "- Do not touch production, Coolify, secrets, app runtime behavior, deploy config, or live data.",
    "",
    "Expected proof:",
    "- exact files inspected;",
    "- exact stale references found;",
    "- exact files changed or explicit proof that no change was needed;",
    "- remaining blockers if any.",
  ].join("\n"),
  status: "todo",
  priority: "high",
  assigneeAgentId: docsMemory.id,
  projectId: roostProject.id,
  goalId: roostGoal.id,
  requestDepth: 2,
  labelIds: labelIds("roost", "companycore", "project-intake", "known-state", "docs"),
  executionWorkspacePreference: "shared_workspace",
  executionWorkspaceId: roostWorkspace.id,
  executionWorkspaceSettings: {
    mode: "shared_workspace",
    workspaceRuntime: {
      evidenceRequiredBeforeDone: true,
      preparationOnly: false,
    },
  },
  acceptanceCriteria: [
    "Canonical Roost path contract is documented consistently.",
    "No production, deploy, secret, or runtime mutation occurs.",
    "Evidence links every changed or inspected file.",
  ],
}));

followupIssues.push(await ensureIssue(company.id, issuesByTitle, {
  title: "[Roost][Prep] Triage legacy docs deletion churn",
  description: [
    "Triage the large pre-existing deletion set under the legacy `Roost - docs/**` path found by LUC-183.",
    "",
    "Scope:",
    "- Inspect git status in C:/Personal/Projekty/Aplikacje/Roost.",
    "- Identify whether the deleted `Roost - docs/**` tree is obsolete legacy material, migrated docs, or accidental loss.",
    "- Compare against the active docs root C:/Personal/Projekty/Aplikacje/Roost/docs.",
    "- Produce a decision packet: restore, archive, remove, or defer.",
    "- Do not perform destructive restore/remove/archive actions without an explicit follow-up approval issue.",
    "",
    "Expected proof:",
    "- deletion count/category summary;",
    "- representative paths;",
    "- migration/equivalence evidence when available;",
    "- recommended operator-safe resolution.",
  ].join("\n"),
  status: "todo",
  priority: "high",
  assigneeAgentId: deliveryLead.id,
  projectId: roostProject.id,
  goalId: roostGoal.id,
  requestDepth: 2,
  labelIds: labelIds("roost", "companycore", "project-intake", "known-state", "docs"),
  executionWorkspacePreference: "shared_workspace",
  executionWorkspaceId: roostWorkspace.id,
  executionWorkspaceSettings: {
    mode: "shared_workspace",
    workspaceRuntime: {
      evidenceRequiredBeforeDone: true,
      preparationOnly: false,
    },
  },
  acceptanceCriteria: [
    "Legacy docs deletion churn has a documented decision packet.",
    "No destructive filesystem action occurs in this issue.",
    "Next action is split into a narrow approval or execution issue.",
  ],
}));

followupIssues.push(await ensureIssue(company.id, issuesByTitle, {
  title: "[Roost][Prep] Pin canonical docs root and takeover handoff",
  description: [
    "Turn LUC-183 and the two Roost prep follow-ups into a clean takeover handoff contract.",
    "",
    "Scope:",
    "- Read LUC-183 readiness evidence and the current Roost docs/index structure.",
    "- Ensure the handoff states one canonical docs root, one canonical local workspace, and which legacy aliases are allowed only as product aliases.",
    "- Define the first specialist lanes that may be opened after path-contract and deletion-churn decisions are resolved.",
    "- Keep protected production actions gate-checked. Local implementation, validation, and source-control closure may proceed when owner-scoped and evidenced.",
    "",
    "Expected proof:",
    "- handoff summary with exact paths;",
    "- dependency order for first Roost specialist lanes;",
    "- explicit readiness state: planning-ready, implementation-ready, or blocked.",
  ].join("\n"),
  status: "todo",
  priority: "medium",
  assigneeAgentId: roostPm.id,
  projectId: roostProject.id,
  goalId: roostGoal.id,
  requestDepth: 2,
  labelIds: labelIds("roost", "companycore", "project-intake", "known-state", "architecture", "docs"),
  executionWorkspacePreference: "shared_workspace",
  executionWorkspaceId: roostWorkspace.id,
  executionWorkspaceSettings: {
    mode: "shared_workspace",
    workspaceRuntime: {
      evidenceRequiredBeforeDone: true,
      preparationOnly: false,
    },
  },
  acceptanceCriteria: [
    "Roost takeover handoff has one canonical path/docs contract.",
    "First specialist lanes are dependency-ordered and owner-scoped.",
    "Roost activation state is honest and evidence-backed.",
  ],
}));

console.log(JSON.stringify({
  apiBase,
  company: { id: company.id, name: company.name },
  agent: { id: roostPm.id, name: roostPm.name, reportsTo: roostPm.reportsTo ?? null },
  project: { id: roostProject.id, name: roostProject.name, status: roostProject.status },
  workspace: { id: roostWorkspace.id, cwd: roostWorkspace.cwd },
  goal: { id: roostGoal.id, title: roostGoal.title },
  issue: { id: prepIssue.id, identifier: prepIssue.identifier, title: prepIssue.title, status: prepIssue.status },
  followupIssues: followupIssues.map((issue) => ({
    id: issue.id,
    identifier: issue.identifier,
    title: issue.title,
    status: issue.status,
  })),
}, null, 2));
