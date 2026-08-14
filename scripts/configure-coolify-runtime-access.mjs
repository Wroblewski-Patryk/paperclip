import { normalizeKey, secretForKey } from "./lib/secret-aliases.mjs";

const apiBase = process.env.PAPERCLIP_API_URL ?? "http://127.0.0.1:3200";
const companyNameAliases = [
  process.env.SOFTWAREHOUSE_COMPANY_NAME,
  process.env.PAPERCLIP_COMPANY_NAME,
  "LuckySparrow",
  "LuckySparrow Software House",
].filter(Boolean);
const companyId = process.env.PAPERCLIP_COMPANY_ID ?? null;
const runId = process.env.PAPERCLIP_RUN_ID?.trim() || null;
const apply = process.argv.includes("--apply");

const usage = `Usage:
  node scripts/configure-coolify-runtime-access.mjs
  node scripts/configure-coolify-runtime-access.mjs --agent <id-or-exact-name> --binding <ENV_NAME>[,<ENV_NAME>...]
  node scripts/configure-coolify-runtime-access.mjs --routine <id-or-exact-title> --binding <ENV_NAME>[,<ENV_NAME>...] [--apply]

Options:
  --agent <selector>    Select exactly one agent by id or exact name.
  --routine <selector>  Select exactly one routine by id or exact title.
  --binding <names>     Select one or more environment binding names; repeatable and comma-separated.
  --bindings <names>    Alias for --binding.
  --apply               Apply the scoped change. Requires PAPERCLIP_RUN_ID.
  --help                Print this names-only usage text.

With no selector or binding arguments, the helper retains its legacy broad dry-run audit.
Apply mode is never available for that broad audit.`;

function parseArgs(argv) {
  const parsedOptions = {
    apply: false,
    help: false,
    agentSelector: null,
    routineSelector: null,
    bindingNames: [],
    bindingOptionSeen: false,
  };

  const readValue = (arg, index) => {
    const equalsIndex = arg.indexOf("=");
    if (equalsIndex >= 0) return { value: arg.slice(equalsIndex + 1), nextIndex: index };
    if (index + 1 >= argv.length || argv[index + 1].startsWith("--")) {
      throw new Error(`${arg} requires a value`);
    }
    return { value: argv[index + 1], nextIndex: index + 1 };
  };

  for (let index = 0; index < argv.length; index += 1) {
    const arg = argv[index];
    if (arg === "--apply") {
      parsedOptions.apply = true;
      continue;
    }
    if (arg === "--help") {
      parsedOptions.help = true;
      continue;
    }
    if (arg === "--agent" || arg.startsWith("--agent=")) {
      if (parsedOptions.agentSelector !== null) throw new Error("--agent may be supplied only once");
      const parsed = readValue(arg, index);
      parsedOptions.agentSelector = parsed.value.trim();
      index = parsed.nextIndex;
      continue;
    }
    if (arg === "--routine" || arg.startsWith("--routine=")) {
      if (parsedOptions.routineSelector !== null) throw new Error("--routine may be supplied only once");
      const parsed = readValue(arg, index);
      parsedOptions.routineSelector = parsed.value.trim();
      index = parsed.nextIndex;
      continue;
    }
    if (["--binding", "--bindings"].includes(arg)
      || arg.startsWith("--binding=")
      || arg.startsWith("--bindings=")) {
      parsedOptions.bindingOptionSeen = true;
      const parsed = readValue(arg, index);
      parsedOptions.bindingNames.push(...parsed.value.split(",").map((value) => value.trim()));
      index = parsed.nextIndex;
      continue;
    }
    throw new Error(`Unknown argument: ${arg}`);
  }

  return parsedOptions;
}

const options = parseArgs(process.argv.slice(2));
const selectorCount = Number(options.agentSelector !== null) + Number(options.routineSelector !== null);
const scoped = selectorCount > 0 || options.bindingOptionSeen;

