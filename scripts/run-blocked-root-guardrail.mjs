import { softwarehouseGateSpecsByRootBlocker } from "./lib/softwarehouse-gates.mjs";
import { rootBlockerIdentifierFor } from "./lib/issue-blockers.mjs";

const apiBase = process.env.PAPERCLIP_API_URL ?? "http://127.0.0.1:3200";
const companyName = process.env.SOFTWAREHOUSE_COMPANY_NAME ?? "LuckySparrow";
const companyId = process.env.PAPERCLIP_COMPANY_ID ?? null;
const duplicateThreshold = Number(process.env.SOFTWAREHOUSE_BLOCKED_ROOT_DUPLICATE_THRESHOLD ?? 3);
const staleHours = Number(process.env.SOFTWAREHOUSE_BLOCKED_GATE_STALE_HOURS ?? 12);
const supervisionCycleHours = Number(process.env.SOFTWAREHOUSE_SUPERVISION_CYCLE_HOURS ?? 1);
const requestTimeoutMs = Number(process.env.BLOCKED_ROOT_GUARDRAIL_REQUEST_TIMEOUT_MS ?? 15_000);
const monitoredRootBlockers = new Set(softwarehouseGateSpecsByRootBlocker.keys());
const terminalStatuses = new Set(["done", "cancelled"]);
const apply = process.argv.includes("--apply");
const companyNameAliases = [companyName, "LuckySparrow Software House", "LuckySparrow"];

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

async function mapWithConcurrency(items, concurrency, fn) {
  const workers = Array.from({ length: Math.max(1, Math.min(concurrency, items.length)) }, async (_, workerIndex) => {
    const results = [];
    for (let index = workerIndex; index < items.length; index += concurrency) {
      results.push(await fn(items[index], index));
    }
    return results;
  });
  return (await Promise.all(workers)).flat();
}

function ageHoursSince(timestamp, nowMs = Date.now()) {
  const tsMs = timestamp ? new Date(timestamp).getTime() : Number.NaN;
  if (!Number.isFinite(tsMs)) return null;
  return Math.max(0, Math.round(((nowMs - tsMs) / 3_600_000) * 100) / 100);
}

function toArray(value) {
  if (Array.isArray(value)) return value;
  if (Array.isArray(value?.value)) return value.value;
  return [];
}

function latestEvidenceTimestamp(issue, comments) {
  const timestamps = [
    issue?.updatedAt ?? null,
    ...comments.map((comment) => comment.updatedAt ?? comment.createdAt ?? null),
  ].filter(Boolean);
  return timestamps.sort().at(-1) ?? null;
}

async function resolveCompany() {
  if (companyId) return { id: companyId, source: "PAPERCLIP_COMPANY_ID" };

  const companies = await request("GET", "/api/companies");
  const company = companies.find((candidate) => companyNameAliases.includes(candidate.name))
    ?? companies.find((candidate) => /^LuckySparrow\b/i.test(candidate.name));
  if (!company) throw new Error(`Company not found: ${companyName}`);
  return { id: company.id, source: "company_name" };
}

const company = await resolveCompany();

let health = null;
let liveRuns = [];
let issues = [];
try {
  [health, liveRuns, issues] = await Promise.all([
    request("GET", "/api/health"),
    request("GET", `/api/companies/${company.id}/live-runs`),
    request("GET", `/api/companies/${company.id}/issues?limit=1000`),
  ]);
} catch (error) {
  if (!isRequestTimeoutError(error)) throw error;
  console.log(JSON.stringify({
    generatedAt: new Date().toISOString(),
    apiBase,
    company: { id: company.id, name: company.name },
    mode: apply ? "apply" : "dry-run",
    candidateScanStatus: "timed_out",
    activeRunCount: null,
    liveRunCount: null,
    thresholds: {
      duplicateBlockedRootIssueCount: duplicateThreshold,
      staleBlockedGateHours: staleHours,
      supervisionCycleHours,
    },
    monitoredRootBlockers: [...monitoredRootBlockers],
    overall: "degraded",
    findingCount: null,
    repairActionCount: 0,
    repairActions: [],
    duplicateRootFindings: [],
    staleGateFindings: [],
    resolvedRootDependentsStillBlocked: [],
    timedOut: true,
    timeoutMs: requestTimeoutMs,
    timeoutMessage: error.message,
  }, null, 2));
  process.exit(0);
}
const activeRunCount = health.devServer?.activeRunCount ?? liveRuns.length;
if (apply && activeRunCount > 0) {
  throw new Error(`Refusing to repair blocked-root metadata while ${activeRunCount} active run(s) exist.`);
}

