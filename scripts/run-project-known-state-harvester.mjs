import { readdir, stat } from "node:fs/promises";
import { execFileSync } from "node:child_process";
import path from "node:path";

import { agentWipBlockerFor, fetchAgentWipState } from "./lib/agent-wip-guard.mjs";

import { buildAgentLookup } from "./lib/softwarehouse-agent-resolver.mjs";

const apiBase = process.env.PAPERCLIP_API_URL ?? "http://127.0.0.1:3200";
const companyName = "LuckySparrow Software House";
const companyId = process.env.PAPERCLIP_COMPANY_ID ?? null;
const appsRoot = process.env.LUCKYSPARROW_APPS_ROOT ?? "C:/Personal/Projekty/Aplikacje";
const apply = process.argv.includes("--apply");
const requestTimeoutMs = Number(process.env.SOFTWAREHOUSE_KNOWN_STATE_REQUEST_TIMEOUT_MS ?? 30_000);
const targetProjects = (process.env.SOFTWAREHOUSE_KNOWN_STATE_PROJECTS ?? "Soar,Roost")
  .split(",")
  .map((name) => name.trim())
  .filter(Boolean);
const maxCreate = Number(process.env.SOFTWAREHOUSE_KNOWN_STATE_MAX_CREATE ?? 4);
const recentKnownStateWindowMs = Number(process.env.SOFTWAREHOUSE_KNOWN_STATE_RECENT_WINDOW_MS ?? 12 * 60 * 60 * 1000);
const recentKnownStateRefreshWindowMs = Number(process.env.SOFTWAREHOUSE_KNOWN_STATE_REFRESH_WINDOW_MS ?? 2 * 60 * 60 * 1000);
const titleSuffix = "[Known State] Evidence collection and architecture baseline";
const refreshTitleSuffix = "[Known State Refresh] Evidence delta and next repair lanes";
const terminalStatuses = new Set(["done", "cancelled"]);
const issueStatuses = ["backlog", "todo", "in_progress", "in_review", "blocked", "done", "cancelled"];
const refreshableStatuses = new Set(["blocked", "in_review"]);
const projectAliases = new Map([
  ["Aviary", ["Aviary", "Personality"]],
]);

async function request(method, route, body) {
  const signal = AbortSignal.timeout(requestTimeoutMs);
  const response = await fetch(`${apiBase}${route}`, {
    method,
    headers: { "content-type": "application/json" },
    signal,
    body: body === undefined ? undefined : JSON.stringify(body),
  });
  const text = await response.text();
  const data = text ? JSON.parse(text) : null;
  if (!response.ok) throw new Error(`${method} ${route} failed with ${response.status}: ${text}`);
  return data;
}

async function pathExists(filePath) {
  try {
    await stat(filePath);
    return true;
  } catch {
    return false;
  }
}

async function countFiles(root, relative = "", limit = 5000) {
  let entries = [];
  try {
    entries = await readdir(path.join(root, relative), { withFileTypes: true });
  } catch {
    return [];
  }
  const output = [];
  for (const entry of entries) {
    if (output.length >= limit) break;
    if (["node_modules", "vendor", ".git", ".next", "dist", "build", ".turbo", "coverage"].includes(entry.name)) continue;
    const child = path.join(relative, entry.name).replaceAll("\\", "/");
    if (entry.isDirectory()) {
      output.push(...await countFiles(root, child, limit - output.length));
    } else if (entry.isFile()) {
      output.push(child);
    }
  }
  return output;
}

function projectManagerName(projectName) {
  const explicit = new Map([
    ["Soar", "Soar Project Manager"],
    ["Roost", "Roost Project Manager"],
    ["Aviary", "Aviary Project Manager"],
    ["Nest", "Nest Project Manager"],
  ]);
  return explicit.get(projectName) ?? "Portfolio Director";
}

function priorityFor(projectName) {
  return projectName === "Soar" ? "critical" : "high";
}

function isPreparationOnlyProject(projectName) {
  return false;
}

function sampleImportantFiles(files) {
  const wanted = [
    "AGENTS.md",
    "README.md",
    "package.json",
    "pnpm-workspace.yaml",
    "docs/documentation-map.md",
    "docs/architecture/codebase-map.md",
    "docs/architecture/traceability-matrix.md",
    "docs/status/architecture-map-status.md",
  ];
  const selected = wanted.filter((file) => files.includes(file));
  return [...selected, ...files.filter((file) => file.startsWith("docs/")).slice(0, 12)]
    .filter((file, index, all) => all.indexOf(file) === index)
    .slice(0, 16);
}

