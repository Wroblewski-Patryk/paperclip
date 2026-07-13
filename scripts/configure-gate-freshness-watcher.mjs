import { softwarehouseGateSpecs } from "./lib/softwarehouse-gates.mjs";

const apiBase = process.env.PAPERCLIP_API_URL ?? "http://127.0.0.1:3200";
const companyNames = [
  process.env.SOFTWAREHOUSE_COMPANY_NAME,
  process.env.PAPERCLIP_COMPANY_NAME,
  "LuckySparrow",
  "LuckySparrow Software House",
].filter(Boolean);
const companyId = process.env.PAPERCLIP_COMPANY_ID ?? null;
const routineTitle = "[Softwarehouse] Gate freshness watcher";
const scheduleLabel = "Every 30 minutes gate freshness watcher";
const scheduleCron = "17,47 * * * *";
const currentRunId = process.env.PAPERCLIP_RUN_ID ?? null;
const requestTimeoutMs = Number(process.env.SOFTWAREHOUSE_GATE_FRESHNESS_REQUEST_TIMEOUT_MS ?? 30_000);
const legacyScheduleLabels = new Set([
  "Hourly gate freshness watcher - quiet unless fresh operator/credential fact exists",
]);

async function request(method, route, body) {
  const headers = { "content-type": "application/json" };
  if (process.env.PAPERCLIP_API_KEY) headers.authorization = `Bearer ${process.env.PAPERCLIP_API_KEY}`;
  if (currentRunId && ["POST", "PATCH", "PUT", "DELETE"].includes(method)) {
    headers["x-paperclip-run-id"] = currentRunId;
  }
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), requestTimeoutMs);
  try {
    const response = await fetch(`${apiBase}${route}`, {
      method,
      headers,
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
    clearTimeout(timeout);
  }
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

function byRosterKey(items, rosterKey) {
  return items.find((item) => item.metadata?.rosterKey === rosterKey);
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
  const trigger = existing
    ? await request("PATCH", `/api/routine-triggers/${existing.id}`, input)
    : await request("POST", `/api/routines/${routineId}/triggers`, {
    kind: "schedule",
    ...input,
  });
  const triggerId = existing?.id ?? trigger?.id ?? trigger?.trigger?.id ?? null;
  const refreshed = await request("GET", `/api/routines/${routineId}`);
  const disabled = [];
  for (const candidate of refreshed.triggers ?? []) {
    if (candidate.kind !== "schedule") continue;
    if (candidate.id === triggerId) continue;
    if (candidate.label === input.label) continue;
    if (!candidate.enabled) continue;
    if (!legacyScheduleLabels.has(candidate.label)) continue;
    await request("PATCH", `/api/routine-triggers/${candidate.id}`, {
      label: candidate.label,
      enabled: false,
      cronExpression: candidate.cronExpression,
      timezone: candidate.timezone,
    });
    disabled.push({ id: candidate.id, label: candidate.label });
  }
  return { trigger, disabledLegacyTriggers: disabled };
}

async function resolveCompany() {
  if (companyId) return { id: companyId, source: "PAPERCLIP_COMPANY_ID" };

  const companies = await request("GET", "/api/companies");
  const company = companies.find((candidate) => companyNames.includes(candidate.name));
  if (!company) throw new Error(`Company not found. Tried: ${companyNames.join(" / ")}`);
  return { id: company.id, source: "company_name" };
}

const company = await resolveCompany();

const [health, liveRuns, agents, projects, goals, routines] = await Promise.all([
  request("GET", "/api/health"),
  request("GET", `/api/companies/${company.id}/live-runs`),
  request("GET", `/api/companies/${company.id}/agents`),
  request("GET", `/api/companies/${company.id}/projects`),
  request("GET", `/api/companies/${company.id}/goals`),
  request("GET", `/api/companies/${company.id}/routines`),
]);

const activeRunCount = health.devServer?.activeRunCount ?? liveRuns.length;
const selfRunCount = liveRuns.filter((run) => currentRunId && run.id === currentRunId).length;
const blockingActiveRunCount = Math.max(0, activeRunCount - selfRunCount);
if (blockingActiveRunCount > 0) {
  throw new Error(`Refusing to reconfigure gate watcher while ${blockingActiveRunCount} non-watcher run(s) are active.`);
}

const activeProjects = projects.filter((project) => !project.archivedAt);
const operating = byNameOrUrlKey(
  activeProjects,
  ["Softwarehouse Operating System", "Softwarehouse", "00 General: Softwarehouse"],
  ["softwarehouse", "00-general-softwarehouse"],
);
const delivery = byName(agents, "Engineering Delivery Lead")
  ?? byNameOrUrlKey(agents, ["04 DPM (Delivery Project Manager)"], ["delivery-project-manager", "04-dpm-delivery-project-manager"])
  ?? byTitle(agents, "Delivery Project Manager")
  ?? byRosterKey(agents, "delivery-project-manager");
const ops = byName(agents, "Ops Release Lead")
  ?? byNameOrUrlKey(agents, ["09 DRE (Deployment & Reliability Engineer)"], ["deployment-reliability-engineer", "09-dre-deployment-reliability-engineer"])
  ?? byTitle(agents, "Deployment & Reliability Engineer")
  ?? byRosterKey(agents, "deployment-reliability-engineer");
const portfolio = byName(agents, "Portfolio Director");
const tsa = byNameOrUrlKey(agents, ["09 TSA (Technical Solution Architect)"], ["technical-solution-architect", "09-tsa-technical-solution-architect"])
  ?? byTitle(agents, "Technical Solution Architect")
  ?? byRosterKey(agents, "technical-solution-architect");
const goal = byTitle(goals, "Softwarehouse operating cadence")
  ?? byTitle(goals, "Soar: sellable or personally excellent product");

if (!operating) throw new Error("Softwarehouse Operating System project not found.");
if (!delivery && !ops && !portfolio && !tsa) throw new Error("No delivery/ops/portfolio/technical architect agent found for gate watcher.");

const description = [
  "Watch external production/protected gates without reading secret values.",
  "",
  "Purpose:",
  "- Turn secure metadata changes into narrow owner-scoped recheck lanes.",
  "- Prevent smoke/deploy/status-sync churn while credentials or approvals have not changed.",
  "- Keep Soar and Roost gates fail-closed until a real new fact exists.",
  "",
  "Mandatory loop:",
  "1. Run `node scripts/run-gate-freshness-watcher.mjs` first. Use `--apply` only when it reports exactly one action and no blocking live runs are active.",
  "2. If active runs are present or active-run telemetry is unknown, supervise only and exit without creating comments unless a run is stale or unsafe.",
  "3. If every gate has `secretUpdatedAfterIssue=false`, do not wake any gated lane. This is a successful quiet outcome.",
  "4. A gate may be resumed only when its relevant credential secret was updated after the latest blocker/status-sync issue update, or when the board/operator explicitly records approval/new evidence in that issue.",
  "5. Updated placeholder/binding metadata is not enough. The latest blocked issue comment must not say that the update was only a placeholder or technical binding sync.",
  "",
  "Gate routing:",
  ...softwarehouseGateSpecs.map((spec) =>
    `- \`${spec.rootBlocker}\` / ${spec.project}: wake only ${spec.owner}. ${spec.allowedAction} ${spec.forbiddenAction}`
  ),
  "",
  "Output contract:",
  "- If no gate is fresh: no issue comment is required.",
  "- If a gate is fresh: identify root blocker, which metadata key changed, chosen owner, exact command/scope, and evidence expected.",
  "- If a gate recheck fails: return the root blocker to `blocked` with exact owner/action and do not retry until the next secret/approval event.",
].join("\n");

const routinesByTitle = new Map(routines.map((routine) => [routine.title, routine]));
const routine = await ensureRoutine(company.id, routinesByTitle, {
  title: routineTitle,
  description,
  projectId: operating.id,
  goalId: goal?.id ?? null,
  assigneeAgentId: delivery?.id ?? ops?.id ?? portfolio?.id ?? tsa?.id ?? null,
  priority: "critical",
  status: "active",
  concurrencyPolicy: "reuse_idle_issue",
  catchUpPolicy: "skip_missed",
});

const triggerResult = await ensureScheduleTrigger(routine.id, {
  label: scheduleLabel,
  enabled: true,
  cronExpression: scheduleCron,
  timezone: "Europe/Berlin",
});
const trigger = triggerResult.trigger?.trigger ?? triggerResult.trigger;

console.log(JSON.stringify({
  apiBase,
  requestTimeoutMs,
  company: { id: company.id, name: company.name },
  activeRunCount,
  blockingActiveRunCount,
  currentRunId,
  routine: { id: routine.id, title: routine.title, status: routine.status },
  trigger: { id: trigger.id, label: trigger.label, enabled: trigger.enabled },
  disabledLegacyTriggers: triggerResult.disabledLegacyTriggers,
}, null, 2));
