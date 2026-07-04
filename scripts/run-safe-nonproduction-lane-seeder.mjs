import { rootBlockerIdentifierFor } from "./lib/issue-blockers.mjs";
import { softwarehouseGateSpecs } from "./lib/softwarehouse-gates.mjs";
import { findAgentByNameOrAlias } from "./lib/softwarehouse-agent-resolver.mjs";

const apiBase = process.env.PAPERCLIP_API_URL ?? "http://127.0.0.1:3200";
const companyNames = [
  process.env.SOFTWAREHOUSE_COMPANY_NAME,
  process.env.PAPERCLIP_COMPANY_NAME,
  "LuckySparrow",
  "LuckySparrow Software House",
].filter(Boolean);
const companyId = process.env.PAPERCLIP_COMPANY_ID ?? null;
const apply = process.argv.includes("--apply");

const terminalStatuses = new Set(["done", "cancelled"]);
const knownGateRoots = new Set(softwarehouseGateSpecs.map((spec) => spec.rootBlocker));
const soarGateRoot = softwarehouseGateSpecs.find((spec) => spec.project === "Soar")?.rootBlocker ?? "Soar gate";
const safeNonProductionCooldownMs = 6 * 60 * 60 * 1000;
const noEvidenceSafeLaneCooldownMs = 24 * 60 * 60 * 1000;
const triageTargetPattern = /^\[Softwarehouse\]\[Blocked Triage\] Classify ([^\s]+) and produce next legal action$/;
const terminalTriageCooldownMs = Number.parseInt(
  process.env.SOFTWAREHOUSE_BLOCKED_TRIAGE_COOLDOWN_MS ?? `${24 * 60 * 60 * 1000}`,
  10,
);

const safeLaneTitle = "[Soar][Safe Lane] Non-production architecture/status refresh while gate is blocked";

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
  return findAgentByNameOrAlias(items, name);
}

function activeProjectByControlledName(projects, controlledName) {
  const aliases = {
    Soar: ["Soar", "11 Innovation: Soar"],
    Roost: ["Roost", "11 Innovation: Roost"],
    "Softwarehouse Operating System": ["Softwarehouse Operating System", "00 General: Softwarehouse"],
  }[controlledName] ?? [controlledName];
  return projects.find((project) => aliases.includes(project.name) && !project.archivedAt) ?? null;
}

function byTitle(items, title) {
  return items.find((item) => item.title === title);
}

function ageMs(timestamp) {
  return timestamp ? Date.now() - new Date(timestamp).getTime() : Number.POSITIVE_INFINITY;
}

function isKnownIntentionalBlockedIssue(issue) {
  const title = String(issue.title ?? "");
  const description = String(issue.description ?? "");
  const labels = (issue.labels ?? []).map((label) => String(label.name ?? "").toLowerCase());
  const architectureArbLane = /\[Soar\]\[ARB-\d+\]/i.test(title)
    && labels.includes("architecture")
    && labels.includes("delivery");
  const protectedEvidenceOpsLane = /\[Soar\]\[ARB-\d+\]\[Ops\]/i.test(title)
    && /protected evidence|input readiness|fail-closed/i.test(`${title}\n${description}`);
  const explicitlyDecisionBound = /decision|required input|once .* active|dependency|blocked_on_inputs|protected inputs/i.test(description);
  return (architectureArbLane && explicitlyDecisionBound) || protectedEvidenceOpsLane;
}

function isProductivityReviewIssue(issue) {
  const title = String(issue.title ?? "").toLowerCase();
  return title.startsWith("review productivity for ");
}

function triageTargetIdentifierFor(issue) {
  const match = String(issue.title ?? "").match(triageTargetPattern);
  return match?.[1] ?? null;
}

function newestIssue(left, right) {
  if (!left) return right;
  if (!right) return left;
  return String(left.updatedAt ?? "").localeCompare(String(right.updatedAt ?? "")) >= 0 ? left : right;
}

function terminalTriageByTargetFor(issues) {
  const byTarget = new Map();
  for (const issue of issues) {
    if (!terminalStatuses.has(issue.status)) continue;
    const target = triageTargetIdentifierFor(issue);
    if (!target) continue;
    byTarget.set(target, newestIssue(byTarget.get(target), issue));
  }
  return byTarget;
}

function hasRecentTerminalTriageDisposition(issue, terminalTriageByTarget, now = Date.now()) {
  const identifier = issue.identifier ?? issue.id;
  const terminalTriage = terminalTriageByTarget.get(identifier);
  if (!terminalTriage) return false;
  const targetUpdatedAt = Date.parse(issue.updatedAt ?? "");
  const triageUpdatedAt = Date.parse(terminalTriage.updatedAt ?? "");
  if (!Number.isFinite(targetUpdatedAt) || !Number.isFinite(triageUpdatedAt)) return false;
  return triageUpdatedAt >= targetUpdatedAt
    || (Number.isFinite(terminalTriageCooldownMs) && now - triageUpdatedAt <= terminalTriageCooldownMs);
}

