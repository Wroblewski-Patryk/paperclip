# Softwarehouse V0 Readiness Audit

Last updated: 2026-07-04

Source: conversation summary plus verified Paperclip API state at
`http://127.0.0.1:3200`.

## Current Readiness

Estimated Stage 0 / v0 readiness: about 96%.

This is close enough to see the v0 horizon, but not ready for Stage 1 agent
execution until the remaining gates below are resolved or consciously accepted
by the owner.

## Verified Implementation State

- Paperclip health: ok, version `0.3.1`, `local_trusted/private`.
- Company: `LuckySparrow`, id `ae26bb8b-8f5f-4a85-b341-78d4e1985975`, prefix `LUC`.
- Agents: 38 total, 38 paused, heartbeat disabled on every sampled/current agent.
- Issues/tasks: 0.
- Live runs: 0.
- Routines: 7 total, all `paused`, every schedule trigger `enabled: false`.
- Goals: 3 planned company goals, all prefixed with department number/name.
- Projects: 6 total, normalized to English department names:
  `00 General: Softwarehouse`, `11 Innovation: Soar`,
  `11 Innovation: Roost`, `11 Innovation: Aviary`,
  `08 Assets: Paperclip Worktrees`, and
  `00 General: WroblewskiPatryk`.
- Skills: 18 company skills, attached by role through desired-skill sync.
- Secrets: 29 company secrets, all `local_encrypted` managed refs with no raw
  values stored in memory files. This includes Coolify login refs, separate
  Coolify read/deploy API tokens, Soar/Roost production URLs, Coolify
  team/resource ids, and Soar/Roost production test accounts.
- Managed instructions: 38/38 agents have managed bundles with no API warnings,
  including shared product-architecture, delegation/reporting, delivery-closure,
  learning-packet, procedure, and task-lifecycle references.
- Agent creation authority: only `06 AIM (AI Agent Manager)` has `permissions.canCreateAgents: true`.
- Department numbering: 05 = Customer Success; 06 = People and AI Workforce.
- Canonical department map: `.agents/state/softwarehouse-departments.md`.
- Resource policy: `.agents/state/softwarehouse-resource-policy.md`.
- Resource access matrix: `.agents/state/softwarehouse-resource-access-matrix.md`.

## Requirement Coverage

| Owner direction | Captured in context | Implemented now | Remaining gap |
| --- | --- | --- | --- |
| Stage 0 before autonomous work | Yes | Yes | Owner must approve Stage 1 later. |
| Codex configures v0; Paperclip agents do not work yet | Yes | Yes | Keep agents paused until explicit approval. |
| No Paperclip issues/tasks during Stage 0 | Yes | Yes | None; issue count verified as 0. |
| Paused/inactive routines are allowed | Yes | Yes | Activation remains owner-gated. |
| Agents should be muted | Yes | Yes | 38/38 paused; heartbeat disabled. |
| Department names should start with numbers for filtering | Yes | Yes | Applied to agents metadata, routines, goals, and naming instructions. |
| Project names should use numbered English department naming | Yes | Yes | Projects normalized as `NN Department: Element`; archived entries included. |
| Build toward Soar and Roost first | Yes | Partly | Need local Stage 1 activation packets before issue creation. |
| Stage 2: VPS + Roost autonomous company | Yes | Concept only | Needs future deploy/provider architecture and secrets. |
| Use APQC/PCF, MECE, PDCA, evidence gates | Yes | Yes in instructions/routines | Future improvement: richer process playbooks by department. |
| Use role/personality fit such as Big Five | Yes | Initial role profiles in agent entry files | Future improvement: more precise role calibration/evals. |
| Agent learning at individual, department, company level | Yes | Yes in instructions and paused PDCA routine | Needs activation and real learning packets in Stage 1. |
| Agents must not self-edit | Yes | Yes in instructions | Future: enforce through stronger permission tooling if available. |
| Hiring only through AI workforce manager | Yes | Yes; only `06 AIM` can create agents | Need full hiring packet template before Stage 1. |
| Secrets via Paperclip secret refs, no raw values | Yes | Coolify, Soar, and Roost refs entered as Paperclip managed secrets; read/deploy/login/test-account bindings are tiered by role | Provider warning unresolved; v2 rotation planned. |
| Coolify/VPS deployment observation | Yes | Coolify browser login verified, team switched to LuckySparrow, API read token tested, Soar/Roost URLs/resource ids discovered, paused readiness routine exists | Deploy-token actions remain gated; full VPS SSH still optional/unconfigured. |
| No paid GitHub assumption or email-noisy automation | Yes | Resource policy and agent instructions updated | Need Stage 1 enforcement during real work. |
| Least-privilege resource access | Yes | Resource access matrix created; Coolify login/deploy restricted to 5 roles, read refs to 16 roles, app test accounts to 10 app-relevant roles, agent creation restricted to `06 AIM` | Need skill-by-agent audit and future tool/plugin enforcement review. |
| Product architecture sources for Soar/Roost | Yes | Product architecture index added; agents must read repo-specific `docs/architecture` before product work | Needs owner dry-run review before Stage 1 activation. |
| Top-down delegation and parent reporting | Yes | Delivery architecture and shared agent references define parent notification, child-work preflight, duplicate prevention, and MECE task split | Needs Stage 1 enforcement during real issue creation. |
| Commit -> push -> Coolify -> production smoke closure | Yes | Delivery closure loop added to state docs and all agent bundles | Deploy actions remain gated; production smoke requires Stage 1 approval. |
| Learning without self-editing | Yes | Learning packet reference added; individual/department/company packet path made explicit | Needs first real Stage 1 learning packets. |
| Procedures/flows before task creation | Yes | Procedure system and task lifecycle contract added; agents must connect work to goal -> procedure -> parent -> child -> evidence -> retro | Needs Stage 1 enforcement and real procedure run records. |
| Constructive parent/child task closure | Yes | Parent and child issue contracts added; completed work must synthesize child results and end as Delivered, Blocked, Cancelled, Superseded, or Learning | Needs actual issue workflow once Stage 1 starts. |
| Prefer configuration and official/common extensions over code | Yes | Yes | CLI/catalog tooling blockers remain documented. |
| Work should be pleasant end-to-end for agents | Yes | Added shared operating flow to all bundles | Needs Stage 1 feedback to refine friction points. |

