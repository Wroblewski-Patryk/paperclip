import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const repoRoot = path.resolve(__dirname, "..");
const appsRoot = path.resolve(repoRoot, "..");
const apiBase = process.env.PAPERCLIP_API_URL ?? "http://127.0.0.1:3200";
const companyIdOverride = process.env.PAPERCLIP_COMPANY_ID ?? null;
const companyNames = ["LuckySparrow", "LuckySparrow Software House"];
const boardUserIdOverride = process.env.PAPERCLIP_BOARD_USER_ID ?? null;
const statePath = path.join(repoRoot, ".paperclip", "runtime", "company-os-state.json");

function loadState() {
  try {
    if (!fs.existsSync(statePath)) return { issuesByTitle: {} };
    return JSON.parse(fs.readFileSync(statePath, "utf8"));
  } catch {
    return { issuesByTitle: {} };
  }
}

function saveState(state) {
  fs.mkdirSync(path.dirname(statePath), { recursive: true });
  fs.writeFileSync(statePath, `${JSON.stringify(state, null, 2)}\n`);
}

const localState = loadState();

async function request(method, route, body) {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 90_000);
  try {
    console.error(`[company-os] ${method} ${route}`);
    const response = await fetch(`${apiBase}${route}`, {
      method,
      headers: { "content-type": "application/json" },
      body: body === undefined ? undefined : JSON.stringify(body),
      signal: controller.signal,
    });
    const text = await response.text();
    const data = text ? JSON.parse(text) : null;
    if (!response.ok) throw new Error(`${method} ${route} failed with ${response.status}: ${text}`);
    return data;
  } finally {
    clearTimeout(timeout);
  }
}

function byName(items, name) {
  return items.find((item) => item.name === name);
}

function byNameOrUrlKey(items, names, urlKeys = []) {
  return items.find((item) => names.includes(item.name) || urlKeys.includes(item.urlKey));
}

function rosterKey(agent) {
  return agent?.metadata?.rosterKey ?? agent?.urlKey ?? null;
}

function resolveAgent(agents, keys, names = []) {
  return agents.find((agent) => keys.includes(rosterKey(agent)))
    ?? agents.find((agent) => names.includes(agent.name))
    ?? null;
}

async function resolveCompany() {
  if (companyIdOverride) {
    const company = await request("GET", `/api/companies/${companyIdOverride}`).catch(() => null);
    return company ?? { id: companyIdOverride, name: "PAPERCLIP_COMPANY_ID" };
  }
  const companies = await request("GET", "/api/companies");
  const company = companies.find((candidate) => companyNames.includes(candidate.name));
  if (!company) throw new Error(`Company not found. Tried: ${companyNames.join(", ")}`);
  return company;
}

async function resolveBoardUser(companyId) {
  if (boardUserIdOverride) return { id: boardUserIdOverride, source: "PAPERCLIP_BOARD_USER_ID" };
  const directory = await request("GET", `/api/companies/${companyId}/user-directory`).catch(() => ({ users: [] }));
  const active = directory.users?.find((entry) => entry.status === "active" && entry.user?.id);
  return active?.user ? { ...active.user, source: "user-directory" } : null;
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
    localState.issuesByTitle[input.title] = { id: existing.id, identifier: existing.identifier ?? null };
    saveState(localState);
    return existing;
  }
  const searched = await request(
    "GET",
    `/api/companies/${companyId}/issues?q=${encodeURIComponent(input.title)}&limit=20`,
  ).catch(() => []);
  const searchedIssues = Array.isArray(searched) ? searched : [];
  const exact = searchedIssues.find((issue) => issue.title === input.title && issue.status !== "cancelled")
    ?? searchedIssues.find((issue) => issue.title === input.title);
  if (exact) {
    issuesByTitle.set(input.title, exact);
    localState.issuesByTitle[input.title] = { id: exact.id, identifier: exact.identifier ?? null };
    saveState(localState);
    return exact;
  }
  const stateExisting = localState.issuesByTitle?.[input.title];
  if (stateExisting?.id) {
    return {
      id: stateExisting.id,
      identifier: stateExisting.identifier ?? null,
      title: input.title,
      status: input.status,
      assigneeUserId: input.assigneeUserId ?? null,
      assigneeAgentId: input.assigneeAgentId ?? null,
    };
  }
  const created = await request("POST", `/api/companies/${companyId}/issues`, input);
  issuesByTitle.set(input.title, created);
  localState.issuesByTitle[input.title] = { id: created.id, identifier: created.identifier ?? null };
  saveState(localState);
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

