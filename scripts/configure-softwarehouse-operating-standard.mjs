#!/usr/bin/env node
const apiBase = process.env.PAPERCLIP_API_URL ?? "http://127.0.0.1:3200";
const companyName = "LuckySparrow Software House";
const companyId = process.env.PAPERCLIP_COMPANY_ID ?? null;

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

async function ensureIssueDocument(issueId, key, title, body) {
  const documents = await request("GET", `/api/issues/${issueId}/documents`);
  const existing = documents.find((document) => document.key === key);
  return request("PUT", `/api/issues/${issueId}/documents/${encodeURIComponent(key)}`, {
    title,
    format: "markdown",
    body,
    changeSummary: "Configure Paperclip Softwarehouse operating standard coordination",
    baseRevisionId: existing?.latestRevisionId ?? undefined,
  });
}

function workPacket({ processClass, owner, objective, acceptance, verification, forbidden = [] }) {
  return [
    `Process class: ${processClass}`,
    `Owner: ${owner}`,
    "",
    "PDCA contract:",
    "- PLAN: read `docs/softwarehouse/` and affected code/docs before changing behavior.",
    `- DO: ${objective}`,
    `- CHECK: ${verification}`,
    "- ACT: update docs/report, link evidence, and create the next issue only when a gap remains.",
    "",
    "Definition of Ready:",
    "- goal, context, expected output, owner, acceptance criteria, risk, and proof method are present in this issue.",
    "",
    "Definition of Done:",
    ...acceptance.map((item) => `- ${item}`),
    "",
    "Work report required:",
    "- use `docs/softwarehouse/templates/work-report-template.md`.",
    "- include files changed, tests/checks, evidence, risks, next action, and final status.",
    "",
    "Forbidden actions:",
    ...forbidden.map((item) => `- ${item}`),
  ].join("\n");
}

async function resolveCompany() {
  if (companyId) return { id: companyId, source: "PAPERCLIP_COMPANY_ID" };

  const companies = await request("GET", "/api/companies");
  const company = companies.find((candidate) => candidate.name === companyName);
  if (!company) throw new Error(`Company not found: ${companyName}`);
  return { id: company.id, source: "company_name" };
}

const company = await resolveCompany();

const [agents, projects, goals, issues] = await Promise.all([
  request("GET", `/api/companies/${company.id}/agents`),
  request("GET", `/api/companies/${company.id}/projects`),
  request("GET", `/api/companies/${company.id}/goals`),
  request("GET", `/api/companies/${company.id}/issues?limit=2000`),
]);

const operatingProject = byNameOrUrlKey(projects, ["Softwarehouse Operating System", "Softwarehouse"], ["softwarehouse"]);
if (!operatingProject) throw new Error("Softwarehouse Operating System project not found.");

const agent = {
  portfolio: byName(agents, "Portfolio Director"),
  product: byName(agents, "Product Lead"),
  cto: byName(agents, "CTO Architect"),
  delivery: byName(agents, "Engineering Delivery Lead"),
  backend: byName(agents, "Backend API Engineer"),
  frontend: byName(agents, "Frontend Engineer"),
  runtime: byName(agents, "AI Agent Runtime Engineer"),
  qa: byName(agents, "QA Regression Lead"),
  security: byName(agents, "Security Review Lead"),
  ops: byName(agents, "Ops Release Lead"),
  docs: byName(agents, "Docs Memory Lead"),
  roostPm: byName(agents, "Roost Project Manager"),
};

const goalsByTitle = new Map(goals.map((goal) => [goal.title, goal]));
const goal = await ensureGoal(company.id, goalsByTitle, {
  title: "Paperclip Softwarehouse autonomous operating standard enforcement",
  description: [
    "Turn the documented Paperclip Softwarehouse operating standard into enforceable control-plane behavior.",
    "This goal owns the transition from docs/prompts to runtime checks, templates, metrics, and Roost/CompanyCore source-of-truth integration.",
  ].join("\n"),
  level: "company",
  status: "active",
  ownerAgentId: agent.portfolio?.id ?? null,
});

