import { spawnSync } from "node:child_process";

const apiBase = process.env.PAPERCLIP_API_URL ?? "http://127.0.0.1:3200";
const companyNames = [
  process.env.SOFTWAREHOUSE_COMPANY_NAME,
  process.env.PAPERCLIP_COMPANY_NAME,
  "LuckySparrow",
  "LuckySparrow Software House",
].filter(Boolean);
const companyId = process.env.PAPERCLIP_COMPANY_ID ?? null;
const apply = process.argv.includes("--apply");
const markerVersion = "v3";

const targetIssueByProject = new Map([
  ["Soar", "LUC-149"],
  ["Roost", "LUC-149"],
]);

async function request(method, route, body) {
  const headers = { "content-type": "application/json" };
  if (method !== "GET" && process.env.PAPERCLIP_API_KEY) {
    headers.authorization = `Bearer ${process.env.PAPERCLIP_API_KEY}`;
  }
  if (method !== "GET" && process.env.PAPERCLIP_RUN_ID) {
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

function parseJsonOutput(output, name) {
  const text = String(output ?? "").trim();
  const start = text.indexOf("{");
  if (start === -1) throw new Error(`${name} did not emit JSON.`);
  return JSON.parse(text.slice(start));
}

function runSourceControlPacket() {
  const result = spawnSync(process.execPath, ["scripts/check-softwarehouse-source-control.mjs"], {
    cwd: process.cwd(),
    env: process.env,
    encoding: "utf8",
    stdio: ["ignore", "pipe", "pipe"],
  });
  if (result.status !== 0) {
    throw new Error(`source-control packet failed with ${result.status}: ${result.stderr || result.stdout}`);
  }
  return parseJsonOutput(result.stdout, "source-control packet");
}

function markerFor(repoName, issueIdentifier) {
  return `softwarehouse-source-control-classification:${repoName}:${issueIdentifier}:${markerVersion}`;
}

function legacyMarkerFor(repoName) {
  return `softwarehouse-source-control-classification:${repoName}:${markerVersion}`;
}

function bodyFor(repo, issue) {
  const marker = markerFor(repo.name, issue.identifier);
  const legacyMarker = legacyMarkerFor(repo.name);
  const lines = [
    marker,
    legacyMarker,
    "",
    `Read-only source-control classification for ${repo.name}.`,
    `Generated from source-control packet at ${repo.generatedAt}.`,
    `Target issue: ${issue.identifier} ${issue.title}.`,
    "",
    "Boundary:",
    "- This classification comment is Paperclip-only and performs no project filesystem writes.",
    "- The responsible PM/source-control lane may inspect diffs, run local validation, and make a local commit/no-commit decision.",
    "- No push, deploy, production restart, protected smoke, live account mutation, or secret disclosure.",
    "",
    "Repository summary:",
    `- path: ${repo.path}`,
    `- branch: ${repo.branch ?? "unknown"}`,
    `- head: ${repo.head ?? "unknown"}`,
    `- dirty files: ${repo.dirtyCount ?? 0}`,
    `- status counts: ${Object.entries(repo.statusCounts ?? {}).map(([key, value]) => `${key}:${value}`).join(", ") || "none"}`,
    "",
    "Lane classification:",
  ];

  for (const lane of repo.sourceControlClosureLanes ?? []) {
    lines.push(
      "",
      `- group: ${lane.group}`,
      `  count: ${lane.count}`,
      `  owner: ${lane.owner}`,
      `  risk: ${lane.risk}`,
      `  action: ${lane.action}`,
      `  evidence required: ${lane.evidenceRequired}`,
      `  gate policy: ${lane.gatePolicy}`,
      `  sample: ${(lane.sample ?? []).join(", ") || "none"}`,
      "  classification: ready for owner review and local source-control closure; preserve agent/user work until reviewed.",
      "  commit decision: no commit from this classification comment; PM/source-control lane must decide after diff review and validation.",
    );
  }

  lines.push(
    "",
    "Conclusion:",
    "- This comment records the current dirty-lane map and keeps protected delivery fail-closed.",
    "- Protected gates still block push/deploy/restart/protected smoke, but they do not block local diff classification, local validation, or a local commit/no-commit decision.",
  );

  return lines.join("\n");
}

function hasRecentMarker(comments, repoName, issueIdentifier) {
  const marker = markerFor(repoName, issueIdentifier);
  const legacyMarker = legacyMarkerFor(repoName);
  return comments.some((comment) => {
    const body = String(comment.body ?? "");
    return body.includes(marker) || body.includes(legacyMarker);
  });
}

const packet = runSourceControlPacket();

async function resolveCompany() {
  if (companyId) return { id: companyId, source: "PAPERCLIP_COMPANY_ID" };

  const companies = await request("GET", "/api/companies");
  const company = companies.find((candidate) => companyNames.includes(candidate.name));
  if (!company) throw new Error(`Company not found. Tried: ${companyNames.join(", ")}`);
  return { id: company.id, source: "company_name" };
}

const company = await resolveCompany();

const [health, issues, liveRuns] = await Promise.all([
  request("GET", "/api/health"),
  request("GET", `/api/companies/${company.id}/issues?limit=1000`),
  request("GET", `/api/companies/${company.id}/live-runs`),
]);

const activeRunCount = health.devServer?.activeRunCount ?? liveRuns.length;
const issueByIdentifier = new Map(issues.map((issue) => [issue.identifier, issue]));

async function resolveIssueByIdentifier(identifier) {
  if (!identifier) return null;
  const listed = issueByIdentifier.get(identifier);
  if (listed) return listed;
  try {
    const issue = await request("GET", `/api/issues/${encodeURIComponent(identifier)}`);
    issueByIdentifier.set(issue.identifier, issue);
    return issue;
  } catch {
    return null;
  }
}

if (apply && activeRunCount > 0) {
  throw new Error(`Refusing to comment source-control classification while ${activeRunCount} active run(s) exist.`);
}

const actions = [];
const skipped = [];
for (const repo of packet.repos ?? []) {
  if (repo.name === "Paperclip_Softwarehouse" || repo.clean !== false) continue;

  const targetIdentifier = targetIssueByProject.get(repo.name);
  const issue = await resolveIssueByIdentifier(targetIdentifier);
  if (!issue) {
    skipped.push({ repository: repo.name, reason: "missing_target_issue", targetIdentifier });
    continue;
  }

  const comments = await request("GET", `/api/issues/${issue.id}/comments?order=desc&limit=20`)
    .then((result) => result.value ?? result ?? [])
    .catch(() => []);
  if (hasRecentMarker(comments, repo.name, issue.identifier)) {
    skipped.push({ repository: repo.name, reason: "classification_marker_exists", issueIdentifier: issue.identifier });
    continue;
  }

  actions.push({
    repository: repo.name,
    issueId: issue.id,
    issueIdentifier: issue.identifier,
    issueTitle: issue.title,
    dirtyCount: repo.dirtyCount ?? 0,
    laneCount: repo.sourceControlClosureLanes?.length ?? 0,
    body: bodyFor({ ...repo, generatedAt: packet.generatedAt }, issue),
  });
}

const applied = [];
if (apply) {
  for (const action of actions) {
    const comment = await request("POST", `/api/issues/${action.issueId}/comments`, { body: action.body });
    applied.push({
      repository: action.repository,
      issueIdentifier: action.issueIdentifier,
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
  liveRunCount: liveRuns.length,
  actionCount: actions.length,
  actions: actions.map((action) => ({
    repository: action.repository,
    issueIdentifier: action.issueIdentifier,
    issueTitle: action.issueTitle,
    dirtyCount: action.dirtyCount,
    laneCount: action.laneCount,
  })),
  skipped,
  applied,
}, null, 2));