function timestampMs(value) {
  const time = value ? Date.parse(value) : NaN;
  return Number.isFinite(time) ? time : 0;
}

function canonicalRoutine(existing, candidate) {
  if (!existing) return candidate;
  if (existing.status !== "active" && candidate.status === "active") return candidate;
  if (existing.status === "active" && candidate.status !== "active") return existing;
  return timestampMs(candidate.createdAt ?? candidate.updatedAt) >= timestampMs(existing.createdAt ?? existing.updatedAt)
    ? candidate
    : existing;
}

function routinesByCanonicalTitle(routines) {
  const byTitle = new Map();
  for (const routine of routines) {
    byTitle.set(routine.title, canonicalRoutine(byTitle.get(routine.title), routine));
  }
  return byTitle;
}

async function ensureScheduleTrigger(routineId, input) {
  const detail = await request("GET", `/api/routines/${routineId}`);
  const existing = detail.triggers?.find((trigger) => trigger.kind === "schedule" && trigger.label === input.label);
  if (existing) return request("PATCH", `/api/routine-triggers/${existing.id}`, input);
  return request("POST", `/api/routines/${routineId}/triggers`, { kind: "schedule", ...input });
}

async function upsertDocument(issueId, key, title, body, changeSummary) {
  const docs = await request("GET", `/api/issues/${issueId}/documents`);
  const existing = docs.find((doc) => doc.key === key);
  return request("PUT", `/api/issues/${issueId}/documents/${encodeURIComponent(key)}`, {
    title,
    format: "markdown",
    body,
    changeSummary,
    baseRevisionId: existing?.latestRevisionId ?? undefined,
  });
}

async function ensureWorkProduct(issueId, input) {
  const existing = await request("GET", `/api/issues/${issueId}/work-products`);
  const match = existing.find((item) => item.title === input.title && item.provider === input.provider);
  if (match) return request("PATCH", `/api/work-products/${match.id}`, input);
  return request("POST", `/api/issues/${issueId}/work-products`, input);
}

async function ensureWorkspace(project, input) {
  const workspaces = await request("GET", `/api/projects/${project.id}/workspaces`);
  const existing = workspaces.find((workspace) => workspace.name === input.name)
    ?? workspaces.find((workspace) => workspace.cwd === input.cwd)
    ?? workspaces.find((workspace) => workspace.isPrimary)
    ?? null;
  const workspace = existing
    ? await request("PATCH", `/api/projects/${project.id}/workspaces/${existing.id}`, input)
    : await request("POST", `/api/projects/${project.id}/workspaces`, { ...input, isPrimary: true });

  const policy = {
    ...(project.executionWorkspacePolicy ?? {}),
    enabled: true,
    defaultMode: "shared_workspace",
    allowIssueOverride: true,
    defaultProjectWorkspaceId: workspace.id,
    workspaceStrategy: {
      type: "project_primary",
      baseRef: null,
      branchTemplate: `codex/${project.name.toLowerCase().replace(/[^a-z0-9]+/g, "-")}-{{issue}}`,
      provisionCommand: null,
      teardownCommand: null,
    },
    cleanupPolicy: {
      closeWhenIssueDone: false,
      requireSourceControlClosure: true,
      preserveHumanChanges: true,
    },
  };
  const updatedProject = await request("PATCH", `/api/projects/${project.id}`, { executionWorkspacePolicy: policy });
  return { workspace, project: updatedProject };
}

