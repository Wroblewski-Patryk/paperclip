import { normalizeKey, secretForKey } from "./lib/secret-aliases.mjs";
import { softwarehouseGateSpecs } from "./lib/softwarehouse-gates.mjs";

const apiBase = process.env.PAPERCLIP_API_URL ?? "http://127.0.0.1:3200";
const companyName = "LuckySparrow Software House";
const companyNameAliases = [companyName, "LuckySparrow"];
const companyId = process.env.PAPERCLIP_COMPANY_ID ?? null;
const apply = process.argv.includes("--apply");
const requestTimeoutMs = Number(process.env.RUNTIME_GATE_BINDING_REPAIR_REQUEST_TIMEOUT_MS ?? 15_000);
const gateArg = argValue("--gate");
const maxGates = Number.parseInt(argValue("--max-gates") ?? "1", 10);

const gateBindingPlans = {
  "LUC-30": {
    agentNames: [
      "11 IPM (Innovation Portfolio Manager)",
      "09 DRE (Deployment & Reliability Engineer)",
      "10 SPA (Security & Privacy Auditor)",
      "11 SPM (Soar Product Manager)",
      "11 RPM (Roost Project Manager)",
      "09 CTO (Chief Technology Officer)",
    ],
    env: {
      COOLIFY_BASE_URL: "coolify_base_url",
      COOLIFY_API_TOKEN: "coolify_api_token",
      COOLIFY_TOKEN: "coolify_api_token",
      COOLIFY_SOAR_PROJECT_ID: "coolify_soar_project_id",
      COOLIFY_SOAR_PROJECT_UUID: "coolify_soar_project_uuid",
      COOLIFY_TEAM_ID: "coolify_team_id",
      COOLIFY_SOAR_TEAM_ID: "coolify_soar_team_id",
      COOLIFY_SOAR_PRODUCTION_ENVIRONMENT: "coolify_soar_production_environment",
      COOLIFY_SOAR_APP_ID: "coolify_soar_app_id",
      COOLIFY_SOAR_API_APP_ID: "coolify_soar_api_app_id",
      COOLIFY_SOAR_WEB_APP_ID: "coolify_soar_web_app_id",
      COOLIFY_SOAR_WORKER_BACKTEST_APP_ID: "coolify_soar_worker_backtest_app_id",
      COOLIFY_SOAR_WORKER_EXECUTION_APP_ID: "coolify_soar_worker_execution_app_id",
      COOLIFY_SOAR_WORKER_MARKET_DATA_APP_ID: "coolify_soar_worker_market_data_app_id",
      COOLIFY_SOAR_WORKER_MARKET_STREAM_APP_ID: "coolify_soar_worker_market_stream_app_id",
      COOLIFY_SOAR_POSTGRES_RESOURCE_ID: "coolify_soar_postgres_resource_id",
      COOLIFY_SOAR_REDIS_RESOURCE_ID: "coolify_soar_redis_resource_id",
      COOLIFY_ROOST_APP_ID: "coolify_roost_app_id",
    },
  },
  "LUC-31": {
    agentNames: [
      "09 DRE (Deployment & Reliability Engineer)",
      "09 QVE (QA & Verification Engineer)",
      "09 TAE (Test Automation Engineer)",
      "10 SPA (Security & Privacy Auditor)",
      "11 SPM (Soar Product Manager)",
      "11 RPM (Roost Project Manager)",
    ],
    env: {
      SOAR_PROD_TEST_BASE_URL: "soar_prod_base_url",
      SOAR_PROD_TEST_API_BASE_URL: "soar_api_base_url",
      SOAR_PROD_TEST_EMAIL: "soar_prod_test_email",
      SOAR_PROD_TEST_PASSWORD: "soar_prod_test_password",
      SOAR_PROD_ADMIN_SMOKE_EMAIL: "soar_prod_admin_smoke_email",
      SOAR_PROD_ADMIN_SMOKE_PASSWORD: "soar_prod_admin_smoke_password",
      ROOST_PROD_TEST_BASE_URL: "roost_prod_base_url",
      ROOST_PROD_TEST_API_BASE_URL: "roost_api_base_url",
      ROOST_PROD_TEST_EMAIL: "roost_prod_test_email",
      ROOST_PROD_TEST_PASSWORD: "roost_prod_test_password",
      ROOST_PROD_TEST_WORKSPACE_NAME: "roost_prod_test_workspace_name",
      SMOKE_AUTH_EMAIL: "smoke_auth_email",
      SMOKE_AUTH_PASSWORD: "smoke_auth_password",
    },
  },
  "LUC-32": {
    agentNames: [
      "00 AIA (AI Assistant)",
      "09 DRE (Deployment & Reliability Engineer)",
      "09 QVE (QA & Verification Engineer)",
      "10 SPA (Security & Privacy Auditor)",
    ],
    env: {
      COOLIFY_BASE_URL: "coolify_base_url",
      COOLIFY_API_URL: "coolify_api_url",
      COOLIFY_API_TOKEN: "coolify_api_token",
      COOLIFY_TEAM_ID: "coolify_team_id",
      COOLIFY_SOAR_PROJECT_ID: "coolify_soar_project_id",
      COOLIFY_SOAR_PROJECT_UUID: "coolify_soar_project_uuid",
      COOLIFY_SOAR_PRODUCTION_ENVIRONMENT: "coolify_soar_production_environment",
      COOLIFY_SOAR_WEB_APP_ID: "coolify_soar_web_app_id",
      COOLIFY_SOAR_API_APP_ID: "coolify_soar_api_app_id",
      COOLIFY_ROOST_APP_ID: "coolify_roost_app_id",
      SOAR_PROD_TEST_BASE_URL: "soar_prod_base_url",
      SOAR_PROD_TEST_API_BASE_URL: "soar_api_base_url",
      ROOST_PROD_TEST_BASE_URL: "roost_prod_base_url",
      ROOST_PROD_TEST_API_BASE_URL: "roost_api_base_url",
    },
  },
};

