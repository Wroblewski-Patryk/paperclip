# Autonomous Application And Business Lifecycle

Status: active operating contract
Version: 1.0
Effective date: 2026-07-26
Owners: Board / 00 AIA / 02 Product / 04 Operations / 09 Technology / 10 Security / 11 Innovation

## Purpose

This procedure is the canonical end-to-end operating lifecycle for applications
created, taken over, repaired, released, operated, and improved by LuckySparrow
Software House. It completes the narrower commit/push/deploy loop with the
business, product, engineering, operational, commercial, and learning controls
required to build durable software rather than merely publish code.

Paperclip is the execution and evidence authority. Roost is the owner-facing
company knowledge and procedure projection. Product repositories remain the
authority for product intent, architecture, source, tests, release contracts,
and actual behavior.

## Procedure Card

- **ID:** `PROC-SH-APPLICATION-LIFECYCLE`
- **Lifecycle state:** Active
- **Trigger:** an owner-approved app idea, an activated existing application,
  a verified defect, a release objective, an operational incident, or a
  measured improvement opportunity.
- **Entry criteria:** accountable offering owner; active goal/project; known
  repository and environment boundaries; first expected user/business outcome;
  risk classification; and one runnable Paperclip issue or explicit decision
  gate.
- **Primary output:** an evidence-backed application increment that is either
  accepted in its declared environment and use boundary, or honestly blocked,
  deferred, cancelled, or superseded with a named next owner.
- **Exit criteria:** applicable lifecycle gates are green; source, deployed
  version, product readiness, and commercial boundary agree; operational
  ownership exists; evidence is attached; and the next product/learning action
  is recorded.

## Authority And Source Boundaries

| Source | Authority |
| --- | --- |
| Paperclip | goals, agent ownership, issues, runs, approvals, budgets, blockers, completion evidence, and recovery paths |
| Roost | company-facing offering, procedure, KPI, decision, dependency, and operating-state projection |
| Product repository | product brief, architecture, code, migrations, tests, release contract, runbooks, and versioned evidence |
| Coolify/VPS/providers | observed deployment and runtime state; never product intent |
| Human board | strategy, commercial activation, authority expansion, protected exceptions, and irreversible/high-impact decisions |

No projection silently overwrites its authority source. Conflicting facts fail
closed until reconciled and superseded explicitly.

## Lifecycle State Machine

```text
direction
  -> opportunity validation
  -> product discovery
  -> business and risk framing
  -> product/UX acceptance
  -> architecture and delivery design
  -> release planning
  -> implementation
  -> verification and review
  -> release readiness
  -> commit and push
  -> deploy and migrate
  -> production acceptance
  -> operate and support
  -> measure and learn
  -> improve, expand, maintain, retire, or return to discovery
```

The flow is iterative, but it is not allowed to become an evidence-free loop.
Every transition must attach current proof or name a first-class blocker and
next owner.

## Stage Contract

