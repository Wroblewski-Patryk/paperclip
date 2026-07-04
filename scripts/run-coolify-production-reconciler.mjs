import { mkdir, writeFile } from "node:fs/promises";
import { spawnSync } from "node:child_process";

const coolifyEnvKeys = [
  "COOLIFY_BASE_URL",
  "COOLIFY_API_TOKEN",
  "COOLIFY_TOKEN",
  "COOLIFY_TEAM_ID",
  "COOLIFY_SOAR_TEAM_ID",
  "COOLIFY_SOAR_PROJECT_ID",
  "COOLIFY_SOAR_PRODUCTION_ENVIRONMENT",
  "COOLIFY_SOAR_APP_ID",
  "COOLIFY_SOAR_API_APP_ID",
  "COOLIFY_SOAR_WEB_APP_ID",
  "COOLIFY_SOAR_POSTGRES_RESOURCE_ID",
  "COOLIFY_SOAR_REDIS_RESOURCE_ID",
];

const compatibilityEnvAliases = {
  COOLIFY_API_TOKEN: ["COOLIFY_READ_API_TOKEN"],
  COOLIFY_TOKEN: ["COOLIFY_READ_API_TOKEN"],
  COOLIFY_TEAM_ID: ["COOLIFY_TEAM_ID_LUCKYSPARROW"],
  COOLIFY_SOAR_TEAM_ID: ["COOLIFY_TEAM_ID_LUCKYSPARROW"],
  COOLIFY_SOAR_PROJECT_ID: ["COOLIFY_PROJECT_ID_SOAR", "COOLIFY_PROJECT_UUID_SOAR"],
  COOLIFY_SOAR_PRODUCTION_ENVIRONMENT: ["COOLIFY_ENVIRONMENT_UUID_SOAR_PRODUCTION"],
  COOLIFY_SOAR_APP_ID: ["COOLIFY_RESOURCE_UUID_SOAR_WEB"],
  COOLIFY_SOAR_WEB_APP_ID: ["COOLIFY_RESOURCE_UUID_SOAR_WEB"],
  COOLIFY_SOAR_API_APP_ID: ["COOLIFY_RESOURCE_UUID_SOAR_API"],
  COOLIFY_SOAR_POSTGRES_RESOURCE_ID: ["COOLIFY_DATABASE_UUID_SOAR_POSTGRESQL"],
  COOLIFY_SOAR_REDIS_RESOURCE_ID: ["COOLIFY_DATABASE_UUID_SOAR_REDIS"],
};

function applyCoolifyEnvCompatibilityAliases() {
  for (const [targetKey, sourceKeys] of Object.entries(compatibilityEnvAliases)) {
    if (process.env[targetKey]) continue;
    const sourceKey = sourceKeys.find((key) => process.env[key]);
    if (sourceKey) process.env[targetKey] = process.env[sourceKey];
  }
}

function hasMinimumCoolifyEnv() {
  return Boolean(
    process.env.COOLIFY_BASE_URL
    && (process.env.COOLIFY_API_TOKEN || process.env.COOLIFY_TOKEN)
    && process.env.COOLIFY_SOAR_PROJECT_ID,
  );
}

