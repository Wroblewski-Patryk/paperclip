import fs from "node:fs/promises";
import path from "node:path";
import crypto from "node:crypto";
import {
  architectureStatusValues,
  canonicalArchitectureStatus,
  taskArtifactStatus,
} from "./lib/architecture-awareness-task-status.mjs";

const relationTypes = new Set([
  "uses",
  "depends_on",
  "implements",
  "tests",
  "documents",
  "owns",
  "extends",
  "connected_to",
]);

const statusValues = new Set(architectureStatusValues);

const entityTypes = new Set([
  "project",
  "module",
  "feature",
  "component",
  "function",
  "route",
  "api_endpoint",
  "model",
  "migration",
  "task",
  "document",
  "test",
  "agent",
]);

function argValue(name, fallback = null) {
  const index = process.argv.indexOf(name);
  return index >= 0 ? process.argv[index + 1] ?? fallback : fallback;
}

function hasFlag(name) {
  return process.argv.includes(name);
}

function intArg(name, fallback = 0) {
  const value = Number.parseInt(argValue(name, String(fallback)), 10);
  return Number.isFinite(value) ? value : fallback;
}

const projectName = argValue("--project", "Soar");
const rootArg = argValue("--root", path.resolve(process.cwd(), "..", projectName));
const outputArg = argValue("--out", null);
const overridesArg = argValue("--overrides", null);
const paperclipIssuesSourceArg = argValue("--paperclip-issues-source", process.env.PAPERCLIP_ARCHITECTURE_ISSUES_SOURCE ?? null);
const repoRoot = path.resolve(rootArg);
const outputRoot = path.resolve(outputArg ?? path.join(repoRoot, "docs"));
const overridesPath = path.resolve(overridesArg ?? path.join(repoRoot, "docs/architecture/scanner-overrides.json"));
const graphsDir = path.join(outputRoot, "graphs");
const statusDir = path.join(outputRoot, "status");
const canonicalGraphsDir = path.join(repoRoot, "docs", "graphs");
const canonicalStatusDir = path.join(repoRoot, "docs", "status");
const curatedGraphPath = path.join(graphsDir, "architecture-graph.json");
const startedAtMs = Date.now();
const defaultUpdatedAt = "1970-01-01T00:00:00.000Z";
const observedAt = process.env.ARCHITECTURE_AWARENESS_OBSERVED_AT ?? new Date().toISOString();
const statusOnly = hasFlag("--status-only");
const maxElapsedMs = Math.max(0, intArg("--max-elapsed-ms", 0));
const progressEveryFiles = Math.max(1, intArg("--progress-every", 250) || 250);
const generatedGraphFileNames = [
  "architecture-awareness.json",
  "architecture-awareness.csv",
  "architecture-proof-register.csv",
  "architecture-graph.md",
  "architecture-graph.mmd",
  "architecture-health.json",
];
const generatedStatusFileNames = [
  "architecture-awareness-report.md",
  "architecture-dependency-report.md",
  "architecture-ownership-report.md",
  "task-synchronization-report.md",
  "app-completion-index.json",
  "app-completion-index.md",
  "event-chain-index.json",
  "event-chain-index.md",
  "operational-readiness-index.json",
  "operational-readiness-index.md",
  "project-truth-index.json",
  "project-truth-index.md",
  "runtime-error-index.json",
  "runtime-error-index.md",
];

function generatedFilesFor(graphsDirectory, statusDirectory) {
  return [
    ...generatedGraphFileNames.map((fileName) => path.join(graphsDirectory, fileName)),
    ...generatedStatusFileNames.map((fileName) => path.join(statusDirectory, fileName)),
  ];
}

const generatedOutputFiles = new Set(generatedFilesFor(graphsDir, statusDir));
const generatedInputFiles = new Set([
  ...generatedFilesFor(canonicalGraphsDir, canonicalStatusDir),
  ...generatedOutputFiles,
]);

const ignoredDirs = new Set([
  ".paperclip",
  ".tmp",
  ".codex",
  ".claude",
  ".cursor",
  ".agents",
  ".agents-cache",
  ".git",
  ".obsidian",
  ".next",
  ".turbo",
  ".venv",
  "coverage",
  "dist",
  "build",
  "node_modules",
  "playwright-report",
  "test-results",
  "vendor",
  "history",
]);
const ignoredGeneratedPathPrefixes = ["storage/", "bootstrap/cache/"];

const codeExtensions = new Set([".ts", ".tsx", ".js", ".jsx", ".mjs", ".cjs", ".py", ".php", ".prisma"]);
const docExtensions = new Set([".md", ".mdx"]);
const modelNamePattern = /(schema|model|entity)\.(ts|tsx|js|mjs|py)$/i;
const routeSegmentPattern = /(^|[\\/])(app|pages|routes|router|api)([\\/]|$)/i;
const apiEndpointPattern = /\b(?:app|router)\.(get|post|put|patch|delete|use)\s*\(\s*["'`]([^"'`]+)["'`]/g;
const laravelEndpointPattern = /\bRoute::(get|post|put|patch|delete|options|any|match)\s*\(\s*["']([^"']+)["']/g;
const laravelNamedRouteCallPattern = /\broute\s*\(\s*["']([^"']+)["']/g;
const laravelTestLiteralRequestPattern = /(?:->|(?:^|[^\w:>]))(getJson|postJson|putJson|patchJson|deleteJson|options|get|post|put|patch|delete)\s*\(\s*["']([^"']+)["']/gim;
const laravelTestJsonRequestPattern = /->\s*json\s*\(\s*["'](GET|POST|PUT|PATCH|DELETE|OPTIONS)["']\s*,\s*["']([^"']+)["']/gi;
const importPattern = /(?:import\s+(?:[^"'`]*?\s+from\s+)?|export\s+[^"'`]*?\s+from\s+|require\s*\()\s*["'`]([^"'`]+)["'`]/g;
const functionPattern = /(?:export\s+)?(?:async\s+)?function\s+([A-Za-z_$][\w$]*)|(?:export\s+)?const\s+([A-Za-z_$][\w$]*)\s*=\s*(?:async\s*)?\([^)]*\)\s*=>/g;
const classPattern = /(?:export\s+)?class\s+([A-Za-z_$][\w$]*)/g;
const prismaModelPattern = /(?:^|\r?\n)\s*model\s+([A-Za-z_][\w]*)\s*\{/g;
const runnableTestExtensionPattern = /\.(test|spec)\.(ts|tsx|js|jsx|mjs|cjs|py|php)$/i;
const ownerAttributionRules = [
  { prefix: "server/", owner: "Backend Platform Lead" },
  { prefix: "ui/", owner: "Frontend Experience Lead" },
  { prefix: "packages/db/", owner: "Data Platform Lead" },
  { prefix: "packages/shared/", owner: "Shared Contracts Lead" },
  { prefix: "packages/adapters/", owner: "Adapters Runtime Lead" },
  { prefix: "packages/adapter-utils/", owner: "Adapters Runtime Lead" },
  { prefix: "packages/plugins/", owner: "Plugin Platform Lead" },
  { prefix: "cli/", owner: "Developer Experience Lead" },
  { prefix: "tests/", owner: "QA Regression Lead" },
  { prefix: "scripts/", owner: "Engineering Delivery Lead" },
  { prefix: "doc/", owner: "Docs Memory Lead" },
  { prefix: "docs/", owner: "Docs Memory Lead" },
  { prefix: "softwarehouse/", owner: "CTO Architect" },
];
const defaultOwner = "Engineering Delivery Lead";

const projectOwnerByNamePattern = [
  { pattern: /soar/i, owner: "Soar Project Manager" },
  { pattern: /roost/i, owner: "Roost Project Manager" },
  { pattern: /paperclip/i, owner: "CTO Architect" },
];

function toPosix(value) {
  return value.split(path.sep).join("/");
}

function progress(phase, extra = {}) {
  console.error(JSON.stringify({
    event: "architecture_awareness_progress",
    project: projectName,
    phase,
    elapsedMs: Date.now() - startedAtMs,
    ...extra,
  }));
}

function enforceTimeBudget(phase, extra = {}) {
  if (!maxElapsedMs) return;
  const elapsedMs = Date.now() - startedAtMs;
  if (elapsedMs <= maxElapsedMs) return;
  const error = new Error(`Architecture awareness scan exceeded --max-elapsed-ms=${maxElapsedMs} during ${phase}. No export writes were started.`);
  error.code = "ARCHITECTURE_AWARENESS_TIME_BUDGET_EXCEEDED";
  error.details = {
    project: projectName,
    phase,
    elapsedMs,
    maxElapsedMs,
    ...extra,
  };
  throw error;
}

function rel(filePath) {
  return toPosix(path.relative(repoRoot, filePath));
}

function slug(value) {
  return value
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 90) || "item";
}

function stableId(type, name, entityPath = "") {
  const hash = crypto
    .createHash("sha1")
    .update(`${projectName}:${type}:${entityPath}:${name}`)
    .digest("hex")
    .slice(0, 10);
  return `${type}:${slug(name)}:${hash}`;
}

function uniq(values) {
  return [...new Set(values.filter(Boolean))];
}

function csvEscape(value) {
  const text = Array.isArray(value) ? value.join("|") : String(value ?? "");
  return `"${text.replaceAll('"', '""')}"`;
}

async function writeFileWithRetry(filePath, content) {
  const attempts = 3;
  for (let attempt = 1; attempt <= attempts; attempt += 1) {
    try {
      await fs.writeFile(filePath, content);
      return;
    } catch (error) {
      const retryable = error && typeof error === "object" && ["EBUSY", "EPERM", "UNKNOWN"].includes(error.code);
      if (!retryable || attempt === attempts) throw error;
      await new Promise((resolve) => setTimeout(resolve, attempt * 250));
    }
  }
}

async function writeGeneratedFile(label, filePath, content) {
  await writeFileWithRetry(filePath, content);
  progress("export_written", { label, file: toPosix(filePath) });
}

async function readJsonIfPresent(filePath) {
  try {
    return JSON.parse(await fs.readFile(filePath, "utf8"));
  } catch (error) {
    if (error && typeof error === "object" && error.code === "ENOENT") return null;
    throw error;
  }
}

async function generatedFileStatus(filePath) {
  try {
    const stats = await fs.stat(filePath);
    return {
      path: toPosix(filePath),
      exists: true,
      sizeBytes: stats.size,
      modifiedAt: stats.mtime.toISOString(),
    };
  } catch (error) {
    if (error && typeof error === "object" && error.code === "ENOENT") {
      return {
        path: toPosix(filePath),
        exists: false,
        sizeBytes: 0,
        modifiedAt: null,
      };
    }
    throw error;
  }
}

