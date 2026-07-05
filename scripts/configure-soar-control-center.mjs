import path from "node:path";
import { fileURLToPath } from "node:url";
import { softwarehousePilotActiveRoutineTitles } from "./lib/softwarehouse-active-routines.mjs";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(__dirname, "..");
const appsRoot = path.resolve(root, "..");
const apiBase = process.env.PAPERCLIP_API_URL ?? "http://127.0.0.1:3200";
const companyName = "LuckySparrow Software House";
const localCodexCommand = path.join(root, "scripts", "codex.cmd");

const activeRoutineTitles = softwarehousePilotActiveRoutineTitles;

const parallelExecutionPolicy = [
  "",
  "",
  "Parallel execution policy: Paperclip may run independent Soar lanes in parallel according to agent/runtime limits.",
  "Do not impose a global one-lane or five-lane cap. PM/Delivery should prevent duplicate work, dependency conflicts, and unsafe production mutations.",
  "Per-agent WIP limit: one agent may have only one active execution lane at a time. Shared specialists must finish, block, delegate, or hand off the current lane before taking another project request.",
  "Soar Project Manager owns Soar context and must delegate staged work through one-owner child issues instead of bundling many unrelated tasks into one run.",
  "Done issues stay done unless explicit reopen/resume intent moves them through todo before live checkout.",
].join("\n");

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

function byName(items, name) {
  return items.find((item) => item.name === name);
}

function byNameOrUrlKey(items, names, urlKeys = []) {
  return items.find((item) => names.includes(item.name) || urlKeys.includes(item.urlKey));
}

function byTitle(items, title) {
  return items.find((item) => item.title === title);
}

function withParallelExecutionPolicy(description) {
  if (description.includes("Parallel execution policy:")) return description;
  const withoutOldPolicy = description.replace(/\n\nCapacity governor:[\s\S]*?Done issues stay done unless explicit reopen\/resume intent moves them through todo before live checkout\./g, "");
  return `${withoutOldPolicy}${parallelExecutionPolicy}`;
}