if (!options.help) {
  if (scoped && selectorCount !== 1) {
    throw new Error("Scoped mode requires exactly one of --agent or --routine");
  }
  if (scoped && (!options.bindingOptionSeen || options.bindingNames.length === 0 || options.bindingNames.some((name) => !name))) {
    throw new Error("Scoped mode requires a non-empty --binding selection");
  }
  const normalizedBindingNames = options.bindingNames.map((name) => name.toUpperCase());
  if (new Set(normalizedBindingNames).size !== normalizedBindingNames.length) {
    throw new Error("Binding selection is ambiguous because a name was selected more than once");
  }
  if (options.agentSelector === "" || options.routineSelector === "") {
    throw new Error("Target selector must not be empty");
  }
  if (apply && !scoped) {
    throw new Error("Apply mode requires exactly one target and an explicit binding selection");
  }
  if (apply && !runId) {
    throw new Error("Apply mode requires PAPERCLIP_RUN_ID for mutation auditability");
  }
}

const baseCoolifyEnv = {
  COOLIFY_BASE_URL: "coolify_base_url",
  COOLIFY_API_TOKEN: "coolify_api_token",
  COOLIFY_TOKEN: "coolify_api_token",
  COOLIFY_TEAM_ID: "coolify_team_id",
};

const soarCoolifyEnv = {
  COOLIFY_SOAR_TEAM_ID: "coolify_soar_team_id",
  COOLIFY_SOAR_PROJECT_ID: "coolify_soar_project_id",
  COOLIFY_SOAR_PROJECT_UUID: "coolify_soar_project_uuid",
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
};

const roostCoolifyEnv = {
  COOLIFY_ROOST_APP_ID: "coolify_roost_app_id",
};

const coolifyEnv = { ...baseCoolifyEnv, ...soarCoolifyEnv, ...roostCoolifyEnv };

const coolifyLoginEnv = {
  COOLIFY_LOGIN_EMAIL: "coolify_login_email",
  COOLIFY_LOGIN_PASSWORD: "coolify_login_password",
};

const soarSmokeEnv = {
  SOAR_PROD_TEST_BASE_URL: "soar_prod_base_url",
  SOAR_PROD_TEST_API_BASE_URL: "soar_api_base_url",
  SOAR_PROD_TEST_EMAIL: "soar_prod_test_email",
  SOAR_PROD_TEST_PASSWORD: "soar_prod_test_password",
  SOAR_PROD_ADMIN_SMOKE_EMAIL: "soar_prod_admin_smoke_email",
  SOAR_PROD_ADMIN_SMOKE_PASSWORD: "soar_prod_admin_smoke_password",
};

const roostSmokeEnv = {
  ROOST_API_BASE_URL: "roost_api_base_url",
  ROOST_PROD_TEST_BASE_URL: "roost_prod_base_url",
  ROOST_PROD_TEST_API_BASE_URL: "roost_api_base_url",
  ROOST_PROD_TEST_EMAIL: "roost_prod_test_email",
  ROOST_PROD_TEST_PASSWORD: "roost_prod_test_password",
  ROOST_PROD_TEST_WORKSPACE_NAME: "roost_prod_test_workspace_name",
};

const agentPlans = [
  {
    names: ["09 DRE (Deployment & Reliability Engineer)"],
    env: { ...coolifyEnv, ...coolifyLoginEnv, ...soarSmokeEnv, ...roostSmokeEnv },
  },
  {
    names: ["10 SPA (Security & Privacy Auditor)"],
    env: { ...coolifyEnv, ...coolifyLoginEnv },
  },
  {
    names: [
      "09 CTO (Chief Technology Officer)",
      "09 TSA (Technical Solution Architect)",
      "11 IPM (Innovation Portfolio Manager)",
    ],
    env: coolifyEnv,
  },
  {
    names: [
      "09 QVE (QA & Verification Engineer)",
      "09 TAE (Test Automation Engineer)",
    ],
    env: { ...coolifyEnv, ...soarSmokeEnv, ...roostSmokeEnv },
  },
  {
    names: ["11 SPM (Soar Product Manager)"],
    env: { ...baseCoolifyEnv, ...soarCoolifyEnv, ...soarSmokeEnv },
    removeEnvPrefixes: ["ROOST_", "COOLIFY_ROOST_", "FEATHERLY_", "COOLIFY_FEATHERLY_"],
  },
  {
    names: ["11 RPM (Roost Project Manager)"],
    env: { ...baseCoolifyEnv, ...roostCoolifyEnv, ...roostSmokeEnv },
    removeEnvPrefixes: ["SOAR_", "COOLIFY_SOAR_", "FEATHERLY_", "COOLIFY_FEATHERLY_"],
  },
  {
    names: ["11 FPM (Featherly Platform Manager)"],
    env: {},
    removeEnvPrefixes: ["SOAR_", "COOLIFY_SOAR_", "ROOST_", "COOLIFY_ROOST_"],
  },
];