const issuesByTitle = new Map(issues.map((issue) => [issue.title, issue]));
const parent = await ensureIssue(company.id, issuesByTitle, {
  title: "[Softwarehouse][OS] Enforce autonomous operating standard",
  description: [
    "Coordinate the remaining work needed to make Paperclip Softwarehouse operate as an autonomous LuckySparrow softwarehouse department.",
    "",
    "The standard now exists in `docs/softwarehouse/` and materialized agent prompts. This parent issue tracks runtime enforcement, templates, metrics, and source-of-truth sync so the standard becomes behavior.",
    "",
    "Required final state:",
    "- agents cannot treat DONE as complete without proof;",
    "- issue templates guide PDCA/DoR/DoD from intake;",
    "- release/DORA evidence is structured;",
    "- process/role drift is audited;",
    "- Roost/CompanyCore source-of-truth sync has an implementation plan;",
    "- push/deploy gates remain blocked until release governor and Coolify readiness are green.",
  ].join("\n"),
  projectId: operatingProject.id,
  goalId: goal.id,
  assigneeAgentId: agent.portfolio?.id ?? null,
  priority: "critical",
  status: "todo",
});

await ensureIssueDocument(parent.id, "plan", "Operating Standard Enforcement Plan", [
  "# Operating Standard Enforcement Plan",
  "",
  "## Objective",
  "",
  "Convert the documented Paperclip Softwarehouse standard into runtime behavior and agent-owned delivery lanes.",
  "",
  "## Work packages",
  "",
  "1. Runtime DONE proof enforcement.",
  "2. Issue templates and PDCA intake defaults.",
  "3. DORA/release evidence fields.",
  "4. Process and role drift audit.",
  "5. Roost/CompanyCore source-of-truth sync plan.",
  "6. Autonomous coordination control tick refresh.",
  "",
  "## Global gates",
  "",
  "- No production mutation without release mutation permit.",
  "- No push/deploy while readiness snapshot lists those actions as forbidden.",
  "- No DONE without evidence.",
  "- No broad super-agent expansion; use role-owned lanes.",
].join("\n"));

