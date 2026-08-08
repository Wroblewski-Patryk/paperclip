import { spawnSync } from "node:child_process";
import { gateBriefFor } from "./lib/softwarehouse-control-brief.mjs";
import { softwarehouseGateSpecsByRootBlocker } from "./lib/softwarehouse-gates.mjs";

const apiBase = process.env.PAPERCLIP_API_URL ?? "http://127.0.0.1:3200";
const companyName = "LuckySparrow";
const companyId = process.env.PAPERCLIP_COMPANY_ID ?? null;
const apply = process.argv.includes("--apply");
const markerVersion = "v1";

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

function parseJsonOutput(output, name) {
  const text = String(output ?? "").trim();
  const start = text.indexOf("{");
  if (start === -1) throw new Error(`${name} did not emit JSON.`);
  return JSON.parse(text.slice(start));
}

function commentTimestamp(comment) {
  return comment.updatedAt ?? comment.createdAt ?? null;
}

function isAfterOrRecent(comment, gate, maxAgeHours = 6) {
  const timestamp = commentTimestamp(comment);
  const commentMs = timestamp ? new Date(timestamp).getTime() : Number.NaN;
  if (!Number.isFinite(commentMs)) return false;

  const latestEvidenceMs = gate.latestEvidence?.updatedAt
    ? new Date(gate.latestEvidence.updatedAt).getTime()
    : Number.NaN;
  if (Number.isFinite(latestEvidenceMs) && commentMs >= latestEvidenceMs - 5000) return true;

  return Date.now() - commentMs <= maxAgeHours * 60 * 60 * 1000;
}

function hasRecentEscalation(comments, gate) {
  const marker = `softwarehouse-stale-gate-escalation:${gate.rootBlocker}:${markerVersion}`;
  return comments.some((comment) =>
    String(comment.body ?? "").includes(marker)
    && isAfterOrRecent(comment, gate)
  );
}

function escalationBody(gate, spec, brief) {
  return [
    `softwarehouse-stale-gate-escalation:${gate.rootBlocker}:${markerVersion}`,
    "",
    `${gate.project} gate ${gate.rootBlocker} is still blocked and stale after ${brief.waitAgeHours ?? "unknown"}h.`,
    `Owner: ${gate.owner}.`,
    `Required owner action: obtain a fresh accepted operator/credential fact or keep ${gate.rootBlocker} blocked with a next review condition.`,
    `Latest evidence: ${gate.latestEvidence?.summary ?? gate.latestEvidence?.status ?? "none"}.`,
    `Evidence required: ${gate.evidenceRequired}.`,
    `Operator prompt: ${gate.operatorPrompt ?? "see unblock packet"}.`,
    "",
    spec.forbiddenAction,
    "This is organizational escalation only. It is not approval to run a protected recheck, mutate a repo, commit, push, deploy, restart production, touch secrets, or broaden scope.",
  ].join("\n");
}

const unblock = spawnSync(process.execPath, ["scripts/export-softwarehouse-unblock-packet.mjs"], {
  cwd: process.cwd(),
  env: process.env,
  encoding: "utf8",
  stdio: ["ignore", "pipe", "pipe"],
});
if (unblock.status !== 0) {
  throw new Error(`unblock packet failed with ${unblock.status}: ${unblock.stderr || unblock.stdout}`);
}
const packet = parseJsonOutput(unblock.stdout, "unblock packet");

async function resolveCompany() {
  if (companyId) return { id: companyId, source: "PAPERCLIP_COMPANY_ID" };

  const companies = await request("GET", "/api/companies");
  const company = companies.find((candidate) => candidate.name === companyName);
  if (!company) throw new Error(`Company not found: ${companyName}`);
  return { id: company.id, source: "company_name" };
}

const company = await resolveCompany();

const [health, issues, liveRuns] = await Promise.all([
  request("GET", "/api/health"),
  request("GET", `/api/companies/${company.id}/issues?limit=1000`),
  request("GET", `/api/companies/${company.id}/live-runs`),
]);
const activeRunCount = health.devServer?.activeRunCount ?? liveRuns.length;
const liveRunCount = liveRuns.length;
const issueByIdentifier = new Map(issues.map((issue) => [issue.identifier, issue]));

const actions = [];
const skipped = [];
for (const gate of packet.gates ?? []) {
  const spec = softwarehouseGateSpecsByRootBlocker.get(gate.rootBlocker);
  const issue = issueByIdentifier.get(gate.rootBlocker);
  if (!spec || !issue) {
    skipped.push({ rootBlocker: gate.rootBlocker, reason: "missing_spec_or_issue" });
    continue;
  }
  const brief = gateBriefFor(gate);
  if (gate.status !== "blocked" || gate.fresh || !brief.stale) {
    skipped.push({ rootBlocker: gate.rootBlocker, reason: "not_blocked_stale_gate" });
    continue;
  }
  const comments = await request("GET", `/api/issues/${issue.id}/comments?order=desc&limit=20`)
    .then((result) => result.value ?? result ?? [])
    .catch(() => []);
  if (hasRecentEscalation(comments, gate)) {
    skipped.push({ rootBlocker: gate.rootBlocker, reason: "recent_escalation_exists" });
    continue;
  }

  actions.push({
    rootBlocker: gate.rootBlocker,
    project: gate.project,
    issueId: issue.id,
    identifier: issue.identifier,
    title: issue.title,
    owner: gate.owner,
    waitAgeHours: brief.waitAgeHours,
    latestEvidence: gate.latestEvidence ?? null,
    body: escalationBody(gate, spec, brief),
  });
}

const applied = [];
if (apply) {
  if (activeRunCount > 0 || liveRunCount > 0) {
    throw new Error(`Refusing to apply stale gate escalation while ${activeRunCount} active run(s) and ${liveRunCount} live run(s) exist.`);
  }
  if (actions.length > 1) {
    throw new Error(`Refusing to apply ${actions.length} stale gate escalations at once; apply one owner escalation per tick.`);
  }
  for (const action of actions) {
    const comment = await request("POST", `/api/issues/${action.issueId}/comments`, { body: action.body });
    applied.push({
      rootBlocker: action.rootBlocker,
      commentId: comment.id,
      createdAt: comment.createdAt ?? null,
      updatedAt: comment.updatedAt ?? null,
    });
  }
}

console.log(JSON.stringify({
  apiBase,
  company: { id: company.id, name: company.name },
  mode: apply ? "apply" : "dry-run",
  activeRunCount,
  liveRunCount,
  actionCount: actions.length,
  actions: actions.map((action) => ({
    rootBlocker: action.rootBlocker,
    project: action.project,
    title: action.title,
    owner: action.owner,
    waitAgeHours: action.waitAgeHours,
    latestEvidence: action.latestEvidence,
  })),
  skipped,
  applied,
}, null, 2));
