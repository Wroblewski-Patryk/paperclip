import { existsSync } from "node:fs";
import { mkdir, readFile, writeFile } from "node:fs/promises";

const apiBase = (process.env.PAPERCLIP_API_URL ?? "http://127.0.0.1:3200").replace(/\/$/, "");
const companyName = process.env.SOFTWAREHOUSE_COMPANY_NAME ?? "LuckySparrow Software House";
const observationDays = Number(process.env.SOFTWAREHOUSE_GRADUATION_DAYS ?? 14);
const materialRepair = process.argv.includes("--material-repair");
const now = new Date();
const nowIso = now.toISOString();
const reportPath = "report/paperclip-autonomy-graduation.latest.json";

async function jsonFile(filePath) {
  if (!existsSync(filePath)) return null;
  try { return JSON.parse(await readFile(filePath, "utf8")); } catch { return null; }
}

async function request(route) {
  try {
    const response = await fetch(`${apiBase}${route}`, { signal: AbortSignal.timeout(10_000) });
    const text = await response.text();
    return { ok: response.ok, status: response.status, data: text ? JSON.parse(text) : null };
  } catch (error) {
    return { ok: false, status: null, error: error instanceof Error ? error.message : String(error), data: null };
  }
}

function ageMs(value) {
  const parsed = Date.parse(value ?? "");
  return Number.isFinite(parsed) ? now.getTime() - parsed : Number.POSITIVE_INFINITY;
}

const [health, companies, previous, cycle, isolation, registry] = await Promise.all([
  request("/api/health"),
  request("/api/companies"),
  jsonFile(reportPath),
  jsonFile("report/autonomous-cycles/latest.json"),
  jsonFile("report/softwarehouse-cross-project-isolation.latest.json"),
  jsonFile("report/paperclip-supervision/findings-registry.json"),
]);
const company = Array.isArray(companies.data)
  ? companies.data.find((candidate) => [companyName, "LuckySparrow", "LuckySparrow Software House"].includes(candidate.name))
  : null;
const companyId = company?.id ?? null;
const [issuesResult, agentsResult, runsResult, deliveriesResult, controlsResult] = companyId
  ? await Promise.all([
      request(`/api/companies/${companyId}/issues?limit=2000`),
      request(`/api/companies/${companyId}/agents`),
      request(`/api/companies/${companyId}/heartbeat-runs?limit=500`),
      request(`/api/companies/${companyId}/deliveries?limit=500`),
      request(`/api/companies/${companyId}/admission-controls`),
    ])
  : Array.from({ length: 5 }, () => ({ ok: false, data: null }));

const issues = Array.isArray(issuesResult.data) ? issuesResult.data : [];
// Company issue listings intentionally omit the expanded dependency graph. Graduation
// must inspect each blocked issue's authoritative detail instead of interpreting the
// absent list projection as "no blockers" (which would turn every valid block orphaned).
const blockedIssueDetails = await Promise.all(issues
  .filter((issue) => issue.status === "blocked")
  .map(async (issue) => {
    const detail = await request(`/api/issues/${issue.id}`);
    return detail.ok ? detail.data : { ...issue, blockerDetailUnavailable: true };
  }));
const orphanBlocked = blockedIssueDetails.filter((issue) => {
  if (issue?.blockerDetailUnavailable) return true;
  return !(Array.isArray(issue?.blockedBy)
    && issue.blockedBy.some((blocker) => blocker && !["done", "cancelled"].includes(blocker.status)));
});
const runs = Array.isArray(runsResult.data) ? runsResult.data : [];
const activeRuns = runs.filter((run) => ["queued", "running"].includes(run.status));
const agents = Array.isArray(agentsResult.data) ? agentsResult.data : [];
const activeAgentIds = new Set(activeRuns.map((run) => run.agentId));
const staleRunningAgents = agents.filter((agent) => agent.status === "running" && !activeAgentIds.has(agent.id));
const controls = Array.isArray(controlsResult.data) ? controlsResult.data : [];
const companyControl = controls.find((control) => control.scopeType === "company");

const deliveryDetails = await Promise.all((Array.isArray(deliveriesResult.data) ? deliveriesResult.data : [])
  .filter((delivery) => delivery.stage === "outcome_accepted" && ageMs(delivery.updatedAt) <= observationDays * 86_400_000)
  .map((delivery) => request(`/api/deliveries/${delivery.id}`).then((result) => result.data)));
function hasCompleteProductIntentTrace(delivery) {
  const intent = delivery?.decisionContract?.intentContract;
  const trace = intent?.trace;
  return intent?.schemaVersion === 1
    && intent?.marker === "softwarehouse-product-intent-trace:v1"
    && Array.isArray(intent?.productSources) && intent.productSources.length > 0
    && Array.isArray(intent?.architectureSources) && intent.architectureSources.length > 0
    && typeof intent?.observedStateSource === "string" && intent.observedStateSource.length > 0
    && ["ownerIntent", "productContract", "architectureContract", "observedGap", "assumptionDisposition", "expectedOutcome", "acceptanceEvidence"]
      .every((field) => typeof trace?.[field] === "string" && trace[field].trim().length > 0)
    && !/\b(?:pending|unknown|unvalidated|needs_decision|conflict)\b/i.test(trace.assumptionDisposition);
}

