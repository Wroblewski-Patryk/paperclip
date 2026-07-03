import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";
import { rootBlockerIdentifierFor } from "./lib/issue-blockers.mjs";
import { resolveIssuesByIdentifier } from "./lib/issue-discovery.mjs";
import {
  aliasCoverageForKeys,
  missingKeysAfterAliasCoverage,
  normalizeKey,
  uniqueSecretsForKeys,
} from "./lib/secret-aliases.mjs";
import { softwarehouseGateSpecs as gateSpecs } from "./lib/softwarehouse-gates.mjs";

const apiBase = process.env.PAPERCLIP_API_URL ?? "http://127.0.0.1:3200";
const companyName = "LuckySparrow Software House";
const companyNameAliases = [companyName, "LuckySparrow"];
const companyId = process.env.PAPERCLIP_COMPANY_ID ?? null;
const requestTimeoutMs = Number(process.env.SOFTWAREHOUSE_UNBLOCK_PACKET_REQUEST_TIMEOUT_MS ?? 15_000);
const issuePageSize = Number(process.env.SOFTWAREHOUSE_UNBLOCK_PACKET_ISSUE_PAGE_SIZE ?? 500);

const terminalStatuses = new Set(["done", "cancelled"]);
const activeIssueStatuses = ["backlog", "todo", "in_progress", "in_review", "blocked"];
const stateStableTimestampLabel = "state-stable; use file mtime for freshness";
const stateStableRuntimeLabel = "state-stable; run pnpm softwarehouse:control-tick for live runtime counts";
async function request(method, route) {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), requestTimeoutMs);
  const headers = { "content-type": "application/json" };
  if (process.env.PAPERCLIP_API_KEY) headers.authorization = `Bearer ${process.env.PAPERCLIP_API_KEY}`;
  try {
    const response = await fetch(`${apiBase}${route}`, {
      method,
      headers,
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

async function requestAllPages(route, { limit = issuePageSize } = {}) {
  const rows = [];
  for (let offset = 0; ; offset += limit) {
    const separator = route.includes("?") ? "&" : "?";
    const page = await request("GET", `${route}${separator}limit=${limit}&offset=${offset}`);
    if (!Array.isArray(page)) {
      throw new Error(`Expected paginated route to return an array: ${route}`);
    }
    rows.push(...page);
    if (page.length < limit) return rows;
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

function latestTimestamp(values) {
  return values
    .filter(Boolean)
    .sort()
    .at(-1) ?? null;
}

function isAfter(left, right) {
  return Boolean(left && right && new Date(left).getTime() > new Date(right).getTime());
}

function redactedSecretState(secret) {
  if (!secret) return null;
  return {
    key: secret.key,
    status: secret.status ?? null,
    updatedAt: secret.updatedAt ?? null,
    createdAt: secret.createdAt ?? null,
    hasValue: Boolean(secret.hasValue ?? secret.valueHash ?? secret.updatedAt ?? secret.createdAt),
  };
}

function commentTimestamp(comment) {
  return comment.updatedAt ?? comment.createdAt ?? null;
}

function isFreshForIssue(comment, issue) {
  const timestamp = commentTimestamp(comment);
  if (!timestamp || !issue?.updatedAt) return false;
  const commentTime = new Date(timestamp).getTime();
  const issueTime = new Date(issue.updatedAt).getTime();
  return Number.isFinite(commentTime)
    && Number.isFinite(issueTime)
    && commentTime >= issueTime - 5000;
}

function truncateEvidenceLine(value, maxLength = 180) {
  const normalized = String(value ?? "")
    .replace(/Bearer\s+[A-Za-z0-9._~+/=-]+/gi, "Bearer [REDACTED]")
    .replace(/(token|password|secret|api[_-]?key)\s*[:=]\s*(\S+)/gi, (match, key, secretValue) => {
      return /^(true|false|null|none|missing)$/i.test(secretValue)
        ? `${key}=${secretValue}`
        : `${key}=[REDACTED]`;
    })
    .replace(/\s+/g, " ")
    .trim();
  return normalized.length > maxLength
    ? `${normalized.slice(0, maxLength - 3)}...`
    : normalized;
}

function meaningfulEvidenceLines(body) {
  return String(body ?? "")
    .split(/\r?\n/)
    .map((line) => truncateEvidenceLine(line.replace(/^[-*]\s*/, "")))
    .filter(Boolean);
}

function lineHasAny(line, tokens) {
  const lower = line.toLowerCase();
  return tokens.some((token) => lower.includes(token));
}

function lineIsInstructionalNoise(line) {
  return /\b(record|required proof|unblock owner|unblock action|then authorize|authorize exactly|execute exactly once|run exactly once|next blocker if any|if it still fails|architecture:status|unrelated existing workspace modification)\b/i
    .test(line);
}

function lineIsFailureSignal(line) {
  if (lineIsInstructionalNoise(line)) return false;
  return /\b(fail(?:ed)?|error|unauthorized|denied|missing)\b|(?:->\s*)?(?:401|403|500)\b/i
    .test(line);
}

function lineIsPassSignal(line) {
  if (lineIsInstructionalNoise(line)) return false;
  return /\b(pass(?:ed)?|healthy)\b|(?:->\s*)?200\b/i
    .test(line);
}

function latestGateEvidence(comments) {
  const resultTokens = [
    "fail",
    "failed",
    "smoke",
    "auth probe",
    "401",
    "403",
    "500",
    "unauthorized",
    "missing",
    "workers/ready",
    "auth/me",
    "/ready",
    "/health",
  ];

  let bestEvidence = null;
  for (const comment of comments) {
    if (/^status sync:/i.test(String(comment.body ?? "").trim())) continue;
    const lines = meaningfulEvidenceLines(comment.body);
    if (!lines.some((line) => lineHasAny(line, resultTokens))) continue;

    const failureSignals = lines
      .filter(lineIsFailureSignal)
      .slice(0, 6);
    const passSignals = lines
      .filter(lineIsPassSignal)
      .slice(0, 6);
    const contextSignals = lines
      .filter((line) => !lineIsInstructionalNoise(line))
      .filter((line) => lineHasAny(line, ["smoke", "auth probe", "workers/ready", "auth/me", "/ready", "/health"]))
      .slice(0, 6);
    const endpointSignals = lines
      .filter((line) => /\/(?:workers\/ready|auth\/me|ready|health)\b/i.test(line))
      .slice(0, 6);
    if (
      failureSignals.length === 0
      && passSignals.length === 0
      && contextSignals.length === 0
      && endpointSignals.length === 0
    ) {
      continue;
    }
    const status = failureSignals.length > 0
      ? "failed"
      : passSignals.length > 0
        ? "passed"
        : "observed";
    const score = (endpointSignals.length * 5)
      + (failureSignals.length * 4)
      + (passSignals.length * 3)
      + (contextSignals.length * 2);

    const evidence = {
      status,
      updatedAt: commentTimestamp(comment),
      summary: endpointSignals.find(lineIsFailureSignal)
        ?? failureSignals[0]
        ?? endpointSignals.find(lineIsPassSignal)
        ?? passSignals[0]
        ?? endpointSignals[0]
        ?? contextSignals[0]
        ?? lines[0]
        ?? null,
      failureSignals,
      passSignals,
      contextSignals,
      endpointSignals,
      score,
    };
    const evidenceTime = new Date(evidence.updatedAt ?? 0).getTime();
    const bestTime = new Date(bestEvidence?.updatedAt ?? 0).getTime();
    const isNewer = Number.isFinite(evidenceTime)
      && (!Number.isFinite(bestTime) || evidenceTime > bestTime);
    const isSameTimeHigherSignal = evidenceTime === bestTime && evidence.score > bestEvidence.score;
    if (!bestEvidence || isNewer || isSameTimeHigherSignal) {
      bestEvidence = evidence;
    }
  }

  if (bestEvidence) {
    const { score, ...evidence } = bestEvidence;
    return evidence;
  }

  return {
    status: "none",
    updatedAt: null,
    summary: null,
    failureSignals: [],
    passSignals: [],
    contextSignals: [],
    endpointSignals: [],
  };
}

function row(cells) {
  return `| ${cells.map((cell) => String(cell ?? "").replaceAll("\n", "<br>")).join(" | ")} |`;
}

function markdownFor(packet) {
  const gates = packet.gates ?? [];
  const skipped = packet.skipped ?? [];
  const lines = [
    "# Softwarehouse Unblock Packet",
    "",
    `Generated at: ${packet.generatedAt}`,
    "",
    "This packet is generated from the local Paperclip API. It intentionally redacts secret values and records only metadata needed for safe gate decisions.",
    "",
    "## Runtime",
    "",
    row(["Field", "Value"]),
    row(["---", "---"]),
    row(["API base", packet.apiBase]),
    row(["Company", packet.company.name ?? packet.company.id]),
    row(["restartRequired", packet.health.restartRequired]),
    row(["activeRunCount", packet.health.activeRunCount]),
    row(["liveRunCount", packet.health.liveRunCount]),
    "",
    "## Gate Summary",
    "",
    row(["Project", "Gate", "Status", "Owner", "Fresh?", "Latest evidence", "Blocked issues", "Allowed next action"]),
    row(["---", "---", "---", "---", "---", "---", "---", "---"]),
    ...gates.map((gate) => row([
      gate.project,
      gate.rootBlocker,
      gate.issue?.status ?? "missing",
      gate.owner,
      gate.secretUpdatedAfterIssue || gate.hasExplicitApprovalOrEvidence ? "yes" : "no",
      gate.latestEvidence?.summary
        ? `${gate.latestEvidence.status}: ${gate.latestEvidence.summary}`
        : gate.latestEvidence?.status ?? "none",
      gate.blockedIssueCount,
      gate.nextAction,
    ])),
    "",
    "## Gate Details",
    "",
  ];

  for (const gate of gates) {
    lines.push(
      `### ${gate.project} / ${gate.rootBlocker}`,
      "",
      row(["Field", "Value"]),
      row(["---", "---"]),
      row(["Title", gate.issue?.title ?? "missing"]),
      row(["Status", gate.issue?.status ?? "missing"]),
      row(["Updated at", gate.issue?.updatedAt ?? "unknown"]),
      row(["Owner", gate.owner]),
      row(["Purpose", gate.purpose]),
      row(["Allowed action", gate.allowedAction]),
      row(["Forbidden action", gate.forbiddenAction]),
      row(["Evidence required", gate.evidenceRequired]),
      row(["Accepted fresh facts", gate.acceptedFreshFacts.join("<br>")]),
      row(["Operator prompt", gate.operatorPrompt]),
      row(["Approval dry-run command", gate.approvalDryRunCommand]),
      row(["Approval apply command", gate.approvalApplyCommand]),
      row(["Recheck handoff", gate.recheckHandoff]),
      row(["Latest tracked secret metadata", gate.latestSecretUpdatedAt ?? "none"]),
      row(["Missing direct company secret keys", gate.missingSecretKeys.length > 0 ? gate.missingSecretKeys.join(", ") : "none"]),
      row(["Covered by runtime aliases", gate.coveredAliasKeys.length > 0 ? gate.coveredAliasKeys.map((alias) => `${alias.key} -> ${alias.sourceKey}`).join(", ") : "none"]),
      row(["Secret updated after blocker", gate.secretUpdatedAfterIssue]),
      row(["Explicit approval/evidence comment", gate.hasExplicitApprovalOrEvidence]),
      row(["Latest comment placeholder-only", gate.latestCommentIsPlaceholderOnly]),
      row(["Latest gate evidence status", gate.latestEvidence?.status ?? "none"]),
      row(["Latest gate evidence at", gate.latestEvidence?.updatedAt ?? "none"]),
      row(["Latest gate evidence summary", gate.latestEvidence?.summary ?? "none"]),
      row(["Latest failure signals", gate.latestEvidence?.failureSignals?.length > 0 ? gate.latestEvidence.failureSignals.join("<br>") : "none"]),
      row(["Latest pass signals", gate.latestEvidence?.passSignals?.length > 0 ? gate.latestEvidence.passSignals.join("<br>") : "none"]),
      "",
      "Tracked secret metadata:",
      "",
      row(["Key", "Status", "Updated at", "Created at", "Has value metadata"]),
      row(["---", "---", "---", "---", "---"]),
      ...gate.trackedSecrets.map((secret) => row([
        secret.key,
        secret.status ?? "unknown",
        secret.updatedAt ?? "",
        secret.createdAt ?? "",
        secret.hasValue,
      ])),
      "",
      "Blocked issue sample:",
      "",
      row(["Issue", "Status", "Assignee", "Title"]),
      row(["---", "---", "---", "---"]),
      ...gate.blockedIssueSample.map((issue) => row([
        issue.identifier,
        issue.status,
        issue.assigneeAgentName ?? issue.assigneeAgentId ?? "",
        issue.title,
      ])),
      "",
    );
  }

  if (skipped.length > 0) {
    lines.push(
      "## Skipped Refresh Inputs",
      "",
      row(["Action", "Reason", "Owner action", "Error"]),
      row(["---", "---", "---", "---"]),
      ...skipped.map((item) => row([
        item.action,
        item.reason,
        item.ownerAction,
        item.error,
      ])),
      "",
    );
  }

  lines.push(
    "## Operating Decision",
    "",
    packet.operatingDecision,
    "",
    "## Agent Handoff",
    "",
    "- If a gate is not fresh, PMs and specialist agents must stay quiet instead of reseeding the same lane.",
    "- If operator approval is needed, show the operator prompt and approval commands, but do not run the apply command without explicit approval.",
    "- If a gate becomes fresh, resume exactly one responsible lane and require the evidence listed above.",
    "- If the lane fails, return the root blocker to `blocked` with exact owner/action and wait for a new fact.",
    "- Do not treat this packet as approval for production mutation.",
    "",
  );

  return `${lines.join("\n")}\n`;
}

async function writePacketFiles(packet) {
  await mkdir("report", { recursive: true });
  await mkdir(path.join("docs", "status"), { recursive: true });
  await writeFile(path.join("report", "softwarehouse-unblock-packet.json"), `${JSON.stringify(packet, null, 2)}\n`);
  await writeFile(path.join("docs", "status", "softwarehouse-unblock-packet.md"), markdownFor(packet));
}

function skippedOperatingDecision(reason) {
  if (reason === "board_access_required") {
    return "Unblock packet refreshed with a board-access-required secret metadata gap. The current actor cannot read company secret metadata, so gate freshness is unknown; keep blocked delivery lanes paused until a board-authorized refresh or explicit operator evidence is recorded.";
  }
  return "Unblock packet refreshed with an API candidate-scan timeout. The local Paperclip API did not return all scan inputs within the timeout budget; keep blocked delivery lanes paused until the scan routes are responsive or a narrower owner-path fix is recorded.";
}

async function resolveCompany() {
  if (companyId) return { id: companyId, source: "PAPERCLIP_COMPANY_ID" };

  const companies = await request("GET", "/api/companies");
  const company = companyNameAliases
    .map((name) => companies.find((candidate) => candidate.name === name))
    .find(Boolean)
    ?? companies.find((candidate) => /^LuckySparrow\b/i.test(candidate.name));
  if (!company) throw new Error(`Company not found: ${companyName}`);
  return { id: company.id, source: "company_name" };
}

const company = await resolveCompany();

let health = null;
let agents = [];
let issues = [];
let secrets = [];
let liveRuns = [];
try {
  [health, agents, issues, secrets, liveRuns] = await Promise.all([
    request("GET", "/api/health"),
    request("GET", `/api/companies/${company.id}/agents`),
    requestAllPages(`/api/companies/${company.id}/issues?status=${activeIssueStatuses.join(",")}`),
    request("GET", `/api/companies/${company.id}/secrets`),
    request("GET", `/api/companies/${company.id}/live-runs`),
  ]);
} catch (error) {
  if (!isRequestTimeoutError(error) && !isBoardAccessRequiredError(error)) throw error;
  const reason = isBoardAccessRequiredError(error) ? "board_access_required" : "candidate_scan_timeout";
  const skipped = [
    {
      action: "skip_unblock_packet_refresh",
      reason,
      ownerAction: isBoardAccessRequiredError(error)
        ? "A board-authorized actor must refresh unblock packet secret metadata; keep the current packet in blocked mode and do not infer gate freshness from this actor."
        : "Retry unblock packet export after the local Paperclip health/agent/issue/secret/live-run routes are responsive.",
      error: error.message,
    },
  ];
  const packet = {
    generatedAt: new Date().toISOString(),
    apiBase,
    company: { id: company.id, name: company.name ?? null },
    candidateScanStatus: reason,
    health: {
      restartRequired: null,
      activeRunCount: null,
      liveRunCount: null,
    },
    runtime: {
      activeRunCount: null,
      liveRunCount: null,
    },
    gateCount: null,
    freshGateCount: null,
    gates: [],
    operatingDecision: skippedOperatingDecision(reason),
    skipped,
  };
  await writePacketFiles(packet);
  console.log(JSON.stringify({
    ...packet,
    refreshedAt: packet.generatedAt,
    outputs: [
      "report/softwarehouse-unblock-packet.json",
      "docs/status/softwarehouse-unblock-packet.md",
    ],
  }, null, 2));
  process.exit(0);
}

const agentById = new Map(agents.map((agent) => [agent.id, agent]));
const issueByIdentifier = await resolveIssuesByIdentifier({
  companyId: company.id,
  identifiers: gateSpecs.map((spec) => spec.rootBlocker),
  issues,
  request,
});
const secretByKey = new Map(secrets.map((secret) => [normalizeKey(secret.key), secret]));

const gates = [];
for (const spec of gateSpecs) {
  const issue = issueByIdentifier.get(spec.rootBlocker) ?? null;
  const comments = issue
    ? await request("GET", `/api/issues/${issue.id}/comments?order=desc&limit=12`)
      .then((result) => result.value ?? result ?? [])
      .catch(() => [])
    : [];
  const latestComment = String(comments[0]?.body ?? "").toLowerCase();
  const latestEvidence = latestGateEvidence(comments);
  const hasExplicitApprovalOrEvidence = comments.some((comment) => {
    const body = String(comment.body ?? "").toLowerCase();
    return isFreshForIssue(comment, issue) && [
      "approval granted",
      "operator approved",
      "gate freshness approved",
      "resume protected smoke",
      "credential rotated",
      "secret updated after blocker",
      "token refreshed",
      "key rotated",
    ].some((token) => body.includes(token))
      && !["placeholder", "metadata-only", "metadata only", "technical binding"].some((token) => body.includes(token));
  });
  const latestCommentIsPlaceholderOnly = ["placeholder", "metadata-only", "metadata only", "technical binding"]
    .some((token) => latestComment.includes(token))
    && !hasExplicitApprovalOrEvidence;
  const trackedSecrets = uniqueSecretsForKeys(secretByKey, spec.secretKeys)
    .map((secret) => redactedSecretState(secret))
    .filter(Boolean);
  const missingSecretKeys = missingKeysAfterAliasCoverage(secretByKey, spec.secretKeys);
  const coveredAliasKeys = aliasCoverageForKeys(secretByKey, spec.secretKeys);
  const latestSecretUpdatedAt = latestTimestamp(trackedSecrets.map((secret) => secret.updatedAt ?? secret.createdAt));
  const secretUpdatedAfterIssue = isAfter(latestSecretUpdatedAt, issue?.updatedAt);
  // Secret updatedAt currently changes during runtime binding/access bookkeeping.
  // Treat it as operator context, not autonomous permission to re-run protected gates.
  const hasSecretFreshnessSignal = secretUpdatedAfterIssue && !latestCommentIsPlaceholderOnly;
  const actionableFreshGateFact = hasExplicitApprovalOrEvidence || hasSecretFreshnessSignal;
  const blockedIssues = issues
    .filter((candidate) =>
      !terminalStatuses.has(candidate.status)
      && candidate.status === "blocked"
      && rootBlockerIdentifierFor(candidate) === spec.rootBlocker
    );
  const gateFresh = Boolean(actionableFreshGateFact);
  const nextAction = gateFresh && !latestCommentIsPlaceholderOnly
    ? `Resume one ${spec.owner} recheck lane with evidence.`
    : "Stay quiet; wait for fresh credential metadata or explicit operator evidence.";

  gates.push({
    project: spec.project,
    rootBlocker: spec.rootBlocker,
    owner: spec.owner,
    purpose: spec.purpose,
    allowedAction: spec.allowedAction,
    forbiddenAction: spec.forbiddenAction,
    evidenceRequired: spec.evidenceRequired,
    acceptedFreshFacts: spec.acceptedFreshFacts,
    operatorPrompt: spec.operatorPrompt,
    approvalDryRunCommand: spec.approvalDryRunCommand,
    approvalApplyCommand: spec.approvalApplyCommand,
    recheckHandoff: spec.recheckHandoff,
    issue: issue ? {
      id: issue.id,
      identifier: issue.identifier,
      title: issue.title,
      status: issue.status,
      updatedAt: issue.updatedAt,
    } : null,
    trackedSecrets,
    missingSecretKeys,
    coveredAliasKeys,
    latestSecretUpdatedAt,
    secretUpdatedAfterIssue,
    hasSecretFreshnessSignal,
    actionableFreshGateFact,
    hasExplicitApprovalOrEvidence,
    latestCommentIsPlaceholderOnly,
    latestEvidence,
    blockedIssueCount: blockedIssues.length,
    blockedIssueSample: blockedIssues.slice(0, 10).map((blockedIssue) => ({
      identifier: blockedIssue.identifier,
      title: blockedIssue.title,
      status: blockedIssue.status,
      assigneeAgentId: blockedIssue.assigneeAgentId ?? null,
      assigneeAgentName: agentById.get(blockedIssue.assigneeAgentId)?.name ?? null,
    })),
    nextAction,
  });
}

const freshGateCount = gates.filter((gate) =>
  gate.actionableFreshGateFact
  && !gate.latestCommentIsPlaceholderOnly
).length;
const operatingDecision = freshGateCount > 0
  ? `There are ${freshGateCount} fresh gate(s). Apply at most one responsible gate recheck lane per tick.`
  : "No gate is fresh. Do not resume blocked delivery lanes; keep monitoring and wait for a new operator/credential fact.";

const packet = {
  generatedAt: stateStableTimestampLabel,
  apiBase,
  company: { id: company.id, name: company.name },
  health: {
    restartRequired: health.devServer?.restartRequired ?? null,
    activeRunCount: stateStableRuntimeLabel,
    liveRunCount: stateStableRuntimeLabel,
  },
  gates,
  operatingDecision,
};

await writePacketFiles(packet);

console.log(JSON.stringify({
  apiBase,
  company: packet.company,
  refreshedAt: new Date().toISOString(),
  fileTimestampMode: packet.generatedAt,
  health: packet.health,
  runtime: {
    activeRunCount: health.devServer?.activeRunCount ?? liveRuns.length,
    liveRunCount: liveRuns.length,
  },
  gateCount: gates.length,
  freshGateCount,
  gates: gates.map((gate) => ({
    project: gate.project,
    rootBlocker: gate.rootBlocker,
    status: gate.issue?.status ?? "missing",
    owner: gate.owner,
    fresh: Boolean(gate.actionableFreshGateFact)
      && !gate.latestCommentIsPlaceholderOnly,
    nextAction: gate.nextAction,
    evidenceRequired: gate.evidenceRequired,
    acceptedFreshFacts: gate.acceptedFreshFacts,
    operatorPrompt: gate.operatorPrompt,
    approvalDryRunCommand: gate.approvalDryRunCommand,
    approvalApplyCommand: gate.approvalApplyCommand,
    recheckHandoff: gate.recheckHandoff,
    latestEvidence: gate.latestEvidence,
  })),
  operatingDecision,
  outputs: [
    "report/softwarehouse-unblock-packet.json",
    "docs/status/softwarehouse-unblock-packet.md",
  ],
}, null, 2));
