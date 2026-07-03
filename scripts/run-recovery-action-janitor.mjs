import { rootBlockerIdentifierFor } from "./lib/issue-blockers.mjs";

const apiBase = process.env.PAPERCLIP_API_URL ?? "http://127.0.0.1:3200";
const companyName = "LuckySparrow Software House";
const companyNameAliases = [companyName, "LuckySparrow"];
const companyId = process.env.PAPERCLIP_COMPANY_ID ?? null;
const apply = process.argv.includes("--apply");
const requestTimeoutMs = Number(process.env.RECOVERY_ACTION_JANITOR_REQUEST_TIMEOUT_MS ?? 15_000);
const terminalStatuses = new Set(["done", "cancelled"]);

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
    request("GET", `/api/companies/${company.id}/issues?limit=1000&includeBlockedBy=true`),
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

const activeRunCount = health?.devServer?.activeRunCount ?? liveRuns.length;
if (apply && activeRunCount > 0) {
  throw new Error(`Refusing to resolve recovery actions while ${activeRunCount} run(s) are active.`);
}

const actions = [];
for (const issue of issues.filter((candidate) => candidate.activeRecoveryAction?.id)) {
  const detail = Array.isArray(issue.blockedBy)
    ? issue
    : await request("GET", `/api/issues/${issue.identifier ?? issue.id}`);
  const blockers = activeBlockerIdentifiers(detail);
  const sourceAlreadyBlocked = detail.status === "blocked";
  const clearBlockedResolution = sourceAlreadyBlocked && blockers.length > 0;
  const action = {
    issueIdentifier: detail.identifier,
    issueTitle: detail.title,
    issueStatus: detail.status,
    recoveryActionId: detail.activeRecoveryAction.id,
    recoveryKind: detail.activeRecoveryAction.kind,
    recoveryStatus: detail.activeRecoveryAction.status,
    rootBlocker: rootBlockerIdentifierFor(detail),
    activeBlockers: blockers,
    action: clearBlockedResolution ? (apply ? "resolved_blocked" : "would_resolve_blocked") : "noop",
    reason: clearBlockedResolution
      ? "Source issue is already blocked by first-class active blocker(s); close stale recovery action as blocked."
      : "Recovery action is not a clear blocked-source cleanup candidate.",
  };
  actions.push(action);

  if (apply && clearBlockedResolution) {
    await request("POST", `/api/issues/${detail.id}/recovery-actions/resolve`, {
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
    });
  }
}

console.log(JSON.stringify({
  apiBase,
  company: { id: company.id, name: company.name },
  mode: apply ? "apply" : "dry-run",
  activeRunCount,
  actionCount: actions.filter((action) => action.action === "would_resolve_blocked" || action.action === "resolved_blocked").length,
  actions,
}, null, 2));
