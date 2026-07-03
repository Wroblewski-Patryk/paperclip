# Pipeline Registry

Last updated: 2026-05-26

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

## Current Soar Focus

`LUC-99` is the active production-readiness blocker family. It requires:

1. release-controller SHA reconciliation (`3fedb7a9...` vs production
   `71b8d503...`);
2. explicit `workers-market-stream` readiness proof or accepted deeper blocker;
3. final parent closure/update for `LUC-98`, `LUC-47`, and dependent issues.

## Maintenance Rule

When a new routine or agent responsibility changes the path of work, update
this registry and the matching role/shared instruction file.