function companyOperatingManual() {
  return [
    "# Softwarehouse Company Operating System",
    "",
    "This document is the operating contract for the local Paperclip softwarehouse.",
    "The company exists to plan, build, verify, and improve applications such as Soar, Roost, and the owner-activated Featherly hardening lane.",
    "Brand marketing, broad finance, formal legal counsel, and unrelated business administration are outside this pilot unless they directly unblock app creation.",
    "",
    "## Operating Chain",
    "",
    "`Board/User dream -> 11 Innovation/PM packet -> 02 Product acceptance -> 09 CTO technical acceptance -> Delivery decomposition -> Specialist build/proof -> QA/Security/Ops gates -> Release/observation -> Retrospective -> Process/agent improvement`",
    "",
    "## Version Roadmap And Active Scope",
    "",
    "`Softwarehouse V0 local app factory (Soar + Roost) -> Softwarehouse V1 hosted Paperclip + governed Roost company plane -> Softwarehouse V2 portfolio expansion`",
    "",
    "- V0 is the current local Paperclip operating target: agents finish Soar and Roost through indexed frontend/backend/worker/event-chain evidence, source-control closure, local verification, and gated deploy proof where credentials/production access are available.",
    "- Soar and Roost are both active V0 application lanes. Soar remains the first tie-breaker when two safe actions compete for the same owner, credential, or protected production gate, but Roost must not be parked when local known-state, source-control, implementation, proof, or documentation work is legal and owner-scoped.",
    "- Featherly is an owner-approved V0 exception in takeover/security-hardening mode; local evidence and repair are active while production remains gated.",
    "- V1 starts only after V0 acceptance. It moves Paperclip to VPS and connects the hosted control plane to the governed Roost company-knowledge boundary.",
    "- V2 opens additional application projects after the local+VPS operating loop proves it can run Soar and Roost without silent idle, duplicate churn, or hidden blockers.",
    "- Aviary, Nest, and other future apps remain parked until the board explicitly reopens them for V2 or a named exception.",
    "",
    "## Value Streams",
    "",
    "1. Dream to Product Slice",
    "   - Owner: 02 CPO + 02 WPM.",
    "   - Input: human dream, project `docs/architecture`, PM packet, screenshots, constraints, blockers.",
    "   - Output: accepted product slice, discovery questions, defer/park decision, or reject/merge decision.",
    "",
    "2. Product Slice to Technical Plan",
    "   - Owner: 09 CTO + 09 TSA.",
    "   - Input: accepted Product slice or explicit technical-only repair.",
    "   - Output: architecture boundaries, modules, contracts, risk, proof plan, specialist owners.",
    "",
    "3. Technical Plan to Delivery Tasks",
    "   - Owner: Engineering Delivery Lead.",
    "   - Input: CTO/TSA packet.",
    "   - Output: one-owner tasks with dependency order, proof requirements, workspace policy, and parent disposition.",
    "",
    "4. Delivery to QA/Security/Ops Gate",
    "   - Owner: QA, Security, Ops.",
    "   - Input: completed implementation/proof lanes.",
    "   - Output: pass, blocker with owner, or release hold with plain reason.",
    "",
    "5. Release to Observation",
    "   - Owner: Ops + PM + Product.",
    "   - Input: gated release candidate.",
    "   - Output: deploy/readiness state, rollback path, smoke proof, user-visible status.",
    "",
    "6. Failure to Learning",
    "   - Owner: CHRO/AID + Docs/Memory.",
    "   - Input: repeated blockers, rework, failed handoffs, unclear ownership, stale routines.",
    "   - Output: improved role instruction, skill, routine, template, or a deliberate no-change note.",
    "",
    "## Human Decision Rule",
    "",
    "If the system needs a board/user choice, it creates a task assigned to the human user. The task must explain:",
    "",
    "- what decision is needed;",
    "- why it matters now;",
    "- the recommended option;",
    "- 2-3 realistic alternatives;",
    "- consequence of doing nothing;",
    "- which work will resume after the answer.",
    "",
    "The wording must be plain Polish or plain English. No dense implementation jargon unless the task is explicitly technical.",
    "",
    "## Definition Of Company-Ready Work",
    "",
    "- One accountable owner exists at every step.",
    "- The next handoff is named before work starts.",
    "- Product intent is accepted before broad feature implementation.",
    "- Technical boundaries are accepted before broad specialist fan-out.",
    "- QA/Security/Ops gates can block release.",
    "- Workspaces protect human changes and preserve source-control closure.",
    "- Done work has evidence or an explicit no-evidence reason.",
    "- Repeated failures become learning tasks, not silent frustration.",
  ].join("\n");
}

function decisionTaskBody({ title, question, recommended, alternatives, whyNow, resumes }) {
  return [
    question,
    "",
    `Why this matters now: ${whyNow}`,
    "",
    `Recommended: ${recommended}`,
    "",
    "Other reasonable options:",
    ...alternatives.map((item) => `- ${item}`),
    "",
    "If you do nothing: Paperclip should keep the current safe/default posture and avoid broad irreversible work.",
    "",
    `After your answer: ${resumes}`,
    "",
    "Please reply in this task with the option you want and any short comment. Plain language is enough.",
    "",
    `Decision marker: ${title}`,
  ].join("\n");
}

