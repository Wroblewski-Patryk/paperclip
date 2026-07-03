# Paperclip Softwarehouse Agent Audit

Status: baseline implemented
Date: 2026-06-03

## Summary

Reviewed the current LuckySparrow Software House roster from `softwarehouse/agent-roster.json`, the shared instruction bundles in `softwarehouse/instructions/shared/`, and the materialized agent instruction directories under the local Paperclip instance.

The current roster already has a strong complementary role split: portfolio, product, architecture, project management, engineering coordination, frontend, backend, data, AI runtime, integration, QA, test automation, security, ops, docs, and UX. The main gap was not missing roles; it was missing one explicit lightweight operating standard that names PDCA, APQC-style process mapping, Definition of Ready, Definition of Done, quality gates, handoff rules, reporting, DORA metrics, security, and ADR expectations in one canonical place.

## Agents reviewed

### Agent: Portfolio Director
- Current role: LuckySparrow Software House Director.
- Target role: Softwarehouse Director / Coordinator Agent.
- Problems found: role is clear; needed explicit operating-system standard.
- Missing knowledge: PDCA/APQC/DoR/DoD references were not fully explicit.
- Missing tools: none found in this audit.
- Overlaps: can overlap with Innovations Director if portfolio vs incubation decisions are not separated.
- Required changes: use `docs/softwarehouse/00-operating-model.md` and process map as governance baseline.
- Updated: yes, through shared standards.

### Agent: 11 Innovations Director
- Current role: Innovation Studio and Application Incubation Lead.
- Target role: incubation and project coordination lead.
- Problems found: clear, but promotion handoff needs evidence gates.
- Missing knowledge: release/quality gate standard.
- Missing tools: none found.
- Overlaps: Product Lead on readiness; PMs on project flow.
- Required changes: apply handoff and DoR/DoD standards.
- Updated: yes, through shared standards.

### Agent: Product Lead
- Current role: product shaping and acceptance owner.
- Target role: Product / Requirements Agent.
- Problems found: clear; needs Definition of Ready ownership.
- Missing knowledge: explicit DoR checklist.
- Missing tools: none found.
- Overlaps: PMs on issue acceptance.
- Required changes: own `04-definition-of-ready.md`.
- Updated: yes, through shared standards.

### Agent: CTO Architect
- Current role: architecture and technical quality lead.
- Target role: System Architect Agent.
- Problems found: clear; ADR trigger needed stronger explicitness.
- Missing knowledge: ADR/quality-gate standard.
- Missing tools: none found.
- Overlaps: Engineering Delivery Lead on design split.
- Required changes: own architecture gate and ADR standard.
- Updated: yes, through shared standards.

### Agent: Engineering Delivery Lead
- Current role: decomposition, integration, handoffs, review routing.
- Target role: engineering coordinator.
- Problems found: clear; should not implement feature code.
- Missing knowledge: explicit handoff checklist.
- Missing tools: none found.
- Overlaps: CTO on contracts, PMs on scheduling.
- Required changes: own `11-agent-handoff-rules.md` and delivery workflow.
- Updated: yes, through shared standards.

### Agent: Frontend Engineer
- Current role: web UI specialist.
- Target role: Frontend Developer Agent.
- Problems found: clear.
- Missing knowledge: quality gates and work report format.
- Missing tools: none found.
- Overlaps: UX Visual Lead on UI quality; Backend on API contracts.
- Required changes: report browser/UI evidence when relevant.
- Updated: yes, through shared standards.

### Agent: Backend API Engineer
- Current role: API and service boundary specialist.
- Target role: Backend Developer Agent.
- Problems found: clear.
- Missing knowledge: security/authorization gate explicitness.
- Missing tools: none found.
- Overlaps: Data Persistence on schema and migrations.
- Required changes: use security checklist for auth/data/company boundaries.
- Updated: yes, through shared standards.

### Agent: Data Persistence Engineer
- Current role: schema, migrations, data integrity.
- Target role: data/persistence specialist.
- Problems found: clear.
- Missing knowledge: migration evidence and rollback gate explicitness.
- Missing tools: none found.
- Overlaps: Backend on persistence contracts.
- Required changes: ensure db/shared/server/ui contract sync is reported.
- Updated: yes, through shared standards.

### Agent: Integration Trading Engineer
- Current role: exchange, runtime, and trading domain specialist.
- Target role: integration/domain specialist.
- Problems found: clear; live-risk boundaries are critical.
- Missing knowledge: human-decision stop conditions should be explicit.
- Missing tools: none found.
- Overlaps: Security and Ops on live mutation.
- Required changes: use security and human-decision gates for live actions.
- Updated: yes, through shared standards.

### Agent: AI Agent Runtime Engineer
- Current role: agent loops, prompts, context, automation.
- Target role: AI runtime specialist.
- Problems found: clear; high leverage and high risk.
- Missing knowledge: process-standard enforcement points.
- Missing tools: none found.
- Overlaps: CTO and Security on runtime safety.
- Required changes: use PDCA/process standards when modifying autonomous behavior.
- Updated: yes, through shared standards.

