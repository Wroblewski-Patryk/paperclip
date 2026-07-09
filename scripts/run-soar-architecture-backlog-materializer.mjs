import { readFile } from "node:fs/promises";
import path from "node:path";

const apiBase = process.env.PAPERCLIP_API_URL ?? "http://127.0.0.1:3200";
const companyName = process.env.PAPERCLIP_COMPANY_NAME ?? "LuckySparrow Software House";
const companyId = process.env.PAPERCLIP_COMPANY_ID ?? null;
const appsRoot = process.env.LUCKYSPARROW_APPS_ROOT ?? "C:/Personal/Projekty/Aplikacje";
const apply = process.argv.includes("--apply");
const sourcePath = process.env.SOAR_ARCHITECTURE_BACKLOG_SOURCE_PATH
  ?? path.join(appsRoot, "Soar", "history", "plans", "luc-384-architecture-repair-backlog-2026-05-28.md");
const sourceLabel = path.basename(sourcePath);

const maxCreate = Number(process.env.SOAR_ARCHITECTURE_BACKLOG_MAX_CREATE ?? 5);
const acceptanceLedgerPath = process.env.SOAR_ACCEPTANCE_LEDGER_PATH ?? "report/soar-delivery-acceptance.latest.json";
const acceptanceBlockingCheckIds = new Set([
  "soar_source_control_clean",
  "owner_login_verified",
  "test_account_verified",
  "coolify_resources_reconciled",
]);

async function request(method, route, body) {
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
    body: body === undefined ? undefined : JSON.stringify(body),
  });
  const text = await response.text();
  const data = text ? JSON.parse(text) : null;
  if (!response.ok) throw new Error(`${method} ${route} failed with ${response.status}: ${text}`);
  return data;
}

function parseBacklogRows(markdown) {
  const rows = [];
  for (const line of markdown.split(/\r?\n/)) {
    if (!line.startsWith("| ARB-")) continue;
    const cells = line.split("|").slice(1, -1).map((cell) => cell.trim());
    if (cells.length < 9) continue;
    const [id, sourceGap, ownerLane, layer, severity, slice, verification, dependency, status] = cells;
    rows.push({ id, sourceGap, ownerLane, layer, severity, slice, verification, dependency, status });
  }
  return rows;
}

function priorityFor(row) {
  if (row.severity === "critical") return "critical";
  if (row.severity === "high") return "high";
  return "medium";
}

function statusFor(row) {
  if (/blocked/i.test(row.status) || /Protected inputs|decision/i.test(row.dependency)) return "blocked";
  if (/ready/i.test(row.status)) return "backlog";
  return "backlog";
}

function shouldAttachAssignee(row) {
  return Boolean(row.ownerLane);
}

function agentMatches(agent, wanted) {
  const values = [
    agent.name,
    agent.urlKey,
    agent.metadata?.rosterKey,
  ].map((value) => String(value ?? "").toLowerCase());
  return wanted.some((needle) => values.some((value) => value.includes(needle)));
}

function assigneeFor(row, agents) {
  const owner = row.ownerLane.toLowerCase();
  const names = [];
  if (owner.includes("qa") || owner.includes("test")) names.push("qa-verification", "test-automation", "qve", "tae");
  if (owner.includes("ops") || owner.includes("delivery")) names.push("deployment-reliability", "delivery-project", "dre", "dpm");
  if (owner.includes("security")) names.push("security-privacy", "spa");
  if (owner.includes("backend")) names.push("core-backend", "cbe");
  if (owner.includes("runtime") || owner.includes("adapter") || owner.includes("integration")) {
    names.push("runtime-adapter", "integration-domain", "rte", "ide");
  }
  if (owner.includes("architecture")) names.push("technical-solution", "chief-technology", "tsa", "cto");
  if (owner.includes("ux")) names.push("ui-visual", "ux-web", "uid", "uxw");
  if (owner.includes("docs")) names.push("documentation-steward", "dsm");
  names.push("soar-product", "chief-technology", "spm", "cto");
  return names
    .map((needle) => agents.find((agent) => agentMatches(agent, [needle])))
    .find(Boolean) ?? null;
}

async function ensureLabel(companyId, labelsByName, name, color) {
  const existing = labelsByName.get(name);
  if (existing) return existing;
  const created = await request("POST", `/api/companies/${companyId}/labels`, { name, color });
  labelsByName.set(name, created);
  return created;
}

const markdown = await readFile(sourcePath, "utf8");
const rows = parseBacklogRows(markdown);

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

async function resolveCompany() {
  if (companyId) return { id: companyId, source: "PAPERCLIP_COMPANY_ID" };

  const companies = await request("GET", "/api/companies");
  const company = companies.find((candidate) => candidate.name === companyName)
    ?? companies.find((candidate) => /^LuckySparrow\b/i.test(candidate.name));
  if (!company) throw new Error(`Company not found: ${companyName}`);
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
  request("GET", `/api/companies/${company.id}/live-runs?limit=50&minCount=0`),
]);

