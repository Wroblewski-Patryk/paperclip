import { readFile } from "node:fs/promises";
import { createRequire } from "node:module";
import path from "node:path";

const requireFromDb = createRequire(new URL("../packages/db/package.json", import.meta.url));
const postgres = requireFromDb("postgres");

let apiBase = process.env.PAPERCLIP_API_URL ?? "http://127.0.0.1:3200";
const apiBaseFallbacks = [
  apiBase,
  "http://127.0.0.1:3200",
  "http://localhost:3100",
  "http://127.0.0.1:3100",
].filter((candidate, index, candidates) => candidates.indexOf(candidate) === index);
const companyNames = [
  process.env.SOFTWAREHOUSE_COMPANY_NAME,
  process.env.PAPERCLIP_COMPANY_NAME,
  "LuckySparrow",
  "LuckySparrow Software House",
].filter(Boolean);
const companyId = process.env.PAPERCLIP_COMPANY_ID ?? null;
const agentId = process.env.PAPERCLIP_AGENT_ID ?? null;
const runId = process.env.PAPERCLIP_RUN_ID ?? null;
const help = process.argv.includes("--help") || process.argv.includes("-h");
const apply = process.argv.includes("--apply");
const openStatuses = new Set(["backlog", "todo", "in_progress", "in_review", "blocked"]);
const terminalStatuses = new Set(["done", "cancelled"]);
const markerPrefix = "softwarehouse-routine-duplicate-janitor:cancel_duplicate_routine:";
if (help) {
  console.log([
    "Usage: node scripts/run-routine-duplicate-janitor.mjs [--apply]",
    "",
    "Find duplicate open routine execution issues by originId/title.",
    "Without --apply, prints a dry-run JSON action list.",
    "With --apply, comments on, cancels, and archives non-canonical duplicate issues.",
  ].join("\n"));
  process.exit(0);
}

async function request(method, route, body, base = apiBase) {
  const response = await fetch(`${base}${route}`, {
    method,
    headers: { "content-type": "application/json" },
    body: body === undefined ? undefined : JSON.stringify(body),
  });
  const text = await response.text();
  const data = text ? JSON.parse(text) : null;
  if (!response.ok) throw new Error(`${method} ${route} failed with ${response.status}: ${text}`);
  return data;
}

function issueKey(issue) {
  return `${issue.originId ?? "no-origin"}:${issue.title}`;
}

function timestampMs(timestamp) {
  const value = timestamp ? new Date(timestamp).getTime() : Number.NaN;
  return Number.isFinite(value) ? value : 0;
}

function rootBlocker(issue) {
  return issue.blockerAttention?.sampleBlockerIdentifier ?? null;
}

function issueScore(issue, liveIssueIds, canonicalCommentIdentifiers) {
  const root = rootBlocker(issue);
  const hasExternalRoot = root && root !== issue.identifier;
  const statusRank = { in_progress: 5, todo: 4, backlog: 3, in_review: 2, blocked: 1 };
  return [
    Number(liveIssueIds.has(issue.id)) * 1000,
    Number(canonicalCommentIdentifiers.has(issue.identifier)) * 500,
    Number(hasExternalRoot) * 250,
    (statusRank[issue.status] ?? 0) * 10,
    timestampMs(issue.createdAt) > 0 ? -timestampMs(issue.createdAt) / 1_000_000_000_000 : 0,
  ].reduce((sum, value) => sum + value, 0);
}

function preferredCanonical(items, liveIssueIds, canonicalCommentIdentifiers) {
  return [...items].sort((a, b) => {
    const liveDelta = Number(liveIssueIds.has(b.id)) - Number(liveIssueIds.has(a.id));
    if (liveDelta !== 0) return liveDelta;
    const scoreDelta = issueScore(b, liveIssueIds, canonicalCommentIdentifiers) - issueScore(a, liveIssueIds, canonicalCommentIdentifiers);
    if (scoreDelta !== 0) return scoreDelta;
    return timestampMs(a.createdAt) - timestampMs(b.createdAt);
  })[0];
}

async function resolveCompany() {
  if (companyId) return { id: companyId, source: "PAPERCLIP_COMPANY_ID" };

  const errors = [];
  for (const base of apiBaseFallbacks) {
    let companies;
    try {
      companies = await request("GET", "/api/companies", undefined, base);
    } catch (error) {
      errors.push(`${base}: ${error.message}`);
      continue;
    }
    const company = companies.find((candidate) => companyNames.includes(candidate.name));
    if (company) {
      apiBase = base;
      return { ...company, source: "company_name" };
    }
    errors.push(`${base}: company missing`);
  }
  throw new Error(`Company not found. Tried names ${companyNames.join(" / ")} across ${errors.join("; ")}`);
}