const company = await resolveCompany();
const [agents, projects, goals, issuesResult, routines, labels] = await Promise.all([
  request("GET", `/api/companies/${company.id}/agents`),
  request("GET", `/api/companies/${company.id}/projects`),
  request("GET", `/api/companies/${company.id}/goals`),
  request("GET", `/api/companies/${company.id}/issues?limit=2000`).catch((err) => {
    console.error(`[company-os] issue index unavailable, continuing from local state: ${err.message}`);
    return [];
  }),
  request("GET", `/api/companies/${company.id}/routines`),
  request("GET", `/api/companies/${company.id}/labels`),
]);
const issues = Array.isArray(issuesResult) ? issuesResult : [];

const boardUser = await resolveBoardUser(company.id);
const operating = byNameOrUrlKey(projects, ["Softwarehouse Operating System", "Softwarehouse"], ["softwarehouse"]);
if (!operating) throw new Error("Softwarehouse Operating System project not found.");

const agent = {
  aia: resolveAgent(agents, ["ai-assistant"], ["00 AIA (AI Assistant)", "LuckySparrow Softwarehouse Operating Assistant"]),
  cso: resolveAgent(agents, ["chief-strategy-officer"], ["01 CSO (Chief Strategy Officer)"]),
  cpo: resolveAgent(agents, ["chief-product-officer", "product-lead"], ["02 CPO (Chief Product Officer)", "Product Lead"]),
  wpm: resolveAgent(agents, ["web-product-manager"], ["02 WPM (Web Product Manager)"]),
  coo: resolveAgent(agents, ["chief-operating-officer"], ["04 COO (Chief Operating Officer)"]),
  chro: resolveAgent(agents, ["chief-human-resources-officer"], ["06 CHRO (Chief Human Resources Officer)"]),
  aid: resolveAgent(agents, ["ai-agent-development-partner"], ["06 AID (AI Agent Development Partner)"]),
  cto: resolveAgent(agents, ["chief-technology-officer", "cto"], ["09 CTO (Chief Technology Officer)", "CTO Architect"]),
  tsa: resolveAgent(agents, ["technical-solution-architect"], ["09 TSA (Technical Solution Architect)"]),
  delivery: resolveAgent(agents, ["engineering-delivery-lead"], ["Engineering Delivery Lead"]),
  qa: resolveAgent(agents, ["qa-lead", "quality-verification-engineer"], ["QA Regression Lead", "05 QVE (Quality Verification Engineer)"]),
  security: resolveAgent(agents, ["security-review-lead", "security-privacy-auditor"], ["Security Review Lead", "10 SPA (Security & Privacy Auditor)"]),
  ops: resolveAgent(agents, ["ops-lead", "deployment-reliability-engineer"], ["Ops Release Lead", "09 DRE (Deployment & Reliability Engineer)"]),
  docs: resolveAgent(agents, ["docs-memory", "documentation-steward"], ["Docs Memory Lead", "04 DSM (Documentation Steward)"]),
  cino: resolveAgent(agents, ["chief-innovation-officer", "innovations-director"], ["11 CINO (Chief Innovation Officer)", "11 Innovations Director"]),
  ipm: resolveAgent(agents, ["innovation-portfolio-manager"], ["11 IPM (Innovation Portfolio Manager)"]),
  spm: resolveAgent(agents, ["soar-product-manager"], ["11 SPM (Soar Product Manager)"]),
  rpm: resolveAgent(agents, ["roost-product-manager"], ["11 RPM (Roost Project Manager)", "Roost Project Manager"]),
};

const labelsByName = new Map(labels.map((label) => [label.name, label]));
const labelSpecs = [
  ["company-os", "#0f766e"],
  ["value-stream", "#2563eb"],
  ["human-decision", "#be123c"],
  ["operating-standard", "#334155"],
  ["softwarehouse", "#334155"],
];
for (const [name, color] of labelSpecs) await ensureLabel(company.id, labelsByName, name, color);
const labelIds = (names) => names.map((name) => labelsByName.get(name)?.id).filter(Boolean);

const goalsByTitle = new Map(goals.map((goal) => [goal.title, goal]));
const companyOsGoal = await ensureGoal(company.id, goalsByTitle, {
  title: "Softwarehouse company operating system",
  description: [
    "Make Paperclip behave like a small autonomous software company for app creation.",
    "The system must run value streams from human dream to Product, Technology, Delivery, QA/Security/Ops, release observation, and learning.",
    "Human decisions must appear as clear tasks assigned to the human user with plain-language context.",
  ].join("\n"),
  level: "company",
  status: "active",
  ownerAgentId: agent.aia?.id ?? agent.cso?.id ?? agent.ipm?.id ?? null,
});

