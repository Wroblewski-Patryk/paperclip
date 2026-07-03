# LuckySparrow Software House Role Coverage Audit

Last updated: 2026-07-03

## Scope

This audit checks whether the local Paperclip Softwarehouse has the roles
needed to create and improve software autonomously enough to take over app
work, run known-state scans, coordinate fixes, verify readiness, and keep
deployment/release work controlled.

This Paperclip instance is the softwarehouse layer. Broader business roles may
exist in the roster for future expansion, but they must not become delivery
dependencies until the software creation loop is reliable.

## Live Configuration Snapshot (2026-07-03)

Verified against the local Paperclip API at `http://127.0.0.1:3200` and the
managed instruction bundles after syncing the roster instructions.

| Check | Result | Notes |
| --- | --- | --- |
| Live agents | pass | 38 live agents and 38 roster entries. |
| Roster mapping | pass | 38/38 live agents map to a roster key. |
| Source role files | pass | 38/38 roster role files exist in `softwarehouse/instructions/roles/`. |
| Managed instruction bundles | pass | 38/38 live agents use managed `AGENTS.md` bundles. |
| Operating standard audit | pass | `pnpm softwarehouse:operating-standard-audit` reports `ok: true` with no findings. |
| Org chain health | pass | 38/38 live agents report healthy org chains. |
| Heartbeat concurrency | pass | 38/38 live agents have `runtimeConfig.heartbeat.maxConcurrentRuns = 1`. |
| Agent creation authority | pass | Only `06 CHRO` has `canCreateAgents = true`; AID designs/reviews AI-agent changes but cannot create agents directly. |
| Routine coverage | pass with review needed | 59 routines exist, 30 active and 29 paused, all with triggers. |
| Secret handling | accepted local debt | 60 secret-looking env keys are configured as plain adapter env entries across 12 agents. This is acceptable for the current private local phase, but should migrate to Paperclip secret refs before broader operation. Values were not printed in this audit. |
| Workspace scoping | pass | 31 agents start in `Paperclip_Softwarehouse`, 2 portfolio agents start in the portfolio root, and 5 app PMs start in their app roots (`Soar`, `Roost`, `Aviary`, `Featherly`, `Nest`). |
| Role-file noise | pass | 18 non-roster role files were archived under `softwarehouse/instructions/roles-archive/legacy-2026-07-03/`; active `roles/` now matches the 38-agent roster. |

The 2026-07-03 prompt sync propagated the latest blocker readback, resume
discipline, evidence-gate, workspace-scope, and CHRO-owned hiring rules to all
live managed agent bundles.

## Implemented Roles

| Business Function | Paperclip Role | Status | Notes |
| --- | --- | --- | --- |
| Portfolio ownership | Portfolio Director | implemented | Owns project intake, priorities, root indexes, and final operating truth. |
| Per-project management | Soar Project Manager | implemented | Owns Soar version progress, queue, blockers, routines, and project-level integration. |
| Next-project intake | Roost Project Manager | implemented for preparation | Owns Roost/companycore scan, known-state baseline, future local bridge constraints, and future takeover plan. User-facing Roost direction routes through `02 Product`; broad implementation waits for Portfolio/Innovation activation plus Product acceptance. |
| Product management | 02 CPO + Web Product Manager | implemented | Owns dream-to-product interpretation from board intent, project `docs/architecture`, app PM packets, workflow maps, acceptance criteria, non-goals, UX direction, and release slices before CTO/Delivery implementation. |
| Architecture | 09 CTO + Technical Solution Architect | implemented | Owns architecture contracts, feasibility, traceability, implementation boundaries, specialist routing, and no-regression strategy after Product accepts the user-facing slice or marks work as technical-only repair. |
| Engineering coordination | Engineering Delivery Lead | implemented | Splits work into specialist lanes; does not implement feature code. |
| Source-control closure | Engineering Delivery Lead + Project Manager | implemented | Requires commit SHA/no-commit reason, push disposition, verification, and deploy impact for implementation/docs lanes. |
| Frontend | Frontend Engineer | implemented | Owns web UI/routes/client state/browser evidence. |
| Backend/API | Backend API Engineer | implemented | Owns routes/controllers/services/validation/auth boundary. |
| Data/persistence | Data Persistence Engineer | implemented | Owns schema, migrations, integrity, backup/restore proof. |
| Trading/runtime integration | Integration Trading Engineer | implemented | Owns exchange, orders, positions, runtime, PAPER/LIVE boundary. |
| AI/runtime automation | AI Agent Runtime Engineer | implemented | Owns assistant, agents, tool/runtime boundaries. |
| QA strategy | QA Regression Lead | implemented | Owns proof standard, release confidence, production smoke account matrix. |
| Test automation | Test Automation Engineer | implemented | Owns repeatable tests, browser proof, fixtures, flake triage. |
| Security | Security Review Lead | implemented | Owns auth, secrets, production accounts, abuse cases, release security gates. |
| Ops/release/deploy | Ops Release Lead | implemented | Owns local/Docker/Coolify/VPS deploy, rollback, observability, committed-source release checks. |
| Docs/memory/indexes | Docs Memory Lead | implemented | Owns docs maps, ledgers, evidence hygiene, template feedback. |
| UX/view quality | UX Visual Lead | implemented | Owns view maps, visual quality, screenshots, design evidence. |