async function resolveDatabaseUrl() {
  if (process.env.DATABASE_URL) return process.env.DATABASE_URL;
  const configPath = await findPaperclipConfigPath();
  const raw = configPath ? await readFile(configPath, "utf8").catch(() => null) : null;
  if (!raw) return null;
  const config = JSON.parse(raw);
  const port = Number(config?.database?.embeddedPostgresPort);
  if (!Number.isFinite(port) || port <= 0) return null;
  return `postgres://paperclip:paperclip@127.0.0.1:${Math.trunc(port)}/paperclip`;
}

async function findPaperclipConfigPath(startDir = process.cwd()) {
  let current = path.resolve(startDir);
  while (true) {
    const candidate = path.join(current, ".paperclip", "config.json");
    if (await readFile(candidate, "utf8").then(() => true).catch(() => false)) return candidate;
    const parent = path.dirname(current);
    if (parent === current) return null;
    current = parent;
  }
}

async function withControlSql(action) {
  const databaseUrl = await resolveDatabaseUrl();
  if (!databaseUrl) {
    throw new Error("No DATABASE_URL or .paperclip/config.json embeddedPostgresPort available for janitor direct read.");
  }

  const sql = postgres(databaseUrl, { max: 1, onnotice: () => {} });
  try {
    return await action(sql);
  } finally {
    await sql.end({ timeout: 5 });
  }
}

const company = await resolveCompany();

const { issues, liveRuns, source } = await withControlSql(async (sql) => {
  const [issueRows, liveRunRows] = await Promise.all([
    sql`
      select
        id,
        identifier,
        title,
        status,
        origin_kind as "originKind",
        origin_id as "originId",
        updated_at as "updatedAt",
        created_at as "createdAt"
      from issues
      where company_id = ${company.id}
        and origin_kind = 'routine_execution'
        and origin_id is not null
        and hidden_at is null
        and status in ('backlog', 'todo', 'in_progress', 'in_review', 'blocked', 'done', 'cancelled')
    `,
    sql`
      select context_snapshot ->> 'issueId' as "issueId"
      from heartbeat_runs
      where company_id = ${company.id}
        and status in ('queued', 'running')
        and context_snapshot ->> 'issueId' is not null
    `,
  ]);
  return {
    issues: issueRows,
    liveRuns: liveRunRows,
    source: "direct-db",
  };
});

const liveIssueIds = new Set(liveRuns.map((run) => run.issueId).filter(Boolean));
const grouped = new Map();
for (const issue of issues) {
  if (!openStatuses.has(issue.status) && !terminalStatuses.has(issue.status)) continue;
  if (issue.originKind !== "routine_execution" || !issue.originId || !issue.title) continue;
  const key = issueKey(issue);
  if (!grouped.has(key)) grouped.set(key, []);
  grouped.get(key).push(issue);
}

const duplicateItems = Array.from(grouped.values())
  .filter((items) => items.length > 1)
  .flat();
const commentsByIssueId = new Map();
if (duplicateItems.length > 0) {
  const commentRows = await withControlSql((sql) => sql`
    select issue_id as "issueId", body
    from (
      select
        issue_id,
        body,
        row_number() over (partition by issue_id order by created_at desc) as rn
      from issue_comments
      where company_id = ${company.id}
        and issue_id in ${sql(duplicateItems.map((issue) => issue.id))}
        and deleted_at is null
    ) recent_comments
    where rn <= 8
  `);
  for (const row of commentRows) {
    const comments = commentsByIssueId.get(row.issueId) ?? [];
    comments.push({ body: row.body });
    commentsByIssueId.set(row.issueId, comments);
  }
}