const valueStreamGoal = await ensureGoal(company.id, goalsByTitle, {
  title: "Softwarehouse app delivery value streams",
  description: "Keep every app delivery lane moving through explicit value streams, not vague task piles.",
  level: "company",
  status: "active",
  ownerAgentId: agent.coo?.id ?? agent.delivery?.id ?? agent.ipm?.id ?? null,
});

const learningGoal = await ensureGoal(company.id, goalsByTitle, {
  title: "Softwarehouse organizational learning and agent improvement",
  description: "Turn repeated blockers, bad handoffs, unclear tasks, and stale routines into durable role, skill, routine, or template improvements.",
  level: "company",
  status: "active",
  ownerAgentId: agent.aid?.id ?? agent.chro?.id ?? agent.docs?.id ?? null,
});

const issuesByTitle = new Map(issues.map((issue) => [issue.title, issue]));
const parent = await ensureIssue(company.id, issuesByTitle, {
  title: "[Softwarehouse][Company OS] Run app-building company operating system",
  description: [
    "Own the operating system that lets Paperclip act like a small autonomous software company for building apps.",
    "",
    "Scope:",
    "- active first: Softwarehouse V0 local app factory (Soar + Roost) -> Softwarehouse V1 hosted Paperclip + governed Roost company plane -> Softwarehouse V2 portfolio expansion;",
    "- active hardening exception: Featherly; future prepared: Aviary and Nest when activated;",
    "- no broad brand marketing, unrelated finance, or formal legal department in this softwarehouse pilot;",
    "- every app idea moves through Innovation -> Product -> Technology -> Delivery -> QA/Security/Ops -> Release/Observation -> Learning.",
    "",
    "Done means: value-stream issues, goals, routines, human-decision tasks, workspaces, and operating artifact are all present and inspectable in Paperclip.",
  ].join("\n"),
  projectId: operating.id,
  goalId: companyOsGoal.id,
  assigneeAgentId: agent.aia?.id ?? agent.ipm?.id ?? null,
  priority: "critical",
  status: "todo",
  labelIds: labelIds(["company-os", "softwarehouse", "operating-standard"]),
});

await upsertDocument(
  parent.id,
  "company-operating-system",
  "Softwarehouse Company Operating System",
  companyOperatingManual(),
  "Install company operating system value streams"
);

const manualPath = "softwarehouse/company-operating-system.md";
const operatingWorkspace = await ensureWorkspace(operating, {
  name: `${operating.name} local primary`,
  sourceType: "local_path",
  cwd: repoRoot,
  defaultRef: null,
  visibility: "advanced",
  metadata: {
    managedBy: "configure-softwarehouse-company-os",
    purpose: "local-first company operating system workspace",
    companyOs: true,
    preserveHumanChanges: true,
  },
});
await ensureWorkProduct(parent.id, {
  projectId: operating.id,
  type: "document",
  provider: "paperclip",
  title: "Softwarehouse Company Operating System manual",
  status: "ready_for_review",
  reviewState: "needs_board_review",
  isPrimary: true,
  summary: "Operating contract for Innovation -> Product -> Technology -> Delivery -> QA/Security/Ops -> Release/Observation -> Learning.",
  metadata: {
    documentKey: "company-operating-system",
    resourceRef: {
      kind: "workspace_file",
      projectId: operating.id,
      projectName: operating.name,
      workspaceKind: "project_workspace",
      workspaceId: operatingWorkspace.workspace.id,
      relativePath: manualPath,
      displayPath: manualPath,
    },
  },
});

