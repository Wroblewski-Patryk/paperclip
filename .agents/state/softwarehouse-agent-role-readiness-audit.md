# Softwarehouse Agent Role Readiness Audit

Last updated: 2026-07-04

Source: Paperclip API checks, managed instruction bundle inspection, and
conversation requirements.

## Verdict

Agent role configuration is strong but not honestly 100%.

Current estimated readiness: about 94%.

This is enough to say v0 is on the horizon. The remaining gap is not missing
roles or missing context; it is runtime proof, budget policy, and future
calibration after the first controlled Stage 1 dry run.

## Verified Strengths

- 38 agents exist and all are paused.
- 38/38 agents use `codex_local`.
- 38/38 agents point at local Codex model configuration.
- 38/38 agents have a role scope.
- 38/38 agents have a working profile using Big Five-style traits.
- 38/38 agents include the shared company, standards, learning, hiring,
  secrets/deploy, flow, department, resource, product architecture,
  delegation, closure, gap detection, procedure, owner-interface, and
  cost/token/context references.
- Only `06 AIM (AI Agent Manager)` can create agents.
- Routines remain paused with disabled triggers.
- There are 0 Paperclip issues/tasks and 0 live runs.
- Soar and Roost are the only active product lanes for Stage 1.
- Featherly, Aviary, and Nest are future portfolio lanes only. Do not create
  Paperclip work for them until they are on VPS and the owner explicitly
  activates them.
- Paperclip exposes cost, budget, and quota endpoints.
- The local Codex CLI wrapper responds to `--version`.

## Main Gaps

1. Runtime proof is intentionally incomplete.
   Agents are paused, so no real agent execution, model invocation, skill use,
   or issue lifecycle has been proven in this clean Stage 0 instance.

2. Monetary budget policy is not configured.
   Company and agent monthly budget fields are currently zero. Paperclip can
   report budgets/costs/quota, but no owner-approved hard limits are set.

3. Cost metering for local Codex is partially observable.
   Quota windows are visible, but cost summary currently has no metered events
   because no Stage 1 work has run. Future local Codex runs may report token
   usage without a reliable dollar cost.

4. Role/personality calibration is plausible, not empirically proven.
   Working profiles are present and role-aligned, but real behavior needs
   evaluation after Stage 1 evidence.

5. Product-specific depth is intentionally lean.
   Agents know to start from Soar/Roost `docs/architecture`, but detailed
   Soar/Roost implementation playbooks should be built from actual dry-run
   findings rather than invented in Stage 0.

## What "100%" Requires Later

- First controlled Soar dry run completes without broad activation.
- AIA produces a Polish owner decision packet that is understandable and
  actionable.
- Agents show they can follow parent/child reporting and closure evidence.
- Cost/quota observations are captured.
- One learning packet is produced if the dry run reveals a process issue.
- Owner decides whether to set company/agent budget limits.
- Role profiles are adjusted only through the governed learning/hiring path.

## Stage 0 Operating Decision

Do not create new agents just because the theoretical organization could be
larger. Start Stage 1 with the current 38 roles, observe real gaps, and let
`06 AIM` propose hiring only through the hiring procedure.