## Implemented Operating Assets

- `.agents/state/softwarehouse-stage0-foundation.md`: Stage 0 index and gates.
- `.agents/state/softwarehouse-secret-requirements.md`: no-value secret manifest.
- `.agents/state/softwarehouse-v0-readiness-audit.md`: this coverage audit.
- `.agents/state/softwarehouse-departments.md`: canonical 00-12 department map.
- `.agents/state/softwarehouse-resource-policy.md`: resource realism, free-plan
  GitHub constraints, and notification-noise policy.
- `.agents/state/softwarehouse-resource-access-matrix.md`: least-privilege
  matrix for secrets, skills, tools, markdown resources, routines, repos,
  deployments, and production test accounts.
- `.agents/state/softwarehouse-product-architecture-index.md`: Soar/Roost
  repo and architecture-source preflight.
- `.agents/state/softwarehouse-autonomous-delivery-architecture.md`: Stage 1
  operating loop, hierarchy, delegation, PDCA, deploy/prod closure, and
  learning architecture.
- `.agents/state/softwarehouse-architecture-gap-analysis.md`: critical gap
  register and controlled activation recommendation.
- `.agents/state/softwarehouse-procedure-system.md`: procedure card,
  procedure lifecycle, initial procedure registry, run record, and retro model.
- `.agents/state/softwarehouse-task-lifecycle-contract.md`: creation gate,
  parent/child issue contracts, constructive closure, and optimization loop.
- `doc/plans/2026-07-04-softwarehouse-stage-0-foundation.md`: repo plan.
- Managed instruction bundles for all agents:
  - `AGENTS.md`
  - `references/company-operating-model.md`
  - `references/standards.md`
  - `references/learning-and-self-correction.md`
  - `references/hiring-and-agent-governance.md`
  - `references/secrets-deploy-evidence.md`
  - `references/end-to-end-operating-flow.md`
  - `references/departments-and-naming.md`
  - `references/resource-and-github-policy.md`
  - `references/product-architecture-source-of-truth.md`
  - `references/delegation-and-reporting-contract.md`
  - `references/delivery-closure-loop.md`
  - `references/gap-detection-and-learning-packets.md`
  - `references/procedures-and-task-lifecycle.md`

## Remaining V0 Gates

1. Secrets gate:
   - Decide whether to accept the local Windows `local_encrypted` key permission warning for local v0, fix the launch/ACL context, or use a different provider strategy.
   - Coolify base/login/read/deploy secrets, team/resource ids, and Soar/Roost
     production test accounts are now entered through Paperclip managed
     secrets.
   - Still add VPS SSH refs only if direct SSH becomes required; keep GitHub
     token optional and least-privilege.

2. Soar/Roost activation gate:
   - Draft local Stage 1 activation packets for Soar and Roost.
   - Include repo path, deploy context, first outcome, verification plan, evidence gates, and owner approval condition.

3. Full disaster recovery gate:
   - Current DB backup exists at `.paperclip/runtime/home/instances/default/data/backups/paperclip-20260704-030213.sql.gz`.
   - Current config/instruction snapshot exists at `.agents/state/backups/stage0-config-20260704-030223.zip`.
   - Still needs deliberate handling of local storage and the local encrypted secrets key outside repo memory.

4. Tooling gate:
   - Paperclip skills catalog install hit a pinned hash mismatch.
   - `pnpm paperclipai skills browse` hit a Windows symlink/EPERM issue.
   - API/local file fallback works, but tooling should be repaired or accepted as a known v0 caveat.

5. Resource realism gate:
   - Stage 1 work must not assume paid GitHub capabilities or create noisy
     notification/email automation.
   - If a workflow needs a paid plan, quota, or hosted automation, agents must
     report the constraint and propose a local/free alternative first.

6. Activation gate:
   - Before Stage 1, owner must explicitly approve which agents/routines to unpause.
   - Do not bulk-resume all agents unless the owner explicitly chooses that mode.

7. Architecture dry-run gate:
   - Review the product architecture index and autonomous delivery contract with
     the owner before enabling agents.
   - First Stage 1 cycle should be narrow: one app lane, one parent PM, one
     technical owner, one verifier, and deployment observation only after local
     proof.

## Future Backlog For Excellent Flow

- Department playbooks for all 12 APQC/PCF categories.
- Hiring packet template and role-fit scorecard for `06 AIM`.
- Expanded procedure cards for the initial procedure registry.
- Learning packet template with severity, root cause, fix proposal, affected scope, and rollback.
- Secret rotation and least-privilege review cadence.
- Soar and Roost app-specific evidence checklists, now grounded in the shared
  delivery closure loop.
- Customer-facing service lifecycle: lead -> discovery -> quote -> delivery -> QA -> deploy -> support -> renewal.