function ageMs(timestamp) {
  return timestamp ? Date.now() - new Date(timestamp).getTime() : Number.POSITIVE_INFINITY;
}

function operatingRepoDirty() {
  try {
    const output = execFileSync("git", ["status", "--short"], {
      cwd: process.cwd(),
      encoding: "utf8",
      stdio: ["ignore", "pipe", "pipe"],
    }).trim();
    return {
      dirty: output.length > 0,
      dirtyCount: output ? output.split(/\r?\n/).filter(Boolean).length : 0,
      sample: output ? output.split(/\r?\n/).filter(Boolean).slice(0, 8) : [],
      error: null,
    };
  } catch (error) {
    return {
      dirty: true,
      dirtyCount: null,
      sample: [],
      error: error instanceof Error ? error.message : String(error),
    };
  }
}

async function ensureLabel(companyId, labelsByName, name, color) {
  const existing = labelsByName.get(name);
  if (existing) return existing;
  const created = await request("POST", `/api/companies/${companyId}/labels`, { name, color });
  labelsByName.set(name, created);
  return created;
}

async function ensureProject(companyId, projectsByName, agentsByName, projectName, projectRoot) {
  const names = projectAliases.get(projectName) ?? [projectName];
  const aliasMatches = names.map((name) => projectsByName.get(name)).filter(Boolean);
  const existing = aliasMatches.find((project) => !project.archivedAt) ?? aliasMatches[0] ?? null;
  const lead = agentsByName.get(projectManagerName(projectName)) ?? agentsByName.get("Portfolio Director") ?? null;
  if (existing) {
    if (existing.archivedAt && apply) {
      const updated = await request("PATCH", `/api/projects/${existing.id}`, {
        archivedAt: null,
        status: existing.status ?? "planned",
        leadAgentId: existing.leadAgentId ?? lead?.id ?? null,
      });
      projectsByName.set(updated.name, updated);
      return { project: updated, action: "unarchived_project" };
    }
    return { project: existing, action: existing.archivedAt ? "would_unarchive_project" : "noop_existing_project" };
  }

  const input = {
    name: projectName,
    description: `Autonomous takeover board for ${projectName}. Local source: ${projectRoot}. First mission: collect known-state evidence before implementation.`,
    status: "planned",
    leadAgentId: lead?.id ?? null,
    color: "#4f7cff",
    workspace: {
      name: `${projectName} local workspace`,
      sourceType: "local_path",
      cwd: projectRoot,
      isPrimary: true,
      visibility: "default",
      metadata: {
        source: "softwarehouse-known-state-harvester",
      },
    },
  };
  if (!apply) return { project: { id: null, name: projectName, archivedAt: null }, action: "would_create_project" };
  const created = await request("POST", `/api/companies/${companyId}/projects`, input);
  projectsByName.set(created.name, created);
  return { project: created, action: "created_project" };
}

async function ensurePrimaryWorkspace(project, projectName, projectRoot) {
  const preparationOnly = isPreparationOnlyProject(projectName);
  const workspaces = await request("GET", `/api/projects/${project.id}/workspaces`);
  const existing = workspaces.find((workspace) => workspace.isPrimary)
    ?? workspaces.find((workspace) => workspace.cwd === projectRoot)
    ?? workspaces[0]
    ?? null;
  const input = {
    name: existing?.name ?? `${projectName} local workspace`,
    sourceType: "local_path",
    cwd: projectRoot,
    isPrimary: true,
    visibility: "default",
    metadata: {
      ...(existing?.metadata ?? {}),
      source: "softwarehouse-known-state-harvester",
      preparationOnly,
    },
    runtimeConfig: {
      ...(existing?.runtimeConfig ?? {}),
      desiredState: "manual",
      workspaceRuntime: {
        ...(existing?.runtimeConfig?.workspaceRuntime ?? {}),
        evidenceRequiredBeforeDone: true,
        preparationOnly,
      },
    },
  };
  if (existing) return request("PATCH", `/api/projects/${project.id}/workspaces/${existing.id}`, input);
  return request("POST", `/api/projects/${project.id}/workspaces`, input);
}

