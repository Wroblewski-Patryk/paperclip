import { softwarehouseGateSpecsByRootBlocker } from "./lib/softwarehouse-gates.mjs";
import { spawnSync } from "node:child_process";
import { canonicalSoftwarehouseRoutineTitle } from "./lib/softwarehouse-active-routines.mjs";

const apiBase = process.env.PAPERCLIP_API_URL ?? "http://127.0.0.1:3200";
const companyName = "LuckySparrow";
const companyId = process.env.PAPERCLIP_COMPANY_ID ?? null;
const apply = process.argv.includes("--apply");
const targetGate = process.argv.find((arg) => arg.startsWith("--gate="))?.slice("--gate=".length) ?? "LUC-241";
const marker = `softwarehouse-infrastructure-gate-diagnosis:${targetGate}:v1`;
const nonBlockingRoutineTitles = new Set([
  "09 Technology: Agent Health and Model Governance",
  "11 Innovation: Autonomy Governor",
  "04 Operations: Gate Freshness Watcher",
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

function byTitle(items, title) {
  return items.find((item) => item.title === title);
}

async function ensureLabel(companyId, labelsByName, name, color) {
  const existing = labelsByName.get(name);
  if (existing) return existing;
  const created = await request("POST", `/api/companies/${companyId}/labels`, { name, color });
  labelsByName.set(name, created);
  return created;
}

function latestEvidenceText(gate) {
  return [
    gate.latestEvidence?.summary,
    ...(gate.latestEvidence?.failureSignals ?? []),
    ...(gate.latestEvidence?.contextSignals ?? []),
    ...(gate.latestEvidence?.endpointSignals ?? []),
  ].filter(Boolean).join("\n");
}

function hasInfrastructureSignal(gate) {
  return /\b(fetch failed|dns|name resolution|tcptestsucceeded=false|enotfound|getaddrinfo|proxy|coolify|gateway|502|503|504)\b/i
    .test(latestEvidenceText(gate));
}

function readUnblockPacket() {
  const result = spawnSync(process.execPath, ["scripts/export-softwarehouse-unblock-packet.mjs"], {
    cwd: process.cwd(),
    encoding: "utf8",
    stdio: ["ignore", "pipe", "pipe"],
  });
  if (result.status !== 0) {
    throw new Error(`unblock packet failed: ${(result.stderr || result.stdout).trim()}`);
  }
  return JSON.parse(result.stdout);
}

const spec = softwarehouseGateSpecsByRootBlocker.get(targetGate);
if (!spec) throw new Error(`Unknown softwarehouse gate: ${targetGate}`);

async function resolveCompany() {
  if (companyId) return { id: companyId, source: "PAPERCLIP_COMPANY_ID" };

  const companies = await request("GET", "/api/companies");
  const company = companies.find((candidate) => candidate.name === companyName);
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
  request("GET", `/api/companies/${company.id}/live-runs`),
]);
const packet = readUnblockPacket();

const activeRunCount = health.devServer?.activeRunCount ?? liveRuns.length;
const issueById = new Map(issues.map((issue) => [issue.id, issue]));
const nonBlockingRoutineLiveRunCount = liveRuns.filter((run) => {
  const issue = issueById.get(run.issueId);
  return issue?.originKind === "routine_execution"
    && nonBlockingRoutineTitles.has(canonicalSoftwarehouseRoutineTitle(issue.title));
}).length;
const blockingActiveRunCount = Math.max(0, activeRunCount - nonBlockingRoutineLiveRunCount);
if (apply && blockingActiveRunCount > 0) {
  throw new Error(`Refusing to seed infrastructure diagnosis while ${blockingActiveRunCount} blocking active run(s) exist.`);
}

const gate = (packet.gates ?? []).find((candidate) => candidate.rootBlocker === targetGate);
if (!gate) throw new Error(`Gate ${targetGate} not found in unblock packet.`);

const title = `[${spec.project}][Infra Gate] Diagnose production DNS/network failure for ${targetGate}`;
const existing = issues.find((issue) =>
  issue.title === title && !["done", "cancelled"].includes(issue.status)
);
const recentDone = issues
  .filter((issue) => issue.title === title && ["done", "cancelled"].includes(issue.status))
  .sort((left, right) => String(right.updatedAt).localeCompare(String(left.updatedAt)))[0] ?? null;
const recentDoneAgeMs = recentDone?.updatedAt ? Date.now() - new Date(recentDone.updatedAt).getTime() : Number.POSITIVE_INFINITY;

const labelsByName = new Map(labels.map((label) => [label.name, label]));
for (const [name, color] of [
  [spec.project.toLowerCase(), "#0f766e"],
  ["ops", "#0369a1"],
  ["infrastructure", "#64748b"],
  ["gate", "#dc2626"],
  ["non-production", "#16a34a"],
]) {
  await ensureLabel(company.id, labelsByName, name, color);
}

const project = byName(projects, spec.project);
if (!project || project.archivedAt) throw new Error(`Active ${spec.project} project not found.`);

const assignee = byName(agents, spec.owner)
  ?? byName(agents, "DevOps Release Engineer")
  ?? byName(agents, "Ops Release Lead")
  ?? byName(agents, "CTO Architect");
const goal = byTitle(goals, `${spec.project} V1 audit-to-completion loop`)
  ?? byTitle(goals, `${spec.project}: sellable or personally excellent product`);

const description = [
  marker,
  "",
  `The ${spec.project} protected gate ${targetGate} is blocked, but the latest evidence now points to infrastructure reachability instead of ordinary credential failure.`,
  "",
  "Latest redacted evidence:",
  "```text",
  latestEvidenceText(gate).slice(0, 2200) || "none",
  "```",
  "",
  "Scope:",
  "- diagnose DNS resolution, TLS, reverse proxy, Coolify routing, service/container health, and endpoint reachability;",
  "- use redacted presence-only credential facts if needed; never print secret values;",
  "- record exact command/UI path, timestamp, observed host/endpoint, and pass/fail reason;",
  "- if the fix requires deploy, restart, DNS edit, runtime mutation, project repo mutation, push, or production-account mutation, stop and create/mark the required explicit operator gate instead of doing it.",
  "",
  "Forbidden in this lane:",
  "- no project repo writes, no commit, no push;",
  "- no deploy, restart, DNS edit, Coolify mutation, or service mutation without explicit operator approval;",
  "- no secret disclosure or broad production probing.",
  "",
  "Definition of done:",
  "- Paperclip comment names the root cause class: dns, tls/proxy, coolify-routing, service-down, auth-after-reachability, or unknown;",
  "- evidence says whether `/workers/ready` is unreachable before auth or reaches the API and fails later;",
  "- next issue is assigned to the narrow owner with exact approval needed, or the gate is returned to blocked with a next review condition.",
].join("\n");

const input = {
  title,
  description,
  status: hasInfrastructureSignal(gate) ? "todo" : "blocked",
  priority: "critical",
  assigneeAgentId: assignee?.id ?? null,
  projectId: project.id,
  goalId: goal?.id ?? null,
  requestDepth: hasInfrastructureSignal(gate) ? 2 : 0,
  labelIds: [spec.project.toLowerCase(), "ops", "infrastructure", "gate", "non-production"]
    .map((name) => labelsByName.get(name)?.id)
    .filter(Boolean),
  acceptanceCriteria: [
    "No project repository mutation, commit, push, deploy, restart, DNS edit, Coolify mutation, or secret disclosure occurs.",
    "DNS/TLS/proxy/Coolify/service reachability is classified with evidence.",
    "The lane posts exact commands or UI path, timestamp, endpoint, and pass/fail reason.",
    "If mutation is needed, the issue stops with an explicit operator gate request.",
  ],
};

const actions = [];
if (!hasInfrastructureSignal(gate)) {
  actions.push({
    action: "noop_no_infrastructure_signal",
    rootBlocker: targetGate,
    latestEvidence: latestEvidenceText(gate).slice(0, 400),
  });
} else if (existing) {
  actions.push({
    action: "noop_existing_infrastructure_gate_diagnosis",
    identifier: existing.identifier,
    status: existing.status,
    title: existing.title,
  });
} else if (recentDone && recentDoneAgeMs < 24 * 60 * 60 * 1000) {
  actions.push({
    action: "noop_recent_infrastructure_gate_diagnosis_completed",
    identifier: recentDone.identifier,
    status: recentDone.status,
    updatedAt: recentDone.updatedAt,
    title: recentDone.title,
  });
} else {
  actions.push({
    action: apply ? "created_infrastructure_gate_diagnosis" : "would_create_infrastructure_gate_diagnosis",
    rootBlocker: targetGate,
    project: spec.project,
    assignee: assignee?.name ?? null,
    goal: goal?.title ?? null,
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
  blockingActiveRunCount,
  nonBlockingRoutineLiveRunCount,
  rootBlocker: targetGate,
  hasInfrastructureSignal: hasInfrastructureSignal(gate),
  actions,
}, null, 2));
