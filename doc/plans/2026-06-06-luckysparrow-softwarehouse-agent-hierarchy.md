# LuckySparrow Softwarehouse Agent Hierarchy Migration

Date: 2026-06-06
Source company: LuckySparrow global hierarchy pasted from the board UI
Target company: LuckySparrow Software House (`LUC`) local instance

## Scope

This migration updates only the softwarehouse operating structure. It intentionally excludes LuckySparrow-wide finance, revenue, customer success, HR, legal, and asset-management roles.

Included domains:

- company operating assistant and executive coordination
- strategy and delivery operations
- product/web design
- engineering architecture and implementation
- data persistence
- runtime/adapters/AI automation
- deployment/reliability
- QA and test automation
- technical security/privacy review
- innovation portfolio and application PMs
- documentation stewardship

## Source Shape

The pasted LuckySparrow hierarchy contains 33 agents:

- `00 AIA(AI Assistant)` as the root operating assistant
- strategy, product, revenue, operations, customer, HR, finance, assets, technology, legal, innovation, and CEO roles
- technical children under CTO: backend, code review, database, deployment, frontend, QA, runtime/adapters, solution architecture
- innovation PMs for Aviary, Featherly, Nest, Soar, and portfolio

## Target Shape

The final softwarehouse hierarchy should be:

- `00 AIA (AI Assistant)`
  - `01 CSO (Chief Strategy Officer)`
  - `02 CPO (Chief Product Officer)`
    - `02 UID (UI Visual Designer)`
    - `02 UXW (UX Web Designer)`
    - `02 WPM (Web Product Manager)`
  - `04 COO (Chief Operating Officer)`
    - `04 DPM (Delivery Project Manager)`
      - `04 DSM (Documentation Steward)`
  - `09 CTO (Chief Technology Officer)`
    - `09 CBE (Core Backend Engineer)`
    - `09 CRS (Code Review Specialist)`
    - `09 DBE (Data Persistence Engineer)`
    - `09 DRE (Deployment & Reliability Engineer)`
    - `09 FEW (Frontend Web Engineer)`
    - `09 IDE (Integration Domain Engineer)`
    - `09 QVE (QA & Verification Engineer)`
      - `Test Automation Engineer`
    - `09 RTE (Runtime & Adapter Engineer)`
    - `09 TSA (Technical Solution Architect)`
    - `10 SPA (Security & Privacy Auditor)`
  - `11 CINO (Chief Innovation Officer)`
    - `11 APM (Aviary Product Manager)`
    - `11 FPM (Featherly Platform Manager)`
    - `11 NPM (Nest Product Manager)`
    - `11 RPM (Roost Project Manager)`
    - `11 SPM (Soar Product Manager)`
  - `12 CEO (Chief Executive Officer)`

## Migration Decisions

- Preserve existing agent IDs, adapters, secret refs, runtime configs, and heartbeat settings wherever possible.
- Do not delete existing agents.
- Rename and reparent existing agents when they already cover the target responsibility.
- Add only missing softwarehouse roles.
- Keep project PM agents under `11 CINO`; they coordinate product/project status and delegate specialist work.
- Put security under CTO instead of creating a legal department, because the requested scope excludes legal but includes technical security/privacy work.
- Keep `Test Automation Engineer` as a child of QA rather than replacing it; it is useful operational specialization beyond the pasted LuckySparrow source.
- Keep `Integration Domain Engineer` as a softwarehouse-specific technical specialist because the current local company already uses that domain expertise.

## Existing-Agent Mapping

| Existing agent | Target agent |
|---|---|
| Portfolio Director | `00 AIA (AI Assistant)` |
| CTO Architect | `09 CTO (Chief Technology Officer)` |
| 11 Innovations Director | `11 CINO (Chief Innovation Officer)` |
| Product Lead | `02 WPM (Web Product Manager)` |
| UX Visual Lead | `02 UXW (UX Web Designer)` |
| Engineering Delivery Lead | `09 TSA (Technical Solution Architect)` |
| Backend API Engineer | `09 CBE (Core Backend Engineer)` |
| Frontend Engineer | `09 FEW (Frontend Web Engineer)` |
| Data Persistence Engineer | `09 DBE (Data Persistence Engineer)` |
| AI Agent Runtime Engineer | `09 RTE (Runtime & Adapter Engineer)` |
| Ops Release Lead | `09 DRE (Deployment & Reliability Engineer)` |
| QA Regression Lead | `09 QVE (QA & Verification Engineer)` |
| Security Review Lead | `10 SPA (Security & Privacy Auditor)` |
| Integration Trading Engineer | `09 IDE (Integration Domain Engineer)` |
| Docs Memory Lead | `04 DSM (Documentation Steward)` |
| Aviary Project Manager | `11 APM (Aviary Product Manager)` |
| Nest Project Manager | `11 NPM (Nest Product Manager)` |
| Roost Project Manager | `11 RPM (Roost Project Manager)` |
| Soar Project Manager | `11 SPM (Soar Product Manager)` |