async function ensureWorkspacePolicy(project, projectName, projectRoot) {
  if (!project.id) return { project, action: "noop_no_project_id" };
  const primaryWorkspace = project.primaryWorkspace
    ?? project.workspaces?.find((workspace) => workspace.isPrimary)
    ?? project.workspaces?.[0]
    ?? null;
  const workspaceDrifted = primaryWorkspace?.cwd !== projectRoot
    || primaryWorkspace?.name !== `${projectName} local workspace`;
  if (!apply) {
    if (!project.executionWorkspacePolicy?.enabled) return { project, action: "would_enable_workspace_policy" };
    return {
      project,
      action: workspaceDrifted ? "would_reconcile_project_workspace" : "noop_workspace_policy_enabled",
    };
  }
  const workspace = await ensurePrimaryWorkspace(project, projectName, projectRoot);
  const preparationOnly = isPreparationOnlyProject(projectName);
  if (project.executionWorkspacePolicy?.enabled
    && project.executionWorkspacePolicy.defaultProjectWorkspaceId === workspace.id
    && project.executionWorkspacePolicy?.runtimePolicy?.preparationOnly === preparationOnly
    && !workspaceDrifted) {
    return { project, action: "noop_workspace_policy_enabled" };
  }
  const updated = await request("PATCH", `/api/projects/${project.id}`, {
    executionWorkspacePolicy: {
      ...(project.executionWorkspacePolicy ?? {}),
      enabled: true,
      defaultMode: "shared_workspace",
      allowIssueOverride: true,
      defaultProjectWorkspaceId: workspace.id,
      workspaceStrategy: {
        ...(project.executionWorkspacePolicy?.workspaceStrategy ?? {}),
        type: "project_primary",
        branchTemplate: "agent/{issueIdentifier}-{slug}",
      },
      branchPolicy: {
        ...(project.executionWorkspacePolicy?.branchPolicy ?? {}),
        requireCleanWorktreeCheck: true,
        commitPerCompletedTask: true,
      },
      runtimePolicy: {
        ...(project.executionWorkspacePolicy?.runtimePolicy ?? {}),
        evidenceRequiredBeforeDone: true,
        preparationOnly,
      },
    },
  });
  return {
    project: updated,
    action: project.executionWorkspacePolicy?.enabled ? "reconciled_workspace_policy" : "enabled_workspace_policy",
  };
}

function knownStateIssueInput({ project, projectName, projectRoot, files, agentsByName, labelsByName, goal }) {
  const manager = agentsByName.get(projectManagerName(projectName))
    ?? agentsByName.get("Portfolio Director")
    ?? agentsByName.get("CTO Architect")
    ?? null;
  const labelIds = ["known-state", "architecture", "evidence", "takeover", projectName.toLowerCase()]
    .map((name) => labelsByName.get(name)?.id)
    .filter(Boolean);
  const docsCount = files.filter((file) => file.startsWith("docs/")).length;
  const testCount = files.filter((file) => /(^|\/)(test|tests|__tests__|specs?)(\/|$)|\.(test|spec)\./i.test(file)).length;
  const packageFiles = files.filter((file) => /(^|\/)package\.json$|pnpm-workspace\.yaml$|requirements\.txt$|pyproject\.toml$|Cargo\.toml$/.test(file));
  const important = sampleImportantFiles(files);

  return {
    title: `[${projectName}] ${titleSuffix}`,
    description: [
      "softwarehouse-known-state-harvester:v1",
      "",
      "Purpose:",
      "Build the project truth before coding. This lane is not a feature implementation lane. It must collect and link evidence until the project has an honest map of what works, what fails, and what is unknown.",
      "",
      "Local project:",
      `- root: ${projectRoot}`,
      `- sampled file count: ${files.length}`,
      `- docs files: ${docsCount}`,
      `- test/spec files: ${testCount}`,
      `- package/runtime files: ${packageFiles.join(", ") || "none detected in sample"}`,
      `- important files: ${important.join(", ") || "none detected"}`,
      "",
      "Required scan:",
      `- run or request the architectural awareness refresh for this repo: \`node scripts/build-architecture-awareness-index.mjs --project ${projectName} --root ${projectRoot}\` from Paperclip_Softwarehouse when safe, or explicitly report why the graph cannot be refreshed;`,
      "- read `docs/graphs/architecture-health.json`, `docs/graphs/architecture-proof-register.csv`, `docs/status/architecture-dependency-report.md`, `docs/status/architecture-ownership-report.md`, and `docs/status/task-synchronization-report.md` when present;",
      "- identify stack, apps/packages/services, runtime scripts, tests, deployment hints, docs, history, generated artifacts, and unknown/legacy folders;",
      "- build or refresh the project status picture: product capabilities, architecture layers, UI routes, API endpoints, data models, jobs, integrations, tests, docs, and operations;",
      "- for each important capability record status: planned, in_progress, implemented, tested, verified, blocked, deprecated, or unknown;",
      "- link evidence: paths, commands, logs, screenshots if available, commits if relevant, docs, and open blockers;",
      "- separate safe local evidence collection from protected actions such as live account mutation, deploy, restart, protected smoke, push, or secret access;",
      "- convert unknowns into the smallest owner-scoped follow-up issues with expected proof and dependency notes.",
      "",
      "Output expected in Paperclip:",
      "- architectural awareness status: exports fresh/missing/stale, top health signals, and graph refresh command/result;",
      "- project known-state summary comment;",
      "- top gaps and risks;",
      "- feature/function/test/document evidence links;",
      "- at most 5 follow-up issues per pass, each with one owner and one evidence contract;",
      "- explicit decision whether next work is PM, architecture, backend, frontend, QA, docs, security, ops, or blocked by external/protected input.",
      "- source-control closure: if this lane creates or changes files, do not mark it done until it records a local commit hash, a linked open source-control closure sidecar, or a concrete no-commit blocker with affected paths plus a linked open non-terminal owner issue.",
      "",
      "Do not:",
      "- guess that a feature works because code exists;",
      "- code a feature before the affected flow and regression risk are named;",
      "- push, deploy, restart, mutate production, run protected smoke, or print secrets from this lane.",
    ].join("\n"),
    status: "todo",
    priority: priorityFor(projectName),
    requestDepth: 2,
    projectId: project.id,
    goalId: goal?.id ?? null,
    assigneeAgentId: manager?.id ?? null,
    labelIds,
    acceptanceCriteria: [
      "The project has an honest works/fails/unknown map for important capabilities.",
      "Architecture awareness exports are refreshed or the lane records a concrete blocker explaining why they cannot be refreshed.",
      "Task/entity/proof gaps from the architecture health reports are summarized.",
      "Evidence links point to files, commands, docs, screenshots/logs, commits, or blockers.",
      "Unknowns are converted into narrow follow-up issues with owner and proof contract.",
      "Any local file changes are either locally committed, linked to an open source-control closure sidecar, or blocked with affected paths and a linked open non-terminal owner issue.",
      "No protected action, push, deploy, restart, production mutation, or secret disclosure occurs.",
    ],
  };
}

