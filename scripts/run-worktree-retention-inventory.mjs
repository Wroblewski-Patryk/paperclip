import { lstat, mkdir, opendir, readFile, realpath, stat, writeFile } from "node:fs/promises";
import { createRequire } from "node:module";
import path from "node:path";

const rootArg = readArg("--root") ?? ".paperclip/worktrees";
const outputDir = readArg("--output-dir") ?? "report/longevity";
const perWorktreeTimeoutMs = readNumberArg("--per-worktree-timeout-ms", 2_000);
const globalTimeoutMs = readNumberArg("--global-timeout-ms", 60_000);
const maxEntriesPerWorktree = readNumberArg("--max-entries-per-worktree", 25_000);
const concurrency = readNumberArg("--concurrency", 8);
const staleDays = readNumberArg("--stale-days", 14);
const staleLimit = readNumberArg("--stale-limit", 40);
const issueLookupLimit = readNumberArg("--issue-lookup-limit", 40);
const apiBase = process.env.PAPERCLIP_API_URL ?? "http://127.0.0.1:3200";
const companyId = process.env.PAPERCLIP_COMPANY_ID ?? null;
const requireFromDb = createRequire(new URL("../packages/db/package.json", import.meta.url));
const startedAt = new Date();
const globalDeadline = Date.now() + globalTimeoutMs;
const root = path.resolve(rootArg);
const cwd = process.cwd();
const defaultRoot = path.resolve(cwd, ".paperclip", "worktrees");
const allowNonstandardRoot = process.argv.includes("--allow-nonstandard-root");

if (!allowNonstandardRoot && root !== defaultRoot) {
  throw new Error(`Refusing nonstandard root ${root}. Pass --allow-nonstandard-root to override.`);
}

const rootStats = await stat(root).catch(() => null);
if (!rootStats?.isDirectory()) {
  throw new Error(`Worktree root is not a directory: ${root}`);
}

const rootRealPath = await realpath(root);
const topLevel = await listTopLevelWorktrees(root);
const measured = await mapWithConcurrency(topLevel, concurrency, measureWorktree);
const completed = measured.filter((item) => item.measurementStatus === "complete");
const partial = measured.filter((item) => item.measurementStatus !== "complete");
const totalMeasuredBytes = measured.reduce((sum, item) => sum + item.measuredBytes, 0);
const staleCutoffMs = startedAt.getTime() - staleDays * 24 * 60 * 60 * 1000;
const staleCandidates = measured
  .filter((item) => item.lastWriteTimeMs !== null && item.lastWriteTimeMs < staleCutoffMs)
  .sort((left, right) => {
    if (left.lastWriteTimeMs !== right.lastWriteTimeMs) return left.lastWriteTimeMs - right.lastWriteTimeMs;
    return right.measuredBytes - left.measuredBytes;
  })
  .slice(0, staleLimit);

const enrichedStaleCandidates = await enrichIssueStatus(staleCandidates.slice(0, issueLookupLimit));
const report = {
  generatedAt: startedAt.toISOString(),
  processClass: "release/deploy gate",
  scope: {
    root,
    rootRealPath,
    topLevelWorktreeCount: topLevel.length,
    staleDays,
    staleCutoff: new Date(staleCutoffMs).toISOString(),
  },
  guardrails: {
    noDelete: true,
    noLinkTraversal: true,
    rootRestrictedToRepoPaperclipWorktrees: !allowNonstandardRoot,
    perWorktreeTimeoutMs,
    globalTimeoutMs,
    maxEntriesPerWorktree,
    concurrency,
    note: "This inventory reads metadata and file sizes only. It does not delete, move, mutate git state, or traverse symlinked entries.",
  },
  summary: {
    completedCount: completed.length,
    partialCount: partial.length,
    totalMeasuredBytes,
    totalMeasuredGiB: bytesToGiB(totalMeasuredBytes),
    totalIsLowerBound: partial.length > 0,
    staleCandidateCount: enrichedStaleCandidates.length,
    issueLookup: buildIssueLookupSummary(enrichedStaleCandidates),
  },
  largestMeasuredWorktrees: [...measured]
    .sort((left, right) => right.measuredBytes - left.measuredBytes)
    .slice(0, 25),
  staleCandidates: enrichedStaleCandidates,
  partialMeasurements: partial,
};