function resolvePaperclipCoolifyEnvFallback() {
  if (hasMinimumCoolifyEnv() || process.env.PAPERCLIP_RESOLVE_LOCAL_SECRETS === "0") {
    return { attempted: false, loadedKeys: [] };
  }

  const resolverSource = String.raw`
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { createDb, agents, companies, routines } from "@paperclipai/db";
import { eq } from "drizzle-orm";
import { secretService } from "./src/services/secrets.ts";

function readConfig() {
  const path = resolve("../.paperclip/config.json");
  return JSON.parse(readFileSync(path, "utf8"));
}

const config = readConfig();
const port = config.database?.embeddedPostgresPort ?? 54345;
if (!process.env.PAPERCLIP_SECRETS_MASTER_KEY_FILE && config.secrets?.localEncrypted?.keyFilePath) {
  process.env.PAPERCLIP_SECRETS_MASTER_KEY_FILE = config.secrets.localEncrypted.keyFilePath;
}

const companyAliases = ["LuckySparrow", "LuckySparrow Software House"];
const dbUrl = process.env.DATABASE_URL ?? "postgres://paperclip:paperclip@127.0.0.1:" + port + "/paperclip";
const db = createDb(dbUrl);
const svc = secretService(db);
const companyRows = await db.select().from(companies);
const company = companyRows.find((row) => companyAliases.includes(row.name)) ?? companyRows.find((row) => /^LuckySparrow\b/i.test(row.name));
if (!company) throw new Error("LuckySparrow company not found");

const routineRows = await db.select().from(routines).where(eq(routines.companyId, company.id));
const routine = routineRows.find((row) => row.title === "[Soar] Coolify production deploy health sweep")
  ?? routineRows.find((row) => /coolify|production deploy|deploy health/i.test(row.title ?? ""));
let resolved = null;
if (routine?.env) {
  const result = await svc.resolveEnvBindings(company.id, routine.env, {
    consumerType: "routine",
    consumerId: routine.id,
    actorType: "system",
    actorId: "coolify-reconciler-env-loader",
  });
  resolved = result.env;
}

if (!resolved || !resolved.COOLIFY_BASE_URL) {
  const agentRows = await db.select().from(agents).where(eq(agents.companyId, company.id));
  const dre = agentRows.find((row) => row.name === "09 DRE (Deployment & Reliability Engineer)");
  if (!dre) throw new Error("DRE agent not found");
  const result = await svc.resolveEnvBindings(company.id, dre.adapterConfig?.env ?? {}, {
    consumerType: "agent",
    consumerId: dre.id,
    actorType: "system",
    actorId: "coolify-reconciler-env-loader",
  });
  resolved = result.env;
}

const keys = ${JSON.stringify(coolifyEnvKeys)};
const output = Object.fromEntries(keys.filter((key) => resolved?.[key]).map((key) => [key, resolved[key]]));
console.log("__PAPERCLIP_ENV_JSON__" + JSON.stringify(output));
process.exit(0);
`;

  const pnpmEntrypoint = process.env.npm_execpath;
  const command = pnpmEntrypoint ? process.execPath : "pnpm";
  const args = [
    ...(pnpmEntrypoint ? [pnpmEntrypoint] : []),
    "--filter",
    "@paperclipai/server",
    "exec",
    "tsx",
    "-",
  ];
  const result = spawnSync(command, args, {
    cwd: "server",
    input: resolverSource,
    encoding: "utf8",
    env: { ...process.env },
    shell: process.platform === "win32" && !pnpmEntrypoint,
    windowsHide: true,
    maxBuffer: 4 * 1024 * 1024,
  });
  if (result.status !== 0) {
    return {
      attempted: true,
      loadedKeys: [],
      error: result.error ? "paperclip_secret_resolution_spawn_failed" : "paperclip_secret_resolution_failed",
    };
  }
  const markerLine = result.stdout
    .split(/\r?\n/)
    .find((line) => line.startsWith("__PAPERCLIP_ENV_JSON__"));
  if (!markerLine) {
    return {
      attempted: true,
      loadedKeys: [],
      error: "paperclip_secret_resolution_missing_output",
    };
  }
  const loaded = JSON.parse(markerLine.slice("__PAPERCLIP_ENV_JSON__".length));
  for (const [key, value] of Object.entries(loaded)) {
    if (coolifyEnvKeys.includes(key) && typeof value === "string") {
      process.env[key] = value;
    }
  }
  applyCoolifyEnvCompatibilityAliases();
  return { attempted: true, loadedKeys: Object.keys(loaded).sort() };
}

applyCoolifyEnvCompatibilityAliases();
const secretEnvFallback = resolvePaperclipCoolifyEnvFallback();
const baseUrl = process.env.COOLIFY_BASE_URL;
const token = process.env.COOLIFY_API_TOKEN ?? process.env.COOLIFY_TOKEN;
const projectId = process.env.COOLIFY_SOAR_PROJECT_ID;
const teamId = process.env.COOLIFY_SOAR_TEAM_ID ?? process.env.COOLIFY_TEAM_ID;
const productionEnvironment = process.env.COOLIFY_SOAR_PRODUCTION_ENVIRONMENT ?? "production";
const expectedResourceCount = Number(process.env.COOLIFY_SOAR_EXPECTED_RESOURCE_COUNT ?? 8);
const knownResourceKeys = [
  "COOLIFY_SOAR_APP_ID",
  "COOLIFY_SOAR_API_APP_ID",
  "COOLIFY_SOAR_WEB_APP_ID",
  "COOLIFY_SOAR_POSTGRES_RESOURCE_ID",
  "COOLIFY_SOAR_REDIS_RESOURCE_ID",
];
const directResourceRoutes = [
  ["COOLIFY_SOAR_APP_ID", "application", "/api/v1/applications"],
  ["COOLIFY_SOAR_API_APP_ID", "application", "/api/v1/applications"],
  ["COOLIFY_SOAR_WEB_APP_ID", "application", "/api/v1/applications"],
  ["COOLIFY_SOAR_POSTGRES_RESOURCE_ID", "database", "/api/v1/databases"],
  ["COOLIFY_SOAR_REDIS_RESOURCE_ID", "database", "/api/v1/databases"],
]
  .map(([key, kind, route]) => ({
    key,
    kind,
    route: process.env[key] ? `${route}/${encodeURIComponent(process.env[key])}` : null,
  }))
  .filter((item) => item.route);