const routinePlans = [
  {
    projectPrefix: "[Soar]",
    titleIncludes: ["Coolify", "production deploy", "deploy health", "production health", "Release and deploy governance"],
    env: { ...baseCoolifyEnv, ...soarCoolifyEnv },
    removeEnvPrefixes: ["ROOST_", "COOLIFY_ROOST_", "FEATHERLY_", "COOLIFY_FEATHERLY_"],
  },
  {
    projectPrefix: "[Roost]",
    titleIncludes: ["Coolify", "production deploy", "deploy health", "production health", "Release and deploy governance"],
    env: { ...baseCoolifyEnv, ...roostCoolifyEnv },
    removeEnvPrefixes: ["SOAR_", "COOLIFY_SOAR_", "FEATHERLY_", "COOLIFY_FEATHERLY_"],
  },
  {
    projectPrefix: "[Featherly]",
    titleIncludes: ["Coolify", "production deploy", "deploy health", "production health", "Release and deploy governance"],
    env: baseCoolifyEnv,
    removeEnvPrefixes: ["SOAR_", "COOLIFY_SOAR_", "ROOST_", "COOLIFY_ROOST_"],
  },
  {
    titleIncludes: [
      "Coolify",
      "production deploy",
      "deploy health",
      "production health",
      "Release and deploy governance",
      "Autonomy governor",
      "Gate freshness watcher",
    ],
    env: coolifyEnv,
  },
];

async function request(method, route, body) {
  const headers = { "content-type": "application/json" };
  if (process.env.PAPERCLIP_API_KEY) headers.authorization = `Bearer ${process.env.PAPERCLIP_API_KEY}`;
  if (!["GET", "HEAD", "OPTIONS"].includes(method)) {
    if (!runId) throw new Error(`${method} request refused because PAPERCLIP_RUN_ID is unavailable`);
    headers["x-paperclip-run-id"] = runId;
  }
  const response = await fetch(`${apiBase}${route}`, {
    method,
    headers,
    body: body === undefined ? undefined : JSON.stringify(body),
  });
  const text = await response.text();
  const data = text ? JSON.parse(text) : null;
  if (!response.ok) throw new Error(`${method} request failed with status ${response.status}`);
  return data;
}

async function resolveCompany() {
  if (companyId) return { id: companyId, source: "PAPERCLIP_COMPANY_ID" };
  const companies = await request("GET", "/api/companies");
  const company = companies.find((candidate) => companyNameAliases.includes(candidate.name))
    ?? companies.find((candidate) => /^LuckySparrow\b/i.test(candidate.name));
  if (!company) throw new Error(`Company not found; tried aliases: ${companyNameAliases.join(", ")}`);
  return { id: company.id, name: company.name, source: "company_alias" };
}

function envEntryMatches(entry, secret) {
  return entry?.type === "secret_ref"
    && entry.secretId === secret.id
    && (entry.version === "latest" || entry.version === undefined);
}

function buildEnvPatch(existingEnv, secretByKey, envPlan, removeEnvPrefixes = []) {
  const env = existingEnv && typeof existingEnv === "object" && !Array.isArray(existingEnv)
    ? { ...existingEnv }
    : {};
  const changed = [];
  const removed = [];
  const missingSecrets = [];

  for (const envKey of Object.keys(env)) {
    if (!removeEnvPrefixes.some((prefix) => envKey.startsWith(prefix))) continue;
    delete env[envKey];
    removed.push(envKey);
  }

  for (const [envKey, sourceKey] of Object.entries(envPlan)) {
    const secret = secretForKey(secretByKey, sourceKey);
    if (!secret) {
      missingSecrets.push({ envKey, sourceKey: normalizeKey(sourceKey) });
      continue;
    }
    if (envEntryMatches(env[envKey], secret)) continue;
    env[envKey] = { type: "secret_ref", secretId: secret.id, version: "latest" };
    changed.push({ envKey, sourceSecretKey: normalizeKey(secret.key) });
  }

  return { env, changed, removed, missingSecrets };
}