### Agent: QA Regression Lead
- Current role: verification strategy and proof quality.
- Target role: QA / Test Agent.
- Problems found: clear; should have authority to block DONE without proof.
- Missing knowledge: explicit DoD ownership.
- Missing tools: none found.
- Overlaps: Test Automation on automated evidence.
- Required changes: own `05-definition-of-done.md` and bugfix/incident process.
- Updated: yes, through shared standards.

### Agent: Test Automation Engineer
- Current role: automated test and browser proof specialist.
- Target role: test automation specialist.
- Problems found: clear.
- Missing knowledge: evidence report format.
- Missing tools: none found.
- Overlaps: QA on test strategy.
- Required changes: report exact commands/screenshots/logs.
- Updated: yes, through shared standards.

### Agent: Security Review Lead
- Current role: security, privacy, abuse-case lead.
- Target role: Security Agent.
- Problems found: clear.
- Missing knowledge: lightweight OWASP-inspired checklist.
- Missing tools: none found.
- Overlaps: Ops for deploy safety; Backend for authz.
- Required changes: own `07-security-standard.md`.
- Updated: yes, through shared standards.

### Agent: Ops Release Lead
- Current role: runtime, deploy, and release lead.
- Target role: DevOps / Release Agent.
- Problems found: clear; deploy requires gate because current readiness can block push/deploy.
- Missing knowledge: DORA/log fields and release mutation permit standard.
- Missing tools: Coolify credentials may be unavailable to shell scripts; this remains an operational gap.
- Overlaps: Security on production risk.
- Required changes: own `08-devops-and-release.md`.
- Updated: yes, through shared standards.

### Agent: Docs Memory Lead
- Current role: docs/status/history/evidence hygiene.
- Target role: Documentation / Knowledge Agent.
- Problems found: clear.
- Missing knowledge: documentation standard and continuous improvement ownership.
- Missing tools: none found.
- Overlaps: PMs on status docs.
- Required changes: own docs standard and improvement loop.
- Updated: yes, through shared standards.

### Agent: UX Visual Lead
- Current role: UX validation and visual evidence lead.
- Target role: UX/design specialist.
- Problems found: clear.
- Missing knowledge: quality gate and evidence format.
- Missing tools: none found.
- Overlaps: Frontend on UI implementation.
- Required changes: provide screenshots/workflow proof, not implementation unless scoped.
- Updated: yes, through shared standards.

### Agent: Soar Project Manager
- Current role: Soar delivery and project operations manager.
- Target role: active project PM.
- Problems found: clear; active pilot has deploy readiness blockers.
- Missing knowledge: explicit DoR/DoD and no-stale-work standard.
- Missing tools: none found.
- Overlaps: Portfolio on priority.
- Required changes: apply PM workflow and ensure leaves have owners/proof.
- Updated: yes, through shared standards.

### Agent: Roost Project Manager
- Current role: Roost/CompanyCore preparation PM.
- Target role: project PM for Roost readiness.
- Problems found: clear; should remain preparation-focused until activation.
- Missing knowledge: known-state and DoR/DoD standard.
- Missing tools: none found.
- Overlaps: future source-of-truth integration with Docs/Portfolio.
- Required changes: keep work in discovery/readiness until Portfolio activation.
- Updated: yes, through shared standards.

### Agent: Aviary Project Manager
- Current role: Aviary preparation PM.
- Target role: project PM for Aviary readiness.
- Problems found: clear.
- Missing knowledge: known-state and handoff standard.
- Missing tools: none found.
- Overlaps: shared specialists when activation begins.
- Required changes: do not start broad implementation before activation.
- Updated: yes, through shared standards.

### Agent: Nest Project Manager
- Current role: Nest preparation PM.
- Target role: project PM for Nest readiness.
- Problems found: clear.
- Missing knowledge: known-state and handoff standard.
- Missing tools: none found.
- Overlaps: shared specialists when activation begins.
- Required changes: do not start broad implementation before activation.
- Updated: yes, through shared standards.

## Global problems

- PDCA, APQC-style process classes, Definition of Ready, Definition of Done, DORA, security, reporting, and ADR standards were not consolidated in one canonical repo location.
- Current deploy autonomy is still limited by readiness/governor gates; push/deploy must remain blocked until release/Coolify gates are healthy.
- Runtime agent instructions referenced operating processes, but the named standards needed stronger explicit wording.
- Evidence quality is the central control point: "done" without proof is the main failure mode to prevent.

## Recommended architecture

Keep the existing 20-agent structure. Do not create a super-agent. Use Portfolio Director, Innovations Director, Project Managers, CTO, Engineering Delivery Lead, QA, Security, Ops, Docs, UX, and specialists as a layered softwarehouse.

## Implementation plan

1. Create canonical operating-standard docs under `docs/softwarehouse/`.
2. Add templates for tasks, bugs, features, work reports, ADRs, QA, release, and agent roles.
3. Update `softwarehouse/operating-processes.md` and shared agent instructions to reference the new standards.
4. Sync updated shared instructions into materialized local agent instruction bundles.
5. Run lightweight audits to verify files and agent settings.

## Completed changes

- Added canonical softwarehouse operating model and process docs.
- Added DoR, DoD, quality gates, security, release, documentation, PDCA/metrics, handoff, incident, and continuous-improvement standards.
- Added reusable templates.
- Recorded this agent audit.

