import { normalizeKey, uniqueSecretsForKeys } from "./lib/secret-aliases.mjs";
import { softwarehouseGateSpecs } from "./lib/softwarehouse-gates.mjs";

const apiBase = process.env.PAPERCLIP_API_URL ?? "http://127.0.0.1:3200";
const companyName = "LuckySparrow Software House";
const companyId = process.env.PAPERCLIP_COMPANY_ID ?? null;
const apply = process.argv.includes("--apply");
const requestTimeoutMs = Number(process.env.AUTONOMOUS_GATE_APPROVAL_REQUEST_TIMEOUT_MS ?? 15_000);
const cooldownMs = Number.parseInt(
  process.env.SOFTWAREHOUSE_AUTONOMOUS_GATE_APPROVAL_COOLDOWN_MS ?? `${6 * 60 * 60 * 1000}`,
  10,
);

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

function isBoardAccessRequiredError(error) {
  return error instanceof Error
    && /failed with 403:/i.test(error.message)
    && /Board access required/i.test(error.message);
}

function timestampOf(item) {
  return item?.updatedAt ?? item?.createdAt ?? null;
}

function ageMs(timestamp) {
  return timestamp ? Date.now() - new Date(timestamp).getTime() : Number.POSITIVE_INFINITY;
}

function isAfterOrNear(left, right) {
  if (!left || !right) return false;
  const leftTime = new Date(left).getTime();
  const rightTime = new Date(right).getTime();
  return Number.isFinite(leftTime) && Number.isFinite(rightTime) && leftTime >= rightTime - 5000;
}

function approvalMarker(rootBlocker) {
  return `softwarehouse-autonomous-gate-approval:${rootBlocker}:v1`;
}

function hasFreshApproval(comments, issue, marker) {
  return comments.some((comment) =>
    String(comment.body ?? "").includes(marker)
    && isAfterOrNear(timestampOf(comment), issue.updatedAt)
  );
}

function hasRecentAutonomousApproval(comments, marker) {
  return comments.some((comment) =>
    String(comment.body ?? "").includes(marker)
    && ageMs(timestampOf(comment)) <= cooldownMs
  );
}

async function resolveCompany() {
  if (companyId) return { id: companyId, source: "PAPERCLIP_COMPANY_ID" };

  const companies = await request("GET", "/api/companies");
  const company = companies.find((candidate) => candidate.name === companyName);
  if (!company) throw new Error(`Company not found: ${companyName}`);
  return { id: company.id, source: "company_name" };
}

const company = await resolveCompany();

let health = null;
let issues = [];
let secrets = [];
let liveRuns = [];
try {
  [health, issues, secrets, liveRuns] = await Promise.all([
    request("GET", "/api/health"),
    request("GET", `/api/companies/${company.id}/issues?limit=1000`),
    request("GET", `/api/companies/${company.id}/secrets`),
    request("GET", `/api/companies/${company.id}/live-runs`),
  ]);
} catch (error) {
  if (!isRequestTimeoutError(error) && !isBoardAccessRequiredError(error)) throw error;
  const reason = isBoardAccessRequiredError(error) ? "board_access_required" : "candidate_scan_timeout";
  console.log(JSON.stringify({
    apiBase,
    company: { id: company.id, name: company.name },
    mode: apply ? "apply" : "dry-run",
    candidateScanStatus: reason,
    activeRunCount: null,
    liveRunCount: null,
    candidateCount: null,
    skipped: [
      {
        action: "skip_autonomous_gate_approval",
        reason,
        ownerAction: isBoardAccessRequiredError(error)
          ? "A board-authorized actor must refresh gate approval metadata; do not post autonomous approval from this agent."
          : "Retry autonomous gate approval after the local Paperclip issue-list/live-run routes are responsive; do not post gate approval from incomplete scan data.",
        error: error.message,
      },
    ],
    actions: [],
  }, null, 2));
  process.exit(0);
}

