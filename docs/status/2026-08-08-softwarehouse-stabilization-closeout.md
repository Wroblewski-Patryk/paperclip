# Softwarehouse stabilization closeout

Date: 2026-08-08

## Outcome

The installed LuckySparrow Paperclip instance remains on version `0.3.1`; no
upstream Paperclip update was attempted. The local control plane is healthy on
strict port `3200` with its canonical embedded PostgreSQL on `54329`.

The stabilization removed configuration drift, duplicate scheduling, unsafe
agent execution defaults, stale product-classification rules, and redundant
repository-local agent context. All four controlled repositories are clean.

## Configuration state

- Company identity converged on `LuckySparrow`, with the former
  `LuckySparrow Software House` retained only as a compatibility alias.
- All 39 active agents pass the settings audit.
- `dangerouslyBypassApprovalsAndSandbox` is false for the managed agents.
- The routine set was reduced from 37 paused/overlapping definitions to eight
  active, non-duplicated routines: one autonomy governor, two health/governance
  routines, two operational learning/backup routines, and one daily status
  refresh for each active application.
- Twenty-nine non-canonical or overlapping routines are archived and have no
  enabled legacy triggers.
- Project/workspace isolation is strict for Paperclip, Soar, Roost, and
  Featherly. The workspace-boundary and runtime-topology audits pass.

## Code and control-plane repairs

- Completed the native autonomy control-plane implementation and synchronized
  routine names across configuration and runtime consumers.
- Corrected agent safety defaults and documented the safe source-control
  handoff when the Codex workspace sandbox rejects `.git` metadata writes.
- Fixed architecture/project-truth freshness so a current scan is timestamped
  as a current observation rather than inheriting the newest source file date.
- Added product-aware flow classification. Generic credentials no longer imply
  an exchange product, and `robots.txt`, `strategy`, or `order` text cannot
  invent a trading domain in Roost or Featherly.
- Rebuilt current architecture, app-completion, event-chain, runtime-error, and
  project-truth indexes for Soar, Roost, and Featherly.

## Application repository cleanup

- Soar: clean on `codex/soar-profile-canary`, seven commits ahead of
  `origin/main`. The final cleanup commit is `9ba70cc5f`.
- Roost: clean on `codex/roost-product-map-release`, two commits ahead of
  `origin/main`. The final cleanup commit is `4a230f02`.
- Featherly: clean on `candidate/featherly-main-convergence-20260731`, without a
  configured upstream. The final cleanup commit is `8d1fce1`.
- Redundant `.agents`, `.claude`, and `.codex` role/prompt/state copies were
  removed from the three application repositories. Their root `AGENTS.md` and
  documentation contracts now point to bounded project truth while Paperclip
  owns roles, coordination, routines, and durable organizational memory.
- The uncommitted Featherly Exchange vertical slice was removed and LUC-2473,
  LUC-2475, LUC-2489, LUC-2490, and the regenerated false-positive LUC-2534
  were cancelled. Exchange/Trading flows are absent from current Featherly
  project truth.
- Roost route-proof reconciliation was preserved in `393ee372`; Soar's useful
  architecture verification matrix was preserved in `c7ba01e94`.

## Controlled canary result

The canary correctly exposed a stale Soar lane, LUC-1972, that attempted to
integrate old accepted commits for SHA `ac0dc341` into a newer branch. It also
proved that direct Git metadata mutation is rejected by the safe Codex
sandbox. The partial integration produced broad out-of-scope deletions and was
rejected. Soar was restored to its exact pre-canary clean state, LUC-1972 and
its redundant recovery lanes were cancelled, and no partial product code was
retained.

This is a fail-closed outcome: current autonomous work may proceed only from
fresh project truth and bounded issue scope; stale release-specific lanes are
not treated as valid backlog merely because historical commits exist.

## Verification evidence

- Softwarehouse gate specifications: 204/204 passed.
- Product-flow/app-completion classifier tests: 8/8 passed.
- Architecture-awareness tests: 3/3 passed.
- Server run-context builder: 5/5 passed.
- Repository typecheck and build passed during the native control-plane
  closure; later changes were scoped to JavaScript control scripts and their
  targeted Node tests.
- Agent settings audit: pass, 39 active agents, zero findings.
- Softwarehouse doctor: pass, eight expected active routines, no unexpected
  routine, no overdue schedule trigger, no live run.
- Workspace-boundary audit: pass.
- Runtime-topology audit: pass; strict ports and singleton worktrees confirmed.
- Restore drill: pass using a 1.324 GB coupled snapshot; 119 tables, 2,502
  issues, 27,626 heartbeat runs, 1,731 work products, 1,644/1,644 stored assets,
  and 29/29 encrypted secret versions were verified. The temporary PostgreSQL
  instance used port `65095`, was removed, and did not touch ports `3200` or
  `54329`.

## Protected boundaries retained

No branch was pushed and no production deployment, restart, rollback, secret
mutation, protected browser smoke, live-account mutation, or Paperclip version
upgrade was performed. Docker Desktop and a local PHP runtime are unavailable,
so those evidence paths remain fail-closed rather than being reported as
successful.
