import { softwarehousePilotActiveRoutineTitles } from "./lib/softwarehouse-active-routines.mjs";

const apiBase = process.env.PAPERCLIP_API_URL ?? "http://127.0.0.1:3200";
const companyNames = ["LuckySparrow", "LuckySparrow Software House"];
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

function byTitle(items, title) {
  return items.find((item) => item.title === title);
}

const activeRoutineTitles = softwarehousePilotActiveRoutineTitles;

const parallelExecutionPolicy = [
  "",
  "",
  "Parallel execution policy: Paperclip may run independent lanes in parallel according to agent/runtime limits.",
  "Do not impose a global one-lane or five-lane cap. Supervisors should prevent duplicate work, dependency conflicts, and unsafe production mutations.",
  "Done issues stay done unless explicit reopen/resume intent moves them through todo before live checkout.",
].join("\n");

function withParallelExecutionPolicy(description) {
  if (description.includes("Parallel execution policy:")) return description;
  const withoutOldPolicy = description.replace(/\n\nCapacity governor:[\s\S]*?Done issues stay done unless explicit reopen\/resume intent moves them through todo before live checkout\./g, "");
  return `${withoutOldPolicy}${parallelExecutionPolicy}`;
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
  if (existing) return request("PATCH", `/api/routine-triggers/${existing.id}`, input);
  return request("POST", `/api/routines/${routineId}/triggers`, {
    kind: "schedule",
    ...input,
  });
}

async function upsertDocument(issueId, key, title, body) {
  const docs = await request("GET", `/api/issues/${issueId}/documents`);
  const existing = docs.find((doc) => doc.key === key);
  return request("PUT", `/api/issues/${issueId}/documents/${encodeURIComponent(key)}`, {
    title,
    format: "markdown",
    body,
    changeSummary: "Refresh softwarehouse operating process document",
    baseRevisionId: existing?.latestRevisionId ?? undefined,
  });
}

async function resolveCompany() {
  if (companyId) return { id: companyId, source: "PAPERCLIP_COMPANY_ID" };

  const companies = await request("GET", "/api/companies");
  const company = companies.find((candidate) => companyNames.includes(candidate.name));
  if (!company) throw new Error(`Company not found: ${companyNames.join(" or ")}`);
  return { id: company.id, source: "company_name" };
}

const company = await resolveCompany();

const [agents, projects, goals, issues, routines] = await Promise.all([
  request("GET", `/api/companies/${company.id}/agents`),
  request("GET", `/api/companies/${company.id}/projects`),
  request("GET", `/api/companies/${company.id}/goals`),
  request("GET", `/api/companies/${company.id}/issues`),
  request("GET", `/api/companies/${company.id}/routines`),
]);

const operating = byNameOrUrlKey(projects, ["Softwarehouse Operating System", "Softwarehouse"], ["softwarehouse"]);
if (!operating) throw new Error("Softwarehouse Operating System project not found.");

const agent = {
  portfolio: byName(agents, "Portfolio Director"),
  pm: byName(agents, "Soar Project Manager"),
  cto: byName(agents, "CTO Architect"),
  delivery: byName(agents, "Engineering Delivery Lead"),
  qa: byName(agents, "QA Regression Lead"),
  security: byName(agents, "Security Review Lead"),
  ops: byName(agents, "Ops Release Lead"),
  docs: byName(agents, "Docs Memory Lead"),
};

const goalsByTitle = new Map(goals.map((goal) => [goal.title, goal]));
const processGoal = await ensureGoal(company.id, goalsByTitle, {
  title: "Softwarehouse operating cadence",
  description: [
    "Keep LuckySparrow Software House moving through repeatable operating processes instead of manual nudges.",
    "Every active project should have a PM, no-stall loop, delivery gap loop, QA/release gates, docs memory, and clear escalation rules.",
  ].join("\n"),
  level: "company",
  status: "active",
  ownerAgentId: agent.portfolio?.id ?? null,
});