function knownStateRefreshIssueInput({ project, projectName, projectRoot, files, agentsByName, labelsByName, goal, sourceIssue }) {
  const input = knownStateIssueInput({ project, projectName, projectRoot, files, agentsByName, labelsByName, goal });
  const manager = agentsByName.get(projectManagerName(projectName))
    ?? agentsByName.get("Portfolio Director")
    ?? agentsByName.get("CTO Architect")
    ?? null;
  return {
    ...input,
    title: `[${projectName}] ${refreshTitleSuffix}`,
    description: [
      "softwarehouse-known-state-refresh:v1",
      "",
      `Source known-state lane: ${sourceIssue.identifier} ${sourceIssue.title}`,
      `Local project: ${projectRoot}`,
      "",
      "Purpose:",
      "The baseline lane is not currently runnable, but the project may still have safe local evidence work. Refresh only the delta needed to turn 'nothing is happening' into concrete owner-scoped repair issues.",
      "",
      "Required scan:",
      `- refresh or inspect the architectural awareness layer for this repo: \`node scripts/build-architecture-awareness-index.mjs --project ${projectName} --root ${projectRoot}\` from Paperclip_Softwarehouse when safe;`,
      "- compare graph health against the prior baseline and report changed/missing/stale proof links;",
      "- identify the highest-impact broken or unknown user-facing flows;",
      "- prove each flow as works, fails, unknown, or blocked with local evidence;",
      "- inspect docs/architecture/test/runtime hints that explain the current failure;",
      "- create or update the smallest follow-up repair issues with owner, scope, files, validation, and expected proof;",
      "- explicitly separate local repair work from protected gates.",
      "",
      "Allowed:",
      "- local file/doc/test/script inspection;",
      "- non-production local validation that does not require live credentials;",
      "- issue creation/status comments with evidence;",
      "- local repo mutation only if the follow-up issue explicitly owns that implementation scope and protected actions stay forbidden.",
      "",
      "Forbidden:",
      "- push;",
      "- deploy;",
      "- restart;",
      "- protected smoke/live account mutation;",
      "- secret disclosure.",
      "",
      "Output expected in Paperclip:",
      "- architecture delta: missing/stale exports, health signal changes, and task/entity gaps;",
      "- concise works/fails/unknown delta;",
      "- links to evidence paths/commands/logs;",
      "- next legal repair lane(s) with one owner and one proof contract;",
      "- commit/no-commit decision if any local files are changed.",
      "- if files changed, one closure proof before `done`: local commit hash, linked source-control closure sidecar, or concrete no-commit blocker with affected paths and a linked open non-terminal owner issue.",
    ].join("\n"),
    assigneeAgentId: manager?.id ?? input.assigneeAgentId ?? null,
    requestDepth: 2,
    acceptanceCriteria: [
      "A fresh works/fails/unknown delta is posted for the source known-state lane.",
      "Architecture awareness exports are refreshed or the lane records a concrete blocker explaining why they cannot be refreshed.",
      "Task/entity/proof deltas are reflected in next legal repair issues.",
      "At least one concrete next legal repair issue is created or an evidence-backed reason is given why none is legal.",
      "Any local file changes are either locally committed, linked to an open source-control closure sidecar, or blocked with affected paths and a linked open non-terminal owner issue.",
      "Protected actions remain fail-closed: no push, deploy, restart, protected smoke, production mutation, or secret disclosure.",
      "Every recommendation has owner, scope, validation, and expected proof.",
    ],
  };
}