| # | Stage | Accountable owner | Required output and evidence | Exit gate |
| --- | --- | --- | --- | --- |
| 1 | Direction and portfolio fit | Board / 00 AIA / 11 CINO | owner intent, strategic fit, active/parked decision, opportunity cost, success boundary | offering is activated or explicitly parked |
| 2 | Opportunity and problem validation | Product / Innovation | target user, job-to-be-done, evidence of the problem, alternatives, assumptions, falsification test | problem and intended outcome are credible enough for a bounded slice |
| 3 | Business framing | Product / Finance / Legal as applicable | value proposition, use boundary, cost model, pricing hypothesis, legal/privacy constraints, measurable outcome | business promise and non-goals are explicit; protected decisions are approved or blocked |
| 4 | Product discovery and requirements | App PM / Product | journeys, personas, acceptance criteria, error/empty/loading/configuration states, dependencies, versioned scope | first release or repair slice is testable and accepted |
| 5 | UX and accessibility design | UX / UI / Product | information architecture, flows, responsive states, accessibility expectations, reference assets, usability risks | user can discover, understand, complete, and recover from the primary journey in the design contract |
| 6 | Architecture, data, and threat design | CTO / TSA / Security | impacted contracts, frontend/API/worker/data/integration topology, tenancy, privacy, threat model, migration and rollback strategy, observability | architecture fits existing systems and high-risk unknowns have owners |
| 7 | Delivery and release planning | Delivery / Operations / PM | MECE issue tree, critical path, owners, WIP/dependency rules, verification matrix, environment plan, rollout/rollback plan | smallest end-to-end slice is runnable without vague ownership |
| 8 | Implementation | Layer specialist | scoped reversible diff, migration/config changes, code comments where needed, no unrelated rewrite, source baseline | implementation matches accepted contracts and is ready for proof |
| 9 | Automated verification | Test Automation / specialist | targeted unit/integration/contract/migration tests first; broader typecheck/build/e2e based on risk; exact results | required automated checks pass or a concrete blocker exists |
| 10 | User-flow QA | QA / Product / UX | browser/device journey, accessibility and failure-state checks, screenshots/video/trace when useful, regression matrix | declared user journey works across affected layers |
| 11 | Independent review | Code Review / CTO / Security | diff and architecture review, maintainability, dependency/supply-chain, abuse/privacy/secret review, resolved findings | reviewer accepts or requests changes through a typed waiting path |
| 12 | Documentation and operational readiness | Docs / DRE / support owner | product/architecture/API/operator docs, release notes, runbook, observability, alert ownership, backup/restore and support impact | future operator and agent can run, diagnose, and recover the slice |
| 13 | Release decision | PM / QVE / DRE / Security | complete gate packet, source branch/SHA, environment, capacity, migration, rollback, smoke, known limitations, GO/NO-GO | every applicable gate is verified or explicitly not applicable |
| 14 | Source-control closure | Delivery / author | coherent commit(s), clean/non-divergent branch, verification refs, deploy impact | meaningful constructive batch is pushed under standing consent; trivial-only batches may wait for a named batching condition |
| 15 | Deployment and migration | DRE / Security when protected | Coolify resource inventory, source binding, deployment IDs/states, migration result, secret-redaction statement, cleanup | expected resources run the intended immutable SHA/config with data preserved |
| 16 | Production acceptance | QVE / DRE / App PM | health/readiness, logs, public and authorized smoke, browser proof, version readback, restart/error state, residual risk | production behavior matches the release contract and use boundary |
| 17 | Operate, support, and observe | Operations / Product / support owner | SLO/SLI signals, alerts, capacity, backups, incidents, user feedback, costs, adoption and business outcome metrics | service has an accountable operating path; exceptions become issues/incidents |
| 18 | Retrospective and improvement | COO / accountable stage owner | outcome vs objective, DORA/quality/business observations, root cause, learning disposition, prevention/eval/routine/doc update | learning is promoted to the narrowest durable control and next action is owned |

## Cross-Cutting Quality Gates

Every release slice evaluates these qualities proportionally to risk:

- usefulness and product acceptance;
- correctness and regression protection;
- usability, accessibility, and responsive behavior;
- security, privacy, tenancy, authorization, and secret handling;
- reliability, availability, graceful degradation, and recovery;
- data integrity, migration safety, backup, restore, and retention;
- performance, capacity, resource cost, and scalability;
- observability, auditability, supportability, and incident response;
- maintainability, architecture fit, dependency and supply-chain health;
- deployment reproducibility, immutable provenance, rollback/forward-fix;
- commercial, legal, financial, and customer-communication readiness when that
  operating scope is activated.

An item is `verified`, `not_applicable` with rationale, `blocked`, `stale`, or
`failed`. Only the first two are green.

## Meaningful Commit, Push, And Deployment Rule

Implementation must not accumulate indefinitely as local-only work. A coherent
batch is meaningful when it contains a verified production/blocker fix, a
complete user-value slice, a compatible multi-layer change, a dependency or
configuration change required by active delivery, or an accepted release
candidate.

For a known clean application branch whose normal push triggers Coolify:

1. record the local source SHA, verification, expected resources, capacity,
   rollback target, and smoke plan;
2. push the coherent batch without asking again under the owner's standing
   consent;
