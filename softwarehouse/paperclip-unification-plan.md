# Paperclip Unification Plan

Last updated: 2026-05-31

## Goal

Use the useful local `Paperclip` knowledge inside `Paperclip_Softwarehouse`
without merging secrets, runtime state, generated build output, or unrelated
fork history.

## Source Categories

| Source | Use in Softwarehouse | Rule |
| --- | --- | --- |
| `Paperclip/AGENTS.md` | Coordinator mandate, process cleanup, engineering invariants, PR/DoD habits. | Adapt into Softwarehouse workflows; do not overwrite role-specific instructions wholesale. |
| `Paperclip/.agents/state` and `.agents/workflows` | Mission state, responsibility learning, subagent coordination. | Keep lightweight Softwarehouse versions under `.agents/state` and `.agents/workflows`. |
| `Paperclip/docs/governance` | Adoption playbooks, readiness checklists, engineering loop, function coverage ledgers. | Import only docs that reduce repeated project takeover friction. |
| `Paperclip/docs/operations` | Coolify/VPS contract, rollback, post-deploy smoke, observability, persistent runtime playbooks. | Adapt to local Softwarehouse and per-project contracts. |
| `Paperclip/skills` | Paperclip issue, routine, agent, plugin, memory, diagnosis workflows. | Keep skill directories aligned unless Softwarehouse has a reason to fork behavior. |
| `.paperclip/runtime` | Runtime state, backups, logs, managed homes. | Never treat as source. Use only as local evidence/backups and do not copy secret values. |

## Implemented Baseline

- Command safety catalog:
  `docs/automation/agent-command-catalog.csv`
- Tooling policy:
  `docs/automation/tooling-contract.md`
- Runtime config ledger:
  `docs/operations/runtime-config-ledger.csv`
- Coolify/VPS contract:
  `docs/operations/coolify-vps-deployment-contract.md`
- App feature backlog:
  `softwarehouse/paperclip-app-feature-backlog.md`
- Coordination memory:
  `.agents/state/active-mission.md`,
  `.agents/state/responsibility-learning.md`,
  `.agents/state/agent-evals.md`,
  `.agents/workflows/softwarehouse-coordination.md`

## Next Imports

1. Add `docs/operations/soar-coolify-vps-contract.md` when Coolify project,
   environment, application, Postgres, Redis, permissions, and smoke facts are
   available.
2. Fill `runtime-config-ledger.csv` `unknown` verification fields as credential
   and smoke checks pass.
3. Backfill command catalog entries whenever a new Softwarehouse script,
   provider action, or plugin tool becomes routine.
4. Review governance docs from local `Paperclip/docs/governance` and import
   only the templates that reduce repeated takeover mistakes.
5. Keep Paperclip skills aligned and record any intentional divergence here.
6. Use `softwarehouse/paperclip-app-feature-backlog.md` to backport app
   features in slices instead of merging whole subsystems blindly.

## Non-Goals

- Do not merge local runtime homes, logs, backups, or secret files into source.
- Do not activate additional delivery projects just because the docs exist.
- Do not grant production mutation from this plan; use a release mutation
  permit.