## New Agents To Add

- `01 CSO (Chief Strategy Officer)`
- `02 CPO (Chief Product Officer)`
- `02 UID (UI Visual Designer)`
- `04 COO (Chief Operating Officer)`
- `04 DPM (Delivery Project Manager)`
- `09 CRS (Code Review Specialist)`
- `11 FPM (Featherly Platform Manager)`
- `12 CEO (Chief Executive Officer)`

## VPS Transfer Notes

When moving this to `paperclip_luckysparrow` on the VPS:

- Export or recreate this company after the hierarchy is stable.
- Keep scheduled heartbeats disabled during import until adapters, secrets, workspace roots, and provider auth are ready on the VPS.
- Rebind environment-specific paths such as local `cwd`, managed Codex home, project workspace roots, and any `file:` adapter packages.
- Migrate secret refs through Paperclip's secret provider flow; do not copy raw values into agent configs.
- Smoke-test with manual wakeups in this order: `00 AIA`, `04 COO`, `09 CTO`, `11 CINO`, then one specialist under each branch.

## VPS Convergence Findings

Checked against `paperclip.luckysparrow.ch` on 2026-06-06 in read-only mode.

VPS company shape:

- Company: `LuckySparrow` (`LUC`)
- Agents: 33
- Projects: 7
- Routines: 14

VPS-only company-wide roles intentionally not copied into the local softwarehouse scope:

- `03 CRO(Chief Revenue Officer)`
- `05 CCO(Chief Customer Officer)`
- `05 CSM(Client Success Manager)`
- `06 CHRO(Chief Human Resources Officer)`
- `07 CFO(Chief Financial Officer)`
- `08 CAO(Chief Assets Officer)`
- `10 CLO(Chief Legal Officer)`

VPS softwarehouse-relevant role to consider adding locally:

- `11 IPM(Innovation Portfolio Manager)` - useful as the portfolio integrator under `11 CINO`, especially once more app PMs and routines are active.

Local-only roles that are still useful for Softwarehouse and should be preserved:

- `11 RPM (Roost Project Manager)` - local Roost ownership exists even though the checked VPS metadata did not include Roost as a project/agent/routine.
- `09 IDE (Integration Domain Engineer)` - useful for domain and external integration work.
- `Test Automation Engineer` - useful execution specialization under `09 QVE`.
- `09 CBE (Core Backend Engineer)` - local title differs from VPS `09 CBE(CMS Backend Engineer)` because Softwarehouse backend scope is broader than Featherly CMS.

VPS project patterns worth copying or mapping into local Softwarehouse:

- `AI Company Operating Layers` - reusable operating system for roles, routines, quality evidence, approvals, and handoff expectations.
- `LuckySparrow Innovation Portfolio` - portfolio coordination layer for app streams.
- `Featherly Web Studio` - website-service delivery workflow using Featherly CMS.
- Existing app streams: `Soar`, `Featherly`, `Nest`, `Aviary`.

VPS routine patterns worth recreating locally with Roost included:

- Daily innovation standup and blocker sweep.
- Weekly innovation portfolio review.
- Weekly app portfolio quality gate.
- Weekly architecture, security, and runtime review.
- Friday release readiness and reliability gate.
- Operating layers daily blocker sweep.
- Per-app review loops for Aviary, Featherly, Nest, Soar, and a new Roost/CompanyCore equivalent.

Recommended local convergence step before VPS migration:

1. Add `11 IPM (Innovation Portfolio Manager)` under `11 CINO`.
2. Add or align local projects for `AI Company Operating Layers`, `LuckySparrow Innovation Portfolio`, and `Featherly Web Studio` if they are absent.
3. Add a Roost/CompanyCore review loop modeled after VPS app loops:
   - assignee: `11 RPM (Roost Project Manager)`
   - project: `Roost` or `LuckySparrow Innovation Portfolio`
   - purpose: inspect Roost/CompanyCore readiness, docs/code status, blockers, and next thin milestone issues.
