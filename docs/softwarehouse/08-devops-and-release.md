# DevOps And Release

Status: active baseline
Date: 2026-06-03
Owner: Ops Release Lead

Paperclip Softwarehouse can prepare releases autonomously, but production mutation requires a clear gate.

Current local-first release reality is captured in
`docs/softwarehouse/local-first-shippable-gate-bundle.md`: no separate staging
VPS exists, a Coolify-bound push can be a production mutation, and protected
actions fail closed until source/ref, target resource, rollback, smoke, and
owner-path facts are current.

## Release Inputs

- source branch and commit SHA
- build command and result
- test command and result
- environment target
- required env vars and secret refs
- migration impact
- rollback path
- smoke test plan

## Release Outputs

- release decision: GO, NO-GO, or NEEDS_HUMAN_DECISION
- deploy log
- smoke evidence
- rollback confirmation or rollback readiness
- linked follow-up issues for failures

Use `docs/softwarehouse/templates/release-checklist-template.md` for release
gate reports. Use `docs/softwarehouse/release-dora-evidence.md` for DORA field
definitions, dry-run examples, and release evidence records.

## DORA Metrics

Start by recording structure in logs and reports:

- deployment frequency
- lead time for changes
- change failure rate
- mean time to recovery
- reliability / smoke stability

Automation can calculate these later once enough structured reports exist.

## Production Mutation Rule

No production deploy, restart, rollback, env mutation, database mutation, or paid/live-account mutation happens without a release mutation permit that names:

- target project/environment/resource
- exact action
- expected source SHA or image
- rollback path
- smoke requirements
- secret redaction rule
- approval owner