const issueByIdentifier = new Map(issues.map((issue) => [issue.identifier, issue]));
const blockedIssues = issues.filter((issue) => issue.status === "blocked");

const groupedByRoot = new Map();
for (const issue of blockedIssues) {
  const root = rootBlockerIdentifierFor(issue);
  if (!monitoredRootBlockers.has(root)) continue;
  const current = groupedByRoot.get(root) ?? [];
  current.push(issue);
  groupedByRoot.set(root, current);
}

const detailIssueIds = [...new Set(
  [...groupedByRoot.entries()].flatMap(([rootBlocker, group]) => group
    .filter((issue) => issue.identifier !== rootBlocker)
    .map((issue) => issue.id)),
)];
const issueDetails = await mapWithConcurrency(detailIssueIds, 8, async (issueId) => ([
  issueId,
  await request("GET", `/api/issues/${issueId}`).catch(() => null),
]));
const issueDetailById = new Map(issueDetails);

const duplicateRootFindings = [];
const repairActions = [];
for (const [rootBlocker, group] of groupedByRoot.entries()) {
  if (group.length < duplicateThreshold) continue;
  const rootIssue = issueByIdentifier.get(rootBlocker);
  if (!rootIssue) continue;
  const notLinked = [];
  for (const issue of group) {
    if (issue.identifier === rootBlocker) continue;
    const detail = issueDetailById.get(issue.id);
    if (!detail) continue;
    const linked = toArray(detail.blockedBy).some((blocker) => blocker?.identifier === rootBlocker);
    if (!linked) {
      const blockedByIssueIds = [
        ...new Set([
          ...toArray(detail.blockedBy).map((blocker) => blocker.id).filter(Boolean),
          rootIssue.id,
        ]),
      ];
      notLinked.push({
        identifier: issue.identifier,
        title: issue.title,
      });
      repairActions.push({
        rootBlocker,
        issueId: issue.id,
        identifier: issue.identifier,
        title: issue.title,
        blockedByIssueIds,
        action: apply ? "repaired_missing_root_blocker_link" : "would_repair_missing_root_blocker_link",
      });
      if (apply) {
        await request("PATCH", `/api/issues/${issue.id}`, {
          blockedByIssueIds,
          status: issue.status,
          comment: [
            "Blocked-root guardrail repair:",
            `- linked ${issue.identifier} to root blocker ${rootBlocker};`,
            "- reason: this issue is already classified under the same root blocker but lacked a direct blockedBy relation;",
            "- scope: Paperclip board metadata only; no repository, production, deploy, restart, or secret access.",
          ].join("\n"),
        });
      }
    }
  }
  if (notLinked.length > 0) {
    duplicateRootFindings.push({
      rootBlocker,
      blockedIssueCount: group.length,
      threshold: duplicateThreshold,
      missingBlockedByRootCount: notLinked.length,
      missingBlockedByRootIssues: notLinked,
    });
  }
}

const staleRootIssues = [...softwarehouseGateSpecsByRootBlocker.entries()]
  .map(([rootBlocker, spec]) => ({ rootBlocker, spec, rootIssue: issueByIdentifier.get(rootBlocker) }))
  .filter(({ rootIssue }) => rootIssue && rootIssue.status === "blocked");
