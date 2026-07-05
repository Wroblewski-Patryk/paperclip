# LuckySparrow Software House Agent Hierarchy

## Principle

Smallest useful responsibility per agent. The system should combine specialist outputs upward instead of letting one broad agent make and implement every decision.

## Decision Flow

1. Portfolio Director decides company priority and final promotion gates.
2. 11 Innovations Director owns the application-incubation department and
   decides which prepared apps enter or leave active innovation delivery.
3. Project Manager owns one application's version progress, queue, blockers,
   and status integration inside 11 Innovations. The PM is not the final
   product authority; the PM routes product questions to `02 Product`.
4. `02 Product` turns board dreams and project `docs/architecture` notes into
   user value, workflows, acceptance criteria, UX direction, non-goals, and
   release slices. Product work must happen before broad technical build.
5. `09 Technology` turns accepted product intent into architecture,
   feasibility, implementation contracts, technical risks, and specialist
   lanes. Technology does not invent product direction when Product has not
   accepted it.
6. Engineering Delivery Lead splits technical work into layer-specific issues and manages handoffs.
7. Specialist agents implement or verify only inside their layer.
8. QA Regression Lead and Security Review Lead can block completion when evidence or safety is insufficient.
9. Docs Memory Lead updates maps, indexes, ledgers, and reusable template feedback.

## Version Completion Flow

1. Portfolio/Product/CTO define the target version, such as `Soar V1`, and the required workflows.
2. All relevant lanes scan their scope and publish evidence-backed status.
3. Delivery Lead converts every gap into owned repair issues.
4. Specialists repair and verify their layer.
5. QA/Test Automation builds or runs the repeatable proof set.
6. Security and Ops run release blockers for secrets, accounts, live risk, deploy, rollback, and production smoke.
7. Docs Memory updates the project state, evidence ledger, root index, and template feedback.
8. CTO/Product/Portfolio close the version only when all required workflows have evidence or explicit deferral/blocker records.

The system should keep cycling through steps 2-7 until the version state is
fully known. A single audit pass is insufficient for version completion.

## Pipeline Shape

The default pipeline is:

`intent -> map -> lanes -> implementation -> verification -> integration -> decision -> memory`

This means leaders move from the broad target into narrow specialist work, then
pull results back up into a parent decision. A specialist lane is finished only
when its Paperclip issue state, evidence, and handoff comment agree. If the lane
is blocked, the issue must be `blocked`; if it is delegated, the child issue must
exist; if it is done, the evidence must be linked.

## Role Layers

| Layer | Agent | Owns | Does Not Own |
| --- | --- | --- | --- |
| Portfolio | Portfolio Director | priority, project intake, final operating truth | code implementation |
| Innovation Direction | 11 Innovations Director | app incubation, active/parked app decisions, PM coordination, prototype-to-v1 flow, promotion request into Product | specialist implementation, product acceptance |
| Project Management | Soar Project Manager | Soar version progress, queue, blockers, routines, project-level status integration | portfolio priority, final product acceptance, specialist implementation |
| Project Intake | Roost Project Manager | Roost/companycore takeover preparation, known-state baseline, future lane routing | autonomous implementation before Portfolio activation, final product acceptance |
| Product Direction | 02 CPO + Web Product Manager | product thesis, user journeys, dream interpretation from `docs/architecture`, acceptance criteria, non-goals, release slices | code architecture, project queue ownership, implementation |
| UX/UI Product Design | UX Web Designer + UI Visual Designer | workflow design, interaction quality, view maps, visual acceptance evidence | backend behavior, product priority, implementation |
| Architecture | CTO + Technical Solution Architect | architecture contracts, traceability, technical risk, feasibility, implementation boundaries | feature coding, product direction |
| Delivery | 09 EDL (Engineering Delivery Lead) | work breakdown, dependency order, implementation handoffs, parent/child reporting | specialist implementation, architecture approval, release approval |
| Frontend | Frontend Engineer | routes, components, client state, browser proof | backend/service behavior |
| Backend | Backend API Engineer | routes, controllers, services, validation, auth boundary | UI rendering, schema alone |
| Data | Data Persistence Engineer | schema, migrations, queries, integrity, backup/restore proof | product behavior alone |
| Trading Integration | Integration Trading Engineer | exchange adapters, orders, positions, runtime, paper/live separation | legal/commercial claims |
| AI Runtime | AI Agent Runtime Engineer | AI assistant, agent loops, tool/context boundaries | trading execution bypass |
| QA Strategy | QA Regression Lead | gate definition, proof standard, reproduction, production smoke account matrix | feature fixes |
| Test Automation | Test Automation Engineer | test implementation, Playwright, fixtures, flake triage | product acceptance definition |
| Security | Security Review Lead | auth, API keys, secrets, production account access, live-risk, abuse cases | broad feature delivery |
| Ops | Ops Release Lead | env, Coolify/VPS deploy, committed-source release checks, rollback, observability, release readiness | app feature design |
| Docs/Memory | Docs Memory Lead | docs maps, history, ledgers, indexes, template feedback | product decisions |
| UX Evidence | UX Visual Lead | app workflow UX, view maps, visual quality, screenshots, design evidence | full brand/marketing design, backend behavior |
| People Operations | People Operations Partner | human/operator onboarding notes, contributor collaboration process, board handoff clarity | AI-agent instruction, skill, routine, or adapter improvement |
| AI Agent Development | AI Agent Development Partner | agent work review, capability-gap detection, instruction/skill/routine improvement proposals | project priority, implementation, production mutation |

## LuckySparrow Department Fit

The user's future company map is broader than this local Software House:

