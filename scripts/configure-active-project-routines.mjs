import {
  activeApplicationRoutineSpecs,
  softwarehouseActiveApplicationProjectNames,
} from "./lib/softwarehouse-active-routines.mjs";
import { findAgentByNameOrAlias } from "./lib/softwarehouse-agent-resolver.mjs";

const apiBase = process.env.PAPERCLIP_API_URL ?? "http://127.0.0.1:3200";
const companyNames = ["LuckySparrow", "LuckySparrow Software House"];
const companyId = process.env.PAPERCLIP_COMPANY_ID ?? null;
const apply = process.argv.includes("--apply");
const allowActiveRuns = process.argv.includes("--allow-active-runs");

const projectManagerByProject = new Map([
  ["Soar", "Soar Project Manager"],
  ["Roost", "Roost Project Manager"],
  ["Featherly", "Featherly Platform Manager"],
  ["Aviary", "Aviary Project Manager"],
  ["Nest", "Nest Project Manager"],
]);
const projectAliases = new Map([
  ["Soar", ["11 Innovation: Soar", "Soar"]],
  ["Roost", ["11 Innovation: Roost", "Roost"]],
  ["Featherly", ["11 Innovation: Featherly", "Featherly"]],
]);

const cadenceByKind = new Map([
  ["status", "45 9 * * *"],
  ["no-stall", "*/30 * * * *"],
  ["known-state", "20 */6 * * *"],
  ["source-control", "10 */2 * * *"],
]);

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

function routineKind(title) {
  if (title.includes("[PM] No-stall")) return "no-stall";
  if (title.includes("Known-state")) return "known-state";
  if (title.includes("Source-control")) return "source-control";
  return "status";
}

function descriptionFor(projectName, kind) {
  if (kind === "no-stall") {
    return [
      `Strict ${projectName} project-manager no-stall loop.`,
      "Inspect the owner-visible milestone, source/deployed SHA debt, open project issues, live-run state, blockers, stale ownership, and missing worker-ready decomposition.",
      "Prefer the next real product transition in this order: verified implementation, coherent commit, standing-consent push, normal Coolify auto-redeploy, deployed-SHA readback, owner journey, monitoring. Plans, status refreshes, maps, and new child issues are not progress unless they are the exact missing input to that transition.",
      "When a clean non-divergent branch is materially ahead of its deployment branch, reuse the canonical release chain and resolve its first executable blocker before creating any documentation, planning, map-refresh, generic recovery, or parallel release issue.",
      "The PM routine routes one accountable executor; it does not itself edit product code. A qualifying evidence-backed push under standing consent is not an operator gate. Manual deploy/restart/rollback, force-push, secrets, destructive actions, and live-account mutation remain separately gated.",
    ].join(" ");
  }
  if (kind === "known-state") {
    return [
      `${projectName} known-state and architecture/map drift guard.`,
      "Refresh what works, fails, is unknown, or is blocked; compare docs, repository shape, architecture exports, tests, and current target.",
      "Create a follow-up only for a new material fact that changes the next executable product or release action. If source is materially ahead of deployment, do not create docs/map work; update the canonical release chain with the exact blocker instead.",
      "Protected production actions remain gated.",
    ].join(" ");
  }
  if (kind === "source-control") {
    return [
      `${projectName} source-control closure sweep.`,
      "Use the generated source-control packet to classify dirty groups, ownership, evidence, verification needs, commit/no-commit decision, and push/deploy impact.",
      "This routine must distinguish local closure from delivery debt. A clean non-divergent meaningful batch on an owner-controlled deployment branch is routed through the canonical release issue and pushed under standing owner consent without asking again, followed by Coolify/deployed-SHA/owner-journey verification.",
      "It must not create a parallel release tree, force-push, manually deploy/restart/rollback, touch secrets, or overwrite unrelated work. If the standing-consent contract is not satisfied, record exactly one blocker and its new-fact condition.",
    ].join(" ");
  }
  return [
    `Refresh ${projectName} project-manager status, target version, blockers, evidence ledger, next decisions, and specialist lane order.`,
    `Sandbox-safe project-truth refresh (PowerShell from the ${projectName} repository root): $snapshotScript = Join-Path $env:LUCKYSPARROW_SOFTWAREHOUSE_ROOT 'scripts/get-project-truth-repository-snapshot.ps1'; $builder = Join-Path $env:LUCKYSPARROW_SOFTWAREHOUSE_ROOT 'scripts/build-project-truth-indexes.mjs'; $env:PROJECT_TRUTH_REPOSITORY_SNAPSHOT = & $snapshotScript -RepositoryRoot (Get-Location).Path; try { node $builder --project ${projectName} --root (Get-Location).Path --apply } finally { Remove-Item Env:PROJECT_TRUTH_REPOSITORY_SNAPSHOT -ErrorAction SilentlyContinue }`,
    "Do not omit the snapshot when nested Git is denied: the builder now fails explicitly instead of emitting unknown repository identity.",
    "Keep the project active in Paperclip while preserving protected gates for production, secrets, paid/live accounts, and irreversible mutation.",
  ].join(" ");
}

async function ensureGoal(companyId, goalsByTitle, input) {
  const existing = goalsByTitle.get(input.title);
  if (existing) {
    if (!apply) return { ...existing, plannedUpdate: input };
    const updated = await request("PATCH", `/api/goals/${existing.id}`, input);
    goalsByTitle.set(input.title, updated);
    return updated;
  }
  if (!apply) return { id: `preview-goal:${input.title}`, ...input, preview: true };
  const created = await request("POST", `/api/companies/${companyId}/goals`, input);
  goalsByTitle.set(input.title, created);
  return created;
}