const valueStreams = [
  {
    title: "[Softwarehouse][Value Stream] Dream to Product Slice",
    owner: agent.cpo ?? agent.wpm,
    goalId: valueStreamGoal.id,
    priority: "critical",
    body: "CPO/WPM turns board dreams, project docs/architecture, screenshots, PM packet, constraints, and blockers into an accepted product slice, discovery questions, defer/park decision, or reject/merge decision.",
  },
  {
    title: "[Softwarehouse][Value Stream] Product Slice to Technical Plan",
    owner: agent.cto ?? agent.tsa,
    goalId: valueStreamGoal.id,
    priority: "critical",
    body: "CTO/TSA turns accepted Product slices into architecture boundaries, contracts, risk, verification plan, rollout/rollback notes, and specialist owners. User-facing ambiguity returns to Product.",
  },
  {
    title: "[Softwarehouse][Value Stream] Technical Plan to Delivery Tasks",
    owner: agent.delivery ?? agent.coo,
    goalId: valueStreamGoal.id,
    priority: "high",
    body: "Delivery turns technical plans into one-owner tasks with dependency order, proof requirement, workspace policy, blocked-by relations, and parent disposition.",
  },
  {
    title: "[Softwarehouse][Value Stream] Delivery to QA Security Ops Gate",
    owner: agent.qa ?? agent.security ?? agent.ops,
    goalId: valueStreamGoal.id,
    priority: "high",
    body: "QA/Security/Ops verifies implementation lanes and blocks release when proof, safety, secrets, deploy, rollback, or production-smoke posture is not clear.",
  },
  {
    title: "[Softwarehouse][Value Stream] Release to Observation",
    owner: agent.ops ?? agent.spm ?? agent.rpm,
    goalId: valueStreamGoal.id,
    priority: "high",
    body: "Ops/PM/Product records deploy/readiness state, rollback path, smoke proof, user-visible status, and next feedback loop for active app releases.",
  },
  {
    title: "[Softwarehouse][Value Stream] Failure to Learning",
    owner: agent.aid ?? agent.chro ?? agent.docs,
    goalId: learningGoal.id,
    priority: "high",
    body: "CHRO/AID/Docs converts repeated blockers, unclear handoffs, bad decomposition, missing evidence, or stale routines into durable role, skill, routine, template, or process improvements.",
  },
];

const valueStreamIssues = [];
for (const stream of valueStreams) {
  valueStreamIssues.push(await ensureIssue(company.id, issuesByTitle, {
    title: stream.title,
    description: [
      stream.body,
      "",
      "Required handoff quality:",
      "- one accountable owner;",
      "- clear input source;",
      "- clear output artifact or decision;",
      "- next owner named;",
      "- plain-language blocker if work cannot continue.",
    ].join("\n"),
    projectId: operating.id,
    goalId: stream.goalId,
    parentId: parent.id,
    assigneeAgentId: stream.owner?.id ?? null,
    priority: stream.priority,
    status: "todo",
    labelIds: labelIds(["company-os", "value-stream", "softwarehouse"]),
  }));
}

const decisionSpecs = [
  {
    title: "[Board Decision][Company OS] Confirm active app focus and parking rule",
    question: "Please confirm the app focus rule for Paperclip.",
    recommended: "Use the roadmap Softwarehouse V0 local app factory -> Softwarehouse V1 hosted capabilities -> Softwarehouse V2 portfolio expansion; keep Soar, Roost, and the owner-activated Featherly hardening lane active while Aviary and Nest remain parked.",
    alternatives: [
      "Make Soar the only active delivery project and keep Roost as preparation only.",
      "Allow Soar, Roost, and one future app to be active together if Paperclip has idle specialist capacity.",
    ],
    whyNow: "Paperclip needs a clean portfolio rule so routines do not wake parked apps too aggressively.",
    resumes: "Portfolio/Innovation will tune project routines and source-control gates to match your choice.",
  },
  {
    title: "[Board Decision][Company OS] Confirm human-decision task style",
    question: "Please confirm how Paperclip should ask you for decisions.",
    recommended: "Use short Polish decision tasks with context, recommendation, alternatives, consequence of doing nothing, and what resumes after your answer.",
    alternatives: [
      "Use Polish for product/business decisions and English only for deeply technical choices.",
      "Use very compact yes/no tasks unless the decision changes roadmap, data access, deploy, money, or live users.",
    ],
    whyNow: "Agents need a default communication standard before they start routing more decisions through your task inbox.",
    resumes: "AIA/CPO/PMs will use this as the default board-question template.",
  },
  {
    title: "[Board Decision][Company OS] Confirm Roost local data bridge boundary",
    question: "Please confirm the safe boundary for the future Roost local data bridge.",
    recommended: "Treat Roost bridge work as local-first and read-only by default until Product, Security, and CTO accept the workflow and data boundary.",
    alternatives: [
      "Allow local read/write experiments only inside a disposable test dataset.",
      "Pause all Roost bridge implementation until Soar has a stronger release-ready posture.",
    ],
    whyNow: "Roost is meant to connect business data later, so Paperclip needs a conservative rule before agents touch company data flows.",
    resumes: "Roost PM, Product, Security, and CTO will create the first accepted bridge slice or keep it parked.",
  },
];