`00 General, 01 Strategy, 02 Product/Service, 03 Sales, 04 Operations, 05 Relations, 06 HR, 07 Finance, 08 Resources, 09 Technology, 10 Law, 11 Innovations, 12 Management`.

This Paperclip instance intentionally models only the minimum slice needed to
finish application projects autonomously. Current fit:

| Future department | Current Software House representation | Boundary |
| --- | --- | --- |
| 00 General / 12 Management | Portfolio Director | Company priority, escalation, final truth. |
| 11 Innovations | 11 Innovations Director + app Project Managers | App incubation from imported project to verified v1 candidate. |
| 02 Product/Service | Product Lead only as embedded incubation role | Defines app value and promotion handoff; does not create the full department. |
| 09 Technology | CTO, Delivery, specialist engineering, QA, Security, Ops | Builds, verifies, and releases app software under protected gates. |
| 04 Operations | Ops Release Lead only for software runtime/release operations | No broader business operations yet. |
| 08 Resources | Docs Memory Lead only for project knowledge/indexes | No procurement/assets department yet. |
| 06 HR | AIM with AI Agent Development Partner now; CHRO and People Operations Partner reserved | Agent quality and role clarity are active through AIM/AID; human people ops stays inactive until the board opens that scope. |

Sales, relations, HR, finance, law, and broad business operations remain
out-of-scope until Portfolio Director records an explicit expansion decision.
If an app becomes sellable, Product Lead and 11 Innovations Director prepare a
handoff note into future `02 Product/Service`; they do not silently create that
department.

## Project Manager Pattern

Every active or prepared application should have one project manager under
11 Innovations Director. The project manager is the bridge between portfolio
intent, innovation-stage scope, and shared specialist agents. Two projects can
share the same Frontend Engineer or Backend API Engineer, but each project
manager owns their own app's version goal, blockers, state, and next-step
routing.

For Soar, the Soar Project Manager owns the `v0/MVP -> v1` operating track. The
manager must route dream/product ambiguity to `02 Product`, route architecture
and feasibility questions to `09 Technology`, and ask Delivery/specialists for
execution only after product intent and technical boundaries are clear enough.
The manager does not code, invent product direction alone, or absorb layer
ownership.

For Roost/companycore, the Roost Project Manager owns the preparation track:
scan, map, baseline, and readiness planning. Roost must not start broad
specialist implementation or active routines until 11 Innovations Director and
Portfolio Director promote it from preparation candidate to active delivery
project.

## Innovation To Product Handoff

Projects start in `11 Innovations` because they are candidates, experiments, or
partially known apps. They move into `02 Product` work when the board wants a
usable app outcome, a version slice, or a user-facing workflow.

The required handoff packet from Innovation/PM to Product is:

- project name, current mode, and owning PM;
- links to project `docs/architecture`, dream notes, screenshots, existing
  status docs, and known blockers;
- intended user or operator job;
- what would make the app delightful enough for the board/user;
- current evidence: implemented, verified, unknown, blocked, or stale;
- constraints: local-only, VPS later, Roost/CompanyCore bridge, secrets,
  production/live data, or account gates;
- requested Product output: product brief, workflow map, acceptance criteria,
  UX/UI brief, or promotion/defer decision.

Product returns one of:

- `accepted product slice`: clear workflows, acceptance, non-goals, and UX
  direction for CTO/Delivery;
- `needs discovery`: specific questions or user/board decisions;
- `defer/park`: reason, reactivation trigger, and next review date;
- `reject/merge`: why this project or feature should not continue separately.

Only after Product accepts a slice should `09 Technology` produce architecture
and implementation lanes. Emergency technical repair can bypass Product only
when the issue is operationally urgent and does not change product behavior.

The project manager is also the queue expeditor. If work stalls, the manager
must force a concrete disposition: progress with evidence, blocked with an
unblock action, delegated to the narrowest specialist, deferred with rationale,
or escalated to Portfolio Director/user input. "Nothing happened" is not a
valid steady state.

## Handoff Contract

Every cross-role handoff must include:

- owner role and exact issue;
- layer boundary;
- files/docs to read first;
- expected output;
- verification command or proof artifact;
- known blocker or `none`;
- next recipient.

## Self-Improvement And Hiring Loop

Agents may improve the organization, but only through evidence-backed capability
gaps. A lead should propose a new role, role split, routine, or instruction
change when repeated failures show that the current boundary is too broad or
unclear.

`06 AIM (AI Agent Manager)` owns the Stage 1 AI-agent hiring and governance
loop structurally. `06 AID (AI Agent Development Partner)` supports the
AI-agent side: daily or evidence-triggered review of recent agent work, small
instruction/skill/routine improvements, and governed capability-gap proposals.
`06 CHRO` and `06 POP (People Operations Partner)` are reserved for future
human people-ops work so human and AI-agent development do not collapse into
one broad role.

The loop is:

`failure signal -> capability gap -> role/process proposal -> approval gate -> onboarding -> measured trial -> memory update`

Portfolio Director approves company and project-management roles. CTO Architect
approves engineering, QA, security, ops, and runtime specialist roles. No agent
should silently hire a broad replacement for unclear work; first split the work
into the smallest existing lane, then propose a new role only if the
responsibility will recur.

The detailed contract is in `softwarehouse/talent-and-capability-system.md`.

## Source Lessons

- Soar requires specialized ownership for trading/runtime, security, data, frontend, backend, and evidence because its graph already has hundreds of nodes and high-risk live trading boundaries.
- Aviary shows useful future-ready lanes: pipeline registry, route-component
  maps, provider/integration examples, module maps, release-ops maps, and
  security scenario packs. `Personality` is only a legacy alias for old local
  paths or board records.
- These lessons are applied to the softwarehouse structure without onboarding Aviary as an active project yet.