async function coolifyGet(route) {
  if (!baseUrl || !token) return { route, ok: false, skipped: "missing_coolify_base_url_or_token" };
  try {
    const response = await fetch(`${baseUrl.replace(/\/$/, "")}${route}`, {
      headers: {
        authorization: `Bearer ${token}`,
        accept: "application/json",
      },
    });
    const text = await response.text();
    let data = null;
    try { data = text ? JSON.parse(text) : null; } catch { data = text.slice(0, 500); }
    return { route, ok: response.ok, status: response.status, data };
  } catch (error) {
    return { route, ok: false, error: error instanceof Error ? error.message : String(error) };
  }
}

function responseItems(raw) {
  const data = raw?.data;
  return Array.isArray(data) ? data
    : Array.isArray(data?.data) ? data.data
      : Array.isArray(data?.resources) ? data.resources
        : data ? [data] : [];
}

function environmentIds(projectResponse) {
  const environments = responseItems(projectResponse).flatMap((item) => (
    Array.isArray(item.environments) ? item.environments : []
  ));
  const matchingEnvironments = environments.filter((environment) => {
    const name = String(environment.name ?? "");
    const uuid = String(environment.uuid ?? "");
    return name === productionEnvironment || uuid === productionEnvironment
      || (/^prod/i.test(productionEnvironment) && /prod/i.test(name))
      || environments.length === 1;
  });
  return new Set(matchingEnvironments.map((environment) => String(environment.id ?? environment.uuid ?? "")).filter(Boolean));
}

function itemEnvironmentId(item) {
  return String(item.environment_id ?? item.environmentId ?? item.environment?.id ?? item.environment_uuid ?? item.environment?.uuid ?? "");
}

function summarizeResources(raw, envIds, fallbackType) {
  return responseItems(raw).filter((item) => envIds.size === 0 || envIds.has(itemEnvironmentId(item))).map((item) => ({
    id: item.id ?? item.uuid ?? item.resource_id ?? null,
    name: item.name ?? item.fqdn ?? item.type ?? null,
    type: item.type ?? item.resource_type ?? item.kind ?? item.database_type ?? item.service_type ?? item.build_pack ?? fallbackType,
    kind: fallbackType,
    status: item.status ?? item.state ?? item.applicationStatus ?? item.server_status ?? null,
    serverStatus: item.server_status ?? null,
    hasGitBranch: Boolean(item.git_branch),
    hasGitCommitSha: Boolean(item.git_commit_sha),
  })).filter((item) => item.id || item.name || item.type || item.status);
}

function summarizeDirectResource(raw, fallbackType, key) {
  return responseItems(raw).map((item) => ({
    id: item.id ?? item.uuid ?? item.resource_id ?? process.env[key] ?? null,
    name: item.name ?? item.fqdn ?? item.type ?? key ?? null,
    type: item.type ?? item.resource_type ?? item.kind ?? item.database_type ?? item.service_type ?? item.build_pack ?? fallbackType,
    kind: fallbackType,
    status: item.status ?? item.state ?? item.applicationStatus ?? item.server_status ?? null,
    serverStatus: item.server_status ?? null,
    hasGitBranch: Boolean(item.git_branch),
    hasGitCommitSha: Boolean(item.git_commit_sha),
    source: key,
  })).filter((item) => item.id || item.name || item.type || item.status);
}

function uniqueResources(resources) {
  const seen = new Set();
  const unique = [];
  for (const resource of resources) {
    const identity = String(resource.id ?? resource.name ?? `${resource.kind}:${resource.type}`);
    if (seen.has(identity)) continue;
    seen.add(identity);
    unique.push(resource);
  }
  return unique;
}

