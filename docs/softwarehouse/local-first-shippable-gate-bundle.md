# Local-First Shippable Gate Bundle

Status: active source of truth
Date: 2026-07-02
Owner: Docs Memory Lead
Source: accepted [LUC-7007](/LUC/issues/LUC-7007#document-plan), revision `91c9270e-bea0-4fec-8a25-7656c020c4ee`

This is the Softwarehouse source of truth for deciding whether a Soar or Roost
slice is locally shippable under the current no-staging operating model.

Current reality:

- There is no separate staging VPS.
- The practical path is local verification -> coherent source-control closure
  -> push when permitted -> Coolify production redeploy -> production
  readback/smoke evidence.
- A push to a Coolify-bound branch can be a production mutation.
- Protected actions fail closed until the issue has a fresh accepted owner-path
  fact for the exact action.
- Local trusted agent permissions are an accepted early constraint, not a
  reason to treat protected production, credentials, live accounts, or secrets
  as open.

## Production-Bound Prerequisite Packet

Contract marker: `protected-access-lane-entry:v1`.

Before follow-on work opens for deploy, restore, governor, or protected smoke,
every production-bound lane must record this packet on the parent issue or a
linked prerequisite issue:

- `readOnlyDeploymentStatusPath`: one read-only deployment-status path and its
  responsible role;
- `nonDestructiveProtectedSmokeOrTestAccountPath`: one non-destructive protected
  smoke or test-account path and its responsible role;
- `secretRefOrBindingAliases`: the least-privilege secret refs or binding
  aliases needed for those paths, by name only;
- `responsibleRoles`: the role responsible for each access path and binding
  confirmation;
- `downstreamUnblockTargets`: the exact deploy, restore, smoke, command, or
  release gate each prerequisite unblocks;
- `blockerOwnershipIssue`: the first-class blocker or owner-scoped prerequisite
  child for every missing item.

An incomplete packet is `blocked`, not locally shippable, and not ready for
production-bound fan-out. Do not wait for a downstream deploy or protected
smoke lane to rediscover missing access.

## Required Gate States

Every applicable gate must be one of:

- `verified`: current issue-linked evidence proves the gate.
- `not_applicable`: the issue records why the gate does not apply.
- `blocked`: a named owner/action and first-class blocker exist where another
  issue owns the unblock.
- `stale`: evidence exists but predates a material source, config, credential,
  environment, deploy, or policy change.
- `failed`: a check ran and failed, with result and next owner/action recorded.

Only `verified` and justified `not_applicable` are green. `blocked`, `stale`,
and `failed` are not shippable states.

Narrative status alone does not satisfy a gate. Evidence must be inspectable in
Paperclip comments, issue documents, attachments, work products, approvals,
review decisions, blocker relations, or repository docs.

## Gate Matrix

| Gate | Primary owner | Fallback owner | Accepted evidence |
| --- | --- | --- | --- |
| Product acceptance | 02 CPO / 02 WPM for product direction; Soar PM or Roost PM for app lane | 00 AIA / 04 COO | Accepted slice, user value, scope exclusions, UX/user-flow acceptance, unresolved product questions, and app PM closure. Product scheduled automation is parked/manual-only while 02 CPO remains paused; Soar/Roost PM substitutes are accepted owner paths. |
| Technical acceptance | 09 CTO | 09 TSA | Affected architecture surface, contracts, data/API/runtime boundary, migration risk, rollback/deploy implications, and technical acceptance review. Canonical CTO routine `dbbad564-5c3a-474e-ab61-a594091dbdf6` remains active; retired duplicate `7f8ad6ce-9380-4c96-906f-488308359f8a` is paused/disabled. |
| Implementation diff | Implementing specialist, coordinated by Engineering Delivery / app PM | 09 CTO / 09 TSA | Dirty-worktree baseline, scoped diff, affected files/entities, no unrelated rewrites, source-control closure block, commit SHA or no-commit reason, push status, deploy impact, and residual risk. |
| Automated tests | 09 TAE | 09 QVE | Smallest relevant command output first, broadened typecheck/build/release smoke when risk requires it, exact command/result, artifact or report link, stale trigger, and failure next owner. |
| QA/browser proof | 09 QVE | 09 TAE | Works/fails/blocked matrix, route or user action, screenshot/video/trace/log where applicable, account class, viewport/device when relevant, redaction note, and protected proof blocker if proof cannot legally run. |
| Security/privacy review | 10 SPA | 09 CTO / 09 DRE for technical evidence | Secret/auth/permission/data mutation/destructive/live-account review, owner-path fact or blocker, redaction statement, screenshot/log handling, and residual risk. |
| Code review | 09 CTO for architecture/technical fit; peer specialist for layer review | 04 DPM / 00 AIA for routing | Reviewer decision, approval, execution decision, or issue-thread interaction that states the scope reviewed and accepted/requested-changes outcome. |
| Documentation evidence | Docs Memory Lead | App PM / 09 CTO | Updated source-of-truth doc, project index/status map, app completion or architecture evidence doc, or explicit no-doc-change reason with owner. |
| Deployment/readback | 09 DRE | Ops Release Lead / app PM for app context | Deployment evidence packet with source branch/remote/SHA, target environment, Coolify resource inventory or blocker, deploy readback, migration risk, secret handling, rollback plan, push status, and deploy impact. |
| Monitoring/rollback | 09 DRE | Ops Release Lead / 09 QVE | Health/readback packet with observed timestamp, checks, result, incident/blocker, next check owner, rollback target/mechanism/owner, data migration reversibility, and safe-stop plan. |

## Accepted Evidence Packets

Use these accepted issue documents as the packet definitions:

- Deployment/readback/monitoring/rollback:
  [LUC-7020 schema](/LUC/issues/LUC-7020#document-schema), revision
  `cae67a83-3077-42a0-87a1-c5cf949e08ef`.
- Automated-test and browser proof:
  [LUC-7021 QA proof packet](/LUC/issues/LUC-7021#document-qa-proof-packet),
  revision `c4e72bb7-5efb-45a5-992e-243022fc7d67`.
- Security/privacy proof:
  [LUC-7022 security/privacy packet](/LUC/issues/LUC-7022#document-security-privacy-evidence-packet),
  revision `95fa1d1e-9017-411e-9540-b03d317d67ed`.
- Routine enforcement after-state:
  [LUC-7023](/LUC/issues/LUC-7023) final closure comment and work products.

Minimum closure block for release/deploy-impacting work:

```md
## Release/Deploy Evidence

- Application/repo:
- Source: branch, remote, SHA or blocker
- Local verification: commands/results or blocked/stale/failed
- Push status: not needed | held for batch | pending | pushed | blocked
- Deploy impact: none | auto-redeploy expected | redeploy observed | requires Ops | blocked
- Coolify/resources: project/environment/resources or blocker
- Monitoring/readback: state plus evidence or blocker
- Rollback: target/mechanism/owner or blocker
- Security/redaction: no secrets/private data exposed; protected actions performed: no/yes with approval
- Residual risk:
- Next owner:
```

## Product And Technical Routine Posture

Accepted routine cleanup from [LUC-7023](/LUC/issues/LUC-7023):

- Product acceptance scheduled automation is intentionally parked/manual-only:
  routines `f0e2ddc6-45ef-4d26-86a3-d7a881f71e0e` and
  `c7b1cfbd-6fbf-483d-a890-4ad44b1aa89b` are paused with triggers disabled
  while 02 CPO remains paused.
- Product/PM owner-path coverage is restored through 11 IPM, with app-specific
  substitutes 11 SPM for Soar and 11 RPM for Roost.
- CTO technical acceptance remains scheduled through canonical routine
  `dbbad564-5c3a-474e-ab61-a594091dbdf6`; the duplicate
  `7f8ad6ce-9380-4c96-906f-488308359f8a` is paused with trigger disabled.

## Application Links

Soar is the first active sellable app lane. Use these existing app docs when
attaching the bundle to Soar closure lanes:

- `C:/Personal/Projekty/Aplikacje/Soar/docs/operations/deployment-readiness-gates.md`
- `C:/Personal/Projekty/Aplikacje/Soar/docs/operations/v1-release-gate-runbook.md`
- `C:/Personal/Projekty/Aplikacje/Soar/docs/operations/coolify-vps-deployment-contract.md`
- `C:/Personal/Projekty/Aplikacje/Soar/docs/operations/post-deploy-smoke.md`
- `C:/Personal/Projekty/Aplikacje/Soar/docs/security/security-baseline.md`
- `C:/Personal/Projekty/Aplikacje/Soar/docs/status/app-completion-index.md`
- `C:/Personal/Projekty/Aplikacje/Soar/docs/status/operational-readiness-index.md`

Soar attachment remains owned by [LUC-7025](/LUC/issues/LUC-7025), which is
blocked by this source-of-truth publication plus Soar protected/source/deploy
blockers.

Roost is the second active sellable app lane. Use these existing app docs when
attaching the bundle to Roost closure lanes:

- `C:/Personal/Projekty/Aplikacje/Roost/docs/DEPLOYMENT.md`
- `C:/Personal/Projekty/Aplikacje/Roost/docs/operations/v1-release-readiness.md`
- `C:/Personal/Projekty/Aplikacje/Roost/docs/operations/coolify-vps-deployment-contract.md`
- `C:/Personal/Projekty/Aplikacje/Roost/docs/operations/post-deploy-smoke.md`
- `C:/Personal/Projekty/Aplikacje/Roost/docs/planning/acf-qa-001-validation-gates-task-contract.md`
- `C:/Personal/Projekty/Aplikacje/Roost/docs/planning/acf-ops-001-deploy-path-acceptance-task-contract.md`
- `C:/Personal/Projekty/Aplikacje/Roost/docs/ux/evidence/`

Roost attachment remains owned by [LUC-7026](/LUC/issues/LUC-7026), which is
blocked by this source-of-truth publication plus Roost protected/deploy
blockers.

## Protected Fail-Closed Rules

Leave protected work blocked until a fresh accepted owner-path fact exists for
the exact action:

- raw secret access, printing, copying, rotation, or rebinding;
- real user account validation that can touch settings, subscriptions, API
  keys, trading settings, connected integrations, or live execution state;
- protected production smoke, Coolify deploy/restart/rollback, VPS mutation,
  production database mutation, or live exchange/order/position action;
- Coolify-bound push when target resource, source ref, rollback path, smoke
  plan, and Ops/Security owner path are not current;
- screenshots, logs, transcripts, or artifacts containing private account data,
  tokens, cookies, API keys, subscription details, exchange balances, or live
  trading state without redaction.

Local evidence can prove local behavior. It cannot prove production health,
deploy success, live integration safety, or protected smoke readiness.

When protected readiness is missing, repair the prerequisite packet at lane
entry and preserve its first-class blocker. Do not create downstream execution
work merely to discover the same missing access again.

## Source-Control Closure Requirement

Every code/docs-producing issue must close with:

- repository path and files changed;
- verification commands/results;
- commit SHA or no-commit reason;
- push status;
- deploy impact;
- Coolify/resource evidence or deploy blocker when production is affected;
- residual risk;
- next owner.

Docs-only source-of-truth changes may hold push for batching unless they unblock
an active delivery gate or a release owner explicitly requests a pushed source
ref.