async function getContext() {
  const companies = await request("GET", "/api/companies");
  const company = companies.find((candidate) => candidate.name === companyName);
  if (!company) throw new Error(`Company not found: ${companyName}`);

  const [agents, projects] = await Promise.all([
    request("GET", `/api/companies/${company.id}/agents/`),
    request("GET", `/api/companies/${company.id}/projects`),
  ]);
  const soar = byName(projects, "Soar");
  const operating = byNameOrUrlKey(projects, ["Softwarehouse Operating System", "Softwarehouse"], ["softwarehouse"]);
  if (!soar || !operating) throw new Error("Run configure-soar-pilot.mjs first.");

  return { company, agents, projects, soar, operating };
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

async function ensureIssue(companyId, issuesByTitle, input) {
  const existing = issuesByTitle.get(input.title);
  if (existing) {
    const patch = ["done", "cancelled"].includes(existing.status)
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

async function ensureChildIssue(parentIssue, issuesByTitle, input) {
  const existing = issuesByTitle.get(input.title);
  if (existing) {
    const patch = ["done", "cancelled"].includes(existing.status)
      ? { ...input, status: existing.status }
      : input;
    const updated = await request("PATCH", `/api/issues/${existing.id}`, {
      ...patch,
      parentId: parentIssue.id,
    });
    issuesByTitle.set(input.title, updated);
    return updated;
  }
  const created = await request("POST", `/api/issues/${parentIssue.id}/children`, input);
  issuesByTitle.set(input.title, created);
  return created;
}

async function ensureRoutine(companyId, routinesByTitle, input) {
  const existing = routinesByTitle.get(input.title);
  if (existing) {
    const updated = await request("PATCH", `/api/routines/${existing.id}`, input);
    routinesByTitle.set(input.title, updated);
    return updated;
  }
  const created = await request("POST", `/api/companies/${companyId}/routines`, input);
  routinesByTitle.set(input.title, created);
  return created;
}

async function ensureScheduleTrigger(routineId, input) {
  const detail = await request("GET", `/api/routines/${routineId}`);
  const existing = detail.triggers?.find((trigger) => trigger.kind === "schedule" && trigger.label === input.label);
  if (existing) {
    return request("PATCH", `/api/routine-triggers/${existing.id}`, input);
  }
  return request("POST", `/api/routines/${routineId}/triggers`, {
    kind: "schedule",
    ...input,
  });
}

async function disableScheduleTriggerByLabel(routineId, label) {
  const detail = await request("GET", `/api/routines/${routineId}`);
  const existing = detail.triggers?.find((trigger) => trigger.kind === "schedule" && trigger.label === label);
  if (!existing || existing.enabled === false) return existing ?? null;
  return request("PATCH", `/api/routine-triggers/${existing.id}`, {
    label: existing.label,
    enabled: false,
    cronExpression: existing.cronExpression,
    timezone: existing.timezone,
  });
}

async function upsertDocument(issueId, key, title, body) {
  const docs = await request("GET", `/api/issues/${issueId}/documents`);
  const existing = docs.find((doc) => doc.key === key);
  return request("PUT", `/api/issues/${issueId}/documents/${encodeURIComponent(key)}`, {
    title,
    format: "markdown",
    body,
    changeSummary: "Refresh Soar control-center document",
    baseRevisionId: existing?.latestRevisionId ?? undefined,
  });
}

async function ensureWorkProduct(issueId, input) {
  const existing = await request("GET", `/api/issues/${issueId}/work-products`);
  const match = existing.find((item) => item.title === input.title && item.provider === input.provider);
  if (match) return request("PATCH", `/api/work-products/${match.id}`, input);
  return request("POST", `/api/issues/${issueId}/work-products`, input);
}

async function ensurePrimaryWorkspace(projectId, input) {
  const workspaces = await request("GET", `/api/projects/${projectId}/workspaces`);
  const existing = workspaces.find((workspace) => workspace.name === input.name) ?? workspaces.find((workspace) => workspace.isPrimary);
  if (existing) return request("PATCH", `/api/projects/${projectId}/workspaces/${existing.id}`, input);
  return request("POST", `/api/projects/${projectId}/workspaces`, { ...input, isPrimary: true });
}

async function ensureAgentCommand(agent) {
  if (!agent || agent.adapterType !== "codex_local") return agent;
  const normalModelFallback = "gpt-5.5";
  const cheapModelFallback = "gpt-5.4";
  const currentModel = typeof agent.adapterConfig?.model === "string" ? agent.adapterConfig.model : "";
  const normalizedModel = currentModel === "gpt-5" || currentModel === "gpt-5-mini" || currentModel === "gpt-5.3-codex" || currentModel.includes("spark")
    ? normalModelFallback
    : agent.adapterConfig?.model;
  const adapterConfig = {
    ...(agent.adapterConfig ?? {}),
    command: localCodexCommand,
    model: normalizedModel,
  };
  const cheapProfile = agent.runtimeConfig?.modelProfiles?.cheap;
  const cheapModel = typeof cheapProfile?.adapterConfig?.model === "string"
    ? cheapProfile.adapterConfig.model
    : "";
  const runtimeConfig = {
    ...(agent.runtimeConfig ?? {}),
    modelProfiles: {
      ...(agent.runtimeConfig?.modelProfiles ?? {}),
      ...(cheapProfile
        ? {
            cheap: {
              ...cheapProfile,
              adapterConfig: {
                ...(cheapProfile.adapterConfig ?? {}),
                command: localCodexCommand,
                model: cheapModel.includes("spark") || cheapModel === "gpt-5" || cheapModel === "gpt-5-mini" || cheapModel === "gpt-5.3-codex"
                  ? cheapModelFallback
                  : cheapProfile.adapterConfig?.model,
                ...((cheapModel.includes("spark") || cheapModel === "gpt-5" || cheapModel === "gpt-5-mini" || cheapModel === "gpt-5.3-codex"
                  ? cheapModelFallback
                  : cheapProfile.adapterConfig?.model) === "gpt-5.4" ? { fastMode: true } : {}),
              },
            },
          }
        : {}),
    },
  };
  return request("PATCH", `/api/agents/${agent.id}`, {
    adapterConfig,
    runtimeConfig,
    replaceAdapterConfig: true,
  });
}

const { company, agents, soar, operating } = await getContext();
const agent = {
  portfolio: byName(agents, "Portfolio Director"),
  projectManager: byName(agents, "Soar Project Manager"),
  cto: byName(agents, "CTO Architect"),
  product: byName(agents, "Product Lead"),
  delivery: byName(agents, "Engineering Delivery Lead") ?? byName(agents, "Implementation Lead"),
  frontend: byName(agents, "Frontend Engineer"),
  backend: byName(agents, "Backend API Engineer"),
  data: byName(agents, "Data Persistence Engineer"),
  integration: byName(agents, "Integration Trading Engineer"),
  aiRuntime: byName(agents, "AI Agent Runtime Engineer"),
  qa: byName(agents, "QA Regression Lead"),
  testAutomation: byName(agents, "Test Automation Engineer"),
  security: byName(agents, "Security Review Lead"),
  ops: byName(agents, "Ops Release Lead"),
  docs: byName(agents, "Docs Memory Lead"),
  ux: byName(agents, "UX Visual Lead"),
};

for (const entry of agents) await ensureAgentCommand(entry);

const labels = await request("GET", `/api/companies/${company.id}/labels`);
const labelsByName = new Map(labels.map((label) => [label.name, label]));
const labelSpecs = [
  ["pilot", "#2563eb"],
  ["soar", "#0f766e"],
  ["known-state", "#7c3aed"],
  ["commercial-readiness", "#16a34a"],
  ["legal-risk", "#dc2626"],
  ["architecture", "#475569"],
  ["product", "#0891b2"],
  ["qa", "#ea580c"],
  ["ops", "#9333ea"],
  ["docs", "#64748b"],
  ["ux", "#db2777"],
  ["implementation", "#0ea5e9"],
  ["frontend", "#0284c7"],
  ["backend", "#0369a1"],
  ["data", "#4d7c0f"],
  ["integration", "#ca8a04"],
  ["ai-runtime", "#7c3aed"],
  ["security", "#dc2626"],
  ["test-automation", "#f97316"],
  ["delivery", "#334155"],
  ["template-feedback", "#65a30d"],
  ["adapter-smoke", "#f59e0b"],
];
for (const [name, color] of labelSpecs) await ensureLabel(company.id, labelsByName, name, color);

const goals = await request("GET", `/api/companies/${company.id}/goals`);
const goalsByTitle = new Map(goals.map((goal) => [goal.title, goal]));
const topGoal = await ensureGoal(company.id, goalsByTitle, {
  title: "Soar: sellable or personally excellent product",
  description: [
    "Bring Soar to a known, usable, legally-aware, commercially-ready state.",
    "If public sale is legally blocked, optimize it until it works extremely well for personal use.",
    "No claim is accepted without evidence.",
  ].join("\n"),
  level: "company",
  status: "active",
  ownerAgentId: agent.projectManager?.id ?? agent.portfolio?.id ?? null,
});
const goalInputs = [
  ["Soar known-state baseline", agent.projectManager ?? agent.cto, "Architecture, runtime, product, QA, docs, UX, and implementation status are mapped with evidence."],
  ["Soar V1 audit-to-completion loop", agent.delivery, "Audit findings are converted into owned repair lanes, verified fixes, release gates, and explicit closure/blockers for the current V1 target."],
  ["Soar commercial readiness", agent.product, "Define what must be true before Soar can be sold or offered as app access."],
  ["Soar legal and risk readiness", agent.portfolio, "Track legal/regulatory unknowns without pretending to provide legal advice."],
  ["Soar no-regression system", agent.qa, "Create repeatable smoke and regression gates for critical workflows."],
  ["Soar production deploy confidence", agent.ops, "Coolify/VPS deploy status, rollback, production smoke, and environment safety are evidence-backed."],
  ["Template feedback from Soar pilot", agent.docs, "Reusable project-management and docs improvements flow back into !template."],
];
const goalsCreated = [];
for (const [title, owner, description] of goalInputs) {
  goalsCreated.push(await ensureGoal(company.id, goalsByTitle, {
    title,
    description,
    level: "team",
    status: "active",
    parentId: topGoal.id,
    ownerAgentId: owner?.id ?? null,
  }));
}

await request("PATCH", `/api/projects/${soar.id}`, {
  status: "in_progress",
  goalIds: [topGoal.id, ...goalsCreated.map((goal) => goal.id)],
  leadAgentId: agent.projectManager?.id ?? agent.portfolio?.id ?? null,
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
      heartbeatDisabledUntilAdapterSmokePasses: true,
      evidenceRequiredBeforeDone: true,
    },
  },
});

const soarWorkspace = await ensurePrimaryWorkspace(soar.id, {
  name: "Soar local workspace",
  sourceType: "local_path",
  cwd: path.join(appsRoot, "Soar"),
  isPrimary: true,
  visibility: "default",
  metadata: {
    docsRoot: "docs",
    documentationMap: "docs/documentation-map.md",
    workspaceBoundaryAudit: "pnpm run softwarehouse:workspace-boundary-audit",
    pilotScope: "Soar first; add future projects only after Soar control loop is proven.",
  },
  runtimeConfig: {
    desiredState: "manual",
    workspaceRuntime: {
      agentHeartbeat: "disabled_until_adapter_smoke_passes",
      evidenceRequiredBeforeDone: true,
    },
  },
});

const issues = await request("GET", `/api/companies/${company.id}/issues`);
const issuesByTitle = new Map(issues.map((issue) => [issue.title, issue]));
const labelIds = (...names) => names.map((name) => labelsByName.get(name)?.id).filter(Boolean);

const parent = await ensureIssue(company.id, issuesByTitle, {
  title: "[Soar] Full takeover audit and operating baseline",
  description: [
    "Soar is already started and needs repair, proof, and organized development.",
    "",
    "Outcome:",
    "- know exactly what works, what is broken, what is missing, and what is risky;",
    "- make it sellable as app access if law/regulation allows;",
    "- otherwise make it work extremely well for private use;",
    "- convert reusable process lessons into !template.",
    "",
    "Operating rule: every child issue must update status with evidence.",
  ].join("\n"),
  status: "todo",
  priority: "critical",
  assigneeAgentId: agent.projectManager?.id ?? agent.portfolio?.id ?? null,
  projectId: soar.id,
  goalId: topGoal.id,
  requestDepth: 3,
  labelIds: labelIds("pilot", "soar", "known-state", "commercial-readiness"),
  executionWorkspacePreference: "shared_workspace",
  executionWorkspaceId: soarWorkspace.id,
  executionWorkspaceSettings: {
    mode: "shared_workspace",
    workspaceRuntime: {
      docsRoot: "docs",
      evidenceRequiredBeforeDone: true,
      heartbeatDisabledUntilAdapterSmokePasses: true,
    },
  },
});

const childSpecs = [
  {
    key: "portfolio",
    title: "[Soar][Portfolio] Live project status and decision dashboard",
    assignee: agent.portfolio,
    goal: topGoal,
    priority: "critical",
    labels: ["pilot", "soar", "known-state"],
    criteria: [
      "Visible Paperclip status reflects current known-state.",
      "Legal/commercial unknowns are tracked without false certainty.",
      "Next project is not introduced until Soar pilot gate is met.",
    ],
  },
  {
    key: "product",
    title: "[Soar][Product] Sellable/private-use product readiness map",
    assignee: agent.product,
    goal: goalsByTitle.get("Soar commercial readiness"),
    priority: "critical",
    labels: ["product", "commercial-readiness", "legal-risk"],
    criteria: [
      "Top user workflows and acceptance criteria are listed.",
      "Commercial-readiness blockers are separated from private-use blockers.",
      "Known legal/regulatory questions are documented as questions, not conclusions.",
    ],
  },
  {
    key: "cto",
    title: "[Soar][CTO] Architecture and function-chain known-state",
    assignee: agent.cto,
    goal: goalsByTitle.get("Soar known-state baseline"),
    priority: "critical",
    labels: ["architecture", "known-state"],
    criteria: [
      "Critical workflows have code-path references.",
      "Architecture graph/doc drift is identified.",
      "Risky duplicated or unclear implementation paths are listed.",
    ],
  },
  {
    key: "qa",
    title: "[Soar][QA] Regression and smoke evidence baseline",
    assignee: agent.qa,
    goal: goalsByTitle.get("Soar no-regression system"),
    priority: "critical",
    labels: ["qa", "known-state"],
    criteria: [
      "Safe local verification commands are known.",
      "Current failures are reproducible with exact command output.",
      "Minimum release/smoke gates are proposed.",
      "Production smoke account classes are explicit: anonymous, AI/test account, subscription-state test account, and user real account only by explicit approval.",
    ],
  },
  {
    key: "ops",
    title: "[Soar][Ops] Runtime, deployment, and environment readiness",
    assignee: agent.ops,
    goal: goalsByTitle.get("Soar known-state baseline"),
    priority: "high",
    labels: ["ops", "known-state"],
    criteria: [
      "Local, Docker, VPS/Coolify paths are mapped.",
      "Required env vars/secrets are listed without exposing values.",
      "Coolify/VPS deploy status checks, source commit policy, post-deploy smoke, and rollback path are defined.",
      "Deploy blockers and rollback path are visible.",
    ],
  },
  {
    key: "docs",
    title: "[Soar][Docs] Docs/index/template feedback audit",
    assignee: agent.docs,
    goal: goalsByTitle.get("Template feedback from Soar pilot"),
    priority: "high",
    labels: ["docs", "template-feedback"],
    criteria: [
      "Soar docs inventory is current under docs/.",
      "Outdated placeholders and missing indexes are listed.",
      "Reusable improvements are proposed for !template.",
    ],
  },
  {
    key: "ux",
    title: "[Soar][UX] Primary workflow visual quality audit",
    assignee: agent.ux,
    goal: goalsByTitle.get("Soar known-state baseline"),
    priority: "high",
    labels: ["ux", "commercial-readiness"],
    criteria: [
      "Primary screens/workflows are identified.",
      "Visual and responsive evidence needs are listed.",
      "UX blockers to selling or enjoyable private use are recorded.",
    ],
  },
  {
    key: "impl",
    title: "[Soar][Delivery] Engineering breakdown and integration map",
    assignee: agent.delivery,
    goal: goalsByTitle.get("Soar no-regression system"),
    priority: "high",
    labels: ["delivery", "implementation", "qa"],
    criteria: [
      "Repair work is split by layer with one owner per issue.",
      "Dependencies between frontend, backend, data, trading, AI, QA, security, ops, docs, and UX are explicit.",
      "Delivery Lead does not implement specialist code directly.",
    ],
  },
  {
    key: "frontend",
    title: "[Soar][Frontend] View map and browser workflow ownership",
    assignee: agent.frontend,
    goal: goalsByTitle.get("Soar known-state baseline"),
    priority: "high",
    labels: ["frontend", "ux", "known-state"],
    criteria: [
      "Primary routes/views are mapped to components and client API calls.",
      "User-visible regressions are reproduced with browser evidence or exact blockers.",
      "Frontend changes stay inside UI/client ownership unless a backend contract is agreed.",
    ],
  },
  {
    key: "backend",
    title: "[Soar][Backend] API and service boundary known-state",
    assignee: agent.backend,
    goal: goalsByTitle.get("Soar known-state baseline"),
    priority: "high",
    labels: ["backend", "architecture", "known-state"],
    criteria: [
      "Critical API routes are mapped to controllers, services, validators, and tests.",
      "Authorization and error semantics are documented for frontend and QA.",
      "Backend changes avoid schema or UI side effects without explicit handoff.",
    ],
  },
  {
    key: "data",
    title: "[Soar][Data] Persistence and integrity known-state",
    assignee: agent.data,
    goal: goalsByTitle.get("Soar known-state baseline"),
    priority: "high",
    labels: ["data", "security", "known-state"],
    criteria: [
      "Core tables/models for users, sessions, API keys, orders, positions, trades, runtime, subscriptions, and audit logs are mapped.",
      "Migration/backup/restore proof gaps are listed.",
      "Data integrity and secret-handling risks are routed to Security or Backend.",
    ],
  },
  {
    key: "integration",
    title: "[Soar][Integration] Exchange and trading runtime boundary",
    assignee: agent.integration,
    goal: goalsByTitle.get("Soar known-state baseline"),
    priority: "critical",
    labels: ["integration", "commercial-readiness", "security"],
    criteria: [
      "Manual order, positions, bot runtime, exchange adapter, and market data chains are mapped.",
      "PAPER/LIVE boundaries and side-effect risks are explicit.",
      "No live mutation proof is requested without board approval and safe environment confirmation.",
    ],
  },
  {
    key: "ai-runtime",
    title: "[Soar][AI Runtime] Assistant and automation boundary",
    assignee: agent.aiRuntime,
    goal: goalsByTitle.get("Soar known-state baseline"),
    priority: "high",
    labels: ["ai-runtime", "architecture", "security"],
    criteria: [
      "AI assistant and automation chains are classified as advisory, operator-assisted, or executable.",
      "Tool/context boundaries and prompt/data leakage risks are listed.",
      "AI cannot bypass trading, product, security, or execution gates.",
    ],
  },
  {
    key: "test-automation",
    title: "[Soar][Test Automation] Repeatable smoke and e2e checks",
    assignee: agent.testAutomation,
    goal: goalsByTitle.get("Soar no-regression system"),
    priority: "critical",
    labels: ["test-automation", "qa"],
    criteria: [
      "Repeated manual fixes are converted into automated checks where feasible.",
      "Browser/API/unit commands are documented with expected and actual results.",
      "Production smoke scripts identify the required account class and avoid destructive account mutations by default.",
      "Live-mutation checks are safe, disabled, or explicitly approved.",
    ],
  },
  {
    key: "security",
    title: "[Soar][Security] Auth, secrets, live-risk, and abuse-case gate",
    assignee: agent.security,
    goal: goalsByTitle.get("Soar legal and risk readiness"),
    priority: "critical",
    labels: ["security", "legal-risk", "commercial-readiness"],
    criteria: [
      "Auth/session/API-key/live-consent/subscription/audit-log risks are mapped.",
      "Coolify credentials, production accounts, user real account checks, API keys, cookies, and subscription/payment tests have least-privilege rules and redaction requirements.",
      "Security-sensitive claims have evidence or are blocked.",
      "Release blockers include severity, owner, proof gap, and unblock action.",
    ],
  },
  {
    key: "legal",
    title: "[Soar][Legal] Compliance and go-to-market decision gate",
    assignee: agent.product,
    goal: goalsByTitle.get("Soar legal and risk readiness"),
    priority: "critical",
    labels: ["legal-risk", "commercial-readiness", "product"],
    criteria: [
      "Legal questions are written as explicit decision gates, not assumptions.",
      "Commercial access is blocked until required legal review is complete.",
      "Private-use fallback is documented separately from sellable-product scope.",
    ],
  },
  {
    key: "adapter",
    title: "[Soar][Adapter] Paperclip agent execution smoke test",
    assignee: agent.cto,
    goal: goalsByTitle.get("Soar no-regression system"),
    priority: "critical",
    labels: ["pilot", "ops", "qa", "adapter-smoke"],
    criteria: [
      "Agent JWT/adapter startup warning is understood and cleared or documented.",
      "One harmless local agent task can start, report status, and stop cleanly.",
      "Heartbeat remains disabled until this lane is verified.",
    ],
  },
];

const children = [];
for (const spec of childSpecs) {
  children.push(await ensureChildIssue(parent, issuesByTitle, {
    title: spec.title,
    description: [
      `Role lane: ${spec.key}`,
      "This is part of the Soar pilot known-state and repair system.",
      "",
      "Start by reading your managed AGENTS.md plus Soar AGENTS.md and docs/.",
      "Update the issue with evidence before moving status.",
    ].join("\n"),
    status: "todo",
    priority: spec.priority,
    assigneeAgentId: spec.assignee?.id ?? null,
    projectId: soar.id,
    goalId: spec.goal?.id ?? null,
    labelIds: labelIds(...spec.labels),
    executionWorkspacePreference: "shared_workspace",
    executionWorkspaceId: soarWorkspace.id,
    acceptanceCriteria: spec.criteria,
    blockParentUntilDone: true,
  }));
}

const statusBody = [
  "# Soar Control Center",
  "",
  "## Current State",
  "",
  "- Scope: Soar only, plus Softwarehouse Operating System.",
  "- Paperclip server: http://127.0.0.1:3200",
  "- Workspace: C:/Personal/Projekty/Aplikacje/Soar",
  "- Docs root: docs",
  "- Agent heartbeat: disabled until adapter smoke test passes.",
  "- Commercial posture: sellable app access only if legal/regulatory review allows; otherwise private-use excellence.",
  "",
  "## Active Lanes",
  "",
  ...childSpecs.map((spec) => `- ${spec.title}: ${spec.assignee?.name ?? "unassigned"}`),
  "",
  "## Status Contract",
  "",
  "Every lane must report: implemented and verified, implemented but not verified, present in code behavior unknown, missing, or blocked by exact error.",
  "",
  "## Completion Contract",
  "",
  "Audit output must become a gap register, owned repair issues, verification evidence, and release readiness decisions. V1 is not closed by narrative summary alone.",
].join("\n");
await upsertDocument(parent.id, "soar-control-center", "Soar Control Center", statusBody);

await upsertDocument(parent.id, "soar-operating-plan", "Soar Operating Plan", [
  "# Soar Operating Plan",
  "",
  "## Principle",
  "",
  "Soar is repaired from known-state outward: scan, prove, prioritize, fix, verify, update docs, then feed lessons back into !template.",
  "",
  "An audit is not closure. Audit findings must become owned repair lanes, then repeatable verification, deploy/status proof, and source-of-truth updates until the current target version is fully known.",
  "",
  "## Work Order",
  "",
  "1. Portfolio keeps one visible truth board.",
  "2. CTO, Product, Delivery, Frontend, Backend, Data, Integration, AI Runtime, QA, Test Automation, Security, Ops, Docs, UX, and Legal lanes audit in parallel.",
  "3. Adapter smoke test must pass before autonomous heartbeat/routine execution is enabled.",
  "4. Specialist implementation starts only from evidence-backed repair lanes and one accountable owner per layer.",
  "5. Each completed lane leaves commands, links, proof, and unresolved risks.",
  "6. Delivery converts remaining gaps into owned child issues instead of leaving them as narrative findings.",
  "7. QA, Security, and Ops can block V1 closure until repeatable proof, credential/account safety, Coolify/VPS status, rollback, and post-deploy smoke are sufficient.",
  "8. V1 closes only when every required workflow is implemented and verified, explicitly deferred, or blocked by a concrete decision with owner and next action.",
].join("\n"));

await upsertDocument(parent.id, "soar-evidence-ledger", "Soar Evidence Ledger", [
  "# Soar Evidence Ledger",
  "",
  "| Area | Claim | Evidence | Status | Owner | Updated |",
  "| --- | --- | --- | --- | --- | --- |",
  "| Docs | Documentation root standardized to docs | commit 4192a62a in Soar | implemented and verified | Docs Memory Lead | 2026-05-25 |",
  "| Paperclip | Pilot board narrowed to Soar + operating system | Paperclip project list | implemented and verified | Portfolio Director | 2026-05-25 |",
  "| Agents | 8 role instructions synced | sync-luckysparrow-agent-instructions.mjs output | implemented and verified | Portfolio Director | 2026-05-25 |",
].join("\n"));

await upsertDocument(parent.id, "soar-commercial-legal-gate", "Soar Commercial and Legal Gate", [
  "# Soar Commercial and Legal Gate",
  "",
  "This is an operating checklist, not legal advice.",
  "",
  "## Sellable Access Gate",
  "",
  "- Product scope is clear enough to describe to a customer.",
  "- Data, privacy, regulated-domain, and liability questions are reviewed before taking money or opening access.",
  "- Terms, support expectations, and failure modes are written down.",
  "- App has passing smoke/regression proof for primary workflows.",
  "",
  "## Private-Use Fallback",
  "",
  "If selling access is not allowed or not worth the risk, the target stays: Soar works extremely well for the owner with the same quality discipline.",
].join("\n"));

await ensureWorkProduct(parent.id, {
  projectId: soar.id,
  type: "document",
  provider: "local_file",
  title: "Soar docs map",
  status: "active",
  isPrimary: true,
  summary: "Primary documentation map for the Soar pilot.",
  metadata: { path: "C:/Personal/Projekty/Aplikacje/Soar/docs/documentation-map.md" },
});
await ensureWorkProduct(parent.id, {
  projectId: soar.id,
  type: "artifact",
  provider: "command",
  title: "Workspace boundary audit",
  status: "active",
  summary: "Audit proving Soar/Paperclip/Roost are the only active Stage 1 agent roots and no generated helper artifacts live directly under /Aplikacje.",
  metadata: { command: "pnpm run softwarehouse:workspace-boundary-audit" },
});
await ensureWorkProduct(parent.id, {
  projectId: soar.id,
  type: "artifact",
  provider: "paperclip",
  title: "Soar control-center issue hierarchy",
  status: "active",
  summary: "Parent issue with role lanes, evidence documents, labels, goals, workspace policy, and archived legacy routines.",
  metadata: { parentIssueId: parent.id, childIssueIds: children.map((child) => child.id) },
});

const routines = await request("GET", `/api/companies/${company.id}/routines`);
const routinesByTitle = new Map(routines.map((routine) => [routine.title, routine]));
await ensureRoutine(company.id, routinesByTitle, {
  title: "[Soar] Daily project status refresh",
  description: withParallelExecutionPolicy("Refresh Soar project-manager status, version target, blockers, evidence ledger, and next decisions. This is safe to run daily once the local Codex adapter smoke test passes."),
  projectId: soar.id,
  parentIssueId: parent.id,
  assigneeAgentId: agent.projectManager?.id ?? agent.portfolio?.id ?? null,
  priority: "high",
  status: activeRoutineTitles.has("[Soar] Daily project status refresh") ? "active" : "archived",
  concurrencyPolicy: "coalesce_if_active",
  catchUpPolicy: "skip_missed",
});
const pmExpeditorRoutine = await ensureRoutine(company.id, routinesByTitle, {
  title: "[Soar][PM] No-stall queue expeditor",
  description: withParallelExecutionPolicy("Strict Soar project-manager control loop. Use LUC-244 as the canonical PM no-stall lane while it exists; update or resume that issue instead of creating sibling no-stall issues for the same routine/blocker. Inspect open Soar issues, find stalled todo/in_progress/blocked lanes, and force a disposition: wake owner, split smaller, reassign, defer, create a narrow unblock task, or escalate to Portfolio/user input. If all lanes are genuinely closed, create the next smallest evidence/routine/polish task required for 100% V1 confidence. Do not implement code."),
  projectId: soar.id,
  goalId: goalsByTitle.get("Soar V1 audit-to-completion loop")?.id ?? null,
  parentIssueId: parent.id,
  assigneeAgentId: agent.projectManager?.id ?? agent.portfolio?.id ?? null,
  priority: "critical",
  status: activeRoutineTitles.has("[Soar][PM] No-stall queue expeditor") ? "active" : "archived",
  concurrencyPolicy: "coalesce_if_active",
  catchUpPolicy: "skip_missed",
});
await ensureScheduleTrigger(pmExpeditorRoutine.id, {
  label: "Every 30 minutes while Soar is in V1 takeover",
  enabled: activeRoutineTitles.has("[Soar][PM] No-stall queue expeditor"),
  cronExpression: "*/30 * * * *",
  timezone: "Europe/Berlin",
});
await ensureRoutine(company.id, routinesByTitle, {
  title: "[Soar] Autonomous idle and map drift sweep",
  description: withParallelExecutionPolicy("Autonomous Soar context drift guard. Check whether Soar is still in active repair/verification or can move toward monitoring. Refresh map inventory, stale issue drift, docs/index parity, UI polish readiness, and routine activation blockers. If no active work exists while V1 is not verified, ask PM/Delivery to create the next narrow evidence or repair lane."),
  projectId: soar.id,
  goalId: goalsByTitle.get("Soar known-state baseline")?.id ?? null,
  parentIssueId: parent.id,
  assigneeAgentId: agent.docs?.id ?? null,
  priority: "high",
  status: activeRoutineTitles.has("[Soar] Autonomous idle and map drift sweep") ? "active" : "archived",
  concurrencyPolicy: "coalesce_if_active",
  catchUpPolicy: "skip_missed",
});
await ensureRoutine(company.id, routinesByTitle, {
  title: "[Soar] Regression evidence sweep",
  description: withParallelExecutionPolicy("Run or update the safe regression/smoke evidence baseline. Keep this active during V1 takeover so QA evidence stays fresh and failed checks become owned repair work."),
  projectId: soar.id,
  parentIssueId: parent.id,
  assigneeAgentId: agent.qa?.id ?? null,
  priority: "high",
  status: activeRoutineTitles.has("[Soar] Regression evidence sweep") ? "active" : "archived",
  concurrencyPolicy: "coalesce_if_active",
  catchUpPolicy: "skip_missed",
});
await ensureRoutine(company.id, routinesByTitle, {
  title: "[Soar] V1 audit-to-completion controller",
  description: withParallelExecutionPolicy("Delivery control loop for Soar V1. Refresh the gap register, owned repair lanes, evidence ledger, release blockers, and version-closure decision. Push specialist results upward to PM and split unresolved gaps downward to one-owner tasks."),
  projectId: soar.id,
  goalId: goalsByTitle.get("Soar V1 audit-to-completion loop")?.id ?? null,
  parentIssueId: parent.id,
  assigneeAgentId: agent.delivery?.id ?? null,
  priority: "critical",
  status: activeRoutineTitles.has("[Soar] V1 audit-to-completion controller") ? "active" : "archived",
  concurrencyPolicy: "coalesce_if_active",
  catchUpPolicy: "skip_missed",
});
await ensureRoutine(company.id, routinesByTitle, {
  title: "[Soar] Gap register and repair lane refresh",
  description: withParallelExecutionPolicy("Convert audit findings, stale inbox states, and failed checks into owned specialist repair issues with severity, workflow, expected fix, verification, commit/push/deploy expectation, and release impact."),
  projectId: soar.id,
  goalId: goalsByTitle.get("Soar V1 audit-to-completion loop")?.id ?? null,
  parentIssueId: parent.id,
  assigneeAgentId: agent.delivery?.id ?? null,
  priority: "critical",
  status: activeRoutineTitles.has("[Soar] Gap register and repair lane refresh") ? "active" : "archived",
  concurrencyPolicy: "coalesce_if_active",
  catchUpPolicy: "skip_missed",
});
await ensureRoutine(company.id, routinesByTitle, {
  title: "[Soar] Coolify production deploy health sweep",
  description: withParallelExecutionPolicy([
    "Check Coolify/VPS deploy status, Soar project/environment/resources, source commit, health endpoints, logs, rollback readiness, and post-deploy smoke evidence without exposing credentials.",
    "Board/user observations that recent Coolify deploys failed are fresh operational facts: create or wake one read-only deploy diagnosis child lane even when protected smoke gates such as /workers/ready remain blocked.",
    "Keep failed-deploy diagnosis separate from redeploy/restart/protected-smoke approval. If diagnosis shows a required production mutation, stop and request explicit approval with affected resource, rollback plan, and no-secret evidence.",
    "Keep production mutation fail-closed unless explicitly approved.",
  ].join(" ")),
  projectId: soar.id,
  goalId: goalsByTitle.get("Soar production deploy confidence")?.id ?? null,
  parentIssueId: parent.id,
  assigneeAgentId: agent.ops?.id ?? null,
  priority: "critical",
  status: activeRoutineTitles.has("[Soar] Coolify production deploy health sweep") ? "active" : "archived",
  concurrencyPolicy: "coalesce_if_active",
  catchUpPolicy: "skip_missed",
});
await ensureRoutine(company.id, routinesByTitle, {
  title: "[Soar] Security and account-access gate sweep",
  description: withParallelExecutionPolicy("Review production accounts, test-account classes, API keys, cookies, subscription/payment tests, exchange/live-risk boundaries, and redaction rules. Keep secrets redacted and block unsafe live mutations."),
  projectId: soar.id,
  goalId: goalsByTitle.get("Soar legal and risk readiness")?.id ?? null,
  parentIssueId: parent.id,
  assigneeAgentId: agent.security?.id ?? null,
  priority: "critical",
  status: activeRoutineTitles.has("[Soar] Security and account-access gate sweep") ? "active" : "archived",
  concurrencyPolicy: "coalesce_if_active",
  catchUpPolicy: "skip_missed",
});
await ensureRoutine(company.id, routinesByTitle, {
  title: "[Softwarehouse] Template feedback sweep",
  description: withParallelExecutionPolicy("Review Soar learnings and update !template candidates so reusable project-management, docs, evidence, and agent-operation improvements propagate to future applications."),
  projectId: operating.id,
  assigneeAgentId: agent.docs?.id ?? null,
  priority: "medium",
  status: activeRoutineTitles.has("[Softwarehouse] Template feedback sweep") ? "active" : "archived",
  concurrencyPolicy: "coalesce_if_active",
  catchUpPolicy: "skip_missed",
});
await ensureRoutine(company.id, routinesByTitle, {
  title: "[Soar] Commercial/legal readiness review",
  description: "Archived commercial-readiness and legal-risk gate routine. Create an explicit one-owner legal/commercial issue when review is requested.",
  projectId: soar.id,
  goalId: goalsByTitle.get("Soar legal and risk readiness")?.id ?? null,
  parentIssueId: parent.id,
  assigneeAgentId: agent.product?.id ?? null,
  priority: "high",
  status: "archived",
  concurrencyPolicy: "coalesce_if_active",
  catchUpPolicy: "skip_missed",
});

const routineSchedules = [
  ["[Soar] Daily project status refresh", "Daily PM status at 09:30", "30 9 * * *"],
  ["[Soar] Autonomous idle and map drift sweep", "Every 6 hours after active repair lanes settle", "15 */6 * * *"],
  ["[Soar] Regression evidence sweep", "Daily regression evidence at 10:00", "0 10 * * *"],
  ["[Soar] V1 audit-to-completion controller", "Every 4 hours during V1 takeover", "15 */4 * * *"],
  ["[Soar] Gap register and repair lane refresh", "Every 2 hours offset from V1 controller", "45 */2 * * *"],
  ["[Soar] Coolify production deploy health sweep", "Every 6 hours after credentials are approved", "30 */6 * * *"],
  ["[Soar] Security and account-access gate sweep", "Daily security/account gate at 11:00", "0 11 * * *"],
  ["[Soar] Commercial/legal readiness review", "Weekly product/legal readiness on Monday", "0 12 * * 1"],
  ["[Softwarehouse] Template feedback sweep", "Weekly template feedback on Friday", "0 14 * * 5"],
];

for (const [title, label, cronExpression] of routineSchedules) {
  const routine = routinesByTitle.get(title);
  if (!routine) continue;
  await ensureScheduleTrigger(routine.id, {
    label,
    enabled: activeRoutineTitles.has(title),
    cronExpression,
    timezone: "Europe/Berlin",
  });
}

const obsoleteRoutineSchedules = [
  ["[Soar][PM] No-stall queue expeditor", "Every 2 hours while Soar is in V1 takeover"],
  ["[Soar] V1 audit-to-completion controller", "Every 2 hours during V1 takeover"],
  ["[Soar] Gap register and repair lane refresh", "Every 4 hours offset from V1 controller"],
];

for (const [title, label] of obsoleteRoutineSchedules) {
  const routine = routinesByTitle.get(title);
  if (!routine) continue;
  await disableScheduleTriggerByLabel(routine.id, label);
}

console.log(JSON.stringify({
  apiBase,
  company: { id: company.id, name: company.name },
  project: { id: soar.id, name: soar.name },
  workspace: { id: soarWorkspace.id, cwd: soarWorkspace.cwd },
  topGoal: topGoal.title,
  childIssues: children.length,
  routines: 10,
}, null, 2));
