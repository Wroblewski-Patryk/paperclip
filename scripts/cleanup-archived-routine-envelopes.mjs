const apiBase = process.env.PAPERCLIP_API_URL ?? "http://127.0.0.1:3200";
const apply = process.argv.includes("--apply");
const maxActions = Number(process.env.SOFTWAREHOUSE_ARCHIVED_ROUTINE_CLEANUP_MAX_ACTIONS ?? 100);
const openStatuses = ["backlog", "todo", "in_review", "blocked"];

async function request(method, route, body) {
  const response = await fetch(`${apiBase}${route}`, {
    method,
    headers: { "content-type": "application/json" },
    body: body === undefined ? undefined : JSON.stringify(body),
  });
  const text = await response.text();
  if (!response.ok) throw new Error(`${method} ${route} failed with ${response.status}: ${text}`);
  return text ? JSON.parse(text) : null;
}

const health = await request("GET", "/api/health");
if (Number(health?.devServer?.activeRunCount ?? 0) > 0) {
  throw new Error("Refusing archived-routine cleanup while agent runs are active.");
}
const companies = await request("GET", "/api/companies");
const company = companies.find((candidate) => candidate.name === "LuckySparrow") ?? companies[0];
if (!company?.id) throw new Error("No Paperclip company is available.");

const [routines, ...issuePages] = await Promise.all([
  request("GET", `/api/companies/${company.id}/routines`),
  ...openStatuses.map((status) => request("GET", `/api/companies/${company.id}/issues?status=${status}&limit=500`)),
]);
const archivedRoutineIds = new Set(routines.filter((routine) => routine.status === "archived").map((routine) => routine.id));
const candidates = [...new Map(issuePages.flat()
  .filter((issue) => issue?.id && issue.originKind === "routine_execution")
  .filter((issue) => archivedRoutineIds.has(issue.originId))
  .filter((issue) => !issue.activeRun)
  .map((issue) => [issue.id, issue])).values()]
  .sort((left, right) => new Date(left.updatedAt).getTime() - new Date(right.updatedAt).getTime());

if (apply && candidates.length > maxActions) {
  throw new Error(`Refusing ${candidates.length} cancellations; guarded maximum is ${maxActions}. Inspect dry-run output first.`);
}

const applied = [];
if (apply) {
  for (const issue of candidates) {
    await request("POST", `/api/issues/${issue.id}/comments`, {
      body: "Archived routine envelope cancelled during the application-delivery-first cleanup. The originating schedule is disabled; preserved issue history remains evidence, but this envelope is not executable product work.",
    });
    const updated = await request("PATCH", `/api/issues/${issue.id}`, { status: "cancelled" });
    applied.push({ identifier: updated.identifier, title: updated.title, from: issue.status, to: updated.status });
  }
}

console.log(JSON.stringify({
  apiBase,
  companyId: company.id,
  apply,
  activeRunCount: Number(health?.devServer?.activeRunCount ?? 0),
  archivedRoutineCount: archivedRoutineIds.size,
  candidateCount: candidates.length,
  candidates: candidates.map((issue) => ({ identifier: issue.identifier, title: issue.title, status: issue.status, originId: issue.originId })),
  applied,
}, null, 2));