function argValue(name) {
  const exact = process.argv.indexOf(name);
  if (exact >= 0) return process.argv[exact + 1];
  const prefix = `${name}=`;
  const arg = process.argv.find((value) => value.startsWith(prefix));
  return arg ? arg.slice(prefix.length) : null;
}

async function request(method, route, body) {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), requestTimeoutMs);
  const headers = { "content-type": "application/json" };
  if (process.env.PAPERCLIP_API_KEY) headers.authorization = `Bearer ${process.env.PAPERCLIP_API_KEY}`;
  if (method !== "GET" && process.env.PAPERCLIP_RUN_ID) headers["x-paperclip-run-id"] = process.env.PAPERCLIP_RUN_ID;
  try {
    const response = await fetch(`${apiBase}${route}`, {
      method,
      headers,
      body: body === undefined ? undefined : JSON.stringify(body),
      signal: controller.signal,
    });
    const text = await response.text();
    const data = text ? JSON.parse(text) : null;
    if (!response.ok) throw new Error(`${method} ${route} failed with ${response.status}: ${text}`);
    return data;
  } catch (error) {
    if (error instanceof Error && error.name === "AbortError") {
      throw new Error(`${method} ${route} timed out after ${requestTimeoutMs}ms`, { cause: error });
    }
    throw error;
  } finally {
    clearTimeout(timeout);
  }
}

function isRequestTimeoutError(error) {
  return error instanceof Error && /timed out after \d+ms/i.test(error.message);
}

function isBoardAccessRequiredError(error) {
  return error instanceof Error
    && /failed with 403:/i.test(error.message)
    && /Board access required/i.test(error.message);
}

function envEntryMatches(entry, secret) {
  return entry?.type === "secret_ref"
    && entry.secretId === secret.id
    && (entry.version === "latest" || entry.version === undefined);
}

function envKeys(agent) {
  return new Set(Object.keys(agent?.adapterConfig?.env ?? {}));
}

function sortedUnique(values) {
  return [...new Set(values.filter(Boolean))].sort();
}

function bindingComment(rootBlocker, project, changedAgents, changedKeys) {
  return [
    `softwarehouse-runtime-gate-binding-repair:${rootBlocker}:v1`,
    "",
    `Gate freshness approved for exactly one ${project} recheck because Paperclip repaired runtime secret bindings for the responsible agent session.`,
    `Agents updated: ${changedAgents.join(", ")}.`,
    `Bound redacted env keys: ${changedKeys.join(", ")}.`,
    "No secret values were read aloud or written to the issue.",
    "Resume only the responsible gate recheck and record pass/fail evidence.",
    "This is not approval to push, deploy, restart, mutate production state, disclose secrets, or broaden scope.",
  ].join("\n");
}