const configuredResourceIds = Object.fromEntries(
  knownResourceKeys.map((key) => [key, process.env[key] ? "configured" : "missing"]),
);
const routes = projectId ? [
  ...(teamId ? [`/api/v1/teams/${teamId}`] : []),
  `/api/v1/projects/${projectId}`,
  `/api/v1/projects/${projectId}/${encodeURIComponent(productionEnvironment)}`,
  "/api/v1/applications",
  "/api/v1/services",
  "/api/v1/databases",
  ...directResourceRoutes.map((item) => item.route),
] : [];
const responses = [];
for (const route of routes) responses.push(await coolifyGet(route));

const projectResponse = responses.find((response) => response.route === `/api/v1/projects/${projectId}`);
const envIds = environmentIds(projectResponse);
const resources = uniqueResources([
  ...summarizeResources(responses.find((response) => response.route === "/api/v1/applications"), envIds, "application"),
  ...summarizeResources(responses.find((response) => response.route === "/api/v1/services"), envIds, "service"),
  ...summarizeResources(responses.find((response) => response.route === "/api/v1/databases"), envIds, "database"),
  ...directResourceRoutes.flatMap((item) =>
    summarizeDirectResource(responses.find((response) => response.route === item.route), item.kind, item.key)
  ),
]);
const projectTeamVisible = Boolean(responseItems(projectResponse).some((item) => item.team_id));
const checks = [
  {
    id: "coolify_credentials_available",
    status: baseUrl && token ? "pass" : "missing",
    reason: baseUrl && token ? "Coolify base URL and API token are available in process env." : "COOLIFY_BASE_URL and/or COOLIFY_API_TOKEN are not available to this process.",
  },
  {
    id: "coolify_project_id_available",
    status: projectId ? "pass" : "missing",
    reason: projectId ? "COOLIFY_SOAR_PROJECT_ID is configured." : "COOLIFY_SOAR_PROJECT_ID is missing.",
  },
  {
    id: "coolify_team_context",
    status: teamId || projectTeamVisible ? "pass" : baseUrl && token ? "partial" : "missing",
    reason: teamId
      ? "Coolify team/workspace id is configured."
      : projectTeamVisible
        ? "Coolify team/workspace id is visible through project metadata."
        : baseUrl && token
        ? "Coolify credentials exist, but COOLIFY_SOAR_TEAM_ID/COOLIFY_TEAM_ID is missing; verify team/workspace before trusting project/resource results."
        : "Coolify team/workspace cannot be checked without credentials.",
  },
  {
    id: "coolify_resource_inventory",
    status: resources.length >= expectedResourceCount ? "pass" : resources.length > 0 ? "partial" : "missing",
    reason: resources.length >= expectedResourceCount
      ? `At least ${expectedResourceCount} resources were discovered for Soar production.`
      : resources.length > 0
        ? `Some resources were discovered, but fewer than expected ${expectedResourceCount} resources (default: 6 apps/services + Postgres + Redis).`
        : "No resource inventory could be read.",
  },
];

const output = {
  generatedAt: new Date().toISOString(),
  baseUrlConfigured: Boolean(baseUrl),
  tokenConfigured: Boolean(token),
  projectIdConfigured: Boolean(projectId),
  teamIdConfigured: Boolean(teamId),
  productionEnvironment,
  expectedResourceCount,
  configuredResourceIds,
  secretEnvFallback: {
    attempted: secretEnvFallback.attempted,
    loadedKeys: secretEnvFallback.loadedKeys,
    error: secretEnvFallback.error ?? null,
  },
  responseSummaries: responses.map((response) => ({
    route: response.route,
    ok: response.ok,
    status: response.status ?? null,
    skipped: response.skipped ?? null,
    error: response.error ?? null,
  })),
  resourceCount: resources.length,
  resources,
  checks,
  overall: checks.some((check) => check.status === "missing")
    ? "not_ready"
    : checks.some((check) => check.status === "partial")
      ? "partial"
      : "ready",
};

await mkdir("report", { recursive: true });
await writeFile("report/coolify-production-reconciler.latest.json", `${JSON.stringify(output, null, 2)}\n`);
await writeFile("report/coolify-production-reconciler.latest.md", [
  "# Coolify Production Reconciler",
  "",
  `Generated at: ${output.generatedAt}`,
  "",
  `Overall: ${output.overall}`,
  "",
  `Resource count: ${output.resourceCount}`,
  "",
  `Expected resource count: ${output.expectedResourceCount}`,
  "",
  "Checks:",
  ...checks.map((check) => `- ${check.id}: ${check.status} - ${check.reason}`),
  "",
].join("\n"));
console.log(JSON.stringify(output, null, 2));