4. Keep routine schedules disabled by default until the local-to-VPS adapter/secrets/workspace story is ready.

## Local Convergence Applied

Applied locally on 2026-06-06 to `LuckySparrow Software House` (`LUC`) at the active local instance.

Added agent:

- `11 IPM (Innovation Portfolio Manager)` reporting to `11 CINO (Chief Innovation Officer)`.

Added/aligned projects:

- `AI Company Operating Layers`
  - lead: `04 COO (Chief Operating Officer)`
  - status: `planned`
- `LuckySparrow Innovation Portfolio`
  - lead: `11 IPM (Innovation Portfolio Manager)`
  - status: `planned`
- `Featherly Web Studio`
  - lead: `04 DPM (Delivery Project Manager)`
  - status: `planned`

Added staging routines with disabled schedule triggers:

- `Daily innovation standup and blocker sweep`
  - project: `LuckySparrow Innovation Portfolio`
  - assignee: `11 IPM (Innovation Portfolio Manager)`
  - trigger: weekday 09:00 Europe/Warsaw, disabled
- `Weekly innovation portfolio review`
  - project: `LuckySparrow Innovation Portfolio`
  - assignee: `11 IPM (Innovation Portfolio Manager)`
  - trigger: Monday 10:00 Europe/Warsaw, disabled
- `Weekly app portfolio quality gate`
  - project: `AI Company Operating Layers`
  - assignee: `09 QVE (QA & Verification Engineer)`
  - trigger: Tuesday 11:00 Europe/Warsaw, disabled
- `Weekly architecture security and runtime review`
  - project: `AI Company Operating Layers`
  - assignee: `09 CTO (Chief Technology Officer)`
  - trigger: Wednesday 12:00 Europe/Warsaw, disabled
- `Friday release readiness and reliability gate`
  - project: `LuckySparrow Innovation Portfolio`
  - assignee: `09 DRE (Deployment & Reliability Engineer)`
  - trigger: Friday 13:00 Europe/Warsaw, disabled
- `Operating layers daily blocker sweep`
  - project: `AI Company Operating Layers`
  - assignee: `04 COO (Chief Operating Officer)`
  - trigger: weekday 08:00 Europe/Warsaw, disabled
- `Weekly client-service delivery readiness gate`
  - project: `Featherly Web Studio`
  - assignee: `04 DPM (Delivery Project Manager)`
  - trigger: Thursday 14:00 Europe/Warsaw, disabled
- `Roost CompanyCore readiness and milestone review`
  - project: `Roost`
  - assignee: `11 RPM (Roost Project Manager)`
  - trigger: Tuesday 15:00 Europe/Warsaw, disabled

Verification:

- Confirmed `11 IPM` reports to `11 CINO`.
- Confirmed all three operating projects exist with intended leads.
- Confirmed all eight staging routines exist.
- Confirmed all schedule triggers are present and disabled.

## Local Agent Operating Context Applied

Applied locally on 2026-06-06 after adding the operating projects and staging routines.

All 29 local Softwarehouse agents now have an explicit `Softwarehouse Operating Context` section in their managed `AGENTS.md` instructions. This section tells each agent:

- the current local hierarchy and their manager
- that execution remains local until the board explicitly authorizes VPS execution
- how `00 AIA`, `01 CSO`, `02 CPO`, `04 COO`, `04 DPM`, `09 CTO`, `11 CINO`, and `11 IPM` divide coordination responsibility
- which operating projects exist: `AI Company Operating Layers`, `LuckySparrow Innovation Portfolio`, `Featherly Web Studio`, and `Roost`
- that the new routines are staging/manual coordination surfaces with disabled schedule triggers
- how to route cross-cutting work through IPM, COO/DPM, CTO/TSA, QVE/CRS/DRE/SPA, or the app PMs instead of flattening everything into AIA
- to treat Soar, Featherly, Nest, Aviary, and Roost/CompanyCore as distinct outputs/workstreams of the main LuckySparrow Softwarehouse activity, with clear identities but shared portfolio alignment
- to prepare portable plans, evidence, issues, and handoffs for later VPS migration without assuming VPS access

Verification:

- Audited all 29 agent instruction bundles.
- Confirmed all 29 contain the shared operating context markers.
- Confirmed all 29 agent metadata entries include `operatingContextVersion: 2026-06-06-softwarehouse-main-stream-convergence`.
- Confirmed all 29 agent metadata entries include `softwarehouseMainStream: true`.
- Confirmed the operating projects exist locally.
- Confirmed all eight staging routines exist and all their schedule triggers remain disabled.