const issuesByTitle = new Map(issues.map((issue) => [issue.title, issue]));
const parent = await ensureIssue(company.id, issuesByTitle, {
  title: "[Softwarehouse][Process] Operating process registry",
  description: [
    "Own the company process registry and ensure Paperclip routines match the documented operating model.",
    "",
    "Required result: company-level processes exist for control, no-stall hygiene, delivery gaps, health/model audit, intake/index sync, release governance, docs memory, and retrospective improvement.",
  ].join("\n"),
  projectId: operating.id,
  goalId: processGoal.id,
  assigneeAgentId: agent.portfolio?.id ?? null,
  priority: "critical",
  status: "todo",
});

const processIssues = [
  ["[Softwarehouse][Process] Daily company control loop", agent.portfolio, "Portfolio checks active projects, stalled queues, routine output, whether Soar/Roost have useful PM ownership, whether parked apps remain quiet, and whether project gates are clear enough for the next safe local delivery lane."],
  ["[Softwarehouse][Process] Architecture awareness graph sync", agent.cto, "Maintain the canonical project organism graph: entities, relations, statuses, owners, dependencies, evidence, exports, and architecture health signals."],
  ["[Softwarehouse][Process] Project no-stall loop", agent.pm ?? agent.portfolio, "Project manager runs active takeover control every 30 minutes: every open lane must have an owner, expected output, evidence contract, and valid next integration point."],
  ["[Softwarehouse][Process] Delivery gap loop", agent.delivery, "Engineering Delivery Lead converts failed proof and ambiguous parent state into one-owner repair/proof lanes with dependency order and parent disposition updates."],
  ["[Softwarehouse][Process] Stale board janitor", agent.pm ?? agent.portfolio, "Find stale in_progress without live runs, blocked issues without owner/unblock action, done without proof, and open issues without assignee."],
  ["[Softwarehouse][Process] Agent health and model governance", agent.cto, "Check adapter health, model policy, Spark drift, role/runtime alignment, and error states."],
  ["[Softwarehouse][Process] Regression evidence loop", agent.qa, "QA refreshes baseline proof for protected workflows and converts each failure into a named repair owner with verification expectations."],
  ["[Softwarehouse][Process] Project intake and workspace boundary sync", agent.portfolio, "Keep Paperclip projects aligned with approved workspace roots, keep parked apps quiet, and decide which project may enter active takeover after Soar."],
  ["[Softwarehouse][Process] Release and deploy governance", agent.ops, "Keep Coolify/VPS/deploy/rollback/smoke rules explicit and block unsafe production changes."],
  ["[Softwarehouse][Process] Docs and memory loop", agent.docs, "Keep maps, ledgers, indexes, issue documents, and process registry aligned with current execution truth and verification evidence."],
  ["[Softwarehouse][Process] Retrospective and template feedback", agent.docs, "Convert stalls, repeated fixes, and useful Soar lessons into SOP, instruction, and !template improvements."],
];

const children = [];
for (const [title, owner, description] of processIssues) {
  children.push(await ensureIssue(company.id, issuesByTitle, {
    title,
    description,
    projectId: operating.id,
    goalId: processGoal.id,
    parentId: parent.id,
    assigneeAgentId: owner?.id ?? null,
    priority: title.includes("Stale") || title.includes("Agent health") ? "critical" : "high",
    status: "todo",
  }));
}