await mkdir(outputDir, { recursive: true });
const jsonPath = path.join(outputDir, "softwarehouse-worktree-retention-inventory.latest.json");
const markdownPath = path.join(outputDir, "softwarehouse-worktree-retention-inventory.latest.md");
await writeFile(jsonPath, `${JSON.stringify(report, null, 2)}\n`);
await writeFile(markdownPath, renderMarkdown(report));
console.log(JSON.stringify({ jsonPath, markdownPath, summary: report.summary }, null, 2));

function readArg(name) {
  const index = process.argv.indexOf(name);
  if (index < 0) return null;
  return process.argv[index + 1] ?? null;
}

function readNumberArg(name, fallback) {
  const value = readArg(name);
  if (value === null) return fallback;
  const parsed = Number(value);
  if (!Number.isFinite(parsed) || parsed < 0) throw new Error(`Invalid ${name}: ${value}`);
  return parsed;
}

async function listTopLevelWorktrees(rootPath) {
  const entries = [];
  const dir = await opendir(rootPath);
  try {
    for await (const entry of dir) {
      if (!entry.isDirectory()) continue;
      if (entry.isSymbolicLink()) continue;
      const fullPath = path.join(rootPath, entry.name);
      const entryStats = await statNoFollow(fullPath).catch(() => null);
      if (!entryStats?.isDirectory() || entryStats.isSymbolicLink) continue;
      entries.push({
        name: entry.name,
        path: fullPath,
        createdAt: entryStats.birthtime.toISOString(),
        updatedAt: entryStats.mtime.toISOString(),
        lastWriteTimeMs: entryStats.mtime.getTime(),
        issueIdentifier: parseIssueIdentifier(entry.name),
      });
    }
  } finally {
    await dir.close().catch(() => {});
  }
  return entries.sort((left, right) => left.name.localeCompare(right.name));
}

async function statNoFollow(filePath) {
  const stats = await lstat(filePath);
  return Object.assign(stats, { isSymbolicLink: stats.isSymbolicLink() });
}

async function measureWorktree(worktree) {
  const state = {
    ...worktree,
    measuredBytes: 0,
    measuredGiB: 0,
    entryCount: 0,
    fileCount: 0,
    directoryCount: 0,
    skippedLinkCount: 0,
    errorCount: 0,
    errors: [],
    measurementStatus: "complete",
    measurementDurationMs: 0,
  };
  const started = Date.now();
  const deadline = Math.min(started + perWorktreeTimeoutMs, globalDeadline);
  const stack = [worktree.path];
  while (stack.length > 0) {
    if (Date.now() > deadline) {
      state.measurementStatus = "timeout";
      break;
    }
    if (state.entryCount >= maxEntriesPerWorktree) {
      state.measurementStatus = "entry_cap";
      break;
    }
    const current = stack.pop();
    let dir;
    try {
      dir = await opendir(current);
    } catch (error) {
      recordError(state, current, error);
      continue;
    }
    try {
      for await (const entry of dir) {
        state.entryCount += 1;
        if (state.entryCount >= maxEntriesPerWorktree || Date.now() > deadline) break;
        const child = path.join(current, entry.name);
        let childStats;
        try {
          childStats = await statNoFollow(child);
        } catch (error) {
          recordError(state, child, error);
          continue;
        }
        if (entry.isSymbolicLink() || childStats.isSymbolicLink) {
          state.skippedLinkCount += 1;
          continue;
        }
        if (childStats.isDirectory()) {
          state.directoryCount += 1;
          stack.push(child);
        } else if (childStats.isFile()) {
          state.fileCount += 1;
          state.measuredBytes += childStats.size;
        }
      }
    } finally {
      await dir.close().catch(() => {});
    }
  }
  state.measuredGiB = bytesToGiB(state.measuredBytes);
  state.measurementDurationMs = Date.now() - started;
  return state;
}

function recordError(state, filePath, error) {
  state.errorCount += 1;
  if (state.errors.length < 5) {
    state.errors.push({
      path: path.relative(root, filePath),
      message: error instanceof Error ? error.message : String(error),
    });
  }
}

function parseIssueIdentifier(name) {
  return /^([A-Z][A-Z0-9]+-\d+)\b/.exec(name)?.[1] ?? null;
}

