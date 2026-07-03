# Release And DORA Evidence

Status: active baseline
Date: 2026-06-03
Owner: Ops Release Lead
Review gate: Security Review Lead for secret, auth, live-account, and production mutation risk

This document defines the lightweight release evidence record used by Softwarehouse deploy, source-control closure, and operating reports. It is a reporting structure only. It does not authorize push, deploy, restart, rollback, environment mutation, database mutation, or live-account mutation.

## Evidence Record

Every release-preparation or deploy gate report must record:

- release id or issue id
- project and environment
- target resource or resource group
- source branch and exact source SHA
- push status: `not needed`, `pending`, `pushed`, or `blocked`
- deploy impact: `none`, `auto-redeploy expected`, `manual Ops redeploy required`, `blocked`, or `completed by Ops`
- build command and result
- test command and result
- environment and secret-binding check, without secret values
- migration impact: `none`, `checked`, `requires migration gate`, or `unknown`
- rollback path and stop condition
- smoke plan and smoke result
- security review status and stop conditions
- release decision: `GO`, `NO-GO`, or `NEEDS_HUMAN_DECISION`
- linked follow-up issues for failures or unknowns

## DORA Fields

Deployment frequency:

- Count each successful production deploy or production-equivalent release as one deployment.
- Record `0` when a release gate blocks before deploy.
- Evidence source: release evidence record with environment, resource, source SHA, decision, and deploy result.

Lead time for changes:

- Measure from the first committed source SHA included in the release batch to the production deploy completion time.
- For docs-only or blocked gates, record `not applicable` or `blocked before deploy`.
- Evidence source: git commit timestamps, source SHA, deploy completion timestamp, and release decision.

Change failure rate:

- Count a change as failed when it causes rollback, hotfix, incident, production smoke failure after deploy, or user-visible regression tied to the release.
- Blocked `NO-GO` gates do not count as failed changes because no production change occurred.
- Evidence source: smoke result, incident link, rollback record, or follow-up issue.

Mean time to recovery:

- Measure from failure detection time to restored healthy state.
- If rollback is ready but not executed because no deploy occurred, record `not applicable`.
- Evidence source: incident start, recovery action, recovery proof, and final status.

Reliability / smoke stability:

- Record the required smoke checks, pass/fail/blocked state, retry count, flaky behavior, and affected resource.
- Evidence source: smoke command output summary, screenshot/log reference when safe, and QA/Ops signoff.

## Security Stop Conditions

The release gate must stop with `NO-GO` or `NEEDS_HUMAN_DECISION` when any condition from `docs/softwarehouse/07-security-standard.md` applies, including:

- secret values may leak
- authorization is unclear
- live or paid accounts may be mutated without approval
- customer or private data handling is unclear
- rollback or audit trail is missing for risky production work

Reports must link or cite the relevant Security Review Lead finding when a stop condition is active.

## Dry-Run Example

Release id: `dry-run-LUC-1795-2026-06-03`

- project and environment: Softwarehouse process docs, no runtime environment
- target resource: none
- source branch / SHA: local docs-only workspace, SHA not released
- push status: `not needed`
- deploy impact: `none`
- build command and result: not applicable, docs-only
- test command and result: `rg "deployment frequency|lead time|change failure rate|mean time to recovery|source SHA|rollback|smoke" docs/softwarehouse` passed
- environment and secret-binding check: no secrets required, no secret values handled
- migration impact: `none`
- rollback path and stop condition: revert docs-only change before release if the checklist weakens push/deploy gates
- smoke plan and result: process smoke only; checklist contains source SHA, build, tests, env, migration, rollback, smoke, and security stop fields
- security review status: gate conditions linked to `docs/softwarehouse/07-security-standard.md`
- DORA snapshot: deployment frequency `0`; lead time `blocked before deploy`; change failure rate `not applicable`; MTTR `not applicable`; reliability `process smoke passed`
- release decision: `NO-GO`
- reason: dry-run evidence structure proves the readiness snapshot blocks push/deploy until source, build, tests, environment, rollback, smoke, and security gates are populated
- linked follow-up issues: none