const rootComments = await mapWithConcurrency(staleRootIssues, 8, async ({ rootIssue }) => ([
  rootIssue.id,
  toArray(await request("GET", `/api/issues/${rootIssue.id}/comments?order=desc&limit=20`).catch(() => [])),
]));
const commentsByRootIssueId = new Map(rootComments);

const staleGateFindings = [];
for (const [rootBlocker, spec] of softwarehouseGateSpecsByRootBlocker.entries()) {
  const rootIssue = issueByIdentifier.get(rootBlocker);
  if (!rootIssue || rootIssue.status !== "blocked") continue;
  const comments = commentsByRootIssueId.get(rootIssue.id) ?? [];
  const latestEvidenceAt = latestEvidenceTimestamp(rootIssue, comments);
  const ageHours = ageHoursSince(latestEvidenceAt);
  if (ageHours !== null && ageHours >= staleHours) {
    staleGateFindings.push({
      rootBlocker,
      project: spec.project,
      owner: spec.owner,
      staleThresholdHours: staleHours,
      latestEvidenceAt,
      ageHours,
      requiredOwnerAction: `Obtain fresh gate evidence or keep ${rootBlocker} blocked with explicit next review condition.`,
    });
  }
}

const resolvedRootDependentsStillBlocked = [];
for (const [rootBlocker] of softwarehouseGateSpecsByRootBlocker.entries()) {
  const rootIssue = issueByIdentifier.get(rootBlocker);
  if (!rootIssue || rootIssue.status === "blocked") continue;
  const resolvedAt = rootIssue.updatedAt ?? null;
  const resolvedAtMs = resolvedAt ? new Date(resolvedAt).getTime() : Number.NaN;
  const thresholdMs = Number.isFinite(resolvedAtMs)
    ? resolvedAtMs + (supervisionCycleHours * 3_600_000)
    : Number.NaN;
  const dependents = blockedIssues.filter((issue) => rootBlockerIdentifierFor(issue) === rootBlocker);
  for (const dependent of dependents) {
    if (dependent.identifier === rootBlocker) continue;
    const dependentUpdatedAtMs = dependent.updatedAt ? new Date(dependent.updatedAt).getTime() : Number.NaN;
    const exceededCycle = Number.isFinite(thresholdMs)
      && Number.isFinite(dependentUpdatedAtMs)
      && dependentUpdatedAtMs >= thresholdMs;
    if (exceededCycle) {
      resolvedRootDependentsStillBlocked.push({
        rootBlocker,
        rootStatus: rootIssue.status,
        rootResolvedAt: resolvedAt,
        supervisionCycleHours,
        dependentIdentifier: dependent.identifier,
        dependentTitle: dependent.title,
        dependentUpdatedAt: dependent.updatedAt ?? null,
      });
    }
  }
}

const findingCount = duplicateRootFindings.length
  + staleGateFindings.length
  + resolvedRootDependentsStillBlocked.length;
const overall = findingCount === 0 ? "pass" : "fail";

console.log(JSON.stringify({
  generatedAt: new Date().toISOString(),
  apiBase,
  company: { id: company.id, name: company.name },
  mode: apply ? "apply" : "dry-run",
  activeRunCount,
  liveRunCount: liveRuns.length,
  thresholds: {
    duplicateBlockedRootIssueCount: duplicateThreshold,
    staleBlockedGateHours: staleHours,
    supervisionCycleHours,
  },
  monitoredRootBlockers: [...monitoredRootBlockers],
  overall,
  findingCount,
  repairActionCount: repairActions.length,
  repairActions: repairActions.map((action) => ({
    rootBlocker: action.rootBlocker,
    identifier: action.identifier,
    title: action.title,
    action: action.action,
  })),
  duplicateRootFindings,
  staleGateFindings,
  resolvedRootDependentsStillBlocked,
}, null, 2));
