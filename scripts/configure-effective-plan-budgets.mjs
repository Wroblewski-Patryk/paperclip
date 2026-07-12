const baseUrl = process.env.PAPERCLIP_API_URL ?? "http://127.0.0.1:3200";
const companyId = process.env.PAPERCLIP_COMPANY_ID ?? "ae26bb8b-8f5f-4a85-b341-78d4e1985975";
const planBudgetCents = Number(process.env.PAPERCLIP_CODEX_LOCAL_SUBSCRIPTION_BUDGET_CENTS ?? 20_000);
const agentBuffer = Number(process.env.PAPERCLIP_EFFECTIVE_PLAN_AGENT_BUFFER ?? 1.2);
const minAgentBudgetCents = Number(process.env.PAPERCLIP_EFFECTIVE_PLAN_MIN_AGENT_BUDGET_CENTS ?? 500);
const maxAgentBudgetCents = Number(process.env.PAPERCLIP_EFFECTIVE_PLAN_MAX_AGENT_BUDGET_CENTS ?? 4_000);
const warnPercent = Number(process.env.PAPERCLIP_EFFECTIVE_PLAN_WARN_PERCENT ?? 85);
const apply = process.argv.includes("--apply");

async function request(path, options = {}) {
  const response = await fetch(`${baseUrl}${path}`, {
    ...options,
    headers: {
      "content-type": "application/json",
      ...(options.headers ?? {}),
    },
  });
  if (!response.ok) {
    const body = await response.text();
    throw new Error(`${options.method ?? "GET"} ${path} failed ${response.status}: ${body}`);
  }
  return response.json();
}

function accountedTokens(row) {
  return Number(row.inputTokens ?? 0) + Number(row.cachedInputTokens ?? 0) + Number(row.outputTokens ?? 0);
}

function roundUpCents(value, step = 100) {
  return Math.ceil(value / step) * step;
}

const [summary, agents, byAgent] = await Promise.all([
  request(`/api/companies/${companyId}/costs/summary`),
  request(`/api/companies/${companyId}/agents`),
  request(`/api/companies/${companyId}/costs/by-agent`),
]);

const subscriptionSpendCents = Number(summary.subscriptionSpendCents ?? 0);
const effectivePlanBudgetCents = Number(summary.subscriptionMonthlyBudgetCents ?? planBudgetCents);
const totalTokens = byAgent.reduce((sum, row) => sum + accountedTokens(row), 0);
const byAgentId = new Map(byAgent.map((row) => [row.agentId, row]));

const policies = [
  {
    scopeType: "company",
    scopeId: companyId,
    metric: "effective_plan_cents",
    windowKind: "calendar_month_utc",
    amount: effectivePlanBudgetCents,
    warnPercent,
    hardStopEnabled: true,
    notifyEnabled: true,
    isActive: true,
  },
  ...agents.map((agent) => {
    const usage = byAgentId.get(agent.id);
    const tokens = usage ? accountedTokens(usage) : 0;
    const monthlyPlanShare = totalTokens > 0
      ? Math.round((effectivePlanBudgetCents * tokens) / totalTokens)
      : 0;
    const bufferedBudget = monthlyPlanShare > 0
      ? roundUpCents(monthlyPlanShare * agentBuffer)
      : minAgentBudgetCents;
    const amount = Math.max(
      minAgentBudgetCents,
      Math.min(maxAgentBudgetCents, bufferedBudget),
    );
    return {
      scopeType: "agent",
      scopeId: agent.id,
      metric: "effective_plan_cents",
      windowKind: "calendar_month_utc",
      amount,
      warnPercent,
      hardStopEnabled: true,
      notifyEnabled: true,
      isActive: true,
      _agentName: agent.name,
      _monthlyPlanShare: monthlyPlanShare,
      _tokens: tokens,
    };
  }),
];

const publicPlan = policies.map(({ _agentName, _monthlyPlanShare, _tokens, ...policy }) => ({
  ...policy,
  agentName: _agentName,
  monthlyPlanShareCents: _monthlyPlanShare,
  accountedTokens: _tokens,
}));

if (!apply) {
  console.log(JSON.stringify({
    mode: "dry-run",
    baseUrl,
    companyId,
    subscriptionSpendCents,
    effectivePlanBudgetCents,
    totalTokens,
    policyCount: policies.length,
    policies: publicPlan,
  }, null, 2));
  process.exit(0);
}

const results = [];
for (const { _agentName, _monthlyPlanShare, _tokens, ...policy } of policies) {
  const result = await request(`/api/companies/${companyId}/budgets/policies`, {
    method: "POST",
    body: JSON.stringify(policy),
  });
  results.push({
    scopeType: result.scopeType,
    scopeName: result.scopeName,
    metric: result.metric,
    amount: result.amount,
    observedAmount: result.observedAmount,
    utilizationPercent: result.utilizationPercent,
    status: result.status,
  });
}

console.log(JSON.stringify({
  mode: "apply",
  baseUrl,
  companyId,
  policyCount: results.length,
  results,
}, null, 2));
