import { readFile, readdir, stat } from "node:fs/promises";
import path from "node:path";

import { findAgentByNameOrAlias } from "./lib/softwarehouse-agent-resolver.mjs";

const apiBase = process.env.PAPERCLIP_API_URL ?? "http://127.0.0.1:3200";
const companyName = "LuckySparrow";
const companyNames = ["LuckySparrow", "LuckySparrow Software House"];
const companyId = process.env.PAPERCLIP_COMPANY_ID ?? null;
const appsRoot = process.env.LUCKYSPARROW_APPS_ROOT ?? "C:/Personal/Projekty/Aplikacje";
const apply = process.argv.includes("--apply");
const requestTimeoutMs = Number(process.env.SOFTWAREHOUSE_SAFE_ARCHITECTURE_PLANNING_REQUEST_TIMEOUT_MS ?? 30_000);

const title = "[Soar][Architecture Planning] Convert architecture docs into executable repair backlog";
const architectureRoot = path.join(appsRoot, "Soar", "docs", "architecture");
const marker = "softwarehouse-safe-architecture-planning:v1";
const recentPlanningWindowMs = Number(process.env.ARCHITECTURE_PLANNING_RECENT_WINDOW_MS ?? 12 * 60 * 60 * 1000);
const acceptanceLedgerPath = process.env.SOAR_ACCEPTANCE_LEDGER_PATH ?? "report/soar-delivery-acceptance.latest.json";
const acceptanceBlockingCheckIds = new Set([
  "soar_source_control_clean",
  "owner_login_verified",
  "test_account_verified",
  "coolify_resources_reconciled",
]);

async function request(method, route, body) {
  const signal = AbortSignal.timeout(requestTimeoutMs);
  const headers = { "content-type": "application/json" };
  if (process.env.PAPERCLIP_AUTH_HEADER) {
    headers.authorization = process.env.PAPERCLIP_AUTH_HEADER;
  }
  if (process.env.PAPERCLIP_RUN_ID && ["POST", "PATCH", "PUT", "DELETE"].includes(method)) {
    headers["x-paperclip-run-id"] = process.env.PAPERCLIP_RUN_ID;
  }
  const response = await fetch(`${apiBase}${route}`, {
    method,
    headers,
    signal,
    body: body === undefined ? undefined : JSON.stringify(body),
  });
  const text = await response.text();
  const data = text ? JSON.parse(text) : null;
  if (!response.ok) throw new Error(`${method} ${route} failed with ${response.status}: ${text}`);
  return data;
}

function isRequestTimeoutError(error) {
  return error instanceof Error && error.name === "TimeoutError";
}

async function readJson(path, fallback = null) {
  try {
    return JSON.parse(await readFile(path, "utf8"));
  } catch {
    return fallback;
  }
}

function blockingAcceptanceChecks(ledger) {
  return (ledger?.checks ?? [])
    .filter((check) => acceptanceBlockingCheckIds.has(check.id))
    .filter((check) => ["missing", "blocker", "fail", "unknown", "partial"].includes(check.status));
}

async function walkFiles(root, prefix = "") {
  let entries = [];
  try {
    entries = await readdir(path.join(root, prefix), { withFileTypes: true });
  } catch {
    return [];
  }
  const output = [];
  for (const entry of entries) {
    const relative = path.join(prefix, entry.name).replaceAll("\\", "/");
    if (entry.isDirectory()) {
      output.push(...await walkFiles(root, relative));
    } else if (entry.isFile()) {
      const fileStat = await stat(path.join(root, relative));
      output.push({ path: relative, size: fileStat.size });
    }
  }
  return output;
}

function byName(items, name) {
  return findAgentByNameOrAlias(items, name);
}

function byTitle(items, wantedTitle) {
  return items.find((item) => item.title === wantedTitle);
}

function activeProjectByControlledName(projects, controlledName) {
  const aliases = {
    Soar: ["Soar", "11 Innovation: Soar"],
    Roost: ["Roost", "11 Innovation: Roost"],
    "Softwarehouse Operating System": ["Softwarehouse Operating System", "00 General: Softwarehouse"],
  }[controlledName] ?? [controlledName];
  return projects.find((project) => aliases.includes(project.name) && !project.archivedAt) ?? null;
}

async function ensureLabel(companyId, labelsByName, name, color) {
  const existing = labelsByName.get(name);
  if (existing) return existing;
  const created = await request("POST", `/api/companies/${companyId}/labels`, { name, color });
  labelsByName.set(name, created);
  return created;
}

const architectureFiles = await walkFiles(architectureRoot);
const filesByArea = new Map();
for (const file of architectureFiles) {
  const area = file.path.split("/")[0] ?? "root";
  filesByArea.set(area, (filesByArea.get(area) ?? 0) + 1);
}