async function ensureRoutine(companyId, routinesByTitle, input) {
  const existing = routinesByTitle.get(input.title);
  if (existing) {
    if (!apply) return { ...existing, plannedUpdate: input };
    const updated = await request("PATCH", `/api/routines/${existing.id}`, input);
    routinesByTitle.set(input.title, updated);
    return updated;
  }
  if (!apply) return { id: `preview-routine:${input.title}`, ...input, preview: true };
  const created = await request("POST", `/api/companies/${companyId}/routines`, input);
  routinesByTitle.set(input.title, created);
  return created;
}

async function ensureScheduleTrigger(routineId, input) {
  if (!apply) return { routineId, ...input, preview: true };
  const detail = await request("GET", `/api/routines/${routineId}`);
  const existing = detail.triggers?.find((trigger) => trigger.kind === "schedule" && trigger.label === input.label);
  if (existing) return request("PATCH", `/api/routine-triggers/${existing.id}`, input);
  return request("POST", `/api/routines/${routineId}/triggers`, {
    kind: "schedule",
    ...input,
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

const [health, liveRuns, agents, projects, goals, routines] = await Promise.all([
  request("GET", "/api/health"),
  request("GET", `/api/companies/${company.id}/live-runs`),
  request("GET", `/api/companies/${company.id}/agents`),
  request("GET", `/api/companies/${company.id}/projects`),
  request("GET", `/api/companies/${company.id}/goals`),
  request("GET", `/api/companies/${company.id}/routines`),
]);

const liveRunCount = Array.isArray(liveRuns) ? liveRuns.length : 0;
const activeRunCount = Math.max(Number(health.devServer?.activeRunCount ?? 0), liveRunCount);
if (apply && activeRunCount > 0 && !allowActiveRuns) {
  console.error(`Refusing to configure active project routines while ${activeRunCount} run(s) are active.`);
  process.exit(2);
}

const goalsByTitle = new Map(goals.map((goal) => [goal.title, goal]));
const routinesByTitle = new Map(routines.map((routine) => [routine.title, routine]));
const portfolioGoal = goalsByTitle.get("11 Innovation: Portfolio Delivery and Promotion to Products & Services");
const configured = [];
const skipped = [];

for (const projectName of softwarehouseActiveApplicationProjectNames) {
  const project = (projectAliases.get(projectName) ?? [projectName])
    .map((name) => byName(projects, name))
    .find((candidate) => candidate && !candidate.archivedAt)
    ?? null;
  const pmName = projectManagerByProject.get(projectName);
  const pm = findAgentByNameOrAlias(agents, pmName);
  if (!project) {
    skipped.push({ project: projectName, reason: "project_not_found" });
    continue;
  }
  if (project.archivedAt || project.status === "archived") {
    skipped.push({ project: projectName, reason: "project_archived" });
    continue;
  }

  const goal = await ensureGoal(company.id, goalsByTitle, {
    title: `${projectName} autonomous delivery and takeover`,
    description: [
      `${projectName} is an active LuckySparrow Software House application lane.`,
      "Paperclip owns project-manager control, known-state refresh, source-control closure, and safe specialist routing.",
      "Normal evidence-backed pushes to verified owner-controlled deployment branches and their expected Coolify auto-redeploy use the standing release consent. Manual deploy/restart/rollback, secrets, paid/live accounts, destructive actions, and irreversible mutation stay behind explicit gates.",
    ].join("\n"),
    level: "team",
    status: "active",
    parentId: portfolioGoal?.id ?? null,
    ownerAgentId: pm?.id ?? project.leadAgentId ?? null,
  });

  const maturationGoal = goalsByTitle.get(`11 Innovation: ${projectName} Product Maturation and Sale Readiness`);
  const desiredGoalIds = [goal.id, maturationGoal?.id].filter(Boolean);
  const currentGoalIds = project.goalIds ?? (project.goalId ? [project.goalId] : []);
  if (currentGoalIds.length !== desiredGoalIds.length || currentGoalIds.some((id) => !desiredGoalIds.includes(id))) {
    if (apply) await request("PATCH", `/api/projects/${project.id}`, { goalIds: desiredGoalIds });
    configured.push({ project: projectName, projectGoalIds: desiredGoalIds, applied: apply });
  }

  const specs = activeApplicationRoutineSpecs.filter((routine) => routine.title.startsWith(`[${projectName}]`));
  for (const spec of specs) {
    const kind = routineKind(spec.title);
    const routine = await ensureRoutine(company.id, routinesByTitle, {
      title: spec.title,
      description: descriptionFor(projectName, kind),
      projectId: project.id,
      goalId: goal.id,
      assigneeAgentId: pm?.id ?? project.leadAgentId ?? null,
      priority: kind === "no-stall" ? "critical" : "high",
      status: "active",
      concurrencyPolicy: "reuse_idle_issue",
      catchUpPolicy: "skip_missed",
    });
    const trigger = await ensureScheduleTrigger(routine.id, {
      label: spec.scheduleLabel,
      enabled: true,
      cronExpression: cadenceByKind.get(kind),
      timezone: "Europe/Berlin",
    });
    configured.push({
      project: projectName,
      routine: spec.title,
      schedule: trigger.label,
      cronExpression: trigger.cronExpression,
      assignee: pm?.name ?? null,
      applied: apply,
    });
  }
}

console.log(JSON.stringify({
  apiBase,
  apply,
  activeRunCount,
  liveRunCount,
  company: { id: company.id, name: company.name },
  configured,
  skipped,
}, null, 2));
