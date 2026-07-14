import { rootBlockerIdentifierFor } from "./lib/issue-blockers.mjs";
import { planReusableRoutineRecoveryRestore } from "./lib/reusable-routine-recovery.mjs";
import { softwarehousePilotActiveRoutineTitles } from "./lib/softwarehouse-active-routines.mjs";

const apiBase = process.env.PAPERCLIP_API_URL ?? "http://127.0.0.1:3200";
const companyName = "LuckySparrow Software House";
const companyNameAliases = [companyName, "LuckySparrow"];
const companyId = process.env.PAPERCLIP_COMPANY_ID ?? null;
const apply = process.argv.includes("--apply");
const requestTimeoutMs = Number(process.env.RECOVERY_ACTION_JANITOR_REQUEST_TIMEOUT_MS ?? 15_000);
const terminalStatuses = new Set(["done", "cancelled"]);
const repairPriority = new Map([
  ["[Softwarehouse] Continuation watchdog", 0],
  ["[Softwarehouse] Autonomy governor", 1],
]);

async function request(method, route, body) {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), requestTimeoutMs);
  const headers = { "content-type": "application/json" };
  if (process.env.PAPERCLIP_API_KEY) headers.authorization = `Bearer ${process.env.PAPERCLIP_API_KEY}`;
  if (method !== "GET" && process.env.PAPERCLIP_RUN_ID) headers["x-paperclip-run-id"] = process.env.PAPERCLIP_RUN_ID;
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
    if (error instanceof Error && error.name === "AbortError") {
      throw new Error(`${method} ${route} timed out after ${requestTimeoutMs}ms`, { cause: error });
    }
    throw error;
  } finally {
    clearTimeout(timeout);
  }
}

function isRequestTimeoutError(error) {
  return error instanceof Error && /timed out after \d+ms/i.test(error.message);
}

function activeBlockerIdentifiers(issue) {
  return (issue.blockedBy ?? [])
    .filter((blocker) => blocker.identifier && !terminalStatuses.has(blocker.status))
    .map((blocker) => blocker.identifier);
}

async function resolveCompany() {
  if (companyId) return { id: companyId, source: "PAPERCLIP_COMPANY_ID" };

  const companies = await request("GET", "/api/companies");
  const company = companies.find((candidate) => companyNameAliases.includes(candidate.name))
    ?? companies.find((candidate) => /^LuckySparrow\b/i.test(candidate.name));
  if (!company) throw new Error(`Company not found: ${companyName}`);
  return {
    id: company.id,
    source: company.name === companyName ? "company_name" : `company_alias:${company.name}`,
  };
}

const company = await resolveCompany();

let health = null;
let issues = [];
let liveRuns = [];
try {
  [health, issues, liveRuns] = await Promise.all([
    request("GET", "/api/health"),
    request("GET", `/api/companies/${company.id}/issues?status=backlog,todo,in_progress,in_review,blocked&limit=2000&includeBlockedBy=true`),
    request("GET", `/api/companies/${company.id}/live-runs`),
  ]);
} catch (error) {
  if (!isRequestTimeoutError(error)) throw error;
  console.log(JSON.stringify({
    apiBase,
    company: { id: company.id, name: company.name },
    mode: apply ? "apply" : "dry-run",
    candidateScanStatus: "timed_out",
    activeRunCount: null,
    actionCount: 0,
    actions: [],
    skipped: [
      {
        action: "skip_recovery_action_janitor",
        reason: "candidate_scan_timeout",
        ownerAction: "Retry recovery-action janitor after the local Paperclip issue-list/live-run routes are responsive.",
        error: error.message,
      },
    ],
  }, null, 2));
  process.exit(0);
}

const liveActiveRunCount = liveRuns.filter((run) => ["queued", "running"].includes(run.status)).length;
const activeRunCount = Math.max(health?.devServer?.activeRunCount ?? 0, liveActiveRunCount);
if (apply && activeRunCount > 0) {
  throw new Error(`Refusing to resolve recovery actions while ${activeRunCount} run(s) are active.`);
}