function knownStateRefreshState({ issues, projectId, projectName }) {
  const refreshTitle = `[${projectName}] ${refreshTitleSuffix}`;
  const existingRefresh = issues.find((issue) =>
    issue.projectId === projectId
    && issue.title === refreshTitle
    && !terminalStatuses.has(issue.status)
  );
  const recentTerminalRefresh = issues
    .filter((issue) =>
      issue.projectId === projectId
      && issue.title === refreshTitle
      && terminalStatuses.has(issue.status)
    )
    .sort((left, right) => String(right.updatedAt).localeCompare(String(left.updatedAt)))[0] ?? null;
  const refreshCooldownActive = Boolean(
    recentTerminalRefresh && ageMs(recentTerminalRefresh.updatedAt) <= recentKnownStateRefreshWindowMs
  );
  return { refreshTitle, existingRefresh, recentTerminalRefresh, refreshCooldownActive };
}

function liveRunCountsByAgent(liveRuns) {
  const counts = new Map();
  for (const run of liveRuns) {
    if (!run.agentId) continue;
    counts.set(run.agentId, (counts.get(run.agentId) ?? 0) + 1);
  }
  return counts;
}

function chooseAvailableAgent(projectName, agentsByName, busyAgentIds) {
  const preferred = [
    projectManagerName(projectName),
    "Portfolio Director",
    "CTO Architect",
    "Engineering Delivery Lead",
    "Docs Memory Lead",
  ];
  for (const name of preferred) {
    const agent = agentsByName.get(name);
    if (agent && !busyAgentIds.has(agent.id)) return agent;
  }
  return agentsByName.get(projectManagerName(projectName))
    ?? agentsByName.get("Portfolio Director")
    ?? agentsByName.get("CTO Architect")
    ?? null;
}

function projectHasActiveWork(projectId, liveProjectIds) {
  return Boolean(projectId && liveProjectIds.has(projectId));
}

function shouldDeferForActiveWork({ activeRunCount, unknownActiveRunCount, project, assigneeId, liveProjectIds, busyAgentIds }) {
  if (activeRunCount <= 0) return false;
  return unknownActiveRunCount > 0
    || projectHasActiveWork(project?.id, liveProjectIds)
    || Boolean(assigneeId && busyAgentIds.has(assigneeId));
}

async function resolveCompany() {
  if (companyId) return { id: companyId, source: "PAPERCLIP_COMPANY_ID" };

  const companies = await request("GET", "/api/companies");
  const company = companies.find((candidate) => candidate.name === companyName);
  if (!company) throw new Error(`Company not found: ${companyName}`);
  return { id: company.id, source: "company_name" };
}

const company = await resolveCompany();

const operatingRepoState = operatingRepoDirty();
if (operatingRepoState.dirty) {
  console.log(JSON.stringify({
    apiBase,
    company: { id: company.id, name: company.name },
    mode: apply ? "apply" : "dry-run",
    targetProjects,
    activeRunCount: null,
    liveRunCount: null,
    unknownActiveRunCount: null,
    maxCreate,
    createdOrWoken: 0,
    operatingRepoState,
    actions: [{
      action: "noop_operating_repo_dirty",
      dirtyCount: operatingRepoState.dirtyCount,
      sample: operatingRepoState.sample,
      error: operatingRepoState.error,
    }],
  }, null, 2));
  process.exit(0);
}

const [health, liveRuns] = await Promise.all([
  request("GET", "/api/health"),
  request("GET", `/api/companies/${company.id}/live-runs`),
]);
const activeRunCount = health.devServer?.activeRunCount ?? liveRuns.length;
const unknownActiveRunCount = Math.max(0, activeRunCount - liveRuns.length);
if (activeRunCount > 0) {
  console.log(JSON.stringify({
    apiBase,
    company: { id: company.id, name: company.name },
    mode: apply ? "apply" : "dry-run",
    targetProjects,
    activeRunCount,
    liveRunCount: liveRuns.length,
    unknownActiveRunCount,
    requestTimeoutMs,
    maxCreate,
    createdOrWoken: 0,
    actions: [{
      action: "noop_active_runs",
      activeRunCount,
      liveRunCount: liveRuns.length,
      unknownActiveRunCount,
    }],
  }, null, 2));
  process.exit(0);
}

