import {
  softwarehousePilotActiveRoutineTitles,
  softwarehousePilotRoutineScheduleLabels,
} from "./lib/softwarehouse-active-routines.mjs";

const apiBase = process.env.PAPERCLIP_API_URL ?? "http://127.0.0.1:3200";
const companyNames = ["LuckySparrow", "LuckySparrow Software House"];
const companyId = process.env.PAPERCLIP_COMPANY_ID ?? null;

const activeRoutineTitles = softwarehousePilotActiveRoutineTitles;
const canonicalScheduleByRoutineTitle = softwarehousePilotRoutineScheduleLabels;

const parallelExecutionPolicy = [
  "",
  "",
  "Parallel execution policy: Paperclip may run independent lanes in parallel according to agent/runtime limits.",
  "Keep one active execution lane per agent and serialize conflicting work in the same project workspace.",
  "Pending interactions and protected operator gates stay fail-closed; they never authorize push, deploy, restart, secret access, or destructive changes.",
  "Use the current control brief and next legal actions as the execution contract; detailed policy remains in agent instructions, not duplicated in every routine.",
  "Status synchronization is not work. Finish each cycle with one explicit disposition and inspectable evidence.",
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

function withParallelExecutionPolicy(description) {
  const text = description ?? "";
  const withoutOldPolicy = text
    .replace(/\n\nCapacity governor:[\s\S]*?Done issues stay done unless explicit reopen\/resume intent moves them through todo before live checkout\./g, "")
    .replace(/\n\nParallel execution policy:[\s\S]*?Done issues stay done unless explicit reopen\/resume intent moves them through todo before live checkout\./g, "");
  return `${withoutOldPolicy}${parallelExecutionPolicy}`.trim();
}

async function resolveCompany() {
  if (companyId) return { id: companyId, source: "PAPERCLIP_COMPANY_ID" };

  const companies = await request("GET", "/api/companies");
  const company = companies.find((candidate) => companyNames.includes(candidate.name));
  if (!company) throw new Error(`Company not found: ${companyNames.join(" or ")}`);
  return { id: company.id, source: "company_name" };
}

const company = await resolveCompany();

const [health, liveRuns, routines] = await Promise.all([
  request("GET", "/api/health"),
  request("GET", `/api/companies/${company.id}/live-runs`),
  request("GET", `/api/companies/${company.id}/routines`),
]);

const liveRunCount = Array.isArray(liveRuns) ? liveRuns.length : 0;
const activeRunCount = Math.max(Number(health.devServer?.activeRunCount ?? 0), liveRunCount);
if (activeRunCount > 0) {
  console.error(`Refusing to rewrite routine posture while ${activeRunCount} run(s) are active.`);
  process.exit(2);
}

const updates = [];
for (const routine of routines) {
  const shouldBeActive = activeRoutineTitles.has(routine.title);
  const nextStatus = shouldBeActive ? "active" : "archived";
  const patch = {};
  if (routine.status !== nextStatus) patch.status = nextStatus;
  if (shouldBeActive) {
    const nextDescription = withParallelExecutionPolicy(routine.description);
    if (nextDescription !== (routine.description ?? "")) patch.description = nextDescription;
  }

  if (Object.keys(patch).length > 0) {
    const updated = await request("PATCH", `/api/routines/${routine.id}`, patch);
    updates.push({ title: routine.title, from: routine.status, to: updated.status });
  }

  const detail = await request("GET", `/api/routines/${routine.id}`);
  const canonicalScheduleLabel = canonicalScheduleByRoutineTitle.get(routine.title) ?? null;
  for (const trigger of detail.triggers ?? []) {
    if (trigger.kind !== "schedule") continue;
    const shouldEnableTrigger = shouldBeActive && trigger.label === canonicalScheduleLabel;
    if (trigger.enabled === shouldEnableTrigger) continue;
    await request("PATCH", `/api/routine-triggers/${trigger.id}`, {
      label: trigger.label,
      enabled: shouldEnableTrigger,
      cronExpression: trigger.cronExpression,
      timezone: trigger.timezone,
    });
    updates.push({
      title: routine.title,
      trigger: trigger.label,
      enabled: shouldEnableTrigger,
    });
  }
}

const finalRoutines = await request("GET", `/api/companies/${company.id}/routines`);
const activeRoutines = finalRoutines.filter((routine) => routine.status === "active").map((routine) => routine.title);

console.log(JSON.stringify({
  apiBase,
  company: { id: company.id, name: company.name },
  activeRunCount,
  liveRunCount,
  updates,
  activeRoutines,
  archivedRoutineCount: finalRoutines.filter((routine) => routine.status === "archived").length,
}, null, 2));
