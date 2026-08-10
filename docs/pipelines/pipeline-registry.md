# Pipeline Registry

Last updated: 2026-08-10

## Purpose

The software-house pipelines describe how Paperclip should move from broad
project awareness to narrow work execution and back to updated global status.

## Registered Pipelines

| Pipeline | Trigger | Owner | Primary inputs | Required output | Status |
| --- | --- | --- | --- | --- | --- |
| Project takeover baseline | New or existing app added to Paperclip | Project Manager | Project root, `!template`, existing docs/history | Documentation backbone, scan report, known-state status | active |
| Architecture awareness sync | Meaningful code/docs/status change | CTO / Architect | Project repo, architecture docs, tests, routes | Graph exports, gap register, entity/relation indexes | active |
| Work delegation loop | User request, routine, or blocker update | Project Manager | Issue, graph, current project state | Narrow owner lane with evidence contract | active |
| Specialist execution | Assigned task with bounded scope | Specialist role | Issue packet, role instruction, affected files | Commit-ready diff or proof-only evidence | active |
| QA/regression proof | Feature repair or release gate | QA / Test Automation | Changed files, capability map, test catalog | Test/smoke evidence and regression risk note | active |
| Release/deploy governance | Deploy/cutover/recovery request | Ops / Security / CTO | SHA, Coolify model, secrets presence, approval gate | Smoke, readiness, rollback, no-secret evidence | active |
| Memory and portfolio refresh | Any meaningful completion | Docs Memory / PM | Task evidence, project docs, root index | Updated docs/history/status and `/Aplikacje` index | active |
| Blocker triage | Blocked issue without live run | PM / responsible lead | Comments, dependencies, evidence, current audit | Honest status, owner/action, next proof or closure | active |
| ProductDelivery outcome loop | Admissible source-traceable product gap | Product Manager / Delivery Lead | Owner intent, product/architecture authority, observed gap | Persisted delivery transitions, independent review, outcome evidence | active |
| Native supervision and learning | Scheduled native cycle or recurring finding | Portfolio Director / AID / responsible owner | Live state, recurrences, shadow comparison, accepted outcomes | Root cause, safeguard/intervention, observation window, or bounded no-action | active |
| Extension utilization closure | Every control tick and every added capability | CTO / AID / Docs Memory | Capability registry, source wiring, live API evidence, tests/docs | Four-dimension utilization verdict; repair or explicit retirement | active |

## Operating Shape

```text
portfolio status
  -> project manager triage
  -> architecture/context lookup
  -> specialist issue
  -> tests/proof
  -> docs/history update
  -> root index refresh
  -> next blocker or done
```

## Hard Rules

- A task must point to a capability, module/area, affected files, proof
  requirement, and docs/history update.
- Parent/controller issues do not code. They integrate child evidence and make
  blocker/closure decisions.
- Pending operator confirmations are hard gates unless newer evidence makes
  them stale and the issue is explicitly synchronized.
- Production work requires explicit deploy/recovery scope, no-secret proof,
  rollback/cutover note, and SHA reconciliation.
- A new capability is not complete when only its schema, route, page, script,
  or configuration exists. It must pass implementation, integration, live-use,
  and proof checks in `pnpm softwarehouse:extension-utilization`.

## Current Product Focus

Soar, Roost, and Featherly are active but isolated product lanes. The current
control tick and ProductDelivery ledger, not historical issue identifiers in
this document, determine the next legal action. Protected push, deployment,
secret, destructive, and owner-acceptance actions remain gated.

## Maintenance Rule

When a new routine, extension, or agent responsibility changes the path of
work, update this registry, the capability map, the extension utilization
registry, and the matching role/shared instruction file.