const independentlyAcceptedAutonomousDeliveries = deliveryDetails.filter((delivery) => {
  const hasTask = Array.isArray(delivery?.tasks) && delivery.tasks.length > 0;
  const agentTransition = Array.isArray(delivery?.transitions)
    && delivery.transitions.some((transition) => transition.actorType === "agent");
  const independentAcceptance = delivery?.outcome?.status === "accepted"
    && Boolean(delivery.outcome.acceptedByUserId
      || (delivery.outcome.acceptedByAgentId
        && delivery.outcome.acceptedByAgentId !== delivery.ownerAgentId));
  return hasTask && agentTransition && independentAcceptance;
});
const acceptedDeliveriesWithoutIntentTrace = independentlyAcceptedAutonomousDeliveries.filter((delivery) => !hasCompleteProductIntentTrace(delivery));
const autonomousAcceptedDeliveries = independentlyAcceptedAutonomousDeliveries.filter(hasCompleteProductIntentTrace);
const acceptedProjects = new Set(autonomousAcceptedDeliveries.map((delivery) => delivery.projectId));

const activeFindings = Array.isArray(registry?.findings)
  ? registry.findings.filter((finding) => !["resolved", "accepted_risk", "superseded"].includes(finding.current_status))
  : [];
const criticalFindings = activeFindings.filter((finding) => ["critical", "p0"].includes(String(finding.severity).toLowerCase()));
const cycleDispatch = cycle?.phases?.workDispatch?.action ?? null;
const productiveCycle = ageMs(cycle?.generatedAt) <= 90 * 60_000
  && ["bounded_product_delivery_dispatched", "product_intent_reconciliation_dispatched", "supervise_product_intent_reconciliation", "supervise_existing_runs", "supervise_existing_project_truth_run"].includes(cycleDispatch);

const checks = [
  { id: "runtime_healthy", passed: health.ok && health.data?.status === "ok", evidence: health.status },
  { id: "admission_open", passed: companyControl?.state === "open", evidence: companyControl?.state ?? "missing" },
  { id: "no_orphan_blocked", passed: orphanBlocked.length === 0, evidence: orphanBlocked.map((issue) => issue.identifier) },
  { id: "no_stale_running_agents", passed: staleRunningAgents.length === 0, evidence: staleRunningAgents.map((agent) => agent.name) },
  { id: "paperclip_owned_cycle_fresh_and_productive", passed: productiveCycle, evidence: { generatedAt: cycle?.generatedAt ?? null, action: cycleDispatch } },
  { id: "cross_project_isolation", passed: isolation?.ok === true, evidence: isolation?.failures ?? isolation?.blockers ?? [] },
  { id: "supervision_findings_closed", passed: activeFindings.length === 0, evidence: { active: activeFindings.length, critical: criticalFindings.length } },
  { id: "accepted_autonomous_outcomes_are_intent_traceable", passed: acceptedDeliveriesWithoutIntentTrace.length === 0, evidence: acceptedDeliveriesWithoutIntentTrace.map((delivery) => delivery.id) },
  { id: "two_autonomous_outcomes_across_two_projects", passed: autonomousAcceptedDeliveries.length >= 2 && acceptedProjects.size >= 2, evidence: { deliveries: autonomousAcceptedDeliveries.map((delivery) => delivery.id), projects: [...acceptedProjects] } },
];

const healthy = checks.every((check) => check.passed);
const resetReasons = [
  ...(materialRepair ? ["A material external repair was required in this evaluation cycle."] : []),
  ...checks.filter((check) => !check.passed).map((check) => check.id),
];
let candidateSince = healthy && !materialRepair ? previous?.candidateSince ?? nowIso : null;
const elapsedMs = candidateSince ? now.getTime() - Date.parse(candidateSince) : 0;
const operationallyGraduated = healthy && elapsedMs >= observationDays * 86_400_000;
const report = {
  schemaVersion: 2,
  evaluatedAt: nowIso,
  companyId,
  observationDays,
  candidateSince,
  observationEndsAt: candidateSince ? new Date(Date.parse(candidateSince) + observationDays * 86_400_000).toISOString() : null,
  consecutiveHealthyEvaluations: healthy ? (previous?.consecutiveHealthyEvaluations ?? 0) + 1 : 0,
  lastResetAt: healthy && !materialRepair ? previous?.lastResetAt ?? null : nowIso,
  resetReasons,
  checks,
  decision: operationallyGraduated ? "operationally_graduated" : "not_operationally_graduated",
  automationRecommendation: operationallyGraduated ? "pause_all_bootstrap_supervision" : "continue_bounded_supervision",
  invariant: "Supervision is temporary scaffolding. Safe stasis is failure; graduation requires autonomous owner-visible outcomes and a continuous repair-free observation window.",
};

await mkdir("report", { recursive: true });
await writeFile(reportPath, `${JSON.stringify(report, null, 2)}\n`);
await writeFile("report/paperclip-teachar-graduation.latest.json", `${JSON.stringify({
  schemaVersion: 2,
  supersededBy: reportPath,
  decision: report.decision,
  evaluatedAt: report.evaluatedAt,
}, null, 2)}\n`);
console.log(JSON.stringify(report, null, 2));
if (!healthy) process.exitCode = 1;