Clarification applied after review:

- The apps are not independent streams beside LuckySparrow.
- The main stream is LuckySparrow operating as a softwarehouse.
- Soar, Featherly, Nest, Aviary, and Roost/CompanyCore are distinct product/service workstreams produced by that main softwarehouse activity.
- Agents should keep each workstream's identity, repositories, docs, blockers, and acceptance criteria clear while tying all priorities back to the shared Softwarehouse operating goal.

## Local Projects And Goals Alignment Applied

Applied locally on 2026-06-06 after validating that projects initially had weak goal linkage.

Goal structure now has one root:

- `LuckySparrow Softwarehouse main operating stream`
  - owner: `00 AIA (AI Assistant)`
  - meaning: LuckySparrow operating as the main softwarehouse business stream

Key child goals:

- `Softwarehouse operating layers and cadence`
  - owner: `04 COO (Chief Operating Officer)`
  - project: `AI Company Operating Layers`
- `LuckySparrow innovation portfolio delivery`
  - owner: `11 IPM (Innovation Portfolio Manager)`
  - project: `LuckySparrow Innovation Portfolio`
- `Featherly Web Studio service delivery`
  - owner: `04 DPM (Delivery Project Manager)`
  - projects: `Featherly Web Studio`, `LuckySparrow.ch`
- `Soar product workstream`
  - owner: `11 SPM (Soar Product Manager)`
  - project: `Soar`
- `Featherly CMS platform workstream`
  - owner: `11 FPM (Featherly Platform Manager)`
  - project: `Featherly`
- `Nest life-organization product workstream`
  - owner: `11 NPM (Nest Product Manager)`
  - project: `Nest`
- `Aviary agent-behavior product workstream`
  - owner: `11 APM (Aviary Product Manager)`
  - projects: `Aviary`, `Aviary (archived legacy)`
- `Roost CompanyCore workstream`
  - owner: `11 RPM (Roost Project Manager)`
  - projects: `Roost`, `companycore`, `companycore-drive-fix`

Other local project mappings:

- `Paperclip` and `Paperclip_Softwarehouse` map to `Softwarehouse operating layers and cadence` with `04 COO` as lead.
- `Softwarehouse`, `WroblewskiPatryk`, `OpenJarvis`, and `Obiekty` map to the main Softwarehouse stream with `00 AIA` as lead.

Verification:

- Confirmed exactly one root company goal.
- Confirmed no projects are missing `goalId`.
- Confirmed no projects are missing `leadAgentId`.
- Confirmed no team goals are orphaned without a parent.

## Subscription-Ready Business Direction Applied

Applied locally on 2026-06-06 after clarifying the top-level business intent.

Main business intent:

- LuckySparrow operates as an agentic softwarehouse.
- The softwarehouse produces applications the operator can personally use now.
- Selected applications should later become subscription-ready products/services where access can be sold.
- Agents exist to coordinate and execute the work because one human operator cannot split attention across all streams at once.

Company description updated to reflect:

- local agentic softwarehouse
- personal use first
- subscription-ready access later
- agents coordinating execution so the operator does not have to do everything manually

Added child goals under `LuckySparrow Softwarehouse main operating stream`:

- `Subscription-ready application portfolio`
  - owner: `11 IPM (Innovation Portfolio Manager)`
- `Personal-use readiness before commercialization`
  - owner: `02 WPM (Web Product Manager)`
- `Subscription delivery and access operations`
  - owner: `04 DPM (Delivery Project Manager)`
- `Commercial readiness proof gates`
  - owner: `09 QVE (QA & Verification Engineer)`

All 29 agents now have a `Commercial Direction` section in their managed instructions:

- make the app/workstream genuinely useful for the operator first
- stabilize with evidence: tests, docs, UX proof, deployment notes, security/privacy checks, acceptance criteria
- package for later sale: onboarding path, access model, reliability expectations, support handoff, subscription-readiness blockers
- keep commercialization scoped to softwarehouse delivery readiness unless the board asks for finance/sales/marketing roles
- choose next actions that improve personal-use readiness, subscription readiness, or agent-operable continuity

Verification:

- Confirmed all four subscription-readiness goals exist under the main Softwarehouse stream.
- Confirmed all 29 agents contain the `Commercial Direction` instruction block.
- Confirmed all 29 agents have `subscriptionReadyGoal: true` and `personalUseFirst: true` metadata.