async function statusOnlyReport() {
  const awarenessPath = path.join(graphsDir, "architecture-awareness.json");
  const healthPath = path.join(graphsDir, "architecture-health.json");
  const awareness = await readJsonIfPresent(awarenessPath);
  const health = await readJsonIfPresent(healthPath);
  const fileStatuses = [];
  for (const filePath of generatedOutputFiles) {
    fileStatuses.push(await generatedFileStatus(filePath));
  }
  const missing = fileStatuses.filter((file) => !file.exists).map((file) => file.path);
  const generatedAt = awareness?.generated_at ?? health?.generated_at ?? null;
  const generatedAtMs = generatedAt ? Date.parse(generatedAt) : NaN;
  const ageMs = Number.isFinite(generatedAtMs) ? Date.now() - generatedAtMs : null;
  return {
    completed: true,
    mode: "status-only",
    project: projectName,
    root: toPosix(repoRoot),
    output: toPosix(outputRoot),
    elapsedMs: Date.now() - startedAtMs,
    generatedAt,
    ageMs,
    counts: {
      entities: awareness?.entities?.length ?? health?.counts?.entities ?? null,
      relations: awareness?.relations?.length ?? health?.counts?.relations ?? null,
    },
    signals: {
      implementation_without_tests: health?.signals?.implementation_without_tests?.count ?? null,
      actionable_implementation_without_tests: health?.signals?.actionable_implementation_without_tests?.count ?? null,
      tasks_without_architecture: health?.signals?.tasks_without_architecture?.count ?? null,
      implementation_without_task: health?.signals?.implementation_without_task?.count ?? null,
      verified_without_proof: health?.signals?.verified_without_proof?.count ?? null,
      entities_without_owner: health?.signals?.entities_without_owner?.count ?? null,
      disconnected_entities: health?.signals?.disconnected_entities?.count ?? null,
    },
    missing,
    files: fileStatuses,
  };
}

const canonicalStatus = canonicalArchitectureStatus;

function parseSimpleCsv(text) {
  const lines = text
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter((line) => line.length > 0 && !line.startsWith("#"));
  if (lines.length < 2) return [];
  const header = lines[0].split(",").map((value) => value.trim());
  const rows = [];
  for (const line of lines.slice(1)) {
    const values = line.split(",").map((value) => value.trim());
    const row = {};
    for (let idx = 0; idx < header.length; idx += 1) {
      row[header[idx]] = values[idx] ?? "";
    }
    rows.push(row);
  }
  return rows;
}

function groupBy(items, keyFn) {
  const grouped = {};
  for (const item of items) {
    const key = keyFn(item);
    grouped[key] ??= [];
    grouped[key].push(item);
  }
  return grouped;
}

async function walk(dir) {
  enforceTimeBudget("walk", { dir: toPosix(dir) });
  let entries;
  try {
    entries = await fs.readdir(dir, { withFileTypes: true });
  } catch (error) {
    if (error && typeof error === "object" && (error.code === "EPERM" || error.code === "EACCES")) {
      return [];
    }
    throw error;
  }
  const files = [];
  for (const entry of entries) {
    enforceTimeBudget("walk", { dir: toPosix(dir), files: files.length });
    if (ignoredDirs.has(entry.name)) continue;
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      const relativePath = rel(full);
      if (ignoredGeneratedPathPrefixes.some((prefix) => `${relativePath}/`.startsWith(prefix))) continue;
      if (isExcludedByOverride(relativePath)) continue;
      files.push(...await walk(full));
    } else if (entry.isFile()) {
      if (generatedInputFiles.has(path.resolve(full))) continue;
      try {
        await fs.access(full);
        files.push(full);
      } catch (error) {
        if (!(error && typeof error === "object" && (error.code === "EPERM" || error.code === "EACCES"))) {
          throw error;
        }
      }
    }
  }
  return files;
}

async function collectMarkdownFiles(dir) {
  enforceTimeBudget("collect_markdown_files", { dir: toPosix(dir) });
  let entries;
  try {
    entries = await fs.readdir(dir, { withFileTypes: true });
  } catch (error) {
    if (error && typeof error === "object" && ["ENOENT", "EPERM", "EACCES"].includes(error.code)) {
      return [];
    }
    throw error;
  }
  const files = [];
  for (const entry of entries) {
    enforceTimeBudget("collect_markdown_files", { dir: toPosix(dir), files: files.length });
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      files.push(...await collectMarkdownFiles(full));
    } else if (entry.isFile() && docExtensions.has(path.extname(entry.name))) {
      files.push(full);
    }
  }
  return files;
}

async function collectTaskFiles() {
  // Repo-local task/state files are ephemeral or historical context. Current
  // execution ownership comes from Paperclip issues, loaded separately below.
  // Keeping them out prevents completed local task archives from becoming
  // current architecture entities and apparent delivery work.
  return [];
}

function isPaperclipProjectScan() {
  return /^(paperclip|paperclip_softwarehouse)$/i.test(projectName);
}

function issueListFromResponse(response) {
  if (Array.isArray(response)) return response;
  if (Array.isArray(response?.value)) return response.value;
  if (Array.isArray(response?.issues)) return response.issues;
  if (Array.isArray(response?.items)) return response.items;
  return [];
}

function projectListFromResponse(response) {
  if (Array.isArray(response)) return response;
  if (Array.isArray(response?.value)) return response.value;
  if (Array.isArray(response?.projects)) return response.projects;
  if (Array.isArray(response?.items)) return response.items;
  return [];
}

async function paperclipRequestJson(pathname) {
  const baseUrl = process.env.PAPERCLIP_API_URL ?? process.env.PAPERCLIP_RUNTIME_API_URL;
  const apiKey = process.env.PAPERCLIP_API_KEY;
  if (!baseUrl || !apiKey) return null;

  const response = await fetch(new URL(pathname, baseUrl), {
    headers: {
      Authorization: `Bearer ${apiKey}`,
      ...(process.env.PAPERCLIP_RUN_ID ? { "X-Paperclip-Run-Id": process.env.PAPERCLIP_RUN_ID } : {}),
    },
  });
  if (!response.ok) {
    throw new Error(`Paperclip issue import request failed: ${response.status} ${response.statusText} ${pathname}`);
  }
  return response.json();
}

async function loadPaperclipIssuesFromSource(filePath) {
  if (!filePath) return null;
  const resolved = path.resolve(filePath);
  const parsed = JSON.parse(await fs.readFile(resolved, "utf8"));
  return {
    source: toPosix(resolved),
    issues: issueListFromResponse(parsed),
    commentsByIssueId: new Map(issueListFromResponse(parsed).map((issue) => [
      issue.id,
      Array.isArray(issue.comments) ? issue.comments : [],
    ])),
  };
}

function targetPaperclipProjectNames() {
  if (/^paperclip_softwarehouse$/i.test(projectName)) return new Set(["Paperclip_Softwarehouse", "Softwarehouse"]);
  if (/^paperclip$/i.test(projectName)) return new Set(["Paperclip_Softwarehouse", "Softwarehouse"]);
  return new Set([projectName]);
}

async function loadPaperclipIssuesFromApi() {
  if (!isPaperclipProjectScan()) return null;
  if (!process.env.PAPERCLIP_API_KEY || !(process.env.PAPERCLIP_API_URL || process.env.PAPERCLIP_RUNTIME_API_URL)) return null;
  const companyId = process.env.PAPERCLIP_COMPANY_ID;
  if (!companyId) return null;

  const issueLimit = Math.max(1, Number.parseInt(process.env.PAPERCLIP_ARCHITECTURE_ISSUE_LIMIT ?? "500", 10) || 500);
  const commentsPerIssue = Math.max(0, Number.parseInt(process.env.PAPERCLIP_ARCHITECTURE_COMMENTS_PER_ISSUE ?? "3", 10) || 0);
  const commentIssueLimit = Math.max(0, Number.parseInt(process.env.PAPERCLIP_ARCHITECTURE_COMMENT_ISSUE_LIMIT ?? "100", 10) || 0);
  const statusFilter = encodeURIComponent(process.env.PAPERCLIP_ARCHITECTURE_ISSUE_STATUSES ?? "todo,in_progress,in_review,blocked,done");

  const projectsResponse = await paperclipRequestJson(`/api/companies/${companyId}/projects`);
  const wantedNames = targetPaperclipProjectNames();
  const projectIds = new Set(projectListFromResponse(projectsResponse)
    .filter((project) => wantedNames.has(project.name))
    .map((project) => project.id)
    .filter(Boolean));

  const projectIdQuery = projectIds.size === 1 ? `&projectId=${encodeURIComponent([...projectIds][0])}` : "";
  const issuesResponse = await paperclipRequestJson(`/api/companies/${companyId}/issues?limit=${issueLimit}&status=${statusFilter}${projectIdQuery}`);
  let issues = issueListFromResponse(issuesResponse);
  if (projectIds.size > 0) {
    issues = issues.filter((issue) => projectIds.has(issue.projectId));
  }
  issues = issues.slice(0, issueLimit);

  const currentIssueId = process.env.PAPERCLIP_TASK_ID;
  if (currentIssueId && !issues.some((issue) => issue.id === currentIssueId || issue.identifier === currentIssueId)) {
    try {
      const currentIssue = await paperclipRequestJson(`/api/issues/${currentIssueId}`);
      if (currentIssue?.id) {
        issues = [currentIssue, ...issues].slice(0, issueLimit);
      }
    } catch {
      // Current issue import is best-effort; the bounded project issue list remains usable.
    }
  }

  const commentsByIssueId = new Map();
  if (commentsPerIssue > 0 && commentIssueLimit > 0) {
    for (const issue of issues.slice(0, commentIssueLimit)) {
      if (!issue?.id) continue;
      try {
        const commentsResponse = await paperclipRequestJson(`/api/issues/${issue.id}/comments?order=desc&limit=${commentsPerIssue}`);
        commentsByIssueId.set(issue.id, issueListFromResponse(commentsResponse));
      } catch {
        commentsByIssueId.set(issue.id, []);
      }
    }
  }

  return {
    source: `${process.env.PAPERCLIP_API_URL ?? process.env.PAPERCLIP_RUNTIME_API_URL}/api/companies/${companyId}/issues`,
    issues,
    commentsByIssueId,
  };
}

async function loadPaperclipIssueTasks() {
  if (paperclipIssuesSourceArg) return loadPaperclipIssuesFromSource(paperclipIssuesSourceArg);
  return loadPaperclipIssuesFromApi();
}

function issueTaskStatus(issue) {
  switch (issue.status) {
    case "done":
      return "verified";
    case "blocked":
      return "blocked";
    case "in_review":
      return "tested";
    case "todo":
    case "backlog":
      return "planned";
    case "in_progress":
      return "in_progress";
    case "cancelled":
      return "deprecated";
    default:
      return "in_progress";
  }
}

function issueTaskText(issue, comments = []) {
  return [
    issue.identifier ? `# ${issue.identifier} ${issue.title ?? ""}` : `# ${issue.title ?? issue.id ?? "Paperclip issue"}`,
    "",
    issue.description ?? "",
    "",
    ...comments.map((comment) => comment.body ?? comment.content ?? comment.text ?? "").filter(Boolean),
  ].join("\n");
}

