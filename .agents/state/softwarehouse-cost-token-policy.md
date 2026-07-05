# Softwarehouse Cost, Token, And Context Policy

Last updated: 2026-07-05

Purpose: keep Paperclip Softwarehouse agent work useful under real Codex,
budget, quota, and context limits.

## Verified Paperclip Capability

- Local Codex adapter is available as `codex_local`.
- Local Codex CLI wrapper exists at
  `C:/Personal/Projekty/Aplikacje/Paperclip_Softwarehouse/scripts/codex.cmd`.
- Paperclip exposes budget and cost endpoints:
  - `/api/companies/:companyId/budgets/overview`
  - `/api/companies/:companyId/costs/summary`
  - `/api/companies/:companyId/costs/by-agent`
  - `/api/companies/:companyId/costs/quota-windows`
- Current cost metering state is `none`, with zero recorded spend and zero
  recorded run events because Stage 0 has not started Paperclip agent work.
- Codex quota windows are visible through Paperclip. On 2026-07-04, Paperclip
  returned OpenAI usage windows for the local Codex path.
- Company and agent `budgetMonthlyCents` are currently `0`. Treat this as
  "no configured hard budget policy yet", not as proof that future work is
  free or unlimited.

## Stage 0 Decision

Do not configure arbitrary monetary hard limits without owner approval. Stage 0
should document the policy, verify Paperclip can observe usage/quota, and make
budget configuration a Stage 1 owner decision.

## Local Codex Provider Quota Gate

Decision: local `codex_local` runs are governed by OpenAI/Codex provider quota
windows as a first-class start gate. For ChatGPT/Codex subscription usage,
`cost_cents = 0` is not proof that capacity is available, so monthly budget
checks alone are not sufficient.

Implementation policy:

- Paperclip may still create and assign useful issues/tasks while Codex quota is
  low.
- If a `codex_local` quota window reaches the configured hold threshold,
  Paperclip must not start the queued run immediately.
- Queued runs are moved to `scheduled_retry` with
  `scheduledRetryReason = provider_quota_hold` and wakeup status
  `deferred_issue_execution`.
- Retry times are staggered after the provider reset so a backlog does not wake
  20 agents at once.
- Quota hold records must include only redacted quota-window evidence:
  provider, source, used percent, reset time, and scheduling metadata. They must
  not include raw auth, tokens, prompts, or account secrets.

Runtime knobs:

- `PAPERCLIP_CODEX_LOCAL_QUOTA_HOLD_USED_PERCENT` defaults to `75`.
- `PAPERCLIP_CODEX_LOCAL_QUOTA_LONG_WINDOW_HOLD_USED_PERCENT` defaults to
  `90`.
- `PAPERCLIP_CODEX_LOCAL_QUOTA_SHORT_WINDOW_MAX_MS` defaults to `86400000`.
- `PAPERCLIP_CODEX_LOCAL_QUOTA_RETRY_SPACING_MS` defaults to `120000`.
- `PAPERCLIP_CODEX_LOCAL_QUOTA_FALLBACK_DELAY_MS` defaults to `900000`.
- `PAPERCLIP_CODEX_LOCAL_QUOTA_CACHE_MS` defaults to `60000`.

The 75% threshold is a hard start gate for short reset windows, such as the
local Codex five-hour window. Longer windows, such as weekly or monthly plan
limits, hold new starts at 90% so a weekly reset window is conserved before it
is fully exhausted. Under long-window pressure, Paperclip should continue with
small, role-scoped work and staggered retry after reset, not wake a broad
backlog.

Dashboard rule: Paperclip must show provider quota pressure separately from
monthly dollar spend. For local Codex, `$0.00` spend means "no metered API spend
was recorded"; it does not mean unlimited subscription capacity remains. Do not
collapse subscription quota into fake dollar spend unless the owner explicitly
configures an effective subscription-cost model later.

Audit command:

```sh
node scripts/audit-softwarehouse-model-cost-readiness.mjs
```

This command checks provider quota windows, budget policies, primary/cheap
model distribution, whether `fastTriage` is actually diversified, and whether
any OpenAI API-key lane exists without verified metered cost evidence.