const keyFiles = [
  "architecture-evidence-graph-system.md",
  "traceability-matrix.md",
  "codebase-map.md",
  "registry/features.csv",
  "registry/api_routes.csv",
  "registry/components.csv",
  "registry/functions.csv",
  "registry/tests.csv",
  "relations/dependencies.csv",
  "chains/chains.csv",
].filter((file) => architectureFiles.some((entry) => entry.path === file));

async function resolveCompany() {
  if (companyId) return { id: companyId, source: "PAPERCLIP_COMPANY_ID" };

  const companies = await request("GET", "/api/companies");
  const company = companies.find((candidate) => companyNames.includes(candidate.name))
    ?? companies.find((candidate) => /^LuckySparrow\b/i.test(candidate.name));
  if (!company) throw new Error(`Company not found: ${companyName}`);
  return { id: company.id, source: "company_name" };
}

const company = await resolveCompany();

let health;
let projects;
let agents;
let goals;
let labels;
let issues;
let liveRuns;
let matchingTitleIssues;
try {
  [health, projects, agents, goals, labels, issues, liveRuns] = await Promise.all([
    request("GET", "/api/health"),
    request("GET", `/api/companies/${company.id}/projects`),
    request("GET", `/api/companies/${company.id}/agents`),
    request("GET", `/api/companies/${company.id}/goals`),
    request("GET", `/api/companies/${company.id}/labels`),
    request("GET", `/api/companies/${company.id}/issues?limit=1000`),
    request("GET", `/api/companies/${company.id}/live-runs?limit=50&minCount=0`),
  ]);
  matchingTitleIssues = await request("GET", `/api/companies/${company.id}/issues?q=${encodeURIComponent(title)}&limit=50`);
} catch (error) {
  if (!isRequestTimeoutError(error)) throw error;
  console.log(JSON.stringify({
    apiBase,
    company: { id: company.id, name: company.name ?? companyName },
    mode: apply ? "apply" : "dry-run",
    requestTimeoutMs,
    candidateScanStatus: "timed_out",
    activeRunCount: null,
    liveRunCount: null,
    architectureRoot,
    architectureFileCount: architectureFiles.length,
    missingLabels: [],
    actions: [{
      action: "skip_safe_architecture_planning_candidate_scan_timeout",
      status: "degraded",
      ownerAction: "Restore local Paperclip API issue-list responsiveness, then rerun node scripts/run-safe-architecture-planning-seeder.mjs or pnpm softwarehouse:control-tick.",
    }],
  }, null, 2));
  process.exit(0);
}

const activeRunCount = health.devServer?.activeRunCount ?? liveRuns.length;
const activeRunNoop = apply && activeRunCount > 0;
const acceptanceLedger = await readJson(acceptanceLedgerPath, null);
const acceptanceBlocks = blockingAcceptanceChecks(acceptanceLedger);
const acceptanceLedgerNoop = apply && !activeRunNoop && acceptanceBlocks.length > 0;

const soar = activeProjectByControlledName(projects, "Soar");
if (!soar || soar.archivedAt) throw new Error("Active Soar project not found.");

const candidateIssues = [...matchingTitleIssues, ...issues];
const existing = candidateIssues.find((issue) =>
  issue.title === title && !["done", "cancelled"].includes(issue.status)
);
const recentDone = candidateIssues
  .filter((issue) => issue.title === title && issue.status === "done")
  .sort((left, right) => String(right.updatedAt).localeCompare(String(left.updatedAt)))[0] ?? null;
const recentDoneAgeMs = recentDone?.updatedAt
  ? Date.now() - new Date(recentDone.updatedAt).getTime()
  : Number.POSITIVE_INFINITY;

const labelsByName = new Map(labels.map((label) => [label.name, label]));
const requiredLabels = [
  ["soar", "#0f766e"],
  ["architecture", "#475569"],
  ["known-state", "#7c3aed"],
  ["non-production", "#16a34a"],
  ["delivery", "#2563eb"],
];
const missingLabels = requiredLabels
  .map(([name]) => name)
  .filter((name) => !labelsByName.has(name));
if (apply) {
  for (const [name, color] of requiredLabels) {
    await ensureLabel(company.id, labelsByName, name, color);
  }
}

const assignee = byName(agents, "Soar Project Manager") ?? byName(agents, "CTO Architect");
const goal = byTitle(goals, "Soar V1 audit-to-completion loop")
  ?? byTitle(goals, "Soar known-state baseline")
  ?? byTitle(goals, "Soar: sellable or personally excellent product");