async function enrichIssueStatus(candidates) {
  if (!companyId || candidates.length === 0) {
    return candidates.map((candidate) => ({ ...candidate, issueLookupStatus: "skipped" }));
  }
  const identifiers = [...new Set(candidates.map((candidate) => candidate.issueIdentifier).filter(Boolean))];
  const issuesByIdentifier = await readIssuesByIdentifier(identifiers).catch(() => new Map());
  return candidates.map((candidate) => {
    if (!candidate.issueIdentifier) return { ...candidate, issueLookupStatus: "no_identifier" };
    const issue = issuesByIdentifier.get(candidate.issueIdentifier) ?? null;
    if (!issue) return { ...candidate, issueLookupStatus: "not_found" };
    return {
      ...candidate,
      issueLookupStatus: "found",
      issue,
      retentionClass: classifyRetentionCandidate(issue),
    };
  });
}

async function readIssuesByIdentifier(identifiers) {
  if (identifiers.length === 0) return new Map();
  const databaseUrl = await resolveDatabaseUrl();
  if (!databaseUrl) return new Map();
  const postgres = requireFromDb("postgres");
  const sql = postgres(databaseUrl, { max: 1, onnotice: () => {} });
  try {
    const rows = await sql`
      select
        id,
        identifier,
        title,
        status,
        priority,
        assignee_agent_id as "assigneeAgentId",
        updated_at as "updatedAt",
        completed_at as "completedAt",
        cancelled_at as "cancelledAt"
      from issues
      where company_id = ${companyId}
        and identifier in ${sql(identifiers)}
    `;
    return new Map(rows.map((row) => [row.identifier, {
      id: row.id,
      identifier: row.identifier,
      title: row.title,
      status: row.status,
      priority: row.priority,
      assigneeAgentId: row.assigneeAgentId ?? null,
      updatedAt: row.updatedAt ? new Date(row.updatedAt).toISOString() : null,
      completedAt: row.completedAt ? new Date(row.completedAt).toISOString() : null,
      cancelledAt: row.cancelledAt ? new Date(row.cancelledAt).toISOString() : null,
    }]));
  } finally {
    await sql.end({ timeout: 5 });
  }
}

async function resolveDatabaseUrl() {
  if (process.env.DATABASE_URL) return process.env.DATABASE_URL;
  const configPath = path.join(cwd, ".paperclip", "config.json");
  const raw = await readFile(configPath, "utf8").catch(() => null);
  if (!raw) return null;
  const config = JSON.parse(raw);
  const port = Number(config?.database?.embeddedPostgresPort);
  if (!Number.isFinite(port) || port <= 0) return null;
  return `postgres://paperclip:paperclip@127.0.0.1:${Math.trunc(port)}/paperclip`;
}

async function requestJson(route) {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 30_000);
  try {
    const headers = {};
    if (process.env.PAPERCLIP_API_KEY) headers.authorization = `Bearer ${process.env.PAPERCLIP_API_KEY}`;
    const response = await fetch(`${apiBase}${route}`, {
      headers,
      signal: controller.signal,
    });
    const text = await response.text();
    if (!response.ok) throw new Error(`GET ${route} failed with ${response.status}: ${text}`);
    const data = text ? JSON.parse(text) : null;
    if (Array.isArray(data)) return data;
    if (Array.isArray(data?.value)) return data.value;
    return data;
  } finally {
    clearTimeout(timeout);
  }
}

async function fallbackEnrichIssueStatusViaApi(candidates) {
  if (!process.env.PAPERCLIP_API_KEY || !companyId || candidates.length === 0) {
    return candidates.map((candidate) => ({ ...candidate, issueLookupStatus: "skipped" }));
  }
  return mapWithConcurrency(candidates, 2, async (candidate) => {
    if (!candidate.issueIdentifier) return { ...candidate, issueLookupStatus: "no_identifier" };
    const issues = await requestJson(`/api/companies/${companyId}/issues?q=${encodeURIComponent(candidate.issueIdentifier)}`);
    const issue = Array.isArray(issues)
      ? issues.find((item) => item.identifier === candidate.issueIdentifier) ?? null
      : null;
    if (!issue) return { ...candidate, issueLookupStatus: "not_found" };
    return {
      ...candidate,
      issueLookupStatus: "found",
      issue: {
        id: issue.id,
        identifier: issue.identifier,
        title: issue.title,
        status: issue.status,
        priority: issue.priority,
        assigneeAgentId: issue.assigneeAgentId ?? null,
        updatedAt: issue.updatedAt ?? null,
        completedAt: issue.completedAt ?? null,
        cancelledAt: issue.cancelledAt ?? null,
      },
      retentionClass: classifyRetentionCandidate(issue),
    }
  });
}