## Skills And Tools Alignment Applied

Applied locally on 2026-06-06 after comparing the VPS `LuckySparrow` skills surface with the local
`LuckySparrow Software House` company.

Finding:

- The local UI already has company skill and agent skill views: `/LUC/skills`, `/LUC/softwarehouse`,
  and each agent's `Skills` tab.
- The local company initially had only eight bundled Paperclip skills.
- All eight bundled skills had `attachedAgentCount: 0`.
- None of the 29 local agents had `paperclipSkillSync.desiredSkills` configured.

Local softwarehouse skill library now contains 24 skills:

- eight bundled Paperclip runtime skills
- adapted company operating skills:
  - `agent-personality-behavior-design`
  - `apqc-process-map`
  - `daci-governance-gates`
  - `mece-responsibility-design`
  - `paei-operating-profile`
  - `paperclip-execution-discipline`
  - `softwarehouse-knowledge-stewardship`
- product and delivery skills:
  - `product-roadmap-and-milestones`
  - `customer-discovery-feedback-loop`
  - `subscription-access-readiness`
  - `mcp-product-design`
  - `featherly-cms-delivery-system`
- technical readiness skills:
  - `repository-audit-architecture-map`
  - `owasp-web-security-review`
  - `sre-release-readiness`
  - `roost-companycore-readiness`

Conscious exclusions from the VPS skill set:

- pricing/margin, legal/privacy as a legal department, people/HR, and broad customer/sales skills were
  not imported as operating departments.
- The retained feedback/subscription skills are framed as product and engineering readiness, not
  marketing, finance, legal, or sales ownership.

Agent assignment model:

- All 29 agents now have `paperclipSkillSync.desiredSkills`.
- All 29 agents receive the shared operating base: Paperclip execution, plan-to-task conversion,
  stop-diagnosis, memory files, APQC, MECE, DACI, PAEI, personality/behavior design, and
  softwarehouse knowledge stewardship.
- Technical roles receive repository audit, Paperclip dev, OWASP review, SRE readiness, and where
  appropriate terminal-bench/plugin creation skills.
- Product, design, delivery, and workstream PM roles receive roadmap, product feedback, subscription
  readiness, MCP product design, and workstream-specific skills.
- Roost/CompanyCore readiness is assigned to Roost, backend, runtime, database, and CTO-facing roles.

Verification:

- Confirmed `/LUC/skills` and `/LUC/softwarehouse` are routable in the local UI.
- Confirmed 24 local skills are present.
- Confirmed 29 local agents are present.
- Confirmed 29/29 agents have non-empty `paperclipSkillSync.desiredSkills`.
- Confirmed every shared base skill is attached to all 29 agents.
- Confirmed key specialist skills are attached to at least one relevant agent:
  `subscription-access-readiness`, `roost-companycore-readiness`,
  `repository-audit-architecture-map`, `owasp-web-security-review`, `sre-release-readiness`,
  `product-roadmap-and-milestones`, `featherly-cms-delivery-system`, and
  `customer-discovery-feedback-loop`.

## Roost V2 Integration Direction Recorded

Recorded on 2026-06-14 after board/operator clarification.

Strategic direction:

- Roost is tied to a future Paperclip operating goal, not only a product lane.
- The intended V2 destination is to move the local `Paperclip_Softwarehouse`
  operating loop into `paperclip_luckysparrow` on the VPS.
- The reason for that migration is to let Paperclip communicate with
  Roost/CompanyCore as part of the live LuckySparrow operating system and to
  test Roost through a real Paperclip-controlled softwarehouse loop.

Activation gates:

- Soar must be fully deployed and release-ready.
- Roost must work without Paperclip first, with its own source, docs, runtime,
  smoke, and operator-use evidence.
- The Paperclip-to-Roost/CompanyCore communication contract must be known before
  connector or migration implementation starts.
- VPS/Coolify capacity, deployment topology, secrets, smoke checks, rollback,
  and operator access must be documented before moving the local Softwarehouse
  loop to the VPS.

Operating implication for now:

- Keep Roost in readiness and integration-design mode behind Soar.
- Do not treat this as permission to start Paperclip VPS migration, production
  mutation, or external CompanyCore connector implementation.
- Preserve the goal link in docs, project planning, Roost PM instructions, and
  Paperclip app backlog so future agents understand why Roost matters to the
  LuckySparrow Softwarehouse direction.