async function resolveCompany() {
  if (companyId) return { id: companyId, source: "PAPERCLIP_COMPANY_ID" };

  const companies = await request("GET", "/api/companies");
  const company = companies.find((candidate) => companyNameAliases.includes(candidate.name))
    ?? companies.find((candidate) => /^LuckySparrow\b/i.test(candidate.name));
  if (!company) throw new Error(`Company not found: ${companyName}`);
  return {
    id: company.id,
    source: company.name === companyName ? "company_name" : `company_alias:${company.name}`,
  };
}

const company = await resolveCompany();

let health = null;
let liveRuns = [];
let agents = [];
let secrets = [];
try {
  [health, liveRuns, agents, secrets] = await Promise.all([
    request("GET", "/api/health"),
    request("GET", `/api/companies/${company.id}/live-runs`),
    request("GET", `/api/companies/${company.id}/agents`),
    request("GET", `/api/companies/${company.id}/secrets`),
  ]);
} catch (error) {
  if (!isRequestTimeoutError(error) && !isBoardAccessRequiredError(error)) throw error;
  const reason = isBoardAccessRequiredError(error) ? "board_access_required" : "candidate_scan_timeout";
  console.log(JSON.stringify({
    apiBase,
    company: { id: company.id, name: company.name },
    mode: apply ? "apply" : "dry-run",
    candidateScanStatus: reason,
    activeRunCount: null,
    liveRunCount: null,
    gateArg,
    maxGates,
    plannedCount: null,
    selectedCount: 0,
    skipped: [
      {
        action: "skip_runtime_gate_binding_repair",
        reason,
        ownerAction: isBoardAccessRequiredError(error)
          ? "A board-authorized actor must repair runtime gate secret bindings; do not mutate agent bindings from this actor."
          : "Retry runtime gate binding repair after the local Paperclip health/live-run/agent/secret routes are responsive; do not mutate agent bindings from incomplete scan data.",
        error: error.message,
      },
    ],
    actions: [],
    applySkipped: null,
    applied: [],
  }, null, 2));
  process.exit(0);
}

const activeRunCount = health.devServer?.activeRunCount ?? liveRuns.length;
const issueByIdentifier = new Map();
const agentById = new Map(agents.map((agent) => [agent.id, agent]));
const agentsByName = new Map(agents.map((agent) => [agent.name, agent]));
const secretByKey = new Map(secrets.map((secret) => [normalizeKey(secret.key), secret]));
const gateSpecs = gateArg
  ? softwarehouseGateSpecs.filter((spec) => spec.rootBlocker === gateArg)
  : softwarehouseGateSpecs;

const planned = [];
const skipped = [];

async function issueForIdentifier(identifier) {
  const existing = issueByIdentifier.get(identifier);
  if (existing) return existing;
  try {
    const exact = await request("GET", `/api/issues/${identifier}`);
    if (exact?.identifier) issueByIdentifier.set(exact.identifier, exact);
    return exact;
  } catch {
    return null;
  }
}

const issueLookupByIdentifier = new Map(
  gateSpecs.map((spec) => [spec.rootBlocker, issueForIdentifier(spec.rootBlocker)]),
);