3. observe Coolify rather than assuming the webhook ran;
4. verify every affected resource and immutable deployed SHA;
5. run health/readiness, relevant authorized API smoke, and production browser
   verification;
6. inspect errors, restarts, capacity, migration/data state, and monitoring;
7. attach evidence and either continue the next legal lane or open one bounded
   recovery issue.

Do not force-push, guess a deployment target, expose or mutate secrets, run a
manual deploy/restart/rollback, change paid resources, perform destructive
cleanup, or mutate live customer/financial/trading state without the separate
gate for that exact action.

Documentation/context-only or cosmetic-only commits normally wait for a named
release batch unless they change an active operating contract, unblock current
delivery, or a release owner explicitly needs the remote source. Capacity and
production risk can still make an otherwise valid push temporarily unsafe.

## Evidence Bundle

Every release-impacting parent issue must provide or link:

- business/product acceptance and declared use boundary;
- affected journeys, architecture entities, files, data, integrations, and
  environments;
- exact test, build, review, security, documentation, deploy, monitoring, and
  browser evidence applicable to the change;
- local branch/SHA, remote branch/SHA, deployed SHA, and alignment state;
- migration and data-preservation result;
- Coolify project/environment/resource and deployment state;
- rollback/forward-fix target, trigger, owner, and safe-stop condition;
- known limitations, residual risk, next owner, and next check time;
- learning disposition: `not_applicable`, `one_off`, or `systemic` with
  prevention evidence/follow-up as required.

Evidence must be inspectable through Paperclip issue comments, documents,
attachments, work products, approvals, or versioned repository sources. A
local path, successful commit, healthy endpoint, or agent statement alone is
not end-to-end completion.

## Failure, Incident, And Recovery Path

- A failed local gate returns to the smallest responsible stage and owner.
- A failed auto-redeploy is diagnosed in order: remote/upstream, source binding
  and webhook, team/project/environment/resource identity, token scope,
  capacity, queue, build logs, runtime logs.
- A failed production smoke stops further rollout. Preserve redacted evidence,
  assess user/data impact, and use the approved rollback or forward-fix path.
- An incident is contained first, then investigated as a problem/root cause,
  then resolved through a controlled change. Containment is not closure.
- Repeated, systemic, or high-risk failures require prevention and an eval or
  regression signal before closure.

## Business Operation And Commercial Transition

Deployment is not commercial readiness. Moving an application from Innovation
to Product/Service requires a versioned acceptance decision covering the
primary journeys, onboarding, support, permissions, data isolation, security,
privacy, backup/recovery, monitoring, known limitations, pricing/billing where
applicable, legal/customer obligations, and owner acceptance.

After release, Product and Operations compare technical health with real
outcomes: activation, task success, retention/usage, support load, reliability,
cost, risk, and owner/user feedback. Those observations decide whether to
improve, expand, maintain, reframe, pause, or retire the offering.

## Procedure Governance

- Operational wording may be clarified by 04 COO with Docs Memory review.
- Changes to authority, protected actions, secrets, production, commercial
  promises, legal/financial gates, or autonomy level require board approval.
- Every run records the procedure ID/version, issue/release, gate outcomes,
  evidence, exceptions, and learning.
- Review at least after a material incident, repeated failure, architecture or
  deployment-model change, and before the next commercial-stage promotion.
- Roost may render this procedure and its current KPIs/relations, but Paperclip
  remains the live execution/evidence authority until a separately approved
  integration phase changes that boundary.

## Related Contracts

- `docs/softwarehouse-sdlc.md`
- `docs/agent-policy-gates.md`
- `docs/softwarehouse/local-first-shippable-gate-bundle.md`
- `docs/softwarehouse/05-definition-of-done.md`
- `docs/softwarehouse/08-devops-and-release.md`
- `docs/softwarehouse/13-app-lifecycle-standard.md`
- `docs/softwarehouse/14-business-operating-standard.md`
- `docs/softwarehouse/17-knowledge-governance.md`
- `docs/softwarehouse/18-roost-company-knowledge-plane.md`
- `.agents/state/softwarehouse-task-lifecycle-contract.md`