const [agents, projects, goals, labels, issues] = await Promise.all([
  request("GET", `/api/companies/${company.id}/agents`),
  request("GET", `/api/companies/${company.id}/projects`),
  request("GET", `/api/companies/${company.id}/goals`),
  request("GET", `/api/companies/${company.id}/labels`),
  request("GET", `/api/companies/${company.id}/issues?status=${issueStatuses.join(",")}&limit=2000`),
]);
const issueById = new Map(issues.map((issue) => [issue.id, issue]));
const liveProjectIds = new Set(liveRuns
  .map((run) => issueById.get(run.issueId)?.projectId)
  .filter(Boolean));
const busyAgentIds = new Set(
  Array.from(liveRunCountsByAgent(liveRuns).entries())
    .filter(([, count]) => count > 0)
    .map(([agentId]) => agentId),
);
const projectsByName = new Map(projects.map((project) => [project.name, project]));
const activeAgents = agents.filter((agent) => agent.status !== "terminated");
const agentsByName = buildAgentLookup(activeAgents);
const labelsByName = new Map(labels.map((label) => [label.name, label]));
for (const [name, color] of [
  ["known-state", "#7c3aed"],
  ["architecture", "#475569"],
  ["evidence", "#0f766e"],
  ["takeover", "#2563eb"],
  ["soar", "#0f766e"],
  ["roost", "#7c2d12"],
  ["personality", "#db2777"],
  ["nest", "#0891b2"],
]) {
  await ensureLabel(company.id, labelsByName, name, color);
}

const goal = goals.find((candidate) => candidate.title === "Softwarehouse operating cadence")
  ?? goals.find((candidate) => candidate.title === "AI-native software development organization")
  ?? null;