async function hasNoEvidenceClosure(issue) {
  if (!issue || issue.status !== "cancelled") return false;
  const comments = await request("GET", `/api/issues/${issue.id}/comments?order=desc&limit=8`)
    .catch(() => []);
  return comments.some((comment) =>
    /\bno[- ]evidence\b/i.test(comment.body ?? "")
    || /without evidence/i.test(comment.body ?? "")
    || /bez dowodu/i.test(comment.body ?? "")
  );
}

async function ensureLabel(companyId, labelsByName, name, color) {
  const existing = labelsByName.get(name);
  if (existing) return existing;
  const created = await request("POST", `/api/companies/${companyId}/labels`, { name, color });
  labelsByName.set(name, created);
  return created;
}

async function resolveCompany() {
  if (companyId) return { id: companyId, source: "PAPERCLIP_COMPANY_ID" };

  const companies = await request("GET", "/api/companies");
  const company = companies.find((candidate) => companyNames.includes(candidate.name));
  if (!company) throw new Error(`Company not found. Tried: ${companyNames.join(", ")}`);
  return { id: company.id, source: "company_name" };
}

const company = await resolveCompany();

const [health, projects, agents, goals, labels, issues, liveRuns] = await Promise.all([
  request("GET", "/api/health"),
  request("GET", `/api/companies/${company.id}/projects`),
  request("GET", `/api/companies/${company.id}/agents`),
  request("GET", `/api/companies/${company.id}/goals`),
  request("GET", `/api/companies/${company.id}/labels`),
  request("GET", `/api/companies/${company.id}/issues?limit=1000`),
  request("GET", `/api/companies/${company.id}/live-runs`),
]);

const activeRunCount = health.devServer?.activeRunCount ?? liveRuns.length;

const soar = activeProjectByControlledName(projects, "Soar");
if (!soar || soar.archivedAt) throw new Error("Active Soar project not found.");

const soarIssues = issues.filter((issue) => issue.projectId === soar.id && !terminalStatuses.has(issue.status));
const terminalTriageByTarget = terminalTriageByTargetFor(issues);
const existingSafeLane = issues.find((issue) => issue.title === safeLaneTitle && !terminalStatuses.has(issue.status));
const recentCompletedSafeLane = issues
  .filter((issue) => issue.title === safeLaneTitle && terminalStatuses.has(issue.status))
  .sort((left, right) => String(right.updatedAt).localeCompare(String(left.updatedAt)))[0] ?? null;
const safeLaneCooldownActive = Boolean(
  recentCompletedSafeLane
  && ageMs(recentCompletedSafeLane.updatedAt) < safeNonProductionCooldownMs
);
const recentSafeLaneWasNoEvidence = await hasNoEvidenceClosure(recentCompletedSafeLane);
const noEvidenceSafeLaneCooldownActive = Boolean(
  recentCompletedSafeLane
  && recentSafeLaneWasNoEvidence
  && ageMs(recentCompletedSafeLane.updatedAt) < noEvidenceSafeLaneCooldownMs
);
const runnableSoarIssue = soarIssues.find((issue) => ["todo", "backlog"].includes(issue.status));
const blockedSoarIssues = soarIssues.filter((issue) => issue.status === "blocked");
const blockedSoarIssuesWithoutSafeDisposition = blockedSoarIssues.filter((issue) => {
  const rootBlocker = rootBlockerIdentifierFor(issue);
  return !knownGateRoots.has(rootBlocker)
    && !hasRecentTerminalTriageDisposition(issue, terminalTriageByTarget)
    && !isKnownIntentionalBlockedIssue(issue)
    && !isProductivityReviewIssue(issue);
});
const unknownBlockedIssue = blockedSoarIssuesWithoutSafeDisposition[0] ?? null;
const allSoarOpenBlockedByKnownGates = soarIssues.length > 0
  && soarIssues.every((issue) => issue.status === "blocked")
  && blockedSoarIssuesWithoutSafeDisposition.length === 0;