const actions = [];
const applicationPlans = new Map();
for (const issue of issues.filter((candidate) => candidate.activeRecoveryAction?.id)) {
  const detail = Array.isArray(issue.blockedBy)
    ? issue
    : await request("GET", `/api/issues/${issue.identifier ?? issue.id}`);
  const blockers = activeBlockerIdentifiers(detail);
  const sourceAlreadyBlocked = detail.status === "blocked";
  const clearBlockedResolution = sourceAlreadyBlocked && blockers.length > 0;
  const issueRuns = clearBlockedResolution
    ? []
    : await request("GET", `/api/issues/${detail.id}/runs`);
  const recurringRestore = planReusableRoutineRecoveryRestore({
    issue: detail,
    activeBlockers: blockers,
    runs: issueRuns,
    activeRoutineTitles: softwarehousePilotActiveRoutineTitles,
  });
  const action = {
    issueId: detail.id,
    issueIdentifier: detail.identifier,
    issueTitle: detail.title,
    issueStatus: detail.status,
    recoveryActionId: detail.activeRecoveryAction.id,
    recoveryKind: detail.activeRecoveryAction.kind,
    recoveryStatus: detail.activeRecoveryAction.status,
    rootBlocker: rootBlockerIdentifierFor(detail),
    activeBlockers: blockers,
    qualifyingRecoveryRunId: recurringRestore?.runId ?? null,
    action: clearBlockedResolution
      ? "would_resolve_blocked"
      : recurringRestore
        ? "would_restore_recurring_controller"
        : "noop",
    reason: clearBlockedResolution
      ? "Source issue is already blocked by first-class active blocker(s); close stale recovery action as blocked."
      : recurringRestore
        ? "Reusable routine has no active blocker and completed a fresh recovery run; restore its normal todo cycle."
        : "Recovery action is not a clear blocked-source cleanup candidate.",
  };
  actions.push(action);

  if (clearBlockedResolution) {
    applicationPlans.set(detail.id, {
      appliedAction: "resolved_blocked",
      route: `/api/issues/${detail.id}/recovery-actions/resolve`,
      body: {
        actionId: detail.activeRecoveryAction.id,
        outcome: "blocked",
        sourceIssueStatus: "blocked",
        resolutionNote: [
          "Softwarehouse recovery janitor:",
          "source issue is already blocked by active first-class blocker(s), so this recovery action is a stale execution artifact.",
          `Root blocker: ${action.rootBlocker}.`,
          `Active blockers: ${blockers.join(", ")}.`,
          "No project repo, production, deploy, secret, or live-account mutation was performed.",
        ].join(" "),
      },
    });
  }
  if (recurringRestore) {
    applicationPlans.set(detail.id, {
      appliedAction: "restored_recurring_controller",
      route: `/api/issues/${detail.id}/recovery-actions/resolve`,
      body: {
        actionId: recurringRestore.actionId,
        outcome: recurringRestore.outcome,
        sourceIssueStatus: recurringRestore.sourceIssueStatus,
        resolutionNote: [
          "Softwarehouse recovery janitor restored a reusable routine controller.",
          `Fresh recovery run ${recurringRestore.runId} succeeded after the active recovery attempt.`,
          "The source issue has no unresolved first-class blocker and returns to its normal todo cycle.",
          "No project repo, production, deploy, secret, or live-account mutation was performed.",
        ].join(" "),
      },
    });
  }
}

actions.sort((left, right) =>
  (repairPriority.get(left.issueTitle) ?? 999) - (repairPriority.get(right.issueTitle) ?? 999)
  || String(left.issueIdentifier).localeCompare(String(right.issueIdentifier))
);
const actionable = actions.filter((action) => applicationPlans.has(action.issueId));
if (apply && actionable.length > 0) {
  const selected = actionable[0];
  const plan = applicationPlans.get(selected.issueId);
  if (!plan) throw new Error(`Missing recovery application plan for ${selected.issueIdentifier}`);
  await request("POST", plan.route, plan.body);
  selected.action = plan.appliedAction;
  for (const deferred of actionable.slice(1)) {
    deferred.action = "deferred_serial_repair";
    deferred.reason = "Deferred because one recovery repair may wake work; re-evaluate after the selected repair reaches a terminal run state.";
  }
}

console.log(JSON.stringify({
  apiBase,
  company: { id: company.id, name: company.name },
  mode: apply ? "apply" : "dry-run",
  activeRunCount,
  liveActiveRunCount,
  actionCount: actions.filter((action) => [
    "would_resolve_blocked",
    "resolved_blocked",
    "would_restore_recurring_controller",
    "restored_recurring_controller",
  ].includes(action.action)).length,
  actions,
}, null, 2));