const actions = [];
let createdOrWoken = 0;
const idleRefreshCandidates = [];
for (const projectName of targetProjects) {
  const projectRoot = path.join(appsRoot, projectName);
  const exists = await pathExists(projectRoot);
  if (!exists) {
    actions.push({ action: "skip_missing_local_project", project: projectName, projectRoot });
    continue;
  }

  const files = await countFiles(projectRoot);
  const ensure = await ensureProject(company.id, projectsByName, agentsByName, projectName, projectRoot);
  const policy = await ensureWorkspacePolicy(ensure.project, projectName, projectRoot);
  actions.push({ action: ensure.action, project: projectName, archivedAt: ensure.project.archivedAt ?? null });
  actions.push({ action: policy.action, project: projectName, archivedAt: policy.project.archivedAt ?? null });
  ensure.project = policy.project;
  if (!ensure.project.id) continue;

  const title = `[${projectName}] ${titleSuffix}`;
  const existing = issues.find((issue) =>
    issue.projectId === ensure.project.id
    && issue.title === title
    && !terminalStatuses.has(issue.status)
  );
  if (existing) {
    const { existingRefresh, recentTerminalRefresh, refreshCooldownActive } = knownStateRefreshState({
      issues,
      projectId: ensure.project.id,
      projectName,
    });

    if (refreshableStatuses.has(existing.status) && !existingRefresh && !refreshCooldownActive) {
      const availableAssignee = chooseAvailableAgent(projectName, agentsByName, busyAgentIds);
      if (shouldDeferForActiveWork({
        activeRunCount,
        unknownActiveRunCount,
        project: ensure.project,
        assigneeId: availableAssignee?.id ?? null,
        liveProjectIds,
        busyAgentIds,
      })) {
        actions.push({
          action: "defer_known_state_refresh_active_runs",
          project: projectName,
          sourceIdentifier: existing.identifier,
          activeRunCount,
          liveRunCount: liveRuns.length,
          unknownActiveRunCount,
        });
        continue;
      }
      if (createdOrWoken >= maxCreate) {
        actions.push({ action: "defer_known_state_refresh_batch_limit", project: projectName, sourceIdentifier: existing.identifier, maxCreate });
        continue;
      }

      const input = knownStateRefreshIssueInput({
        project: ensure.project,
        projectName,
        projectRoot,
        files,
        agentsByName,
        labelsByName,
        goal,
        sourceIssue: existing,
      });
      if (availableAssignee) {
        input.assigneeAgentId = availableAssignee.id;
      }
      actions.push({
        action: apply ? "created_known_state_refresh_lane" : "would_create_known_state_refresh_lane",
        project: projectName,
        sourceIdentifier: existing.identifier,
        title: input.title,
        assignee: agents.find((agent) => agent.id === input.assigneeAgentId)?.name ?? null,
        sampledFileCount: files.length,
      });
      if (apply) {
        const created = await request("POST", `/api/companies/${company.id}/issues`, input);
        const freshWip = await fetchAgentWipState({ request, companyId: company.id });
        const wakeBlocker = agentWipBlockerFor(created.assigneeAgentId, freshWip);
        await request("POST", `/api/issues/${created.id}/comments`, {
          body: [
            "softwarehouse-known-state-refresh-wakeup:v1",
            "",
            `Created because ${existing.identifier} is ${existing.status}; continue with safe local evidence gathering instead of waiting silently.`,
            "Use this lane to produce concrete next legal repair issues with owner/scope/evidence.",
          ].join("\n"),
          resume: !wakeBlocker,
        });
        actions.at(-1).identifier = created.identifier;
        actions.at(-1).status = created.status;
        if (wakeBlocker) {
          actions.at(-1).wakeSkipped = wakeBlocker;
          actions.at(-1).activeRunCount = freshWip.activeRunCount;
          actions.at(-1).liveRunCount = freshWip.liveRunCount;
          actions.at(-1).unknownActiveRunCount = freshWip.unknownActiveRunCount;
        }
        if (input.assigneeAgentId) busyAgentIds.add(input.assigneeAgentId);
      }
      createdOrWoken += 1;
      continue;
    }

    if (!existingRefresh && !refreshCooldownActive) {
      idleRefreshCandidates.push({
        project: ensure.project,
        projectName,
        projectRoot,
        files,
        sourceIssue: existing,
        sourceUpdatedAt: existing.updatedAt,
        reason: `existing_${existing.status}_known_state_lane`,
      });
    }

    actions.push({
      action: "noop_existing_known_state_lane",
      project: projectName,
      identifier: existing.identifier,
      status: existing.status,
      assigneeAgentId: existing.assigneeAgentId ?? null,
      refreshIdentifier: existingRefresh?.identifier ?? null,
      refreshCooldownUntilRecentMs: refreshCooldownActive ? recentKnownStateRefreshWindowMs : null,
    });
    continue;
  }
  const recentTerminal = issues
    .filter((issue) =>
      issue.projectId === ensure.project.id
      && issue.title === title
      && terminalStatuses.has(issue.status)
    )
    .sort((left, right) => String(right.updatedAt).localeCompare(String(left.updatedAt)))[0] ?? null;
  if (recentTerminal && ageMs(recentTerminal.updatedAt) <= recentKnownStateWindowMs) {
    const { existingRefresh, refreshCooldownActive } = knownStateRefreshState({
      issues,
      projectId: ensure.project.id,
      projectName,
    });
    if (!existingRefresh && !refreshCooldownActive) {
      idleRefreshCandidates.push({
        project: ensure.project,
        projectName,
        projectRoot,
        files,
        sourceIssue: recentTerminal,
        sourceUpdatedAt: recentTerminal.updatedAt,
        reason: `recent_${recentTerminal.status}_known_state_lane`,
      });
    }
    actions.push({
      action: "noop_recent_known_state_lane",
      project: projectName,
      identifier: recentTerminal.identifier,
      status: recentTerminal.status,
      updatedAt: recentTerminal.updatedAt,
      recentKnownStateWindowMs,
      idleRefreshEligible: !existingRefresh && !refreshCooldownActive,
    });
    continue;
  }

  const availableAssignee = chooseAvailableAgent(projectName, agentsByName, busyAgentIds);
  if (shouldDeferForActiveWork({
    activeRunCount,
    unknownActiveRunCount,
    project: ensure.project,
    assigneeId: availableAssignee?.id ?? null,
    liveProjectIds,
    busyAgentIds,
  })) {
    actions.push({
      action: "defer_known_state_lane_active_runs",
      project: projectName,
      activeRunCount,
      liveRunCount: liveRuns.length,
      unknownActiveRunCount,
    });
    continue;
  }
  if (createdOrWoken >= maxCreate) {
    actions.push({ action: "defer_known_state_lane_batch_limit", project: projectName, maxCreate });
    continue;
  }

  const input = knownStateIssueInput({
    project: ensure.project,
    projectName,
    projectRoot,
    files,
    agentsByName,
    labelsByName,
    goal,
  });
  if (availableAssignee) {
    input.assigneeAgentId = availableAssignee.id;
  }
  actions.push({
    action: apply ? "created_known_state_lane" : "would_create_known_state_lane",
    project: projectName,
    title: input.title,
    assignee: agents.find((agent) => agent.id === input.assigneeAgentId)?.name ?? null,
    sampledFileCount: files.length,
  });
  if (apply) {
    const created = await request("POST", `/api/companies/${company.id}/issues`, input);
    const freshWip = await fetchAgentWipState({ request, companyId: company.id });
    const wakeBlocker = agentWipBlockerFor(created.assigneeAgentId, freshWip);
    await request("POST", `/api/issues/${created.id}/comments`, {
      body: [
        "softwarehouse-known-state-wakeup:v1",
        "",
        "Start with local evidence collection and convert findings into concrete next repair lanes.",
        "Do not push, deploy, restart, run protected smoke, mutate production, or disclose secrets.",
      ].join("\n"),
      resume: !wakeBlocker,
    });
    actions.at(-1).identifier = created.identifier;
    actions.at(-1).status = created.status;
    if (wakeBlocker) {
      actions.at(-1).wakeSkipped = wakeBlocker;
      actions.at(-1).activeRunCount = freshWip.activeRunCount;
      actions.at(-1).liveRunCount = freshWip.liveRunCount;
      actions.at(-1).unknownActiveRunCount = freshWip.unknownActiveRunCount;
    }
    if (input.assigneeAgentId) busyAgentIds.add(input.assigneeAgentId);
  }
  createdOrWoken += 1;
}