function addEntity(map, input) {
  if (!entityTypes.has(input.type)) throw new Error(`Unknown entity type: ${input.type}`);
  const id = input.id ?? stableId(input.type, input.name, input.path);
  const existing = map.get(id);
  const status = canonicalStatus(input.status, existing?.status ?? "implemented");
  const merged = {
    id,
    type: input.type,
    name: input.name,
    path: input.path ?? "",
    description: input.description ?? "",
    status,
    owner: input.owner ?? "",
    dependencies: uniq([...(existing?.dependencies ?? []), ...(input.dependencies ?? [])]),
    related_entities: uniq([...(existing?.related_entities ?? []), ...(input.related_entities ?? [])]),
    updated_at: input.updated_at ?? existing?.updated_at ?? defaultUpdatedAt,
    evidence: uniq([...(existing?.evidence ?? []), ...(input.evidence ?? [])]),
  };
  map.set(id, merged);
  return merged;
}

function addRelation(relations, from, to, type, evidence = "") {
  if (!from || !to || from === to) return;
  if (!relationTypes.has(type)) throw new Error(`Unknown relation type: ${type}`);
  const key = `${from.id}->${type}->${to.id}`;
  if (relations.has(key)) return;
  relations.set(key, {
    id: stableId("relation", key, evidence),
    from: from.id,
    to: to.id,
    type,
    evidence,
    updated_at: [from.updated_at, to.updated_at]
      .filter((value) => typeof value === "string" && value.length > 0)
      .sort()
      .at(-1) ?? defaultUpdatedAt,
  });
}

function pathLooksLikeTest(relativePath) {
  return /(^|[\\/])(__tests__|tests?|specs?)([\\/]|$)/i.test(relativePath) ||
    /\.(test|spec)\.(ts|tsx|js|jsx|mjs|cjs|py|php)$/i.test(relativePath) ||
    /(^|[\\/])tests?[\\/].*Test\.php$/i.test(relativePath);
}

function pathLooksLikeRunnableTest(relativePath) {
  return runnableTestExtensionPattern.test(relativePath) ||
    /(^|[\\/])tests?[\\/].*Test\.php$/i.test(relativePath) ||
    pathLooksLikeStructuredTestArtifact(relativePath);
}

function pathLooksLikeStructuredTestArtifact(relativePath) {
  return /(^|[\\/])history[\\/]artifacts[\\/][^\\/]*(browser-proof|smoke-e2e|api-smoke-e2e|test-proof)[^\\/]*\.json$/i.test(
    relativePath,
  );
}

function pathLooksLikeTestFixture(relativePath) {
  return pathLooksLikeTest(relativePath) ||
    /(^|[\\/])(__fixtures__|fixtures?|test-fixtures?|test-support|testing)([\\/]|$)/i.test(relativePath) ||
    /\.(fixture|fixtures|mock|mocks|stub|stubs)\.(ts|tsx|js|jsx|mjs|cjs|py)$/i.test(relativePath) ||
    /(^|[\\/])[^\\/]*\.(e2e|integration)\.fixtures?\.(ts|tsx|js|jsx|mjs|cjs|py)$/i.test(relativePath);
}

function pathLooksLikeComponent(relativePath) {
  return (/\.(tsx|jsx)$/.test(relativePath) || /\.blade\.php$/i.test(relativePath)) &&
    (/(^|[\\/])(components?|ui|views?|pages?)([\\/]|$)/i.test(relativePath) ||
      /^[A-Z]/.test(path.basename(relativePath)));
}

function pathLooksLikeMigration(relativePath) {
  return /(^|[\\/])(migrations?|db[\\/]migrations)([\\/]|$)/i.test(relativePath);
}

