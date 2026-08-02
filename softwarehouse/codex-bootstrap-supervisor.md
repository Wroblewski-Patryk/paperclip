# Codex Bootstrap Supervisor

Last updated: 2026-08-02

## Purpose

The local Codex desktop session is a temporary bootstrap supervisor for
Paperclip Softwarehouse. It is not the same execution layer as the Codex model
used by Paperclip agents.

The bootstrap supervisor exists only to get Paperclip into a state where
Paperclip can own its own operating loop. After that, this local Codex
automation should be removed.

## Boundary

Local Codex owns:

- running a scheduled external health check,
- calling Paperclip's control tick,
- checking whether Paperclip can supervise itself,
- writing a bootstrap report,
- stopping when Paperclip is ready.

Paperclip owns:

- issue state,
- agent dispatch,
- work packets,
- validation,
- release and deployment ledgers,
- monitoring,
- self-improvement backlog.

Local Codex must not become a hidden project manager. If it starts making
product or delivery decisions directly, Paperclip has not become autonomous.

## Command

```text
pnpm codex:bootstrap-supervisor
```

The command runs `scripts/run-codex-bootstrap-supervisor.mjs`.

The versioned automation contract is
`softwarehouse/paperclip-teachar-prompt.md`. The live Codex automation and any
owner-facing export under `report/` must be content-equivalent to that source.

Outputs:

- `report/codex-bootstrap-supervisor.latest.json`
- `report/codex-bootstrap-supervisor.latest.md`

For quick report regeneration without running the full Paperclip control tick:

```text
pnpm codex:bootstrap-supervisor -- --skip-control-tick
```

## What The Supervisor Checks

The local supervisor checks:

- Paperclip API reachability,
- `softwarehouse:control-tick` health,
- Paperclip OS worktree cleanliness,
- existence of the Paperclip-owned autonomous cycle entrypoint,
- existence of the cycle ledger,
- freshness of the cycle ledger and control tick (historical files do not
  prove current autonomy),
- the canonical active application registry: Soar, Roost, and Featherly,
- whether the 30-minute cycle is documented,
- whether the self-improvement loop is available.

## Retirement Criteria

The local Codex automation can be removed only when all required checks pass:

- `controlTickHealthy`
- `paperclipOsClean`
- `autonomousCycleEntrypointExists`
- `cycleLedgerExists`
- `cycleLedgerFresh`
- `controlTickFresh`
- `cycleRoutineDocumented`
- `selfImprovementLoopAvailable`

After those pass, the local Codex bootstrap automation should keep running
every 30 minutes through a 14-day graduation window. Any material Teachar
repair, critical regression, cross-project contamination, stale Paperclip-owned
cycle, unsafe retry loop, or missing evidence resets that window.

Graduation is portfolio-wide, not Soar-only:

- Paperclip must drive Soar, Roost, and Featherly to project-specific terminal
  outcomes or an explicitly accepted pause/no-go decision.
- Each released application must pass its owner journey and deployed-SHA
  readback with project-specific evidence.
- Paperclip must record what it improved in its own operating loop while
  delivering the portfolio.
- Shared specialists must remain separated through project-scoped tasks and
  WIP limits throughout the observation window.

Only then should the local Codex automation be retired.

The Soar acceptance ledger remains Soar-only. Roost and Featherly require their
own acceptance/deployment evidence; no project's ledger may qualify another.
The graduation packet must also prove fresh autonomous-cycle and control-tick
ledgers, zero critical isolation findings, zero material Teachar repairs during
the window, and a fresh owner-visible Roost portfolio projection.

When every criterion remains satisfied for the complete window, Teachar writes
its final Polish decision packet and pauses automation `paperclip-teachar`.
If the automation-management tool is unavailable or pause readback fails, it
must remain active and report the exact blocker rather than claiming retirement.

Codex-visible automation command:

```text
pnpm softwarehouse:autonomous-cycle
pnpm codex:bootstrap-supervisor
```

Do not install hidden OS-level schedulers for this loop. The bootstrap
supervision must stay visible as a Codex automation so Patryk can inspect,
pause, edit, or retire it from Codex.

## Current Expected Status

As of 2026-08-02, the expected status is `bootstrap_required`.

Known blockers:

- Paperclip OS source-control closure is still required when local changes are
  present.
- `report/autonomous-cycles/latest.json` exists but its latest verified cycle
  is stale (2026-07-02), so it is not current autonomy evidence.
- Roost still carries undelivered release debt, Soar has source-control work,
  and Featherly lacks complete project-truth/upstream evidence.

This is correct behavior. The local Codex supervisor should stay active until
Paperclip can prove the closed autonomous loop itself.