const activeRunCount = health.devServer?.activeRunCount ?? liveRuns.length;
const acceptanceLedger = await readJson(acceptanceLedgerPath, null);
const acceptanceBlocks = blockingAcceptanceChecks(acceptanceLedger);
if (apply && activeRunCount === 0 && acceptanceBlocks.length > 0) {
  console.log(JSON.stringify({
    apiBase,
    company: { id: company.id, name: company.name },
    mode: "apply",
    activeRunCount,
    liveRunCount: liveRuns.length,
    sourcePath,
    parsedRows: rows.length,
    maxCreate,
    acceptanceLedgerPath,
    actionCount: 1,
    actions: [{
      action: "noop_acceptance_ledger_gaps_before_architecture_backlog",
      blockedChecks: acceptanceBlocks.map((check) => ({
        id: check.id,
        status: check.status,
        reason: check.reason,
      })),
      ownerAction: "Run softwarehouse:access-unblock-tasks:apply or the assigned evidence lanes before materializing new architecture backlog.",
    }],
  }, null, 2));
  process.exit(0);
}
if (apply && activeRunCount > 0) {
  console.log(JSON.stringify({
    apiBase,
    company: { id: company.id, name: company.name },
    mode: "apply",
    activeRunCount,
    liveRunCount: liveRuns.length,
    sourcePath,
    parsedRows: rows.length,
    maxCreate,
    actionCount: 1,
    actions: [{
      action: "noop_active_runs",
      activeRunCount,
      liveRunCount: liveRuns.length,
    }],
  }, null, 2));
  process.exit(0);
}

const soar = projects.find((project) => ["Soar", "11 Innovation: Soar"].includes(project.name) && !project.archivedAt);
if (!soar) throw new Error("Active Soar project not found.");

const goal = goals.find((candidate) => candidate.title === "Soar V1 audit-to-completion loop")
  ?? goals.find((candidate) => candidate.title === "Soar no-regression system")
  ?? goals.find((candidate) => candidate.title === "Soar known-state baseline");

const labelsByName = new Map(labels.map((label) => [label.name, label]));
for (const [name, color] of [
  ["soar", "#0f766e"],
  ["architecture", "#475569"],
  ["known-state", "#7c3aed"],
  ["delivery", "#2563eb"],
  ["qa", "#ca8a04"],
  ["implementation", "#7c2d12"],
]) {
  await ensureLabel(company.id, labelsByName, name, color);
}
const labelIds = ["soar", "architecture", "known-state", "delivery", "qa", "implementation"]
  .map((name) => labelsByName.get(name)?.id)
  .filter(Boolean);

const actions = [];
for (const row of rows.slice(0, maxCreate)) {
  const title = `[Soar][${row.id}] ${row.slice.slice(0, 96)}`;
  const existing = issues.find((issue) => issue.title === title || String(issue.description ?? "").includes(`Architecture backlog row: ${row.id}`));
  if (existing) {
    actions.push({
      action: "noop_existing_architecture_backlog_issue",
      backlogId: row.id,
      identifier: existing.identifier,
      status: existing.status,
      title: existing.title,
    });
    continue;
  }

  const assignee = shouldAttachAssignee(row) ? assigneeFor(row, agents) : null;
  const input = {
    title,
    description: [
      `Architecture backlog row: ${row.id}`,
      "",
      `Source: \`${sourceLabel}\` architecture repair backlog materialized by Paperclip OS script.`,
      "",
      `Source gap: ${row.sourceGap}`,
      `Owner lane: ${row.ownerLane}`,
      `Layer: ${row.layer}`,
      `Severity: ${row.severity}`,
      `Executable repair slice: ${row.slice}`,
      `Verification contract: ${row.verification}`,
      `Dependency: ${row.dependency}`,
      `Architecture status: ${row.status}`,
      "",
      "Boundaries:",
      "- This issue is a backlog/materialization artifact until source-control and protected gates allow implementation.",
      "- No push, deploy, production restart, protected smoke, or secret access without a fresh gate fact.",
      "- If implementation touches the Soar repo, first resolve existing source-control classification and preserve current agent work.",
      "",
      "Definition of done:",
      "- Owner records exact affected capability/chain/files before implementation.",
      "- Owner records validation command/proof and regression risk.",
      "- PM links final evidence back to architecture graph/traceability.",
    ].join("\n"),
    status: statusFor(row),
    priority: priorityFor(row),
    assigneeAgentId: assignee?.id ?? null,
    projectId: soar.id,
    goalId: goal?.id ?? null,
    requestDepth: statusFor(row) === "blocked" ? 0 : 2,
    labelIds,
    acceptanceCriteria: [
      "The issue remains within its owner lane.",
      "No protected action occurs without a fresh gate fact.",
      "Evidence links back to architecture graph/traceability.",
    ],
  };

  actions.push({
    action: apply ? "created_architecture_backlog_issue" : "would_create_architecture_backlog_issue",
    backlogId: row.id,
    status: input.status,
    priority: input.priority,
    assignee: assignee?.name ?? null,
    title,
  });

  if (apply) {
    const created = await request("POST", `/api/companies/${company.id}/issues`, input);
    actions.at(-1).identifier = created.identifier;
    actions.at(-1).createdStatus = created.status;
  }
}

console.log(JSON.stringify({
  apiBase,
  company: { id: company.id, name: company.name },
  mode: apply ? "apply" : "dry-run",
  activeRunCount,
  liveRunCount: liveRuns.length,
  sourcePath,
  parsedRows: rows.length,
  maxCreate,
  actionCount: actions.length,
  actions,
}, null, 2));