function laravelRouteNameAfter(text, endpointMatch) {
  const tail = text.slice(endpointMatch.index + endpointMatch[0].length, endpointMatch.index + endpointMatch[0].length + 1200);
  const nextRouteIndex = tail.search(/\bRoute::(?:get|post|put|patch|delete|options|any|match)\s*\(/);
  const routeTail = nextRouteIndex >= 0 ? tail.slice(0, nextRouteIndex) : tail;
  return routeTail.match(/->\s*name\s*\(\s*["']([^"']+)["']\s*\)/)?.[1] ?? "";
}

function matchingBraceIndex(text, openIndex) {
  let depth = 0;
  for (let index = openIndex; index < text.length; index += 1) {
    if (text[index] === "{") depth += 1;
    if (text[index] === "}") depth -= 1;
    if (depth === 0) return index;
  }
  return text.length;
}

function extractLaravelStaticRouteGroups(text) {
  const groups = [];
  const groupPattern = /Route::(?:(?!;\s*(?:\r?\n|$))[\s\S]){0,500}?->\s*group\s*\(\s*function[^\{]*\{/g;
  for (const match of text.matchAll(groupPattern)) {
    const openIndex = match.index + match[0].lastIndexOf("{");
    const declaration = match[0];
    const namePrefix = declaration.match(/(?:Route::|->\s*)name\s*\(\s*["']([^"']+)["']\s*\)/)?.[1] ?? "";
    const pathPrefix = declaration.match(/(?:Route::|->\s*)prefix\s*\(\s*["']([^"']+)["']\s*\)/)?.[1] ?? "";
    if (!namePrefix && !pathPrefix) continue;
    groups.push({
      start: openIndex + 1,
      end: matchingBraceIndex(text, openIndex),
      namePrefix,
      pathPrefix,
    });
  }
  return groups;
}

function laravelRouteContext(groups, endpointIndex) {
  const active = groups
    .filter((group) => group.start <= endpointIndex && endpointIndex < group.end)
    .sort((a, b) => a.start - b.start);
  return {
    namePrefix: active.map((group) => group.namePrefix).join(""),
    pathPrefix: active.map((group) => group.pathPrefix).filter(Boolean).join("/"),
  };
}

function normalizeLaravelRequestMethod(value) {
  return String(value ?? "").replace(/Json$/i, "").toLowerCase();
}

function normalizeLaravelRoutePath(value) {
  return String(value ?? "")
    .trim()
    .replace(/^https?:\/\/[^/]+/i, "")
    .split(/[?#]/, 1)[0]
    .replace(/^\/+|\/+$/g, "");
}

function joinLaravelRoutePath(prefix, routePath) {
  const joined = [normalizeLaravelRoutePath(prefix), normalizeLaravelRoutePath(routePath)].filter(Boolean).join("/");
  return joined || "/";
}

function laravelRoutePathMatches(routePath, requestPath, { suffix = false } = {}) {
  const routeSegments = normalizeLaravelRoutePath(routePath).split("/").filter(Boolean);
  const requestSegments = normalizeLaravelRoutePath(requestPath).split("/").filter(Boolean);
  if (suffix && !routeSegments.some((segment) => !/^\{[^}]+\??\}$/.test(segment))) return false;
  if (suffix ? requestSegments.length < routeSegments.length : requestSegments.length !== routeSegments.length) return false;
  const offset = suffix ? requestSegments.length - routeSegments.length : 0;
  return routeSegments.every((segment, index) =>
    /^\{[^}]+\??\}$/.test(segment) || segment === requestSegments[index + offset]
  );
}

function uniqueLaravelRouteCandidate(candidates) {
  const unique = new Map(candidates.map((candidate) => [candidate.entity.id, candidate]));
  return unique.size === 1 ? [...unique.values()][0] : null;
}

function moduleNameFor(relativePath) {
  const parts = relativePath.split("/");
  const index = parts.findIndex((part) => ["apps", "packages", "libs", "src"].includes(part));
  if (index >= 0 && parts[index + 1]) return parts.slice(index, Math.min(index + 3, parts.length - 1)).join("/");
  return parts.length > 1 ? parts[0] : ".";
}

function importToCandidatePath(source, currentRelativePath) {
  if (!source.startsWith(".")) return null;
  const currentDir = path.dirname(currentRelativePath);
  const normalized = toPosix(path.normalize(path.join(currentDir, source)));
  return normalized.replaceAll("\\", "/");
}

function firstMarkdownHeading(text) {
  const match = /^#\s+(.+)$/m.exec(text);
  return match?.[1]?.trim() ?? null;
}

function normalizeRelativePath(value) {
  if (!value) return "";
  return toPosix(path.normalize(String(value).replaceAll("\\", "/")));
}

function entityBasePath(entityPath) {
  return normalizeRelativePath(String(entityPath ?? "").split("#")[0]);
}

function splitRefs(value) {
  return String(value ?? "")
    .split(/[|;,]/)
    .map((item) => normalizeRelativePath(item.trim()))
    .filter(Boolean);
}

async function loadCuratedGraphCoverage(filePath) {
  try {
    const raw = await fs.readFile(filePath, "utf8");
    const parsed = JSON.parse(raw);
    const coveredPaths = new Set();
    const nodes = Array.isArray(parsed.nodes) ? parsed.nodes : [];

    for (const node of nodes) {
      for (const fileRef of splitRefs(node.file_path)) coveredPaths.add(fileRef);
      for (const fileRef of splitRefs(node.related_files)) coveredPaths.add(fileRef);
    }

    for (const relation of parsed.relations ?? []) {
      for (const fileRef of splitRefs(relation.evidence)) coveredPaths.add(fileRef);
    }

    return {
      filePath: toPosix(filePath),
      coveredPaths,
      nodes,
    };
  } catch (error) {
    if (error && typeof error === "object" && "code" in error && error.code === "ENOENT") {
      return {
        filePath: toPosix(filePath),
        coveredPaths: new Set(),
        nodes: [],
      };
    }
    throw error;
  }
}

function inferredGapNoiseReason(entity, curatedCoverage) {
  const basePath = entityBasePath(entity.path);
  const name = String(entity.name ?? "");

  if (entity.type === "function" && pathLooksLikeTestFixture(basePath)) {
    return "test_fixture_function";
  }
  if (/\.(d\.ts|ts|tsx)$/i.test(basePath) && /(^|\/)types?(?:\/|\.)/i.test(basePath) && ["feature", "function", "model"].includes(entity.type)) {
    return "typescript_type_declaration";
  }

  if (/Error$/i.test(name) && /\.(ts|tsx)$/i.test(basePath) && ["feature", "function", "model"].includes(entity.type)) {
    return "domain_error_declaration";
  }

  if ((/(^|\/)(proof|proofs|test-support|testing)(\/|$)/i.test(basePath) || (/CdpClient/i.test(name) && /(^|\/)scripts\//i.test(basePath))) && ["feature", "function", "model"].includes(entity.type)) {
    return "proof_runner_helper";
  }

  if (/(^|\/)(test|tests|__tests__)(\/|$)/i.test(basePath) && entity.type === "feature") {
    return "test_support_file";
  }

  if (basePath && curatedCoverage.coveredPaths.has(basePath)) {
    return "curated_graph_covered";
  }

  if (
    entity.type === "api_endpoint" &&
    /^USE\s+/i.test(name) &&
    /(^|\/)(index|dashboard|admin)\.routes?\.ts$/i.test(basePath)
  ) {
    return "aggregate_route_mount";
  }

  if (
    entity.type === "api_endpoint" &&
    /^GET\s+\/$/i.test(name) &&
    /(^|\/)(index|dashboard|admin)\.routes?\.ts$/i.test(basePath)
  ) {
    return "aggregate_route_root";
  }

  if (entity.type === "api_endpoint" && /^USE\s+\/avatars$/i.test(name) && basePath === "apps/api/src/index.ts") {
    return "top_level_app_mount";
  }

  if (/^docs\/\.obsidian\/plugins\//i.test(basePath)) {
    return "generated_vendor_docs_vault_plugin";
  }

  if (/^docs\/(graphs|status)\//i.test(basePath)) {
    return "generated_architecture_report_artifact";
  }

  if (
    /(^|\/)next-env\.d\.ts$/i.test(basePath) ||
    /(^|\/)sw\.js$/i.test(basePath) ||
    /(^|\/)index\.(ts|tsx|js|jsx|mjs|cjs)$/i.test(basePath) ||
    /(^|\/)i18n\/namespaces\/[^/]+\.(ts|tsx|js|jsx|mjs|cjs)$/i.test(basePath) ||
    /(^|\/)(vite|vitest|playwright|tailwind|postcss|next|eslint|prettier|tsconfig|components)\.config\./i.test(basePath) ||
    /(^|\/)(docker-compose|package-lock|pnpm-lock|yarn\.lock|package)\.(json|yaml|yml)$/i.test(basePath)
  ) {
    return "config_only_file";
  }

  return "";
}

function taskLinkageNoiseReason(entity, curatedCoverage) {
  const basePath = entityBasePath(entity.path);

  if (entity.type === "task" && /^history\/tasks\//i.test(basePath)) {
    return "historical_task_archive";
  }

  const inferredReason = inferredGapNoiseReason(entity, curatedCoverage);
  if (inferredReason) return inferredReason;

  return "";
}

async function loadOverrides(filePath) {
  try {
    const raw = await fs.readFile(filePath, "utf8");
    const parsed = JSON.parse(raw);
    return {
      filePath: toPosix(filePath),
      excludePaths: new Set((parsed.excludePaths ?? []).map(normalizeRelativePath)),
      excludePathPrefixes: new Set((parsed.excludePathPrefixes ?? []).map(normalizeRelativePath)),
      entityOverrides: Array.isArray(parsed.entityOverrides) ? parsed.entityOverrides : [],
      relationOverrides: Array.isArray(parsed.relationOverrides) ? parsed.relationOverrides : [],
    };
  } catch (error) {
    if (error && typeof error === "object" && "code" in error && error.code === "ENOENT") {
      return {
        filePath: toPosix(filePath),
        excludePaths: new Set(),
        excludePathPrefixes: new Set(),
        entityOverrides: [],
        relationOverrides: [],
      };
    }
    throw error;
  }
}

function inferOwnerForPath(entityPath) {
  const normalized = toPosix(entityPath ?? "");
  if (!normalized || normalized === ".") return defaultOwner;
  for (const rule of ownerAttributionRules) {
    if (normalized.startsWith(rule.prefix)) return rule.owner;
  }
  return defaultOwner;
}

function inferProjectOwner(name) {
  const match = projectOwnerByNamePattern.find((rule) => rule.pattern.test(name));
  return match?.owner ?? "Portfolio Director";
}

if (statusOnly) {
  progress("status_only_start", {
    root: toPosix(repoRoot),
    output: toPosix(outputRoot),
  });
  const report = await statusOnlyReport();
  progress("status_only_complete", {
    generatedAt: report.generatedAt,
    entities: report.counts.entities,
    relations: report.counts.relations,
    missing: report.missing.length,
  });
  await new Promise((resolve) => {
    process.stdout.write(`${JSON.stringify(report, null, 2)}\n`, resolve);
  });
  process.exit(report.missing.length ? 2 : 0);
}

progress("load_inputs", {
  root: toPosix(repoRoot),
  output: toPosix(outputRoot),
  overrides: toPosix(overridesPath),
});
const overrides = await loadOverrides(overridesPath);
const curatedCoverage = await loadCuratedGraphCoverage(curatedGraphPath);
progress("walk_start");
const files = await walk(repoRoot);
progress("walk_complete", { files: files.length });
enforceTimeBudget("walk_complete", { files: files.length });
const entities = new Map();
const relations = new Map();
const fileEntityByPath = new Map();
const moduleEntityByName = new Map();
const testSourceTextByEntityId = new Map();
const laravelRouteCandidates = [];
const overrideStats = {
  excludedFiles: 0,
  excludedFilesByPrefix: 0,
  entityOverridesApplied: 0,
  relationOverridesApplied: 0,
  criticalEntitiesTagged: 0,
};

function isExcludedByOverride(relativePath) {
  const normalized = normalizeRelativePath(relativePath);
  if (overrides.excludePaths.has(normalized)) return "path";
  for (const prefix of overrides.excludePathPrefixes) {
    if (!prefix) continue;
    if (normalized === prefix || normalized.startsWith(`${prefix}/`)) return "prefix";
  }
  return "";
}

function resolveOverrideEntity(entry, side) {
  const idKey = `${side}Id`;
  const pathKey = `${side}Path`;
  const typeKey = `${side}Type`;
  if (typeof entry[idKey] === "string" && entry[idKey]) {
    return entities.get(entry[idKey]) ?? null;
  }
  if (typeof entry[pathKey] === "string" && entry[pathKey]) {
    const normalizedPath = normalizeRelativePath(entry[pathKey]);
    const direct = fileEntityByPath.get(normalizedPath);
    if (direct) return direct;
    const typeFilter = typeof entry[typeKey] === "string" ? entry[typeKey] : null;
    return [...entities.values()].find((entity) =>
      entity.path === normalizedPath && (!typeFilter || entity.type === typeFilter)
    ) ?? null;
  }
  return null;
}

function resolveEntityByOverridePath(targetPath, typeFilter = null) {
  const normalizedPath = normalizeRelativePath(targetPath);
  const direct = fileEntityByPath.get(normalizedPath);
  if (direct && (!typeFilter || direct.type === typeFilter)) return direct;
  return [...entities.values()].find((entity) =>
    entity.path === normalizedPath && (!typeFilter || entity.type === typeFilter)
  ) ?? null;
}

const project = addEntity(entities, {
  id: stableId("project", projectName, repoRoot),
  type: "project",
  name: projectName,
  path: toPosix(repoRoot),
  description: "Indexed software project root.",
  status: "in_progress",
  owner: inferProjectOwner(projectName),
  evidence: [toPosix(repoRoot)],
});

let scannedFiles = 0;
for (const file of files) {
  scannedFiles += 1;
  enforceTimeBudget("scan_files", { scannedFiles, files: files.length });
  if (scannedFiles === 1 || scannedFiles % progressEveryFiles === 0 || scannedFiles === files.length) {
    progress("scan_files", { scannedFiles, files: files.length });
  }
  const relativePath = rel(file);
  const exclusionKind = isExcludedByOverride(relativePath);
  if (exclusionKind) {
    overrideStats.excludedFiles += 1;
    if (exclusionKind === "prefix") overrideStats.excludedFilesByPrefix += 1;
    continue;
  }
  const ext = path.extname(file);
  const stat = await fs.stat(file);
  const isDoc = docExtensions.has(ext);
  const isCode = codeExtensions.has(ext);
  const isStructuredTestArtifact = pathLooksLikeStructuredTestArtifact(relativePath);
  const isTest = pathLooksLikeRunnableTest(relativePath);
  const isMigration = pathLooksLikeMigration(relativePath);
  const isAgent = /(^|[\\/])(\.agents|agents?|\.codex[\\/]agents)([\\/]|$)/i.test(relativePath) && isDoc;
  if (!isDoc && !isCode && !isMigration && !isStructuredTestArtifact) continue;

  const text = await fs.readFile(file, "utf8").catch(() => "");
  const moduleName = moduleNameFor(relativePath);
  let moduleEntity = moduleEntityByName.get(moduleName);
  if (!moduleEntity) {
    moduleEntity = addEntity(entities, {
      type: "module",
      name: moduleName,
      path: moduleName,
      description: `Repo module inferred from ${moduleName}.`,
      status: "implemented",
      owner: "",
      evidence: [moduleName],
    });
    moduleEntityByName.set(moduleName, moduleEntity);
    addRelation(relations, project, moduleEntity, "owns", moduleName);
  }

  let type = "document";
  let status = "implemented";
  let name = path.basename(file);
  let description = "Repository document.";

  if (isAgent) {
    type = "agent";
    name = firstMarkdownHeading(text) ?? path.basename(file, ext);
    description = "Agent instruction or state document.";
  } else if (isTest) {
    type = "test";
    description = "Automated or manual test artifact.";
    status = "tested";
  } else if (isMigration) {
    type = "migration";
    description = "Database migration artifact.";
  } else if (modelNamePattern.test(relativePath) && ext !== ".prisma") {
    type = "model";
    description = "Model/schema/type artifact.";
  } else if (routeSegmentPattern.test(relativePath)) {
    type = "route";
    description = "Route or API routing artifact.";
  } else if (pathLooksLikeComponent(relativePath)) {
    type = "component";
    description = "UI component or view artifact.";
  } else if (isCode) {
    type = "feature";
    description = "Code feature artifact.";
  } else if (isDoc) {
    name = firstMarkdownHeading(text) ?? name;
  }

  if (/deprecated/i.test(relativePath) || /deprecated/i.test(text.slice(0, 1000))) status = "deprecated";
  if (/(^|\n)\s*(status|state)\s*:\s*blocked\b/i.test(text) || /(^|\n)##?\s+blocked\b/i.test(text)) status = "blocked";

  const entity = addEntity(entities, {
    type,
    name,
    path: relativePath,
    description,
    status,
    owner: "",
    updated_at: stat.mtime.toISOString(),
    evidence: [relativePath],
  });
  fileEntityByPath.set(relativePath, entity);
  if (isTest && ext === ".php") testSourceTextByEntityId.set(entity.id, text);
  addRelation(relations, moduleEntity, entity, type === "document" ? "documents" : "implements", relativePath);

  if (isDoc) addRelation(relations, entity, moduleEntity, "documents", relativePath);

  if (isCode) {
    for (const match of text.matchAll(importPattern)) {
      const candidate = importToCandidatePath(match[1], relativePath);
      if (!candidate) continue;
      entity.dependencies.push(candidate);
    }

    if (!isTest) {
      for (const match of text.matchAll(apiEndpointPattern)) {
        const endpoint = addEntity(entities, {
          type: "api_endpoint",
          name: `${match[1].toUpperCase()} ${match[2]}`,
          path: `${relativePath}#${match[2]}`,
          description: "API endpoint inferred from route registration.",
          status: "implemented",
          evidence: [relativePath],
        });
        fileEntityByPath.set(endpoint.path, endpoint);
        addRelation(relations, entity, endpoint, "implements", relativePath);
        addRelation(relations, endpoint, moduleEntity, "connected_to", relativePath);
      }
      const laravelEndpointMatches = [...text.matchAll(laravelEndpointPattern)];
      const laravelRouteGroups = extractLaravelStaticRouteGroups(text);
      const laravelEndpointSignatureCounts = new Map();
      for (const match of laravelEndpointMatches) {
        const routeContext = laravelRouteContext(laravelRouteGroups, match.index);
        const fullPath = joinLaravelRoutePath(routeContext.pathPrefix, match[2]);
        const signature = `${match[1].toLowerCase()} ${fullPath}`;
        laravelEndpointSignatureCounts.set(signature, (laravelEndpointSignatureCounts.get(signature) ?? 0) + 1);
      }
      for (const match of laravelEndpointMatches) {
        const routeContext = laravelRouteContext(laravelRouteGroups, match.index);
        const fullPath = joinLaravelRoutePath(routeContext.pathPrefix, match[2]);
        const routeName = `${routeContext.namePrefix}${laravelRouteNameAfter(text, match)}`;
        const signature = `${match[1].toLowerCase()} ${fullPath}`;
        const discriminator = (laravelEndpointSignatureCounts.get(signature) ?? 0) > 1
          ? `@${routeName || `offset-${match.index}`}`
          : "";
        const endpoint = addEntity(entities, {
          type: "api_endpoint",
          name: `${match[1].toUpperCase()} ${fullPath}`,
          path: `${relativePath}#${fullPath}${discriminator}`,
          description: "Laravel endpoint inferred from route registration.",
          status: "implemented",
          evidence: [relativePath],
        });
        fileEntityByPath.set(endpoint.path, endpoint);
        laravelRouteCandidates.push({
          entity: endpoint,
          method: match[1].toLowerCase(),
          path: fullPath,
          routeName,
        });
        addRelation(relations, entity, endpoint, "implements", relativePath);
        addRelation(relations, endpoint, moduleEntity, "connected_to", relativePath);
      }
    }

    for (const match of text.matchAll(functionPattern)) {
      const functionName = match[1] ?? match[2];
      const functionEntity = addEntity(entities, {
        type: "function",
        name: functionName,
        path: `${relativePath}#${functionName}`,
        description: "Function inferred from source code.",
        status: isTest ? "tested" : "implemented",
        evidence: [relativePath],
      });
      fileEntityByPath.set(functionEntity.path, functionEntity);
      addRelation(relations, entity, functionEntity, "implements", relativePath);
    }

    for (const match of text.matchAll(classPattern)) {
      const classEntity = addEntity(entities, {
        type: "feature",
        name: match[1],
        path: `${relativePath}#${match[1]}`,
        description: "Class inferred from source code.",
        status: "implemented",
        evidence: [relativePath],
      });
      fileEntityByPath.set(classEntity.path, classEntity);
      addRelation(relations, entity, classEntity, "implements", relativePath);
    }
    if (ext === ".prisma") {
      for (const match of text.matchAll(prismaModelPattern)) {
        const modelEntity = addEntity(entities, {
          type: "model",
          name: match[1],
          path: `${relativePath}#${match[1]}`,
          description: "Prisma model declaration.",
          status: "implemented",
          evidence: [relativePath],
        });
        fileEntityByPath.set(modelEntity.path, modelEntity);
        addRelation(relations, entity, modelEntity, "implements", relativePath);
      }
    }
  }
}

for (const entry of overrides.entityOverrides) {
  const targetPath = normalizeRelativePath(entry.path ?? "");
  if (!targetPath) continue;
  const target = resolveEntityByOverridePath(targetPath);
  if (!target) continue;

  let mutated = false;
  const targetExtension = path.extname(target.path.split("#", 1)[0]).toLowerCase();
  const promotesMarkdownProofToTest = docExtensions.has(targetExtension) && entry.type === "test";
  if (entityTypes.has(entry.type) && entry.type !== target.type && !promotesMarkdownProofToTest) {
    target.type = entry.type;
    mutated = true;
  }
  if (typeof entry.name === "string" && entry.name && entry.name !== target.name) {
    target.name = entry.name;
    mutated = true;
  }
  if (typeof entry.description === "string" && entry.description !== target.description) {
    target.description = entry.description;
    mutated = true;
  }
  if (typeof entry.status === "string" && canonicalStatus(entry.status, target.status) !== target.status) {
    target.status = canonicalStatus(entry.status, target.status);
    mutated = true;
  }
  if (typeof entry.owner === "string" && entry.owner !== target.owner) {
    target.owner = entry.owner;
    mutated = true;
  }

  const extraDependencies = (entry.dependencies ?? []).map(String);
  const nextDependencies = uniq([...(target.dependencies ?? []), ...extraDependencies]);
  if (nextDependencies.length !== (target.dependencies ?? []).length) {
    target.dependencies = nextDependencies;
    mutated = true;
  }

  const extraEvidence = (entry.evidence ?? []).map(String);
  const nextEvidence = uniq([...(target.evidence ?? []), ...extraEvidence]);
  if (nextEvidence.length !== (target.evidence ?? []).length) {
    target.evidence = nextEvidence;
    mutated = true;
  }

  if (entry.critical === true && !target.evidence.includes("critical_entity_override")) {
    target.evidence.push("critical_entity_override");
    overrideStats.criticalEntitiesTagged += 1;
    mutated = true;
  }

  if (mutated) overrideStats.entityOverridesApplied += 1;
}

for (const entry of overrides.relationOverrides) {
  const relationType = typeof entry.type === "string" ? entry.type : "";
  if (!relationTypes.has(relationType)) continue;
  const fromEntity = resolveOverrideEntity(entry, "from");
  const toEntity = resolveOverrideEntity(entry, "to");
  if (!fromEntity || !toEntity) continue;
  addRelation(
    relations,
    fromEntity,
    toEntity,
    relationType,
    typeof entry.evidence === "string" && entry.evidence ? entry.evidence : overrides.filePath,
  );
  overrideStats.relationOverridesApplied += 1;
}

progress("resolve_dependencies_start", { entities: entities.size, relations: relations.size });
const dependencyPathSuffixes = [
  "",
  ".ts",
  ".tsx",
  ".js",
  ".jsx",
  ".mjs",
  ".cjs",
  ".py",
  ".md",
  ".mdx",
  "/index.ts",
  "/index.tsx",
  "/index.js",
  "/index.jsx",
  "/index.mjs",
  "/index.cjs",
  "/index.py",
];
for (const entity of entities.values()) {
  if (entity.dependencies.length === 0) continue;
  const resolved = [];
  for (const dependency of entity.dependencies) {
    const matches = [];
    const seenTargets = new Set();
    for (const suffix of dependencyPathSuffixes) {
      const target = fileEntityByPath.get(`${dependency}${suffix}`);
      if (!target || seenTargets.has(target.id)) continue;
      matches.push(target);
      seenTargets.add(target.id);
      if (matches.length >= 3) break;
    }
    for (const target of matches) {
      addRelation(relations, entity, target, "uses", dependency);
      resolved.push(target.id);
    }
  }
  entity.dependencies = uniq(resolved);
}
progress("resolve_dependencies_complete", { entities: entities.size, relations: relations.size });

const testEntities = [...entities.values()].filter((entity) => entity.type === "test");
progress("infer_test_links_start", { testEntities: testEntities.length });

for (const testEntity of testEntities) {
  const testSource = testSourceTextByEntityId.get(testEntity.id);
  if (!testSource) continue;

  const linkCandidate = (candidate, evidence) => {
    if (candidate) addRelation(relations, testEntity, candidate.entity, "tests", `${testEntity.path}#${evidence}`);
  };

  for (const match of testSource.matchAll(laravelTestLiteralRequestPattern)) {
    const method = normalizeLaravelRequestMethod(match[1]);
    const requestPath = match[2];
    const methodCandidates = laravelRouteCandidates.filter((candidate) =>
      candidate.method === "any" || candidate.method === method
    );
    const exact = uniqueLaravelRouteCandidate(
      methodCandidates.filter((candidate) => laravelRoutePathMatches(candidate.path, requestPath)),
    );
    const suffix = exact ?? uniqueLaravelRouteCandidate(
      methodCandidates.filter((candidate) => laravelRoutePathMatches(candidate.path, requestPath, { suffix: true })),
    );
    linkCandidate(suffix, `laravel-request:${method.toUpperCase()} ${requestPath}`);
  }

  for (const match of testSource.matchAll(laravelTestJsonRequestPattern)) {
    const method = normalizeLaravelRequestMethod(match[1]);
    const requestPath = match[2];
    const methodCandidates = laravelRouteCandidates.filter((candidate) =>
      candidate.method === "any" || candidate.method === method
    );
    const exact = uniqueLaravelRouteCandidate(
      methodCandidates.filter((candidate) => laravelRoutePathMatches(candidate.path, requestPath)),
    );
    const suffix = exact ?? uniqueLaravelRouteCandidate(
      methodCandidates.filter((candidate) => laravelRoutePathMatches(candidate.path, requestPath, { suffix: true })),
    );
    linkCandidate(suffix, `laravel-request:${method.toUpperCase()} ${requestPath}`);
  }

  for (const match of testSource.matchAll(laravelNamedRouteCallPattern)) {
    const requestedName = match[1];
    const exact = uniqueLaravelRouteCandidate(
      laravelRouteCandidates.filter((candidate) => candidate.routeName === requestedName),
    );
    const suffix = exact ?? uniqueLaravelRouteCandidate(
      laravelRouteCandidates.filter((candidate) =>
        candidate.routeName && (
          requestedName.endsWith(`.${candidate.routeName}`) || candidate.routeName.endsWith(`.${requestedName}`)
        )
      ),
    );
    linkCandidate(suffix, `laravel-route:${requestedName}`);
  }
}

const testTargetCandidatesByBase = new Map();
for (const entity of entities.values()) {
  if (entity.type === "test" || !entity.path || pathLooksLikeTest(entity.path)) continue;
  const baseName = path.basename(entity.path).toLowerCase();
  if (!baseName) continue;
  for (const token of new Set(baseName.split(/[^a-z0-9]+/i).filter((part) => part.length >= 3))) {
    const bucket = testTargetCandidatesByBase.get(token) ?? [];
    bucket.push(entity);
    testTargetCandidatesByBase.set(token, bucket);
  }
}
for (const test of testEntities) {
  const base = path.basename(test.path)
    .replace(/\.(test|spec)\.(ts|tsx|js|jsx|mjs|cjs|py)$/i, "")
    .toLowerCase();
  if (!base) continue;
  const candidates = new Map();
  for (const token of new Set(base.split(/[^a-z0-9]+/i).filter((part) => part.length >= 3))) {
    for (const entity of testTargetCandidatesByBase.get(token) ?? []) {
      if (path.basename(entity.path).toLowerCase().includes(base)) {
        candidates.set(entity.id, entity);
      }
    }
  }
  for (const target of [...candidates.values()].slice(0, 5)) addRelation(relations, test, target, "tests", test.path);
}
progress("infer_test_links_complete", { relations: relations.size });

progress("collect_tasks_start");
const taskFiles = await collectTaskFiles();
progress("collect_tasks_complete", { taskFiles: taskFiles.length });
enforceTimeBudget("collect_tasks_complete", { taskFiles: taskFiles.length });
progress("collect_paperclip_issue_tasks_start");
const paperclipIssueTasks = await loadPaperclipIssueTasks();
const taskImportStats = {
  local_task_files: taskFiles.length,
  paperclip_issue_source: paperclipIssueTasks?.source ?? "",
  paperclip_issue_tasks: paperclipIssueTasks?.issues?.length ?? 0,
  paperclip_issue_comments: paperclipIssueTasks
    ? [...paperclipIssueTasks.commentsByIssueId.values()].reduce((total, comments) => total + comments.length, 0)
    : 0,
};
progress("collect_paperclip_issue_tasks_complete", taskImportStats);
enforceTimeBudget("collect_paperclip_issue_tasks_complete", taskImportStats);
const entityById = new Map(entities);
const generatedEntityIdPattern = /[a-z_]+:[a-z0-9-]+:[a-f0-9]{10}/gi;
const curatedArchitectureIdPattern = /\b[A-Z][A-Z0-9]*(?:-[A-Z0-9]+){2,}\b/g;
const curatedEntityById = new Map();

for (const node of curatedCoverage.nodes) {
  const id = typeof node.id === "string" ? node.id.trim() : "";
  if (!id) continue;
  const candidatePaths = [
    ...splitRefs(node.file_path),
    ...splitRefs(node.related_files),
    `docs/architecture/nodes/${id}.md`,
  ];
  const entity = candidatePaths.map((candidatePath) => fileEntityByPath.get(candidatePath)).find(Boolean);
  if (entity) curatedEntityById.set(id, entity);
}

function architectureLinkBlockPaths(text) {
  const match = text.match(/(^|\n)## Architecture Links\s*\n([\s\S]*?)(?=\n## |\n# |$)/i);
  if (!match) return [];
  const block = match[2] ?? "";
  const paths = [];
  for (const pathMatch of block.matchAll(/(?:^|[\s`])((?:\.agents|\.codex|backend|web|mobile|docs?|docker|apps|packages|scripts|history|server|ui|cli|tests?)\/[A-Za-z0-9._~:/#[\]@!$&'()*+,;=%-]+)/g)) {
    paths.push(pathMatch[1].replace(/[),.;\]]+$/g, ""));
  }
  return uniq(paths.map(normalizeRelativePath).filter(Boolean));
}

function architectureLinkBlockIds(text) {
  const match = text.match(/(^|\n)## Architecture Links\s*\n([\s\S]*?)(?=\n## |\n# |$)/i);
  if (!match) return [];
  const block = match[2] ?? "";
  return uniq([...block.matchAll(curatedArchitectureIdPattern)].map((idMatch) => idMatch[0]));
}

function referencedRepoPaths(text) {
  const paths = [];
  const pathPattern = /(?:^|[\s`"'([])((?:\.agents|\.codex|backend|web|mobile|docs?|docker|apps|packages|scripts|history|server|ui|cli|tests?)\/[A-Za-z0-9._~:/#[\]@!$&'()*+,;=%-]+)/g;
  for (const pathMatch of text.matchAll(pathPattern)) {
    paths.push(pathMatch[1].replace(/[),.;\]]+$/g, ""));
  }
  return uniq(paths.map(normalizeRelativePath).filter(Boolean));
}

function taskLinkedEntities(text) {
  const linked = new Map();
  const add = (entity) => {
    if (entity) linked.set(entity.id, entity);
  };

  for (const idMatch of text.matchAll(generatedEntityIdPattern)) {
    add(entityById.get(idMatch[0]));
  }

  for (const curatedId of architectureLinkBlockIds(text)) {
    add(curatedEntityById.get(curatedId));
  }

  for (const linkedPath of [...architectureLinkBlockPaths(text), ...referencedRepoPaths(text)]) {
    add(fileEntityByPath.get(linkedPath));
    const hashlessPath = linkedPath.split("#")[0];
    if (hashlessPath !== linkedPath) add(fileEntityByPath.get(hashlessPath));
  }

  return [...linked.values()];
}

for (const file of taskFiles) {
  enforceTimeBudget("scan_tasks", { file: toPosix(file) });
  const relativePath = rel(file);
  const text = await fs.readFile(file, "utf8").catch(() => "");
  const task = addEntity(entities, {
    type: "task",
    name: firstMarkdownHeading(text) ?? path.basename(file, path.extname(file)),
    path: relativePath,
    description: "Task or project-state artifact.",
    status: taskArtifactStatus(text),
    evidence: [relativePath],
  });
  addRelation(relations, project, task, "connected_to", relativePath);

  for (const target of taskLinkedEntities(text)) {
    addRelation(relations, task, target, "documents", relativePath);
  }
}

for (const issue of paperclipIssueTasks?.issues ?? []) {
  if (!issue || typeof issue !== "object") continue;
  enforceTimeBudget("scan_paperclip_issue_tasks", { issue: issue.identifier ?? issue.id ?? issue.title });
  const comments = paperclipIssueTasks.commentsByIssueId.get(issue.id) ?? [];
  const text = issueTaskText(issue, comments);
  const identifier = String(issue.identifier ?? "").trim();
  const issueId = String(issue.id ?? identifier ?? issue.title ?? "").trim();
  if (!issueId && !issue.title) continue;
  const name = [identifier, issue.title].filter(Boolean).join(" ");
  const issuePath = identifier ? `paperclip/issues/${identifier}` : `paperclip/issues/${issueId}`;
  const task = addEntity(entities, {
    id: `task:${slug(identifier || issueId || name)}:${crypto.createHash("sha1").update(issueId || name).digest("hex").slice(0, 10)}`,
    type: "task",
    name: name || "Paperclip issue",
    path: issuePath,
    description: "Paperclip issue imported as an architecture task entity.",
    status: issueTaskStatus(issue),
    owner: issue.assigneeAgentId ? `agent:${issue.assigneeAgentId}` : issue.assigneeUserId ? `user:${issue.assigneeUserId}` : "",
    dependencies: (issue.blockedBy ?? []).map((blocker) => blocker.identifier ?? blocker.id).filter(Boolean),
    evidence: [
      identifier ? `/${identifier.split("-")[0]}/issues/${identifier}` : issuePath,
      ...(issue.updatedAt ? [`updated:${issue.updatedAt}`] : []),
    ],
  });
  addRelation(relations, project, task, "connected_to", issuePath);

  for (const target of taskLinkedEntities(text)) {
    addRelation(relations, task, target, "documents", issuePath);
  }
}

const relatedEntityIdsByEntityId = new Map();
for (const relation of relations.values()) {
  const fromRelated = relatedEntityIdsByEntityId.get(relation.from) ?? new Set();
  fromRelated.add(relation.to);
  relatedEntityIdsByEntityId.set(relation.from, fromRelated);

  const toRelated = relatedEntityIdsByEntityId.get(relation.to) ?? new Set();
  toRelated.add(relation.from);
  relatedEntityIdsByEntityId.set(relation.to, toRelated);
}

for (const entity of entities.values()) {
  if (!entity.owner) {
    entity.owner = inferOwnerForPath(entity.path);
  }
  entity.dependencies = uniq(entity.dependencies);
  entity.related_entities = uniq([
    ...entity.related_entities,
    ...relatedEntityIdsByEntityId.get(entity.id) ?? [],
  ]);
}

const entityByPath = new Map();
for (const entity of entities.values()) {
  if (!entity.path) continue;
  const bucket = entityByPath.get(entity.path) ?? [];
  bucket.push(entity);
  entityByPath.set(entity.path, bucket);
}

const curatedDocumentationLinksPath = path.join(repoRoot, "docs/architecture/relations/documentation-links.csv");
try {
  const raw = await fs.readFile(curatedDocumentationLinksPath, "utf8");
  const rows = parseSimpleCsv(raw);
  for (const row of rows) {
    const entityPath = row.entity_path ?? "";
    const docPath = row.doc_path ?? "";
    if (!entityPath || !docPath) continue;
    const documentedEntities = entityByPath.get(entityPath) ?? [];
    const docEntity = fileEntityByPath.get(docPath);
    if (!docEntity || documentedEntities.length === 0) continue;
    for (const target of documentedEntities) {
      addRelation(relations, docEntity, target, "documents", curatedDocumentationLinksPath);
    }
  }
} catch {
  // Optional curated documentation links file.
}

const curatedPriorityTestLinksPath = path.join(repoRoot, "docs/architecture/relations/priority-test-links.csv");
try {
  const raw = await fs.readFile(curatedPriorityTestLinksPath, "utf8");
  const rows = parseSimpleCsv(raw);
  for (const row of rows) {
    const entityPath = row.entity_path ?? "";
    const testPath = row.test_path ?? "";
    if (!entityPath || !testPath) continue;
    const testedEntities = entityByPath.get(entityPath) ?? [];
    const testEntitiesForPath = (entityByPath.get(testPath) ?? []).filter((entity) => entity.type === "test");
    if (testedEntities.length === 0 || testEntitiesForPath.length === 0) continue;
    for (const testEntity of testEntitiesForPath) {
      for (const target of testedEntities) {
        addRelation(relations, testEntity, target, "tests", curatedPriorityTestLinksPath);
      }
    }
  }
} catch {
  // Optional curated priority test links file.
}

// Artifact freshness describes when this repository snapshot was scanned. Entity and
// relation `updated_at` fields continue to preserve the underlying source timestamps.
const generatedAt = observedAt;

const graph = {
  schema_version: 1,
  generated_at: generatedAt,
  project: {
    name: projectName,
    root: toPosix(repoRoot),
  },
  entity_types: [...entityTypes],
  relation_types: [...relationTypes],
  overrides: {
    file: overrides.filePath,
    exclude_paths: [...overrides.excludePaths],
    exclude_path_prefixes: [...overrides.excludePathPrefixes],
    entity_override_entries: overrides.entityOverrides.length,
    relation_override_entries: overrides.relationOverrides.length,
    applied: overrideStats,
  },
  task_imports: taskImportStats,
  status_values: [...statusValues],
  entities: [...entities.values()].sort((a, b) =>
    a.type.localeCompare(b.type)
    || a.path.localeCompare(b.path)
    || a.id.localeCompare(b.id)),
  relations: [...relations.values()].sort((a, b) =>
    a.type.localeCompare(b.type)
    || a.from.localeCompare(b.from)
    || a.to.localeCompare(b.to)
    || a.id.localeCompare(b.id)),
};

enforceTimeBudget("graph_built", { entities: graph.entities.length, relations: graph.relations.length });

function reportFor(graph) {
  const health = healthFor(graph);
  const countsByType = health.counts.by_type;
  const countsByStatus = health.counts.by_status;
  const rawImplementationWithoutTests = health.signals.implementation_without_tests;
  const rawImplementationWithoutDocs = health.signals.implementation_without_docs;
  const actionableImplementationWithoutTests = health.signals.actionable_implementation_without_tests;
  const actionableImplementationWithoutDocs = health.signals.actionable_implementation_without_docs;
  const classifiedInferredNoise = health.signals.classified_inferred_link_noise;
  const rawTasksWithoutArchitecture = health.signals.raw_tasks_without_architecture;
  const actionableTasksWithoutArchitecture = health.signals.tasks_without_architecture;
  const rawImplementationWithoutTask = health.signals.raw_implementation_without_task;
  const actionableImplementationWithoutTask = health.signals.implementation_without_task;
  const classifiedTaskLinkageNoise = health.signals.classified_task_linkage_noise;
  const entitiesWithoutOwner = health.signals.entities_without_owner.items;
  const disconnected = health.signals.disconnected_entities.items;

  return [
    "# Architecture Awareness Report",
    "",
    `Generated: ${graph.generated_at}`,
    `Project: ${graph.project.name}`,
    `Root: ${graph.project.root}`,
    "",
    "## Counts By Type",
    "",
    "| Type | Count |",
    "| --- | ---: |",
    ...Object.entries(countsByType).sort().map(([type, count]) => `| ${type} | ${count} |`),
    "",
    "## Counts By Status",
    "",
    "| Status | Count |",
    "| --- | ---: |",
    ...Object.entries(countsByStatus).sort().map(([status, count]) => `| ${status} | ${count} |`),
    "",
    "## Health Signals",
    "",
    `- Raw implementation entities without inferred tests: ${rawImplementationWithoutTests.count}`,
    `- Actionable implementation entities without inferred tests: ${actionableImplementationWithoutTests.count}`,
    `- Raw implementation entities without inferred docs: ${rawImplementationWithoutDocs.count}`,
    `- Actionable implementation entities without inferred docs: ${actionableImplementationWithoutDocs.count}`,
    `- Classified inferred-link noise: ${classifiedInferredNoise.count}`,
    `- Raw tasks without architecture links: ${rawTasksWithoutArchitecture.count}`,
    `- Actionable tasks without architecture links: ${actionableTasksWithoutArchitecture.count}`,
    `- Raw implementation entities without task links: ${rawImplementationWithoutTask.count}`,
    `- Actionable implementation entities without task links: ${actionableImplementationWithoutTask.count}`,
    `- Classified task-linkage noise: ${classifiedTaskLinkageNoise.count}`,
    `- Entities without owner attribution: ${entitiesWithoutOwner.length}`,
    `- Disconnected entities: ${disconnected.length}`,
    "",
    "## Top Actionable Missing Test Links",
    "",
    ...actionableImplementationWithoutTests.items.slice(0, 40).map((entity) => `- ${entity.type}: ${entity.name} (${entity.path})`),
    "",
    "## Top Actionable Missing Doc Links",
    "",
    ...actionableImplementationWithoutDocs.items.slice(0, 40).map((entity) => `- ${entity.type}: ${entity.name} (${entity.path})`),
    "",
    "## Classified Inferred-Link Noise",
    "",
    ...Object.entries(classifiedInferredNoise.by_reason)
      .sort(([left], [right]) => left.localeCompare(right))
      .map(([reason, count]) => `- ${reason}: ${count}`),
    "",
    "## Top Classified Noise Samples",
    "",
    ...classifiedInferredNoise.items.slice(0, 40).map((entity) => `- ${entity.reason}: ${entity.type}: ${entity.name} (${entity.path})`),
    "",
    "## Classified Task-Linkage Noise",
    "",
    ...Object.entries(classifiedTaskLinkageNoise.by_reason)
      .sort(([left], [right]) => left.localeCompare(right))
      .map(([reason, count]) => `- ${reason}: ${count}`),
    "",
    "## Top Classified Task-Linkage Noise Samples",
    "",
    ...classifiedTaskLinkageNoise.items.slice(0, 40).map((entity) => `- ${entity.reason}: ${entity.type}: ${entity.name} (${entity.path})`),
    "",
    "## Notes",
    "",
    "- This is an inferred baseline. CTO/Docs Memory must promote or correct important relations.",
    `- Curated graph coverage input: \`${curatedCoverage.filePath}\` (covered paths: ${curatedCoverage.coveredPaths.size}).`,
    `- Override input: \`${graph.overrides.file}\` (entity entries: ${graph.overrides.entity_override_entries}, relation entries: ${graph.overrides.relation_override_entries}).`,
    `- Override summary: excluded files ${graph.overrides.applied.excludedFiles}, entity overrides ${graph.overrides.applied.entityOverridesApplied}, relation overrides ${graph.overrides.applied.relationOverridesApplied}, critical entities tagged ${graph.overrides.applied.criticalEntitiesTagged}.`,
    "- `verified` still requires fresh command/browser/deploy evidence, not only file presence.",
  ].join("\n");
}

function healthFor(graph) {
  const byType = Object.fromEntries(
    Object.entries(groupBy(graph.entities, (entity) => entity.type))
      .sort()
      .map(([key, items]) => [key, items.length]),
  );
  const byStatus = Object.fromEntries(
    Object.entries(groupBy(graph.entities, (entity) => entity.status))
      .sort()
      .map(([key, items]) => [key, items.length]),
  );
  const testedTargets = new Set(graph.relations.filter((relation) => relation.type === "tests").map((relation) => relation.to));
  const documentedTargets = new Set(graph.relations.filter((relation) => relation.type === "documents").map((relation) => relation.to));
  const taskIds = new Set(graph.entities.filter((entity) => entity.type === "task").map((entity) => entity.id));
  const linkedEntityIds = new Set();
  const taskLinkedEntityIds = new Set();
  const implementationIdsLinkedToTasks = new Set();
  const taskRelationTypes = new Set(["implements", "depends_on", "tests", "documents"]);
  for (const relation of graph.relations) {
    linkedEntityIds.add(relation.from);
    linkedEntityIds.add(relation.to);
    if (taskRelationTypes.has(relation.type)) {
      taskLinkedEntityIds.add(relation.from);
      taskLinkedEntityIds.add(relation.to);
    }
    if (taskIds.has(relation.from)) implementationIdsLinkedToTasks.add(relation.to);
    if (taskIds.has(relation.to)) implementationIdsLinkedToTasks.add(relation.from);
  }
  const entitiesWithoutOwner = graph.entities.filter((entity) => !entity.owner);
  const implementationWithoutTests = graph.entities.filter((entity) =>
    ["feature", "component", "api_endpoint", "function"].includes(entity.type) &&
    !testedTargets.has(entity.id)
  );
  const implementationWithoutDocs = graph.entities.filter((entity) =>
    ["feature", "component", "api_endpoint", "route", "model"].includes(entity.type) &&
    !documentedTargets.has(entity.id)
  );
  const inferredNoiseById = new Map();
  for (const entity of implementationWithoutTests.concat(implementationWithoutDocs)) {
    const reason = inferredGapNoiseReason(entity, curatedCoverage);
    if (reason) inferredNoiseById.set(entity.id, { entity, reason });
  }
  const actionableImplementationWithoutTests = implementationWithoutTests.filter((entity) => !inferredNoiseById.has(entity.id));
  const actionableImplementationWithoutDocs = implementationWithoutDocs.filter((entity) => !inferredNoiseById.has(entity.id));
  const classifiedInferredNoise = [...inferredNoiseById.values()];
  const classifiedInferredNoiseByReason = Object.fromEntries(
    Object.entries(groupBy(classifiedInferredNoise, (item) => item.reason))
      .sort()
      .map(([reason, items]) => [reason, items.length]),
  );
  const disconnected = graph.entities.filter((entity) =>
    entity.type !== "project" &&
    !linkedEntityIds.has(entity.id)
  );
  const rawTasksWithoutArchitecture = graph.entities.filter((entity) =>
    entity.type === "task" &&
    !taskLinkedEntityIds.has(entity.id)
  );
  const rawImplementationWithoutTask = graph.entities.filter((entity) =>
    ["feature", "component", "api_endpoint", "route", "model"].includes(entity.type) &&
    !implementationIdsLinkedToTasks.has(entity.id)
  );
  const classifiedTaskLinkageNoise = rawTasksWithoutArchitecture
    .concat(rawImplementationWithoutTask)
    .map((entity) => ({ entity, reason: taskLinkageNoiseReason(entity, curatedCoverage) }))
    .filter((item) => item.reason);
  const classifiedTaskLinkageNoiseByReason = Object.fromEntries(
    Object.entries(groupBy(classifiedTaskLinkageNoise, (item) => item.reason))
      .sort()
      .map(([reason, items]) => [reason, items.length]),
  );
  const taskLinkageNoiseIds = new Set(classifiedTaskLinkageNoise.map((item) => item.entity.id));
  const actionableTasksWithoutArchitecture = rawTasksWithoutArchitecture.filter((entity) => !taskLinkageNoiseIds.has(entity.id));
  const actionableImplementationWithoutTask = rawImplementationWithoutTask.filter((entity) => !taskLinkageNoiseIds.has(entity.id));
  const verifiedWithoutProof = graph.entities.filter((entity) =>
    entity.status === "verified" &&
    (!Array.isArray(entity.evidence) || entity.evidence.length === 0)
  );
  return {
    generated_at: graph.generated_at,
    project: graph.project,
    counts: {
      entities: graph.entities.length,
      relations: graph.relations.length,
      by_type: byType,
      by_status: byStatus,
    },
    signals: {
      implementation_without_tests: signal(implementationWithoutTests),
      implementation_without_docs: signal(implementationWithoutDocs),
      actionable_implementation_without_tests: signal(actionableImplementationWithoutTests),
      actionable_implementation_without_docs: signal(actionableImplementationWithoutDocs),
      classified_inferred_link_noise: signalWithReason(classifiedInferredNoise, classifiedInferredNoiseByReason),
      entities_without_owner: signal(entitiesWithoutOwner),
      disconnected_entities: signal(disconnected),
      tasks_without_architecture: signal(actionableTasksWithoutArchitecture),
      raw_tasks_without_architecture: signal(rawTasksWithoutArchitecture),
      implementation_without_task: signal(actionableImplementationWithoutTask),
      raw_implementation_without_task: signal(rawImplementationWithoutTask),
      classified_task_linkage_noise: signalWithReason(classifiedTaskLinkageNoise, classifiedTaskLinkageNoiseByReason),
      verified_without_proof: signal(verifiedWithoutProof),
    },
  };
}

function signal(items) {
  return {
    count: items.length,
    items: items.slice(0, 200).map((entity) => ({
      id: entity.id,
      type: entity.type,
      name: entity.name,
      path: entity.path,
      status: entity.status,
      owner: entity.owner,
    })),
  };
}

function signalWithReason(items, byReason) {
  return {
    count: items.length,
    by_reason: byReason,
    items: items.slice(0, 200).map(({ entity, reason }) => ({
      id: entity.id,
      type: entity.type,
      name: entity.name,
      path: entity.path,
      status: entity.status,
      owner: entity.owner,
      reason,
    })),
  };
}

function mermaidFor(graph) {
  const safe = (value) => value.replace(/[^A-Za-z0-9_]/g, "_");
  const selectedRelations = graph.relations
    .filter((relation) => ["owns", "implements", "tests", "uses", "documents"].includes(relation.type))
    .slice(0, 220);
  const entityById = new Map(graph.entities.map((entity) => [entity.id, entity]));
  const lines = ["flowchart TD"];
  for (const relation of selectedRelations) {
    const from = entityById.get(relation.from);
    const to = entityById.get(relation.to);
    if (!from || !to) continue;
    lines.push(`  ${safe(from.id)}["${from.type}: ${from.name.replaceAll('"', "'")}"] -->|${relation.type}| ${safe(to.id)}["${to.type}: ${to.name.replaceAll('"', "'")}"]`);
  }
  return `${lines.join("\n")}\n`;
}

function markdownGraphFor(graph) {
  return [
    "# Architecture Graph",
    "",
    `Generated: ${graph.generated_at}`,
    "",
    "## Canonical Exports",
    "",
    "- `architecture-awareness.json`",
    "- `architecture-awareness.csv`",
    "- `architecture-graph.mmd`",
    "- `../status/architecture-awareness-report.md`",
    "",
    "## Entity Index",
    "",
    "| Type | Status | Name | Path | Owner |",
    "| --- | --- | --- | --- | --- |",
    ...graph.entities.slice(0, 500).map((entity) =>
      `| ${entity.type} | ${entity.status} | ${entity.name.replaceAll("|", "\\|")} | ${entity.path.replaceAll("|", "\\|")} | ${entity.owner.replaceAll("|", "\\|")} |`
    ),
    "",
    "## Relation Index",
    "",
    "| Type | From | To | Evidence |",
    "| --- | --- | --- | --- |",
    ...graph.relations.slice(0, 700).map((relation) =>
      `| ${relation.type} | ${relation.from} | ${relation.to} | ${relation.evidence.replaceAll("|", "\\|")} |`
    ),
  ].join("\n");
}

function dependencyReportFor(graph) {
  const entityById = new Map(graph.entities.map((entity) => [entity.id, entity]));
  const dependencyRelations = graph.relations.filter((relation) => relation.type === "uses" || relation.type === "depends_on");
  return [
    "# Dependency Report",
    "",
    `Generated: ${graph.generated_at}`,
    "",
    "## Summary",
    "",
    `- Dependency relations: ${dependencyRelations.length}`,
    `- Entities with dependencies: ${new Set(dependencyRelations.map((relation) => relation.from)).size}`,
    "",
    "## Dependency Edges",
    "",
    "| From | Relation | To | Evidence |",
    "| --- | --- | --- | --- |",
    ...dependencyRelations.slice(0, 800).map((relation) => {
      const from = entityById.get(relation.from);
      const to = entityById.get(relation.to);
      return `| ${from?.name ?? relation.from} | ${relation.type} | ${to?.name ?? relation.to} | ${relation.evidence.replaceAll("|", "\\|")} |`;
    }),
  ].join("\n");
}

function ownershipReportFor(graph) {
  const owners = groupBy(graph.entities, (entity) => entity.owner || "Unassigned");
  return [
    "# Ownership Report",
    "",
    `Generated: ${graph.generated_at}`,
    "",
    "| Owner | Entities | Planned | In Progress | Implemented | Tested | Verified | Blocked | Deprecated |",
    "| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |",
    ...Object.entries(owners).sort().map(([owner, items]) => {
      const byStatus = groupBy(items, (entity) => entity.status);
      const count = (status) => byStatus[status]?.length ?? 0;
      return `| ${owner.replaceAll("|", "\\|")} | ${items.length} | ${count("planned")} | ${count("in_progress")} | ${count("implemented")} | ${count("tested")} | ${count("verified")} | ${count("blocked")} | ${count("deprecated")} |`;
    }),
  ].join("\n");
}

function taskSynchronizationReportFor(graph) {
  const health = healthFor(graph);
  const rawTasksWithoutArchitecture = health.signals.raw_tasks_without_architecture;
  const rawImplementationWithoutTask = health.signals.raw_implementation_without_task;
  const actionableTasksWithoutArchitecture = health.signals.tasks_without_architecture;
  const actionableImplementationWithoutTask = health.signals.implementation_without_task;
  const classifiedTaskLinkageNoise = health.signals.classified_task_linkage_noise;
  return [
    "# Task Synchronization Report",
    "",
    `Generated: ${graph.generated_at}`,
    "",
    "## Contract",
    "",
    "Every task should identify the feature/module it changes, dependency expectations, affected files, test requirements, docs requirements, and proof links.",
    "",
    "## Signals",
    "",
    `- Actionable tasks without architecture links: ${actionableTasksWithoutArchitecture.count}`,
    `- Raw tasks without architecture links: ${rawTasksWithoutArchitecture.count}`,
    `- Actionable implementation entities without task links: ${actionableImplementationWithoutTask.count}`,
    `- Raw implementation entities without task links: ${rawImplementationWithoutTask.count}`,
    `- Classified task-linkage noise: ${classifiedTaskLinkageNoise.count}`,
    `- Verified entities without proof evidence: ${health.signals.verified_without_proof.count}`,
    "",
    "## Classified Task-Linkage Noise",
    "",
    ...Object.entries(classifiedTaskLinkageNoise.by_reason)
      .sort(([left], [right]) => left.localeCompare(right))
      .map(([reason, count]) => `- ${reason}: ${count}`),
    "",
    "## Actionable Tasks Without Architecture Links",
    "",
    ...actionableTasksWithoutArchitecture.items.slice(0, 80).map((entity) => `- ${entity.name} (${entity.path})`),
    "",
    "## Actionable Implementation Without Task Links",
    "",
    ...actionableImplementationWithoutTask.items.slice(0, 80).map((entity) => `- ${entity.type}: ${entity.name} (${entity.path})`),
    "",
    "## Raw Task-Linkage Samples",
    "",
    "### Raw Tasks Without Architecture Links",
    "",
    ...rawTasksWithoutArchitecture.items.slice(0, 40).map((entity) => `- ${entity.name} (${entity.path})`),
    "",
    "### Raw Implementation Without Task Links",
    "",
    ...rawImplementationWithoutTask.items.slice(0, 40).map((entity) => `- ${entity.type}: ${entity.name} (${entity.path})`),
  ].join("\n");
}

progress("export_start", {
  entities: graph.entities.length,
  relations: graph.relations.length,
});
enforceTimeBudget("export_start", { entities: graph.entities.length, relations: graph.relations.length });
await fs.mkdir(graphsDir, { recursive: true });
await fs.mkdir(statusDir, { recursive: true });

await writeGeneratedFile("architecture-awareness.json", path.join(graphsDir, "architecture-awareness.json"), `${JSON.stringify(graph, null, 2)}\n`);
await writeGeneratedFile("architecture-awareness.csv", path.join(graphsDir, "architecture-awareness.csv"), [
  ["id", "type", "name", "path", "description", "status", "owner", "dependencies", "related_entities", "evidence", "updated_at"].map(csvEscape).join(","),
  ...graph.entities.map((entity) => [
    entity.id,
    entity.type,
    entity.name,
    entity.path,
    entity.description,
    entity.status,
    entity.owner,
    entity.dependencies,
    entity.related_entities,
    entity.evidence,
    entity.updated_at,
  ].map(csvEscape).join(",")),
].join("\n") + "\n");
await writeGeneratedFile("architecture-proof-register.csv", path.join(graphsDir, "architecture-proof-register.csv"), [
  ["entity_id", "type", "status", "name", "path", "owner", "proof"].map(csvEscape).join(","),
  ...graph.entities.flatMap((entity) =>
    (entity.evidence?.length ? entity.evidence : [""]).map((proof) => [
      entity.id,
      entity.type,
      entity.status,
      entity.name,
      entity.path,
      entity.owner,
      proof,
    ].map(csvEscape).join(","))
  ),
].join("\n") + "\n");
await writeGeneratedFile("architecture-graph.mmd", path.join(graphsDir, "architecture-graph.mmd"), mermaidFor(graph));
await writeGeneratedFile("architecture-graph.md", path.join(graphsDir, "architecture-graph.md"), markdownGraphFor(graph));
await writeGeneratedFile("architecture-health.json", path.join(graphsDir, "architecture-health.json"), `${JSON.stringify(healthFor(graph), null, 2)}\n`);
await writeGeneratedFile("architecture-awareness-report.md", path.join(statusDir, "architecture-awareness-report.md"), reportFor(graph));
await writeGeneratedFile("architecture-dependency-report.md", path.join(statusDir, "architecture-dependency-report.md"), dependencyReportFor(graph));
await writeGeneratedFile("architecture-ownership-report.md", path.join(statusDir, "architecture-ownership-report.md"), ownershipReportFor(graph));
await writeGeneratedFile("task-synchronization-report.md", path.join(statusDir, "task-synchronization-report.md"), taskSynchronizationReportFor(graph));

const completion = JSON.stringify({
  completed: true,
  project: projectName,
  root: toPosix(repoRoot),
  output: toPosix(outputRoot),
  generatedAt: graph.generated_at,
  elapsedMs: Date.now() - startedAtMs,
  entities: graph.entities.length,
  relations: graph.relations.length,
  files: files.length,
  overrides: graph.overrides,
  exports: [
    toPosix(path.join(graphsDir, "architecture-awareness.json")),
    toPosix(path.join(graphsDir, "architecture-awareness.csv")),
    toPosix(path.join(graphsDir, "architecture-proof-register.csv")),
    toPosix(path.join(graphsDir, "architecture-graph.md")),
    toPosix(path.join(graphsDir, "architecture-graph.mmd")),
    toPosix(path.join(graphsDir, "architecture-health.json")),
    toPosix(path.join(statusDir, "architecture-awareness-report.md")),
    toPosix(path.join(statusDir, "architecture-dependency-report.md")),
    toPosix(path.join(statusDir, "architecture-ownership-report.md")),
    toPosix(path.join(statusDir, "task-synchronization-report.md")),
  ],
}, null, 2);

progress("complete", {
  entities: graph.entities.length,
  relations: graph.relations.length,
});

await new Promise((resolve) => {
  process.stdout.write(`${completion}\n`, resolve);
});
process.exit(0);