function classifyRetentionCandidate(issue) {
  if (["done", "cancelled"].includes(issue.status)) return "candidate_after_review_terminal_issue";
  if (issue.status === "blocked") return "hold_blocked_issue";
  if (["todo", "in_progress", "in_review"].includes(issue.status)) return "hold_active_issue";
  return "review_before_action";
}

function buildIssueLookupSummary(candidates) {
  const counts = {};
  for (const candidate of candidates) {
    const key = candidate.issueLookupStatus ?? "unknown";
    counts[key] = (counts[key] ?? 0) + 1;
  }
  return counts;
}

async function mapWithConcurrency(items, limit, fn) {
  const results = new Array(items.length);
  const workers = Array.from({ length: Math.max(1, Math.min(limit, items.length)) }, async (_, workerIndex) => {
    for (let index = workerIndex; index < items.length; index += Math.max(1, limit)) {
      results[index] = await fn(items[index], index);
    }
  });
  await Promise.all(workers);
  return results.filter(Boolean);
}

function bytesToGiB(bytes) {
  return Math.round((bytes / 1024 / 1024 / 1024) * 1000) / 1000;
}

function renderMarkdown(report) {
  const lines = [
    "# Softwarehouse Worktree Retention Inventory",
    "",
    `Generated: ${report.generatedAt}`,
    "",
    "## Summary",
    "",
    `- Root: \`${report.scope.root}\``,
    `- Top-level worktrees: ${report.scope.topLevelWorktreeCount}`,
    `- Completed measurements: ${report.summary.completedCount}`,
    `- Partial measurements: ${report.summary.partialCount}`,
    `- Measured bytes: ${report.summary.totalMeasuredBytes} (${report.summary.totalMeasuredGiB} GiB${report.summary.totalIsLowerBound ? ", lower bound" : ""})`,
    `- Stale candidates older than ${report.scope.staleDays} days: ${report.summary.staleCandidateCount}`,
    "",
    "## Guardrails",
    "",
    "- No delete, move, git mutation, secret read, storage read, or database mutation is performed.",
    "- Symlinked entries are skipped and not traversed.",
    `- Per-worktree timeout: ${report.guardrails.perWorktreeTimeoutMs} ms`,
    `- Per-worktree entry cap: ${report.guardrails.maxEntriesPerWorktree}`,
    `- Global timeout: ${report.guardrails.globalTimeoutMs} ms`,
    "",
    "## Largest Measured Worktrees",
    "",
    "| Worktree | GiB | Status | Entries | Updated | Issue |",
    "| --- | ---: | --- | ---: | --- | --- |",
    ...report.largestMeasuredWorktrees.slice(0, 15).map((item) => (
      `| ${escapeCell(item.name)} | ${item.measuredGiB} | ${item.measurementStatus} | ${item.entryCount} | ${item.updatedAt} | ${item.issueIdentifier ?? ""} |`
    )),
    "",
    "## Stale Candidates",
    "",
    "These are review candidates only. Active, blocked, or unknown issue state is a hold signal, not a cleanup approval.",
    "",
    "| Worktree | GiB | Updated | Issue status | Retention class | Measurement |",
    "| --- | ---: | --- | --- | --- | --- |",
    ...report.staleCandidates.slice(0, 25).map((item) => (
      `| ${escapeCell(item.name)} | ${item.measuredGiB} | ${item.updatedAt} | ${item.issue?.status ?? item.issueLookupStatus ?? ""} | ${item.retentionClass ?? "review_before_action"} | ${item.measurementStatus} |`
    )),
    "",
    "## Partial Measurements",
    "",
    "| Worktree | GiB lower bound | Status | Entries | Errors |",
    "| --- | ---: | --- | ---: | ---: |",
    ...report.partialMeasurements.slice(0, 25).map((item) => (
      `| ${escapeCell(item.name)} | ${item.measuredGiB} | ${item.measurementStatus} | ${item.entryCount} | ${item.errorCount} |`
    )),
    "",
  ];
  return `${lines.join("\n")}\n`;
}

function escapeCell(value) {
  return String(value).replaceAll("|", "\\|");
}