const description = [
  marker,
  "",
  "Safe architecture planning lane created because protected Soar delivery is blocked, but architecture/docs can still drive Paperclip backlog without touching the project repo.",
  "",
  "Scope:",
  "- read existing Soar architecture docs, registries, chains, traceability, and evidence maps;",
  "- treat architecture/docs as the source of product intent when they describe what Soar should become;",
  "- infer missing capabilities, implementation gaps, QA gaps, UX gaps, deployment gaps, and docs gaps from those docs without asking the board to restate the goal;",
  "- convert the docs into a prioritized Paperclip backlog of narrow repair/audit issues;",
  "- each proposed issue must identify owner role, affected capability/chain, expected proof, risk, and whether it needs protected gate approval;",
  "- if docs conflict, create a decision/backlog issue that names the conflict and the smallest reversible next step;",
  "- do not edit Soar files, do not commit, do not push, do not deploy, do not restart, do not run protected smoke, do not access or print secrets.",
  "",
  "Architecture packet:",
  `- root: ${architectureRoot}`,
  `- file count: ${architectureFiles.length}`,
  `- areas: ${Array.from(filesByArea.entries()).map(([area, count]) => `${area}:${count}`).sort().join(", ")}`,
  `- key files: ${keyFiles.join(", ") || "none detected"}`,
  "",
  "Required output in Paperclip only:",
  "- comment with the top 10 architecture-backed repair/audit candidates;",
  "- create at most 5 child/backlog issues in Paperclip, each one-owner and evidence-based;",
  "- prefer work that moves Soar toward sellable, owner-usable production readiness;",
  "- mark which candidates are blocked by LUC-241 protected auth/smoke gate;",
  "- mark which candidates can be advanced without project repo mutation;",
  "- final disposition must say whether next work is PM triage, backend, frontend, QA, docs, ops, or gate owner.",
  "",
  "Definition of done:",
  "- Paperclip contains an executable backlog derived from architecture docs;",
  "- every created issue has a scope small enough for one agent and one evidence contract;",
  "- no project repo files were written.",
].join("\n");

const labelIds = ["soar", "architecture", "known-state", "non-production", "delivery"]
  .map((name) => labelsByName.get(name)?.id)
  .filter(Boolean);

const input = {
  title,
  description,
  status: "todo",
  priority: "high",
  assigneeAgentId: assignee?.id ?? null,
  projectId: soar.id,
  goalId: goal?.id ?? null,
  requestDepth: 2,
  labelIds,
  acceptanceCriteria: [
    "No Soar project filesystem writes occur.",
    "No commit, push, deploy, restart, protected smoke, production mutation, or secret access occurs.",
    "Architecture docs are converted into Paperclip-only backlog with owner/evidence/risk.",
    "At most 5 follow-up issues are created in this pass.",
  ],
};

const actions = [];
if (acceptanceLedgerNoop) {
  actions.push({
    action: "noop_acceptance_ledger_gaps_before_architecture_planning",
    acceptanceLedgerPath,
    blockedChecks: acceptanceBlocks.map((check) => ({
      id: check.id,
      status: check.status,
      reason: check.reason,
    })),
    ownerAction: "Run softwarehouse:access-unblock-tasks:apply or the assigned evidence lanes before starting architecture planning.",
  });
} else if (activeRunNoop) {
  actions.push({
    action: "noop_active_runs",
    activeRunCount,
    liveRunCount: liveRuns.length,
  });
} else if (existing) {
  actions.push({
    action: "noop_existing_architecture_planning_lane",
    identifier: existing.identifier,
    status: existing.status,
    title: existing.title,
  });
} else if (recentDone && recentDoneAgeMs <= recentPlanningWindowMs) {
  actions.push({
    action: "noop_recent_architecture_planning_done",
    identifier: recentDone.identifier,
    status: recentDone.status,
    title: recentDone.title,
    updatedAt: recentDone.updatedAt,
    recentPlanningWindowMs,
  });
} else {
  actions.push({
    action: apply ? "created_architecture_planning_lane" : "would_create_architecture_planning_lane",
    title,
    project: soar.name,
    assignee: assignee?.name ?? null,
    goal: goal?.title ?? null,
    architectureFileCount: architectureFiles.length,
    keyFiles,
    recentDone: recentDone ? {
      identifier: recentDone.identifier,
      status: recentDone.status,
      updatedAt: recentDone.updatedAt,
    } : null,
  });
  if (apply) {
    const created = await request("POST", `/api/companies/${company.id}/issues`, input);
    actions.at(-1).identifier = created.identifier;
    actions.at(-1).status = created.status;
  }
}

console.log(JSON.stringify({
  apiBase,
  company: { id: company.id, name: company.name },
  mode: apply ? "apply" : "dry-run",
  activeRunCount,
  liveRunCount: liveRuns.length,
  architectureRoot,
  architectureFileCount: architectureFiles.length,
  missingLabels,
  actions,
}, null, 2));