## Soar V1 Takeover Readiness

The implemented role set is sufficient for the next Soar request:

1. The local Soar project coordinator acts as the user-to-Paperclip bridge.
2. Soar Project Manager owns the Soar app queue, version target, blockers, and
   project-level state.
3. Portfolio/Innovation PM sends project dream, `docs/architecture`, and
   evidence context into Product; Product/CTO define the accepted mission and
   known-state target.
4. Delivery Lead splits the mission into lanes.
5. Frontend, Backend, Data, Integration, AI Runtime, Ops, Security, QA, Test
   Automation, Docs, and UX each scan their layer.
6. QA and Security can block V1 readiness.
7. Ops owns Coolify/VPS deploy checks and post-deploy smoke.
8. Docs Memory records the final state and feeds reusable changes back to
   `!template`.

## Audit-To-Completion Responsibility

For the current target version, such as Soar V1, role responsibility continues
after the first scan:

| Phase | Owner | Output |
| --- | --- | --- |
| Target definition | CPO/Web Product Manager + CTO/Technical Solution Architect + Portfolio Director | version scope, required workflows, non-goals, release gates, and technical acceptance boundary |
| Project coordination | Soar Project Manager | current version state, queue, blockers, routine readiness, project-level escalation |
| Full scan | All specialist lanes | evidence-backed known-state per layer |
| Gap register | Engineering Delivery Lead + Docs Memory Lead | owned gaps with severity, workflow, files, proof requirement |
| Repair delegation | Engineering Delivery Lead | child issues with one accountable owner per layer |
| Layer repair | Specialist agents | smallest coherent fix plus local evidence |
| Regression proof | QA Regression Lead + Test Automation Engineer | repeatable command/browser/API proof and failure ledger |
| Security gate | Security Review Lead | auth/secrets/accounts/API-key/live-risk pass/blocker |
| Deploy gate | Ops Release Lead | committed-source deploy status, Coolify/VPS, rollback, post-deploy smoke |
| Version closure | Soar Project Manager + CTO/Technical Solution Architect + CPO/Web Product Manager + Portfolio Director | release confidence decision or explicit blocker list |

The Softwarehouse should keep working through this loop until the target
version is fully known. `100%` means all required workflows have proof-backed
status, not that every imagined future feature is implemented.

## Explicit Production Safety Ownership

| Concern | Owner | Gate |
| --- | --- | --- |
| Commit quality | Engineering Delivery Lead + CTO | small, coherent, validated commits |
| Push readiness | Engineering Delivery Lead + Project Manager + Ops | clean source ref, explicit branch/remote intent, required checks, deploy impact known |
| Coolify/VPS status | Ops Release Lead | read-only status/log checks allowed when credentials are configured |
| Coolify deploy/restart/rollback/env change | Ops Release Lead + Security Review Lead | explicit release issue or user-approved task |
| Secret storage | Security Review Lead | Paperclip secrets or approved encrypted local secret manager |
| Production smoke design | QA Regression Lead + Test Automation Engineer | account class, expected proof, cleanup |
| User real account checks | Security Review Lead + QA Regression Lead | explicit narrow approval, no unapproved mutations |
| Soar exchange/API-key/live trading checks | Security Review Lead + Integration Trading Engineer | fail-closed, no live mutation without exact approval |

## Dormant Or Future Business Functions

These are real business functions, but they are not required to run the current
softwarehouse takeover loop. Some are already present as paused or
boundary-limited agents; they should remain dormant until software creation is
stable enough to absorb broader business operations.

| Function | Suggested Future Owner | Current Handling |
| --- | --- | --- |
| Legal counsel/compliance sign-off | CLO / Security | present but paused or gate-limited; no legal conclusions. |
| Sales/GTM | CRO | present but should stay non-blocking for software delivery. |
| Customer support | CCO / CSM | present but paused until users/customers exist. |
| Billing/accounting | CFO | present but paused; subscription behavior remains Product/QA/Security test scope. |
| Marketing/content | Future marketing owner | not a softwarehouse delivery dependency. |
| HR/vendor management | CHRO / POP | CHRO active for agent staffing and quality; people/vendor operations remain paused. |

## Current Verdict

For Soar V1 technical takeover, deployment stabilization, and full application
known-state scan: role coverage is implemented.

For Roost/companycore takeover preparation: per-project management is
implemented, with shared specialist lanes available after Portfolio/Innovation
activation and `02 Product` acceptance of the user-facing workflow, non-goals,
and local-vs-VPS constraints.

For the entire broader LuckySparrow business: role coverage is intentionally
partial and should be expanded later in the main company Paperclip instance,
not inside this softwarehouse pilot, unless the user decides otherwise.

For a strict autonomous software-creation company score, the current agent
configuration is strong but not yet fully excellent. It has a coherent org
chart, healthy managed instruction distribution, evidence gates, learning roles,
active routines, CHRO-owned hiring authority, and narrower default workspaces.
It is held below excellent by accepted local plain-env secret debt and paused
Product/UX acceptance paths that still require manual judgment for some work.