const decisionIssues = [];
for (const spec of decisionSpecs) {
  decisionIssues.push(await ensureIssue(company.id, issuesByTitle, {
    title: spec.title,
    description: decisionTaskBody(spec),
    projectId: operating.id,
    goalId: companyOsGoal.id,
    parentId: parent.id,
    assigneeAgentId: null,
    assigneeUserId: boardUser?.id ?? null,
    priority: "high",
    status: "todo",
    labelIds: labelIds(["company-os", "human-decision", "softwarehouse"]),
  }));
}

const routinesByTitle = routinesByCanonicalTitle(routines);
const routineSpecs = [
  {
    title: "[Softwarehouse] Company value-stream governance",
    owner: agent.coo ?? agent.aia ?? agent.ipm,
    goalId: companyOsGoal.id,
    priority: "critical",
    cron: "20 8 * * *",
    label: "Daily company value-stream governance at 08:20",
    description: [
      "Check whether active app work is moving through the required value streams.",
      "Flag any issue that skipped Product acceptance before feature build, skipped CTO acceptance before delivery fan-out, lacks QA/Security/Ops gate, or lacks next owner.",
      "Create or update narrow corrective tasks. Do not do feature implementation inside this routine.",
    ].join("\n"),
  },
  {
    title: "00 General: Owner Direction and Proposal Review",
    owner: agent.aia ?? agent.cso ?? agent.ipm,
    goalId: companyOsGoal.id,
    priority: "high",
    cron: "*/30 * * * *",
    label: "00 AIA owner decision briefing every 30 minutes",
    description: [
      "Act as the sole AIA owner-decision steward. GET /api/companies/$PAPERCLIP_COMPANY_ID/decisions, choose up to five state=preparing interactions by risk/age, and complete a disposition for every selected item in this run; do not stop after preparing the first one.",
      "First decide whether the request truly requires owner authority. Technical, reversible, or policy-covered choices must be routed to the competent internal agent and closed through POST /api/companies/$PAPERCLIP_COMPANY_ID/decisions/interaction/{id}/reroute; never show them to the owner.",
      "Internal assignment/routing (including cross-department ProductDelivery routing), code review, QA, architecture choices inside accepted boundaries, local commits without push/deploy, and ordinary implementation tradeoffs are never owner decisions.",
      "Owner decisions are limited to product/scope direction, risk acceptance outside policy, protected access or secret-provider choices, destructive actions, production deployment/public release, money/legal commitments, and permanent authority or agent-organization changes.",
      "For a true owner decision, inspect the canonical issue, current comments, documents, approvals, and work products. Consolidate duplicates and do not copy raw logs or secret values.",
      "Prepare a Polish payload.decisionContext.ownerBriefing containing: one decision sentence, 2-5 current facts, 1-5 options each with benefit/cost/risk, one explicit AIA recommendation, actions after acceptance, and rollback/recovery.",
      "Set audience=board and decisionReady=true only when that packet is complete, then POST it to /api/companies/$PAPERCLIP_COMPANY_ID/decisions/interaction/{id}/prepare. Otherwise leave it in preparation and record the exact missing evidence on its canonical issue.",
      "A selected item may remain preparing only when named current evidence is genuinely missing; record that missing-evidence reason and continue with the remaining selected items.",
      "Do not create a second owner interaction for the same decision. Do not ask the owner for credentials, raw alert payloads, implementation details, or decisions already delegated by policy.",
    ].join("\n"),
  },
  {
    title: "[Softwarehouse] Product acceptance gate review",
    owner: agent.cpo ?? agent.wpm,
    goalId: valueStreamGoal.id,
    priority: "critical",
    cron: "15 */4 * * *",
    label: "Product acceptance gate review every 4 hours",
    description: [
      "Review active user-facing app work.",
      "If work lacks an accepted product slice, move it back to Product discovery or create a Product acceptance task.",
      "Accepted slices must name user workflow, acceptance criteria, non-goals, UX/UI owner if needed, and next technical owner.",
    ].join("\n"),
  },
  {
    title: "[Softwarehouse] App completion map and browser review loop",
    owner: agent.wpm ?? agent.cpo ?? agent.qa ?? agent.docs,
    goalId: valueStreamGoal.id,
    priority: "critical",
    cron: "5 */6 * * *",
    label: "App completion map and browser review every 6 hours",
    description: [
      "Refresh or request the app-completion index for active sellable apps.",
      "Use `node scripts/build-app-completion-index.mjs --project Soar --root ../Soar` after architecture-awareness exports are fresh.",
      "Convert gaps into one-owner lanes that connect user action, frontend route/component, backend/API, auth, subscription, configuration, exchange integrations such as Binance/Gate.io, tests, docs, and browser screenshot/clickthrough proof.",
      "If backend works but the frontend renders wrong, route Frontend/UX repair. If frontend exists but API/config/subscription/integration proof is missing, route Backend/Integration/Config repair.",
      "Do not code features in this routine. Its output is a current completion map, review handoff, or worker-ready proof/repair issues.",
    ].join("\n"),
  },
  {
    title: "[Softwarehouse] CTO technical acceptance gate review",
    owner: agent.cto ?? agent.tsa,
    goalId: valueStreamGoal.id,
    priority: "critical",
    cron: "35 */4 * * *",
    label: "CTO technical acceptance gate review every 4 hours",
    description: [
      "Review active implementation lanes.",
      "If work lacks architecture boundaries, affected modules, data/API contracts, verification plan, or rollback/deploy impact, create a TSA/CTO corrective task.",
      "Send unresolved product questions back to Product instead of inventing behavior.",
    ].join("\n"),
  },
  {
    title: "[Softwarehouse] Organizational learning and agent improvement review",
    owner: agent.aid ?? agent.chro ?? agent.docs,
    goalId: learningGoal.id,
    priority: "high",
    cron: "30 15 * * 5",
    label: "Weekly organizational learning and agent improvement review",
    description: [
      "Review repeated blockers, unclear handoffs, stale routines, failed proof, and bad task decomposition.",
      "Apply one low-risk durable improvement or create a governed follow-up with evidence and rollback path.",
      "Prefer improving role instructions, task templates, routines, skills, or work-product standards over adding more agents.",
    ].join("\n"),
  },
];