await upsertDocument(parent.id, "softwarehouse-operating-processes", "Softwarehouse Operating Processes", [
  "# Softwarehouse Operating Processes",
  "",
  "Canonical file: `softwarehouse/operating-processes.md`.",
  "",
  "## Up-Down-Up Loop",
  "",
  "`Portfolio/PM -> Delivery -> Specialist -> QA/Ops/Security -> Delivery -> PM -> Docs/Memory -> Portfolio`",
  "",
  "## Active Company Processes",
  "",
  "| Process | Owner | Cadence |",
  "| --- | --- | --- |",
  "| Daily company control loop | Portfolio Director | Archived library routine; autonomy governor owns the active cadence |",
  "| Architecture awareness graph sync | CTO Architect + Docs Memory Lead | Archived library routine; run manually when architecture exports need a focused refresh |",
  "| Project no-stall loop | Soar Project Manager | Archived library routine; autonomy governor owns no-stall selection |",
  "| Delivery gap loop | Engineering Delivery Lead | Archived library routine; gate freshness watcher and autonomy governor own active delivery triage |",
  "| Stale board janitor | Soar Project Manager / Portfolio Director | Active, hourly |",
  "| Agent health and model governance | CTO Architect | Daily 08:00 |",
  "| Regression evidence loop | QA Regression Lead | Archived library routine; create explicit one-owner QA lanes instead |",
  "| Project intake and workspace boundary sync | Portfolio Director | Archived library routine |",
  "| Release and deploy governance | Ops Release Lead | Archived library routine; gate freshness watcher owns active deploy checks |",
  "| Docs and memory loop | Docs Memory Lead | Active, daily 14:00 |",
  "| Retrospective and template feedback | Docs Memory Lead | Archived library routine |",
  "",
  "## State Rules",
  "",
  "- `in_progress` requires a live run.",
  "- Paperclip may run independent lanes in parallel according to agent/runtime limits; coordination blocks only duplicate, dependency-conflicting, or unsafe work.",
  "- Blocked issues require owner and unblock action.",
  "- Done issues require evidence.",
  "- Tasks must link to architecture entities or explicitly request graph reconciliation.",
  "- Architecture graph exports must exist for every active takeover project.",
  "- Routine issues are checkpoints; recurrence belongs to the routine.",
  "- If Soar V1 is not verified and no work is active, PM/Delivery must create or restart the next smallest proof/repair lane.",
].join("\n"));