function routineMatchesPlan(routine, plan) {
  const title = String(routine.title ?? "");
  if (plan.projectPrefix && !title.startsWith(plan.projectPrefix)) return false;
  if (!plan.projectPrefix && /^\[(Soar|Roost|Featherly)\]/i.test(title)) return false;
  const haystack = title.toLowerCase();
  return plan.titleIncludes.some((needle) => haystack.includes(needle.toLowerCase()));
}

function resolveExactTarget(entries, selector, labelKey, targetType) {
  const normalizedSelector = selector.toLowerCase();
  const matches = entries.filter((entry) => entry.id === selector
    || String(entry[labelKey] ?? "").toLowerCase() === normalizedSelector);
  if (matches.length === 0) throw new Error(`No ${targetType} matched the exact selector`);
  if (matches.length > 1) throw new Error(`${targetType} selector is ambiguous`);
  return matches[0];
}

function resolveSinglePlan(target, plans, matchesPlan, targetType) {
  const matches = plans.filter((plan) => matchesPlan(target, plan));
  if (matches.length === 0) throw new Error(`Selected ${targetType} has no runtime-access binding plan`);
  if (matches.length > 1) throw new Error(`Selected ${targetType} has an ambiguous runtime-access binding plan`);
  return matches[0];
}

function selectEnvPlan(envPlan, bindingNames) {
  const entries = Object.entries(envPlan);
  const selected = {};
  for (const requestedName of bindingNames) {
    const matches = entries.filter(([envKey]) => envKey.toLowerCase() === requestedName.toLowerCase());
    if (matches.length === 0) throw new Error(`Selected binding has no configured alias: ${requestedName}`);
    if (matches.length > 1) throw new Error(`Selected binding is ambiguous: ${requestedName}`);
    const [[envKey, sourceKey]] = matches;
    selected[envKey] = sourceKey;
  }
  return selected;
}

if (options.help) {
  console.log(usage);
  process.exit(0);
}

const company = await resolveCompany();
const [secrets, agents, routines] = await Promise.all([
  request("GET", `/api/companies/${company.id}/secrets/metadata`),
  options.routineSelector === null
    ? request("GET", `/api/companies/${company.id}/agents`)
    : Promise.resolve([]),
  options.agentSelector === null
    ? request("GET", `/api/companies/${company.id}/routines`)
    : Promise.resolve([]),
]);

const secretByKey = new Map(secrets.map((secret) => [normalizeKey(secret.key), secret]));
const agentsByName = new Map(agents.map((agent) => [agent.name, agent]));
const actions = [];
const skipped = [];

const selectedAgent = options.agentSelector === null
  ? null
  : resolveExactTarget(agents, options.agentSelector, "name", "agent");
const selectedRoutine = options.routineSelector === null
  ? null
  : resolveExactTarget(routines, options.routineSelector, "title", "routine");

const effectiveAgentPlans = selectedAgent
  ? [resolveSinglePlan(
    selectedAgent,
    agentPlans,
    (agent, plan) => plan.names.includes(agent.name),
    "agent",
  )]
  : agentPlans;