if (createdOrWoken === 0 && idleRefreshCandidates.length > 0) {
  const candidate = idleRefreshCandidates
    .filter((item) => {
      const availableAssignee = chooseAvailableAgent(item.projectName, agentsByName, busyAgentIds);
      return !shouldDeferForActiveWork({
        activeRunCount,
        unknownActiveRunCount,
        project: item.project,
        assigneeId: availableAssignee?.id ?? null,
        liveProjectIds,
        busyAgentIds,
      });
    })
    .sort((left, right) =>
      String(left.sourceUpdatedAt ?? "").localeCompare(String(right.sourceUpdatedAt ?? ""))
      || targetProjects.indexOf(left.projectName) - targetProjects.indexOf(right.projectName)
    )[0];
  if (candidate) {
  const input = knownStateRefreshIssueInput({
    project: candidate.project,
    projectName: candidate.projectName,
    projectRoot: candidate.projectRoot,
    files: candidate.files,
    agentsByName,
    labelsByName,
    goal,
    sourceIssue: candidate.sourceIssue,
  });
  const availableAssignee = chooseAvailableAgent(candidate.projectName, agentsByName, busyAgentIds);
  if (availableAssignee) {
    input.assigneeAgentId = availableAssignee.id;
  }
  actions.push({
    action: apply ? "created_idle_known_state_refresh_lane" : "would_create_idle_known_state_refresh_lane",
    project: candidate.projectName,
    sourceIdentifier: candidate.sourceIssue.identifier,
    title: input.title,
    assignee: agents.find((agent) => agent.id === input.assigneeAgentId)?.name ?? null,
    reason: candidate.reason,
    sampledFileCount: candidate.files.length,
  });
  if (apply) {
    const created = await request("POST", `/api/companies/${company.id}/issues`, input);
    const freshWip = await fetchAgentWipState({ request, companyId: company.id });
    const wakeBlocker = agentWipBlockerFor(created.assigneeAgentId, freshWip);
    await request("POST", `/api/issues/${created.id}/comments`, {
      body: [
        "softwarehouse-idle-known-state-refresh-wakeup:v1",
        "",
        "Created because the portfolio control loop was idle while this project has a recent/blocked baseline that can still be refreshed safely.",
        `Source lane: ${candidate.sourceIssue.identifier} ${candidate.sourceIssue.title}`,
        "Produce concrete next legal repair issues or an evidence-backed reason why no local work is legal.",
      ].join("\n"),
      resume: !wakeBlocker,
    });
    actions.at(-1).identifier = created.identifier;
    actions.at(-1).status = created.status;
    if (wakeBlocker) {
      actions.at(-1).wakeSkipped = wakeBlocker;
      actions.at(-1).activeRunCount = freshWip.activeRunCount;
      actions.at(-1).liveRunCount = freshWip.liveRunCount;
      actions.at(-1).unknownActiveRunCount = freshWip.unknownActiveRunCount;
    }
  }
  createdOrWoken += 1;
  }
}

console.log(JSON.stringify({
  apiBase,
  company: { id: company.id, name: company.name },
  mode: apply ? "apply" : "dry-run",
  targetProjects,
  activeRunCount,
  liveRunCount: liveRuns.length,
  unknownActiveRunCount,
  maxCreate,
  createdOrWoken,
  actions,
}, null, 2));