## Model And Provider Diversification

Primary Stage 1 coding, security, deployment, and architecture lanes stay on
`gpt-5.5` with high or extra-high reasoning unless a specific issue proves a
cheaper lane is sufficient. The `fastTriage` profile is separate: it uses
`gpt-5.4`, low reasoning, and Codex fast mode for bounded triage, documentation
sync, duplicate checks, monitor summaries, and status-only work.

Future OpenAI API-backed agents must not be enabled broadly just because an
`OPENAI_API_KEY` exists. First run a small metered smoke test and verify that
Paperclip writes `cost_events` with `billingType = metered_api` and useful
non-zero cost or an explicitly approved configured pricing model. Until that is
true, API-backed GPT lanes are allowed only for narrow experiments with owner
approval.

Operating rule: if quota data is temporarily unavailable, Paperclip logs that
fact and allows the start rather than silently pretending a hard quota block
exists. Repeated unavailable quota checks should become an improvement task,
because the correct long-term state is observable quota-aware scheduling.

## Agent Operating Rules

Agents must:

- prefer narrow, goal-linked work over broad exploratory sweeps;
- read only the files needed for the current procedure step;
- summarize findings before handing context to another agent;
- reuse existing project indexes, architecture docs, and Paperclip evidence
  before re-discovering the same facts;
- run targeted local verification before expensive broad suites;
- report token/quota/cost uncertainty as a real operating constraint;
- treat `provider_quota_hold` as a planned capacity delay, not as a failed
  agent run;
- stop and escalate if quota pressure, missing metering, or budget ambiguity
  threatens completion quality;
- attach cost/quota observations to Stage 1 dry-run evidence when available.

Agents must not:

- repeatedly perform repo-wide scans when a scoped query proves the point;
- paste huge logs into issue comments or handoffs when a bounded summary and
  artifact link are enough;
- assume paid GitHub, hosted CI, paid runners, or external paid services;
- increase model/reasoning level, run long browser loops, or trigger deploy
  cycles without a clear evidence need.

## Reasoning Level Guidance

- Use low or normal reasoning for small clerical updates, naming checks,
  status checks, and bounded evidence collection.
- Use high reasoning for architecture, security, deployment, production smoke,
  cross-agent coordination, and owner decision packets.
- Use extra-high reasoning only when the issue is complex, high risk, or a
  prior attempt failed with an unclear root cause.

## Stage 1 Dry-Run Requirement

The first Stage 1 Soar dry run should include a small cost/quota section:

- Paperclip cost summary before/after the run;
- quota windows before/after the run when available;
- number of agents awakened;
- runtime duration;
- evidence produced;
- recommendation for whether to set company or agent budget limits.

## Future Budget Gate

Before broad autonomous work, the owner should decide:

- whether to set a company monthly budget;
- whether to set per-agent monthly budgets;
- whether to define stricter daily or per-run soft limits;
- whether CFO, CTO, AIA, or CEO owns budget escalation;
- how to handle unknown-cost local Codex runs in status reports.

## Effective Local Codex Plan Usage

Local `codex_local` runs do not necessarily create metered API `cost_events`,
so `$0.00 API spend` can be true while the owner's ChatGPT/Codex plan capacity
is being consumed. Paperclip should therefore keep two separate accounting
lanes:

- reported spend: direct API or adapter-reported cost events;
- effective subscription usage: an operational estimate derived from live
  Codex quota windows and a configured monthly subscription budget.

The default local Codex subscription budget is 20,000 cents, matching the
owner's current $200/month plan assumption. This can be changed with
`PAPERCLIP_CODEX_LOCAL_SUBSCRIPTION_BUDGET_CENTS` and
`PAPERCLIP_CODEX_LOCAL_SUBSCRIPTION_PLAN_LABEL`.

Do not use the effective subscription estimate as proof of OpenAI billing. It
is a capacity-management and dashboard value so the company sees quota pressure
as a meaningful budget burn instead of fake `$0.00 of $1.00` numbers. Future
OpenAI API-backed GPT lanes must still prove real `metered_api` cost reporting
before they are treated as billable API spend.
