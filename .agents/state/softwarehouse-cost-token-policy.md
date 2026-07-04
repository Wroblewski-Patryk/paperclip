# Softwarehouse Cost, Token, And Context Policy

Last updated: 2026-07-04

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

## Agent Operating Rules

Agents must:

- prefer narrow, goal-linked work over broad exploratory sweeps;
- read only the files needed for the current procedure step;
- summarize findings before handing context to another agent;
- reuse existing project indexes, architecture docs, and Paperclip evidence
  before re-discovering the same facts;
- run targeted local verification before expensive broad suites;
- report token/quota/cost uncertainty as a real operating constraint;
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
