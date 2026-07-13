const apiBase = process.env.PAPERCLIP_API_URL ?? "http://127.0.0.1:3200";
const companyName = "LuckySparrow Software House";
const companyNames = ["LuckySparrow Software House", "LuckySparrow"];
const companyId = process.env.PAPERCLIP_COMPANY_ID ?? null;
const requestTimeoutMs = Number(process.env.SOFTWAREHOUSE_LONGEVITY_REQUEST_TIMEOUT_MS ?? 15_000);

async function request(method, route, body) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), requestTimeoutMs);
  try {
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
  } catch (error) {
    if (error?.name === "AbortError") {
      throw new Error(`${method} ${route} timed out after ${requestTimeoutMs}ms`);
    }
    throw error;
  } finally {
    clearTimeout(timer);
  }
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
  const scheduleTriggers = detail.triggers?.filter((trigger) => trigger.kind === "schedule") ?? [];
  const existing = scheduleTriggers.find((trigger) => trigger.label === input.label)
    ?? (scheduleTriggers.length === 1 ? scheduleTriggers[0] : null);
  if (existing) return request("PATCH", `/api/routine-triggers/${existing.id}`, input);
  return request("POST", `/api/routines/${routineId}/triggers`, { kind: "schedule", ...input });
}

async function resolveCompany() {
  if (companyId) return { id: companyId, source: "PAPERCLIP_COMPANY_ID" };

  const companies = await request("GET", "/api/companies");
  const company = companies.find((candidate) => companyNames.includes(candidate.name))
    ?? companies.find((candidate) => /^LuckySparrow\b/i.test(candidate.name));
  if (!company) throw new Error(`Company not found: ${companyNames.join(" / ")}`);
  return { id: company.id, source: "company_name" };
}

const company = await resolveCompany();

const [agents, projects, goals, routines] = await Promise.all([
  request("GET", `/api/companies/${company.id}/agents`),
  request("GET", `/api/companies/${company.id}/projects`),
  request("GET", `/api/companies/${company.id}/goals`),
  request("GET", `/api/companies/${company.id}/routines`),
]);

const operating = byNameOrUrlKey(projects, ["Softwarehouse Operating System", "Softwarehouse", "00 General: Softwarehouse"], ["softwarehouse"]);
if (!operating) throw new Error("Softwarehouse operating project not found.");
const portfolio = byName(agents, "11 IPM (Innovation Portfolio Manager)") ?? byName(agents, "Portfolio Director");
const cto = byName(agents, "09 CTO (Chief Technology Officer)") ?? byName(agents, "CTO Architect");
const docs = byName(agents, "04 DSM (Documentation Steward)") ?? byName(agents, "Docs Memory Lead");
const aiAgentManager = byName(agents, "06 AIM (AI Agent Manager)");
const chro = byName(agents, "06 CHRO (Chief Human Resources Officer)");
const aiAgentDevelopment = byName(agents, "06 AID (AI Agent Development Partner)");

const goalsByTitle = new Map(goals.map((goal) => [goal.title, goal]));
const longevityGoal = await ensureGoal(company.id, goalsByTitle, {
  title: "Softwarehouse long-term autonomy and self-maintenance",
  description: [
    "Keep the local LuckySparrow Software House alive for years: snapshots, doctor/watchdog checks, learning loop, project lifecycle hygiene, and upgrade-drift awareness.",
    "This goal does not permit production mutation, secret disclosure, paid account changes, or destructive repository actions.",
  ].join("\n"),
  level: "company",
  status: "active",
  ownerAgentId: portfolio?.id ?? cto?.id ?? null,
});