const actions = [];
for (const items of grouped.values()) {
  if (items.length <= 1) continue;
  const canonicalCommentIdentifiers = new Set();
  for (const issue of items) {
    const comments = commentsByIssueId.get(issue.id) ?? [];
    for (const comment of comments) {
      for (const match of String(comment.body ?? "").matchAll(/\bkeeping\s+(LUC-\d+)\s+as canonical/gi)) {
        canonicalCommentIdentifiers.add(match[1]);
      }
    }
  }
  const keep = preferredCanonical(items, liveIssueIds, canonicalCommentIdentifiers);
  for (const issue of items) {
    if (issue.id === keep.id) continue;
    if (liveIssueIds.has(issue.id)) continue;
    if (!openStatuses.has(issue.status)) continue;
    actions.push({
      action: "cancel_duplicate_routine_issue",
      identifier: issue.identifier,
      issueId: issue.id,
      title: issue.title,
      status: issue.status,
      rootBlocker: rootBlocker(issue),
      keepIdentifier: keep.identifier,
      keepStatus: keep.status,
      keepRootBlocker: rootBlocker(keep),
      keepHasLiveRun: liveIssueIds.has(keep.id),
    });
  }

  const openItems = items.filter((issue) => openStatuses.has(issue.status));
  const terminalItems = items.filter((issue) => terminalStatuses.has(issue.status) && !liveIssueIds.has(issue.id));
  const terminalKeep = openItems.length > 0
    ? null
    : [...terminalItems].sort((a, b) => {
        const updatedDelta = timestampMs(b.updatedAt) - timestampMs(a.updatedAt);
        if (updatedDelta !== 0) return updatedDelta;
        return timestampMs(b.createdAt) - timestampMs(a.createdAt);
      })[0] ?? null;
  const archiveKeep = openItems.length > 0 ? keep : terminalKeep;
  for (const issue of terminalItems) {
    if (terminalKeep && issue.id === terminalKeep.id) continue;
    if (!archiveKeep) continue;
    actions.push({
      action: "archive_terminal_duplicate_routine_issue",
      identifier: issue.identifier,
      issueId: issue.id,
      title: issue.title,
      status: issue.status,
      rootBlocker: rootBlocker(issue),
      keepIdentifier: archiveKeep.identifier,
      keepStatus: archiveKeep.status,
      keepRootBlocker: rootBlocker(archiveKeep),
      keepHasLiveRun: liveIssueIds.has(archiveKeep.id),
    });
  }
}

const applied = [];
if (apply) {
  await withControlSql(async (sql) => {
    await sql.begin(async (tx) => {
      for (const action of actions) {
        const body = action.action === "archive_terminal_duplicate_routine_issue"
          ? [
              `${markerPrefix}${action.identifier}:archive:v1`,
              "",
              `Archived terminal duplicate routine issue in favor of canonical ${action.keepIdentifier}.`,
              `Duplicate routine title: ${action.title}.`,
              "This is board metadata cleanup only: no project code, production, deploy, restart, protected smoke, push, or secret mutation.",
              "Any evidence already posted on this issue remains preserved in its comments/history.",
            ].join("\n")
          : [
          `${markerPrefix}${action.identifier}:v1`,
          "",
          `Cancelled duplicate routine issue in favor of canonical ${action.keepIdentifier}.`,
          `Duplicate routine title: ${action.title}.`,
          "This is board metadata cleanup only: no project code, production, deploy, restart, protected smoke, push, or secret mutation.",
          "Any evidence already posted on this issue remains preserved in its comments/history.",
        ].join("\n");
        await tx`
          insert into issue_comments (
            company_id,
            issue_id,
            author_agent_id,
            author_type,
            created_by_run_id,
            body
          )
          values (
            ${company.id},
            ${action.issueId},
            ${agentId},
            ${agentId ? "agent" : "system"},
            ${runId},
            ${body}
          )
        `;
        const updated = action.action === "archive_terminal_duplicate_routine_issue"
          ? await tx`
              update issues
              set hidden_at = now(),
                  updated_at = now()
              where id = ${action.issueId}
                and company_id = ${company.id}
              returning status, hidden_at as "hiddenAt"
            `
          : await tx`
              update issues
              set status = 'cancelled',
                  cancelled_at = now(),
                  hidden_at = now(),
                  updated_at = now()
              where id = ${action.issueId}
                and company_id = ${company.id}
              returning status, hidden_at as "hiddenAt"
            `;
        applied.push({ ...action, updatedStatus: updated[0]?.status ?? null, hiddenAt: updated[0]?.hiddenAt ?? null });
      }
    });
  });
}

console.log(JSON.stringify({
  apiBase,
  source,
  company: { id: company.id, name: company.name },
  mode: apply ? "apply" : "dry-run",
  duplicateGroupCount: Array.from(grouped.values()).filter((items) => items.length > 1).length,
  actionCount: actions.length,
  actions,
  applied,
}, null, 2));