const configuredRoutines = [];
for (const spec of routineSpecs) {
  const routine = await ensureRoutine(company.id, routinesByTitle, {
    title: spec.title,
    description: spec.description,
    projectId: operating.id,
    goalId: spec.goalId,
    parentIssueId: parent.id,
    assigneeAgentId: spec.owner?.id ?? null,
    priority: spec.priority,
    status: "active",
    concurrencyPolicy: "coalesce_if_active",
    catchUpPolicy: "skip_missed",
  });
  await ensureScheduleTrigger(routine.id, {
    label: spec.label,
    enabled: true,
    cronExpression: spec.cron,
    timezone: "Europe/Berlin",
  });
  configuredRoutines.push({ title: routine.title, id: routine.id });
}

const workspaceResults = [];
for (const projectName of ["Softwarehouse Operating System", "Softwarehouse", "Soar", "Roost", "Aviary", "Nest", "Featherly"]) {
  const project = byName(projects, projectName);
  if (!project) continue;
  const folderName = projectName === "Softwarehouse Operating System" || projectName === "Softwarehouse"
    ? "Paperclip_Softwarehouse"
    : projectName;
  const cwd = path.join(appsRoot, folderName);
  if (!fs.existsSync(cwd)) continue;
  const result = await ensureWorkspace(project, {
    name: `${project.name} local primary`,
    sourceType: "local_path",
    cwd,
    defaultRef: null,
    visibility: project.name === "Softwarehouse Operating System" || project.name === "Softwarehouse" ? "advanced" : "default",
    metadata: {
      managedBy: "configure-softwarehouse-company-os",
      purpose: "local-first app delivery workspace",
      companyOs: true,
      preserveHumanChanges: true,
    },
  });
  workspaceResults.push({ project: project.name, workspace: result.workspace.name, cwd });
}

console.log(JSON.stringify({
  apiBase,
  company: { id: company.id, name: company.name },
  boardUser: boardUser ? { id: boardUser.id, name: boardUser.name ?? null, source: boardUser.source } : null,
  goals: [companyOsGoal.title, valueStreamGoal.title, learningGoal.title],
  parentIssue: { identifier: parent.identifier, title: parent.title },
  valueStreamIssues: valueStreamIssues.map((issue) => ({ identifier: issue.identifier, title: issue.title })),
  decisionIssues: decisionIssues.map((issue) => ({
    identifier: issue.identifier,
    title: issue.title,
    assigneeUserId: issue.assigneeUserId,
  })),
  routines: configuredRoutines,
  workspaces: workspaceResults,
}, null, 2));