const actions = [];
if (activeRunCount > 0) {
  actions.push({
    action: "noop_active_runs",
    activeRunCount,
    liveRunCount: liveRuns.length,
  });
} else if (existingSafeLane) {
  actions.push({
    action: "noop_existing_safe_lane",
    identifier: existingSafeLane.identifier,
    status: existingSafeLane.status,
    title: existingSafeLane.title,
  });
} else if (noEvidenceSafeLaneCooldownActive) {
  actions.push({
    action: "noop_recent_safe_lane_no_evidence",
    identifier: recentCompletedSafeLane.identifier,
    status: recentCompletedSafeLane.status,
    updatedAt: recentCompletedSafeLane.updatedAt,
    cooldownHours: noEvidenceSafeLaneCooldownMs / 60 / 60 / 1000,
    title: recentCompletedSafeLane.title,
  });
} else if (safeLaneCooldownActive) {
  actions.push({
    action: "noop_recent_safe_lane_completed",
    identifier: recentCompletedSafeLane.identifier,
    status: recentCompletedSafeLane.status,
    updatedAt: recentCompletedSafeLane.updatedAt,
    title: recentCompletedSafeLane.title,
  });
} else if (runnableSoarIssue) {
  actions.push({
    action: "noop_runnable_work_exists",
    identifier: runnableSoarIssue.identifier,
    status: runnableSoarIssue.status,
    title: runnableSoarIssue.title,
  });
} else if (unknownBlockedIssue) {
  actions.push({
    action: "noop_unknown_blocker_needs_triage",
    identifier: unknownBlockedIssue.identifier,
    rootBlocker: rootBlockerIdentifierFor(unknownBlockedIssue),
    title: unknownBlockedIssue.title,
  });
} else if (allSoarOpenBlockedByKnownGates) {
  const labelsByName = new Map(labels.map((label) => [label.name, label]));
  for (const [name, color] of [
    ["soar", "#0f766e"],
    ["known-state", "#7c3aed"],
    ["architecture", "#475569"],
    ["docs", "#64748b"],
    ["non-production", "#16a34a"],
  ]) {
    await ensureLabel(company.id, labelsByName, name, color);
  }

  const assignee = byName(agents, "Docs Memory Lead") ?? byName(agents, "Soar Project Manager");
  const goal = byTitle(goals, "Soar known-state baseline")
    ?? byTitle(goals, "Template feedback from Soar pilot")
    ?? byTitle(goals, "Soar: sellable or personally excellent product");
  const workspaces = await request("GET", `/api/projects/${soar.id}/workspaces`);
  const workspace = workspaces.find((item) => item.isPrimary) ?? workspaces[0] ?? null;
  const labelIds = ["soar", "known-state", "architecture", "docs", "non-production"]
    .map((name) => labelsByName.get(name)?.id)
    .filter(Boolean);

  const input = {
    title: safeLaneTitle,
    description: [
      "Safe autonomous work lane created because every open Soar lane is blocked by a known production/operator gate or has a recent explicit triage disposition.",
      "",
      "Scope:",
      "- refresh non-production architecture/status/docs/evidence only;",
      "- inspect current docs/index/architecture map freshness;",
      "- identify drift between Paperclip issue state and Soar docs/history;",
      "- update or propose documentation/index corrections only when safe;",
      "- create narrower follow-up issues for real implementation gaps instead of changing product code here.",
      "",
      "Hard limits:",
      "- no deploy, push, production mutation, live account mutation, secret printing, credential rotation, or broad refactor;",
      "- do not retry protected smoke gates unless gate freshness watcher marks a newer credential/approval event;",
      "- if code changes are required, stop and create a one-owner specialist issue with tests and risk notes.",
      "",
      "Evidence required:",
      "- exact files inspected;",
      "- exact docs/index drift found or explicit no-drift proof;",
      "- updates made with paths, or follow-up issue identifiers;",
      `- current gate summary for ${soarGateRoot} and why production was not touched.`,
      "- explicit list of blocked-but-parked issues that should stay parked until new evidence arrives.",
    ].join("\n"),
    status: "todo",
    priority: "high",
    assigneeAgentId: assignee?.id ?? null,
    projectId: soar.id,
    goalId: goal?.id ?? null,
    requestDepth: 2,
    labelIds,
    executionWorkspacePreference: workspace ? "shared_workspace" : undefined,
    executionWorkspaceId: workspace?.id ?? undefined,
    executionWorkspaceSettings: workspace ? {
      mode: "shared_workspace",
      workspaceRuntime: {
        docsRoot: "docs",
        evidenceRequiredBeforeDone: true,
        safeNonProductionOnly: true,
      },
    } : undefined,
    acceptanceCriteria: [
      "No production, deploy, push, secret, or live-account mutation occurs.",
      "Architecture/status/docs evidence is refreshed or explicitly confirmed fresh.",
      "Any implementation work is split into a separate one-owner issue.",
      "The Soar gate remains fail-closed until a real gate freshness event exists.",
    ],
  };

  actions.push({
    action: apply ? "created_safe_lane" : "would_create_safe_lane",
    title: input.title,
    assignee: assignee?.name ?? null,
    project: soar.name,
  });

  if (apply) {
    const created = await request("POST", `/api/companies/${company.id}/issues`, input);
    actions.at(-1).identifier = created.identifier;
    actions.at(-1).status = created.status;
  }
} else {
  actions.push({
    action: "noop_no_safe_seed_condition",
    soarOpenIssues: soarIssues.length,
    allSoarOpenBlockedByKnownGates,
    blockedSoarIssuesWithoutSafeDisposition: blockedSoarIssuesWithoutSafeDisposition.length,
  });
}

console.log(JSON.stringify({
  apiBase,
  company: { id: company.id, name: company.name },
  mode: apply ? "apply" : "dry-run",
  activeRunCount,
  actions,
  counts: {
    soarOpenIssues: soarIssues.length,
    liveRuns: liveRuns.length,
    activeRunCount,
    recentSafeLaneWasNoEvidence: recentSafeLaneWasNoEvidence ? 1 : 0,
    noEvidenceSafeLaneCooldownActive: noEvidenceSafeLaneCooldownActive ? 1 : 0,
    blockedSoarIssuesWithoutSafeDisposition: blockedSoarIssuesWithoutSafeDisposition.length,
  },
}, null, 2));