const routinesByTitle = new Map(routines.map((routine) => [routine.title, routine]));
const specs = [
  {
    title: "[Softwarehouse] Longevity doctor and watchdog",
    assignee: cto ?? portfolio,
    priority: "critical",
    description: [
      "Run the local longevity doctor/watchdog for Paperclip as an autonomous softwarehouse control plane.",
      "It checks Paperclip API health, restartRequired, live-run WIP, stale issue state, target project workspace policies, core routines, snapshot export, operating docs/ADR/evidence-map, softwarehouse autonomy audit, Coolify runtime access, project-truth indexes, policy gate specs, and deployment/source-control posture.",
      "When a gap is detected, route or create constructive repair work through Paperclip issues/routines rather than treating the gap as an excuse to stall.",
      "The watchdog must keep checking whether Paperclip can autonomously create apps locally with explicit agent operating records, task/run/event evidence, QA/security/docs gates, supervisor review, deployment monitoring, retrospectives, and process-improvement loops.",
      "If the API is unreachable or restartRequired is true, write a safe restart request only; do not restart production apps or touch secrets.",
      "Heavy recursive control-tick execution is opt-in with SOFTWAREHOUSE_LONGEVITY_RUN_CONTROL_TICK=true; routine runs still inspect the rest of the softwarehouse contract by default.",
      "Command: `node scripts/run-softwarehouse-longevity-doctor.mjs --apply`.",
    ].join("\n"),
    schedule: ["Hourly longevity doctor", "20 * * * *"],
  },
  {
    title: "[Softwarehouse] Continuation watchdog",
    assignee: portfolio ?? cto,
    priority: "critical",
    description: [
      "Keep the softwarehouse from going idle while current Soar/Roost delivery gaps still have legal non-production work.",
      "Run `pnpm run softwarehouse:continuation-watchdog` and follow its output.",
      "The watchdog must not start duplicate owner work when live runs exist. When no live runs exist, it may apply the next legal action selected by `softwarehouse:next-legal-action:apply`.",
      "After each cycle, the watchdog must return its own recurring issue to `todo` with a clear final disposition. It must never stay `in_progress` between scheduled runs or create a missing-disposition recovery loop.",
      "Allowed actions are limited to Paperclip issue/routine routing, project-truth proof/repair lane creation, control packet refresh, and local non-production evidence work.",
      "Forbidden without a fresh accepted gate fact: push, deploy, restart, rollback, protected smoke, live account mutation, secret disclosure, or destructive repository changes.",
    ].join("\n"),
    schedule: ["Every 5 minutes continuation watchdog", "*/5 * * * *"],
  },
  {
    title: "[Softwarehouse] Longevity snapshot backup",
    assignee: docs ?? portfolio,
    priority: "high",
    description: [
      "Export a redacted local snapshot of the Paperclip softwarehouse control plane.",
      "This preserves project, issue, routine, agent, goal, label, live-run, and secret-key metadata without secret values.",
      "Command: `node scripts/export-softwarehouse-longevity-snapshot.mjs`.",
    ].join("\n"),
    schedule: ["Daily redacted longevity snapshot", "10 3 * * *"],
  },
  {
    title: "[Softwarehouse] Organizational learning loop",
    assignee: docs ?? cto ?? portfolio,
    priority: "high",
    description: [
      "Detect repeated blockers, repeated proof gaps, vague handoffs, missing owners, and role/process drift.",
      "Create capability-gap issues only when a repeated pattern needs a process, role, routine, instruction, or template improvement.",
      "Command: `node scripts/run-softwarehouse-learning-loop.mjs --apply`.",
    ].join("\n"),
    schedule: ["Daily learning loop", "40 3 * * *"],
  },
  {
    title: "[Softwarehouse] AI-agent development review",
    assignee: aiAgentDevelopment ?? aiAgentManager ?? chro ?? docs ?? cto ?? portfolio,
    priority: "high",
    description: [
      "Review recent completed, blocked, reopened, and productivity-review issues for repeatable AI-agent improvement lessons.",
      "Apply at most one low-risk durable instruction/skill/routine update, propose up to three governed follow-ups, or explicitly record that no durable change is justified.",
      "Use the agent-development-review skill and stay inside CHRO/AID authority boundaries.",
    ].join("\n"),
    schedule: ["Daily AI-agent development review", "25 4 * * *"],
  },
];

const results = [];
for (const spec of specs) {
  const routine = await ensureRoutine(company.id, routinesByTitle, {
    title: spec.title,
    description: spec.description,
    projectId: operating.id,
    goalId: longevityGoal.id,
    assigneeAgentId: spec.assignee?.id ?? null,
    priority: spec.priority,
    status: "active",
    concurrencyPolicy: "reuse_idle_issue",
    catchUpPolicy: "skip_missed",
  });
  await ensureScheduleTrigger(routine.id, {
    label: spec.schedule[0],
    enabled: true,
    cronExpression: spec.schedule[1],
    timezone: "Europe/Berlin",
  });
  results.push({ title: routine.title, id: routine.id, status: routine.status });
}

console.log(JSON.stringify({
  apiBase,
  company: { id: company.id, name: company.name },
  goal: { id: longevityGoal.id, title: longevityGoal.title },
  routines: results,
}, null, 2));
