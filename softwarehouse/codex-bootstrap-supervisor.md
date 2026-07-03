# Codex Bootstrap Supervisor

Last updated: 2026-06-01

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
- whether the 30-minute cycle is documented,
- whether the self-improvement loop is available.

## Retirement Criteria

The local Codex automation can be removed only when all required checks pass:

- `controlTickHealthy`
- `paperclipOsClean`
- `autonomousCycleEntrypointExists`
- `cycleLedgerExists`
- `cycleRoutineDocumented`
- `selfImprovementLoopAvailable`

After those pass, the local Codex bootstrap automation should keep running
every 30 minutes until Paperclip proves it can operate as a softwarehouse.

The first practical proof is Soar:

- Paperclip must drive Soar to a usable state.
- Soar must pass a login/app smoke or equivalent owner-visible verification.
- Paperclip must record what it improved in its own operating loop while
  delivering Soar.
- Patryk must accept that Soar is delivered enough to count as the first
  autonomous softwarehouse proof.

Only then should the local Codex automation be retired.

The proof contract is `report/soar-delivery-acceptance.latest.json`. It is a
local runtime artifact and should include `paperclipDelivered=true`,
`paperclipAutonomyImproved=true`, `productionLoginSmoke="pass"`, and
`ownerAccepted=true`.

Codex-visible automation command:

```text
pnpm softwarehouse:autonomous-cycle
pnpm codex:bootstrap-supervisor
```

Do not install hidden OS-level schedulers for this loop. The bootstrap
supervision must stay visible as a Codex automation so Patryk can inspect,
pause, edit, or retire it from Codex.

## Current Expected Status

As of 2026-06-01, the expected status is `bootstrap_required`.

Known blockers:

- Paperclip OS source-control closure is still required when local changes are
  present.
- `scripts/run-autonomous-development-cycle.mjs` is not yet implemented.
- `report/autonomous-cycles/latest.json` is not yet produced.

This is correct behavior. The local Codex supervisor should stay active until
Paperclip can prove the closed autonomous loop itself.