for (const plan of effectiveAgentPlans) {
  const names = selectedAgent ? [selectedAgent.name] : plan.names;
  for (const name of names) {
    const agent = selectedAgent ?? agentsByName.get(name);
    if (!agent || agent.status === "terminated") {
      skipped.push({ targetType: "agent", name, reason: "missing_or_terminated" });
      continue;
    }
    const adapterConfig = agent.adapterConfig && typeof agent.adapterConfig === "object"
      ? agent.adapterConfig
      : {};
    const envPlan = selectedAgent ? selectEnvPlan(plan.env, options.bindingNames) : plan.env;
    const patch = buildEnvPatch(
      adapterConfig.env,
      secretByKey,
      envPlan,
      selectedAgent ? [] : plan.removeEnvPrefixes,
    );
    if (selectedAgent && patch.missingSecrets.length > 0) {
      const missingNames = patch.missingSecrets.map((entry) => entry.envKey).sort().join(", ");
      throw new Error(`Selected binding aliases are missing from secret metadata: ${missingNames}`);
    }
    if (patch.missingSecrets.length > 0 && patch.removed.length === 0) {
      skipped.push({ targetType: "agent", name, reason: "missing_secrets", missingSecrets: patch.missingSecrets });
      continue;
    }
    if (patch.changed.length === 0 && patch.removed.length === 0) {
      skipped.push({ targetType: "agent", name, reason: "already_current" });
      continue;
    }
    actions.push({
      targetType: "agent",
      id: agent.id,
      name,
      changedEnvKeys: patch.changed.map((item) => item.envKey).sort(),
      removedEnvKeys: patch.removed.sort(),
      sourceSecretKeys: [...new Set(patch.changed.map((item) => item.sourceSecretKey))].sort(),
      missingSecrets: patch.missingSecrets,
      payload: { adapterConfig: { ...adapterConfig, env: patch.env } },
    });
  }
}

const routineCandidates = selectedRoutine ? [selectedRoutine] : routines.filter((entry) => entry.status !== "paused");
for (const routine of routineCandidates) {
  const effectiveRoutinePlans = selectedRoutine
    ? [resolveSinglePlan(selectedRoutine, routinePlans, routineMatchesPlan, "routine")]
    : routinePlans;
  for (const plan of effectiveRoutinePlans) {
    if (!routineMatchesPlan(routine, plan)) continue;
    const detail = await request("GET", `/api/routines/${routine.id}`);
    const envPlan = selectedRoutine ? selectEnvPlan(plan.env, options.bindingNames) : plan.env;
    const patch = buildEnvPatch(
      detail.env,
      secretByKey,
      envPlan,
      selectedRoutine ? [] : plan.removeEnvPrefixes,
    );
    if (patch.missingSecrets.length > 0) {
      if (selectedRoutine) {
        const missingNames = patch.missingSecrets.map((entry) => entry.envKey).sort().join(", ");
        throw new Error(`Selected binding aliases are missing from secret metadata: ${missingNames}`);
      }
      skipped.push({ targetType: "routine", title: routine.title, reason: "missing_secrets", missingSecrets: patch.missingSecrets });
      continue;
    }
    if (patch.changed.length === 0 && patch.removed.length === 0) {
      skipped.push({ targetType: "routine", title: routine.title, reason: "already_current" });
      continue;
    }
    actions.push({
      targetType: "routine",
      id: routine.id,
      title: routine.title,
      changedEnvKeys: patch.changed.map((item) => item.envKey).sort(),
      removedEnvKeys: patch.removed.sort(),
      sourceSecretKeys: [...new Set(patch.changed.map((item) => item.sourceSecretKey))].sort(),
      payload: { env: patch.env },
    });
    break;
  }
}

const applied = [];
if (apply) {
  for (const action of actions) {
    if (action.targetType === "agent") {
      await request("PATCH", `/api/agents/${action.id}?companyId=${company.id}`, action.payload);
      applied.push({
        targetType: action.targetType,
        name: action.name,
        changedEnvKeys: action.changedEnvKeys,
        removedEnvKeys: action.removedEnvKeys ?? [],
      });
    } else {
      await request("PATCH", `/api/routines/${action.id}`, action.payload);
      applied.push({
        targetType: action.targetType,
        title: action.title,
        changedEnvKeys: action.changedEnvKeys,
      });
    }
  }
}

console.log(JSON.stringify({
  companyName: company.name ?? null,
  mode: apply ? "apply" : "dry-run",
  scope: scoped ? "explicit-target" : "legacy-broad-audit",
  actionCount: actions.length,
  appliedCount: applied.length,
  actions: actions.map((action) => ({
    targetType: action.targetType,
    name: action.name ?? action.title,
    changedEnvKeys: action.changedEnvKeys,
    removedEnvKeys: action.removedEnvKeys ?? [],
    sourceSecretKeys: action.sourceSecretKeys,
    missingSecrets: action.missingSecrets ?? [],
  })),
  skipped,
  applied,
}, null, 2));