const routinesByTitle = new Map(routines.map((routine) => [routine.title, routine]));
const routineSpecs = [
  {
    title: "[Softwarehouse] Daily company control loop",
    description: "Portfolio daily operating check: active project focus, stalled queues, routine output, unresolved blockers, and whether the company is actually moving toward Soar V1.",
    assigneeAgentId: agent.portfolio?.id ?? null,
    priority: "critical",
    schedule: ["Daily company control at 08:30", "30 8 * * *"],
  },
  {
    title: "[Softwarehouse] Architecture awareness graph sync",
    description: [
      "CTO/Docs Memory graph sync routine. Maintain the Architectural Awareness Layer for the active project.",
      "Run `pnpm softwarehouse:architecture-lifecycle` first to see which controlled projects are missing or stale.",
      "When safe, run `pnpm softwarehouse:architecture-lifecycle:apply`; otherwise create one-owner graph-refresh blockers for projects that cannot be refreshed.",
      "Review generated graph exports, dependency report, ownership report, proof register, health JSON, and task synchronization report.",
      "Required output: updated/validated architecture-awareness exports, missing proof signals, task/entity linkage gaps, and next owner/action. Do not code features in this routine.",
    ].join("\\n"),
    assigneeAgentId: agent.cto?.id ?? null,
    priority: "critical",
    schedule: ["Architecture awareness graph sync every 6 hours", "10 */6 * * *"],
  },
  {
    title: "[Softwarehouse] Project no-stall loop",
    description: "Project manager lane-control routine during active takeover. Every open issue lane must have one owner, expected output, proof requirement, and valid next integration path; stale in_progress state is corrected immediately.",
    assigneeAgentId: agent.pm?.id ?? agent.portfolio?.id ?? null,
    priority: "critical",
    schedule: ["Project no-stall control every 30 minutes", "0,30 * * * *"],
  },
  {
    title: "[Softwarehouse] Delivery gap loop",
    description: "Engineering Delivery routine to convert failed proof and ambiguous parent state into one-owner repair/proof tasks with dependency order and parent disposition updates.",
    assigneeAgentId: agent.delivery?.id ?? null,
    priority: "critical",
    schedule: ["Delivery gap loop every 2 hours", "15 */2 * * *"],
  },
  {
    title: "[Softwarehouse] Stale board janitor",
    description: "Company-wide stale state cleanup. Run `node scripts/run-live-run-janitor.mjs` first; apply only for closed-issue live-run tails or governor self-supervision loops that the dry-run names. Then find in_progress without live run, missing owner, blocked without unblock action, done without proof, and parent/controller issues pretending to be active.",
    assigneeAgentId: agent.pm?.id ?? agent.portfolio?.id ?? null,
    priority: "critical",
    schedule: ["Hourly stale board janitor", "5 * * * *"],
  },
  {
    title: "[Softwarehouse] Agent health and model governance",
    description: "Check adapter health, agent error states, model policy, Spark drift, Codex command paths, and role/runtime alignment. Repair safe config drift or create blockers.",
    assigneeAgentId: agent.cto?.id ?? null,
    priority: "critical",
    schedule: ["Daily agent health and model audit at 08:00", "0 8 * * *"],
  },
  {
    title: "[Softwarehouse] Regression evidence loop",
    description: "QA routine to refresh proof on critical workflows, convert failures into repair issues with accountable owners, and prevent repeated unknown-state regressions.",
    assigneeAgentId: agent.qa?.id ?? null,
    priority: "high",
    schedule: ["Daily regression evidence loop at 11:00", "0 11 * * *"],
  },
  {
    title: "[Softwarehouse] Project intake and workspace boundary sync",
    description: "Run `pnpm run softwarehouse:workspace-boundary-audit`, keep active Paperclip projects inside approved roots, keep parked sibling app folders untouched, and name the next takeover candidate without starting it.",
    assigneeAgentId: agent.portfolio?.id ?? null,
    priority: "high",
    schedule: ["Daily project intake and index sync at 09:00", "0 9 * * *"],
  },
  {
    title: "[Softwarehouse] Release and deploy governance audit",
    description: "Ops checks deploy hygiene, Coolify/VPS readiness, dirty-worktree risk, commit/push/deploy evidence, rollback path, and production smoke posture across active projects.",
    assigneeAgentId: agent.ops?.id ?? null,
    priority: "high",
    schedule: ["Daily release governance at 12:30", "30 12 * * *"],
  },
  {
    title: "[Softwarehouse] Docs and memory loop",
    description: "Docs Memory routine to keep operating docs, ledgers, maps, and indexes synchronized with issue graph truth and verification evidence.",
    assigneeAgentId: agent.docs?.id ?? null,
    priority: "high",
    schedule: ["Daily docs and memory loop at 14:00", "0 14 * * *"],
  },
  {
    title: "[Softwarehouse] Weekly retrospective and SOP update",
    description: "Docs Memory reviews stalls, repeated fixes, missing process coverage, template feedback, and updates operating docs/instructions or creates process improvement tasks.",
    assigneeAgentId: agent.docs?.id ?? null,
    priority: "medium",
    schedule: ["Weekly retrospective and SOP update on Friday", "0 15 * * 5"],
  },
];

const createdRoutines = [];
for (const spec of routineSpecs) {
  const active = activeRoutineTitles.has(spec.title);
  const routine = await ensureRoutine(company.id, routinesByTitle, {
    title: spec.title,
    description: withParallelExecutionPolicy(spec.description),
    projectId: operating.id,
    goalId: processGoal.id,
    parentIssueId: parent.id,
    assigneeAgentId: spec.assigneeAgentId,
    priority: spec.priority,
    status: active ? "active" : "archived",
    concurrencyPolicy: "coalesce_if_active",
    catchUpPolicy: "skip_missed",
  });
  await ensureScheduleTrigger(routine.id, {
    label: spec.schedule[0],
    enabled: active,
    cronExpression: spec.schedule[1],
    timezone: "Europe/Berlin",
  });
  createdRoutines.push(routine.title);
}

console.log(JSON.stringify({
  apiBase,
  company: { id: company.id, name: company.name },
  project: { id: operating.id, name: operating.name },
  goal: processGoal.title,
  parentIssue: parent.title,
  childIssues: children.length,
  routines: createdRoutines,
}, null, 2));
