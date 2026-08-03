# Routine recovery classification

Last verified: 2026-08-03

LuckySparrow remains in company maintenance. No routine is active. Every future activation must pass the native admission controller and retain `skip_missed`, bounded WIP, cooldown, idempotency and evidence requirements.

## Canary set

- `retain / paused`: `[Soar] Daily project status refresh` — the only project routine eligible for the first Soar canary, after safety gates. It does not authorize push or deployment.
- `retain / paused`: `00 General: Owner Direction and Proposal Review` — owner-decision intake only; activate only if the canary needs a real decision.
- All other retained routines stay paused through the first canary. A canary can run with zero scheduled routines and one explicitly admitted delivery.

## Retain, but keep paused

- `[Roost] Daily project status refresh`, `[Featherly] Daily project status refresh` — later product activation only.
- `04 Operations: Longevity Snapshot Backup` — bounded recovery evidence, not a progress generator.
- `04 Operations: Organizational Learning Loop` — post-outcome learning only.
- `06 People: Agent Hiring and Governance Review`, `06 People: AI-Agent Development Review` — periodic governance, never a canary prerequisite.
- `07 Finance: Cost, Quota, and Budget Review` — budget evidence and hold authority.
- `09 Technology: Agent Health and Model Governance` — model/agent drift audit.
- `10 Legal: Secrets Coolify and VPS Access Readiness Review` — protected release readiness only.
- `11 Innovation: Autonomy Governor` — retained canonical governor; it may observe and propose, but cannot bypass admission.

## Replace or merge, archived

- Project `Known-state and map drift sweep` routines (3) merge into project current-state refresh and the Daily Integrity Audit.
- `[Softwarehouse] AI-agent development review` merges into the canonical People review.
- `[Softwarehouse] Autonomy governor` merges into the canonical Innovation governor.
- `[Softwarehouse] Organizational learning loop` merges into the canonical Operations learning loop.
- `[Softwarehouse] Longevity snapshot backup` merges into the canonical Operations snapshot.
- `09 Technology: Stale Board Janitor` is replaced by deterministic admission/recovery reconciliation and the lightweight Watchdog.

## Archive: recurrence-risk class

- All project `No-stall queue expeditor` routines (3).
- All project `Source-control closure sweep` routines (3).
- Both continuation watchdogs.
- Both longevity doctor/watchdog routines.

These routines created activity in response to missing progress and could replenish their own queue. Their useful checks now belong to admission policy, one shared finding registry and bounded supervision automations, not autonomous task generators.

## Already archived legacy routines

The controlled-activation draft, general liveness review, PDCA review, portfolio/workspace review, evidence-gate review and generic source/deploy review remain archived. They must not be resurrected as duplicates.

## Reopen rule

First canary: organization WIP 1, project WIP 1, issue WIP 1, one Soar delivery, no continuation/no-stall/source-control routines, no catch-up. After accepted outcome and observation, reassess one routine at a time; recurrence or queue growth returns its project admission scope to maintenance.