for (const spec of gateSpecs) {
  const issue = await issueLookupByIdentifier.get(spec.rootBlocker);
  const plan = gateBindingPlans[spec.rootBlocker];
  if (!issue) {
    skipped.push({ rootBlocker: spec.rootBlocker, reason: "missing_issue" });
    continue;
  }
  if (!plan) {
    skipped.push({ rootBlocker: spec.rootBlocker, reason: "missing_binding_plan" });
    continue;
  }
  if (["done", "cancelled"].includes(issue.status)) {
    skipped.push({ rootBlocker: spec.rootBlocker, reason: "gate_not_open", status: issue.status });
    continue;
  }

  const targetAgentNames = sortedUnique([
    ...plan.agentNames,
    spec.owner,
    agentById.get(issue.assigneeAgentId)?.name,
  ]);
  const missingAgents = targetAgentNames.filter((name) => !agentsByName.has(name));
  const missingSecrets = [];
  const agentActions = [];

  for (const [envKey, sourceKey] of Object.entries(plan.env)) {
    const secret = secretForKey(secretByKey, sourceKey);
    if (!secret) missingSecrets.push({ envKey, sourceKey });
  }

  for (const name of targetAgentNames) {
    const agent = agentsByName.get(name);
    if (!agent) continue;
    const existingEnv = agent.adapterConfig?.env && typeof agent.adapterConfig.env === "object"
      ? agent.adapterConfig.env
      : {};
    const additions = [];
    const env = { ...existingEnv };

    for (const [envKey, sourceKey] of Object.entries(plan.env)) {
      const secret = secretForKey(secretByKey, sourceKey);
      if (!secret) continue;
      if (envEntryMatches(env[envKey], secret)) continue;
      env[envKey] = { type: "secret_ref", secretId: secret.id, version: "latest" };
      additions.push({ envKey, sourceKey: normalizeKey(secret.key) });
    }

    if (additions.length > 0) {
      agentActions.push({
        agentId: agent.id,
        agentName: agent.name,
        addedEnvKeys: additions.map((item) => item.envKey).sort(),
        sourceSecretKeys: sortedUnique(additions.map((item) => item.sourceKey)),
        beforeEnvKeyCount: envKeys(agent).size,
        afterEnvKeyCount: Object.keys(env).length,
        env,
      });
    }
  }

  if (missingAgents.length > 0 || missingSecrets.length > 0) {
    skipped.push({
      rootBlocker: spec.rootBlocker,
      reason: "missing_prerequisites",
      missingAgents,
      missingSecrets,
    });
    continue;
  }
  if (agentActions.length === 0) {
    skipped.push({
      rootBlocker: spec.rootBlocker,
      reason: "bindings_already_current",
      targetAgentNames,
    });
    continue;
  }

  planned.push({
    rootBlocker: spec.rootBlocker,
    project: spec.project,
    issueId: issue.id,
    issueTitle: issue.title,
    currentAssigneeName: agentById.get(issue.assigneeAgentId)?.name ?? null,
    targetAgentNames,
    actionCount: agentActions.length,
    changedEnvKeys: sortedUnique(agentActions.flatMap((action) => action.addedEnvKeys)),
    agentActions,
  });
}

const selected = planned.slice(0, Number.isFinite(maxGates) && maxGates > 0 ? maxGates : 1);
const notSelected = planned.slice(selected.length).map((action) => ({
  rootBlocker: action.rootBlocker,
  reason: "max_gates_per_run",
}));
const applied = [];
let applySkipped = null;

if (apply) {
  if (activeRunCount > 0) {
    applySkipped = { reason: "active_runs", activeRunCount, liveRunCount: liveRuns.length };
  } else {
    for (const action of selected) {
      const changedAgents = [];
      for (const agentAction of action.agentActions) {
        await request("PATCH", `/api/agents/${agentAction.agentId}?companyId=${company.id}`, {
          adapterConfig: { env: agentAction.env },
        });
        changedAgents.push(agentAction.agentName);
      }
      const comment = await request("POST", `/api/issues/${action.issueId}/comments`, {
        body: bindingComment(action.rootBlocker, action.project, changedAgents, action.changedEnvKeys),
      });
      applied.push({
        rootBlocker: action.rootBlocker,
        project: action.project,
        changedAgents,
        changedEnvKeys: action.changedEnvKeys,
        commentId: comment.id ?? null,
        commentCreatedAt: comment.createdAt ?? null,
      });
    }
  }
}

console.log(JSON.stringify({
  apiBase,
  company: { id: company.id, name: company.name },
  mode: apply ? "apply" : "dry-run",
  activeRunCount,
  liveRunCount: liveRuns.length,
  gateArg,
  maxGates,
  plannedCount: planned.length,
  selectedCount: selected.length,
  skipped: [...skipped, ...notSelected],
  actions: selected.map((action) => ({
    rootBlocker: action.rootBlocker,
    project: action.project,
    issueTitle: action.issueTitle,
    currentAssigneeName: action.currentAssigneeName,
    targetAgentNames: action.targetAgentNames,
    changedEnvKeys: action.changedEnvKeys,
    agentActions: action.agentActions.map((agentAction) => ({
      agentName: agentAction.agentName,
      addedEnvKeys: agentAction.addedEnvKeys,
      sourceSecretKeys: agentAction.sourceSecretKeys,
      beforeEnvKeyCount: agentAction.beforeEnvKeyCount,
      afterEnvKeyCount: agentAction.afterEnvKeyCount,
    })),
  })),
  applySkipped,
  applied,
}, null, 2));