const activeRunCount = health.devServer?.activeRunCount ?? liveRuns.length;
const secretByKey = new Map(secrets.map((secret) => [normalizeKey(secret.key), secret]));
const issueByIdentifier = new Map(issues.map((issue) => [issue.identifier, issue]));
const candidates = [];
const skipped = [];

for (const spec of softwarehouseGateSpecs) {
  const issue = issueByIdentifier.get(spec.rootBlocker);
  if (!issue) {
    skipped.push({ rootBlocker: spec.rootBlocker, reason: "missing_issue" });
    continue;
  }
  const marker = approvalMarker(spec.rootBlocker);
  const comments = await request("GET", `/api/issues/${issue.id}/comments?order=desc&limit=20`)
    .then((result) => result.value ?? result ?? [])
    .catch(() => []);
  const trackedSecrets = uniqueSecretsForKeys(secretByKey, spec.secretKeys);
  if (issue.status !== "blocked") {
    skipped.push({ rootBlocker: spec.rootBlocker, reason: "gate_not_blocked", status: issue.status });
    continue;
  }
  if (trackedSecrets.length === 0) {
    skipped.push({ rootBlocker: spec.rootBlocker, reason: "no_tracked_credentials" });
    continue;
  }
  if (hasFreshApproval(comments, issue, marker)) {
    skipped.push({ rootBlocker: spec.rootBlocker, reason: "fresh_autonomous_approval_exists" });
    continue;
  }
  if (hasRecentAutonomousApproval(comments, marker)) {
    skipped.push({ rootBlocker: spec.rootBlocker, reason: "autonomous_approval_cooldown" });
    continue;
  }
  candidates.push({
    spec,
    issue,
    trackedSecretCount: trackedSecrets.length,
    latestCredentialMetadataAt: trackedSecrets
      .map((secret) => secret.updatedAt ?? secret.createdAt)
      .filter(Boolean)
      .sort()
      .at(-1) ?? null,
  });
}

const actions = [];
if (activeRunCount > 0) {
  actions.push({ action: "noop_active_runs", activeRunCount, liveRunCount: liveRuns.length });
} else if (candidates.length === 0) {
  actions.push({ action: "noop_no_autonomous_gate_candidate" });
} else {
  const { spec, issue, trackedSecretCount, latestCredentialMetadataAt } = candidates[0];
  const marker = approvalMarker(spec.rootBlocker);
  const body = [
    marker,
    "",
    `Autonomous standing policy approved one narrow ${spec.project} gate recheck for ${spec.approvalPurpose}.`,
    "Reason: the operator has asked Paperclip to work autonomously with already provided project credentials/data.",
    `Tracked credential metadata is present (${trackedSecretCount} redacted entr${trackedSecretCount === 1 ? "y" : "ies"}).`,
    latestCredentialMetadataAt ? `Latest credential metadata timestamp: ${latestCredentialMetadataAt}.` : null,
    "Resume exactly one responsible recheck lane and record pass/fail evidence.",
    spec.forbiddenAction,
    "This is not approval to commit, push, deploy, restart production, mutate runtime state, print secrets, or broaden scope.",
  ].filter(Boolean).join("\n");
  actions.push({
    action: apply ? "posted_autonomous_gate_approval" : "would_post_autonomous_gate_approval",
    rootBlocker: spec.rootBlocker,
    project: spec.project,
    issueStatus: issue.status,
    trackedSecretCount,
  });
  if (apply) {
    const comment = await request("POST", `/api/issues/${issue.id}/comments`, { body });
    actions.at(-1).commentId = comment.id ?? null;
    actions.at(-1).commentCreatedAt = comment.createdAt ?? null;
  }
}

console.log(JSON.stringify({
  apiBase,
  company: { id: company.id, name: company.name },
  mode: apply ? "apply" : "dry-run",
  activeRunCount,
  liveRunCount: liveRuns.length,
  candidateCount: candidates.length,
  skipped,
  actions,
}, null, 2));