const children = [
  {
    title: "[Softwarehouse][OS] Runtime DONE proof enforcement",
    owner: agent.runtime ?? agent.backend,
    priority: "critical",
    packet: workPacket({
      processClass: "Implementation / Quality gates / Continuous improvement",
      owner: "AI Agent Runtime Engineer with Backend API Engineer review and QA acceptance",
      objective: "Design and implement the smallest safe runtime enforcement path so issue completion requires evidence or an explicit no-proof blocker path.",
      verification: "`pnpm softwarehouse:operating-standard-audit`, targeted route/service tests, and a manual API scenario proving DONE without proof is rejected or routed to review/blocker.",
      acceptance: [
        "completion path documents or enforces evidence expectations",
        "DONE without proof has a blocked/review path rather than silent closure",
        "tests or explicit implementation blockers are recorded",
        "QA has a named acceptance handoff",
      ],
      forbidden: ["breaking existing terminal-state recovery semantics", "production mutation", "push/deploy"],
    }),
  },
  {
    title: "[Softwarehouse][OS] PDCA issue templates and intake defaults",
    owner: agent.product ?? agent.docs,
    priority: "high",
    packet: workPacket({
      processClass: "Intake and requirements / Documentation",
      owner: "Product Lead with Docs Memory Lead support",
      objective: "Wire or document issue templates so task, bug, feature, QA, release, and work-report formats are available at intake and handoff.",
      verification: "`docs/softwarehouse/templates/` reviewed, issue-template surface or documented operator path exists, and one sample Paperclip issue document uses the template.",
      acceptance: [
        "task intake includes process class, PDCA, DoR, acceptance, risk, and verification",
        "bug and feature templates are discoverable",
        "work-report template is linked from the operating standard",
        "remaining UI/API integration gap is captured if not implemented in this lane",
      ],
      forbidden: ["large UI redesign", "unrelated issue-board refactor"],
    }),
  },
  {
    title: "[Softwarehouse][OS] DORA and release evidence structure",
    owner: agent.ops,
    priority: "high",
    packet: workPacket({
      processClass: "DevOps and deployment / Metrics",
      owner: "Ops Release Lead with Security Review Lead gate review",
      objective: "Create the lightweight release/DORA evidence structure used by deploy and source-control closure reports.",
      verification: "release checklist, DORA field definitions, and one dry-run release evidence example exist; readiness snapshot still blocks push/deploy until gates are green.",
      acceptance: [
        "deployment frequency, lead time, change failure rate, MTTR, and reliability fields are defined",
        "release checklist includes source SHA, build, tests, env, migration, rollback, smoke",
        "Security review stop conditions are linked",
        "push/deploy gate policy remains explicit",
      ],
      forbidden: ["actual deploy", "push", "secret disclosure", "production mutation"],
    }),
  },
  {
    title: "[Softwarehouse][OS] Process and role drift audit",
    owner: agent.cto ?? agent.docs,
    priority: "high",
    packet: workPacket({
      processClass: "Continuous improvement / Agent health and model governance",
      owner: "CTO Architect with Docs Memory Lead",
      objective: "Extend audits so process/role drift is caught: every agent bundle must include operating standard references, every role must map to responsibilities, and process docs must remain complete.",
      verification: "`pnpm softwarehouse:operating-standard-audit` remains green and any new drift checks are covered by script output or tests.",
      acceptance: [
        "agent instruction drift is checked",
        "required docs/templates are checked",
        "role coverage gap is reported or confirmed clean",
        "audit has clear JSON output for automation",
      ],
      forbidden: ["creating new active agents without hiring gate"],
    }),
  },
  {
    title: "[Softwarehouse][OS] Roost CompanyCore source-of-truth sync plan",
    owner: agent.roostPm ?? agent.docs,
    priority: "high",
    packet: workPacket({
      processClass: "Roost / Obsidian / docs sync / Architecture design",
      owner: "Roost Project Manager with Docs Memory Lead and CTO review",
      objective: "Produce the implementation plan for moving operating truth from local docs into Roost/CompanyCore without breaking current Paperclip execution.",
      verification: "plan document exists with source-of-truth entities, sync direction, conflict handling, rollout stages, and first integration issue.",
      acceptance: [
        "Roost-owned entities are named",
        "Paperclip-owned execution state is named",
        "sync boundaries and conflict resolution are defined",
        "first safe adapter/integration lane is proposed",
      ],
      forbidden: ["changing Roost production data", "secrets", "broad implementation before plan acceptance"],
    }),
  },
  {
    title: "[Softwarehouse][OS] Coordination tick for standard adoption",
    owner: agent.portfolio,
    priority: "critical",
    packet: workPacket({
      processClass: "Department management / Continuous improvement",
      owner: "Portfolio Director",
      objective: "Run the control tick after these lanes are created, assign the next legal owner, and prevent duplicate work while existing active runs are supervised.",
      verification: "`pnpm softwarehouse:readiness-snapshot` and `pnpm softwarehouse:control-loop` or a dry-run equivalent produce current next actions.",
      acceptance: [
        "active lanes are visible in Paperclip",
        "no duplicate source-control/deploy lane is started",
        "forbidden push/deploy state is preserved until gates are green",
        "next owner and action are recorded",
      ],
      forbidden: ["push", "deploy", "production mutation", "duplicate source-control cleanup"],
    }),
  },
];

const createdChildren = [];
for (const child of children) {
  const issue = await ensureIssue(company.id, issuesByTitle, {
    title: child.title,
    description: child.packet,
    projectId: operatingProject.id,
    goalId: goal.id,
    parentId: parent.id,
    assigneeAgentId: child.owner?.id ?? null,
    priority: child.priority,
    status: "todo",
  });
  createdChildren.push({
    identifier: issue.identifier,
    title: issue.title,
    status: issue.status,
    assigneeAgentId: issue.assigneeAgentId,
  });
}

console.log(JSON.stringify({
  ok: true,
  apiBase,
  company: { id: company.id, name: company.name },
  project: { id: operatingProject.id, name: operatingProject.name },
  goal: { id: goal.id, title: goal.title },
  parentIssue: { identifier: parent.identifier, title: parent.title, status: parent.status },
  childIssues: createdChildren,
}, null, 2));
