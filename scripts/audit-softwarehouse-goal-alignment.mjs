import { buildSoftwarehouseGoalAlignmentPlan } from "./lib/softwarehouse-goal-alignment.mjs";

const apiBase = process.env.PAPERCLIP_API_URL ?? "http://127.0.0.1:3200";
const apply = process.argv.includes("--apply");
const companyNames = ["LuckySparrow", "LuckySparrow Software House"];

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

const companies = await request("GET", "/api/companies");
const company = companies.find((candidate) => companyNames.includes(candidate.name));
if (!company) throw new Error(`Company not found: ${companyNames.join(" / ")}`);

const [health, goals, projects, routines, issues] = await Promise.all([
  request("GET", "/api/health"),
  request("GET", `/api/companies/${company.id}/goals`),
  request("GET", `/api/companies/${company.id}/projects`),
  request("GET", `/api/companies/${company.id}/routines`),
  request("GET", `/api/companies/${company.id}/issues?limit=3000`),
]);
const plan = buildSoftwarehouseGoalAlignmentPlan({ goals, projects, routines, issues });
if (plan.missingGoals.length > 0) throw new Error(`Missing canonical goals: ${plan.missingGoals.join(", ")}`);

if (apply) {
  const activeRunCount = Number(health.devServer?.activeRunCount ?? 0);
  if (activeRunCount > 0) throw new Error(`Refusing goal alignment while ${activeRunCount} run(s) are active.`);
  for (const action of plan.projectUpdates) await request("PATCH", `/api/projects/${action.id}`, { goalIds: action.goalIds });
  for (const action of plan.routineUpdates) await request("PATCH", `/api/routines/${action.id}`, { goalId: action.goalId });
  for (const action of plan.issueUpdates) await request("PATCH", `/api/issues/${action.id}`, { goalId: action.goalId });
  for (const action of plan.goalUpdates) await request("PATCH", `/api/goals/${action.id}`, { status: action.status });
}

console.log(JSON.stringify({
  apiBase,
  apply,
  company: { id: company.id, name: company.name },
  activeRunCount: Number(health.devServer?.activeRunCount ?? 0),
  counts: Object.fromEntries(Object.entries(plan).map(([key, value]) => [key, value.length])),
  plan,
}, null, 2));
