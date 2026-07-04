# Softwarehouse Stage 0 Foundation

Last updated: 2026-07-04

This file indexes the owner intent and verified readiness state for configuring
LuckySparrow Software House before autonomous agents start work.

## Stage Model

- Stage 0: configure Paperclip Softwarehouse before agent execution. Current stage.
- Stage 1: enable Paperclip agents to work toward app goals, initially Soar and Roost, supervised by Codex/Paperclip watchdog loops.
- Stage 2: move Paperclip to VPS and operate with Roost as an autonomous digital-services company. Soar remains a personal capital-growth app lane.

## Durable Owner Intent

- Avoid repeating the previous noisy state where thousands of tasks existed but signal was low.
- Prefer configuration, official Paperclip features, company packages, skills, routines, instructions, and secret refs over new code.
- Use recognized operating standards where they improve local execution: APQC/PCF, MECE, PDCA, governance gates, evidence gates, QA/security/DevOps, customer success, pricing/subscription, and learning loops.
- Treat agents as company employees with explicit role scope, authority, responsibilities, access, escalation paths, and personality fit. Big Five can be used as a role-shaping model when it improves agent behavior.
- Keep Paperclip as the control plane for the company. Product apps such as Soar and Roost remain separate app repos.
- Do not start autonomous agent work until Stage 0 gates are sufficiently ready and visible to the board.
- Measure forces against available resources. The owner does not have a paid
  GitHub plan, so agents must not assume paid GitHub features, paid Actions
  capacity, Advanced Security, paid runners/packages/storage, enterprise-only
  controls, or paid GitHub AI features. Do not create notification-heavy GitHub
  automation or workflows that send repeated emails unless the owner explicitly
  approves that exact tradeoff.
- During Stage 0, Codex in this chat implements/configures Paperclip directly
  and must not create Paperclip issues/tasks for Paperclip agents unless the
  owner explicitly asks. Paperclip agents and Codex-local agents inside
  Paperclip remain inactive until the owner approves Stage 1.

## Verified Local State On 2026-07-04

- Active Paperclip base: `http://127.0.0.1:3200`.
- Health: `ok`, version `0.3.1`, deployment mode `local_trusted`, exposure `private`.
- Current company: `LuckySparrow`, id `ae26bb8b-8f5f-4a85-b341-78d4e1985975`, prefix `LUC`, issue counter `6`.
- Agents: 38 returned by `/api/companies/:companyId/agents`; all are currently paused for Stage 0 quiet mode.
- Projects: 6 returned by `/api/companies/:companyId/projects`; names are
  normalized to the English project convention `NN Department: Element`.
  Active/planned lanes include `00 General: Softwarehouse`,
  `11 Innovation: Soar`, `11 Innovation: Roost`, and
  `11 Innovation: Aviary`; archived/non-active entries include
  `08 Assets: Paperclip Worktrees` and `00 General: WroblewskiPatryk`.
- Goals: 4 planned company goals, all normalized to the English convention
  `NN Department: Element`: `00 General: v0 Softwarehouse Readiness`,
  `00 General: Stage 1 Controlled Activation Dry Run`,
  `11 Innovation: Stage 1 Soar Activation`, and
  `11 Innovation: Stage 1 Roost Activation`.
- Issues: 0 returned by `/api/companies/:companyId/issues`.
- Routines: 10 returned by `/api/companies/:companyId/routines`; all are v1
  draft assets with `status: paused`, every title is normalized to English
  department naming, and every schedule trigger is `enabled: false`.
- Live runs: 0 returned by `/api/companies/:companyId/live-runs`.
- Agent status: 38/38 agents are intentionally `paused` as the Stage 0 quiet-mode guard.
- Company skills: 18 returned by `/api/companies/:companyId/skills`. Role attachments are present for Paperclip ops, planning, triage, QA, docs, GitHub PR workflow, browser, release, and product/design skills.
- App-shipped skills catalog exists at `packages/skills-catalog/generated/catalog.json` with bundled/optional skills for docs, Paperclip operations, product, quality, software development, browser, content, and design critique.
- Agent managed instructions are configured for all 38 agents. Verified through `/api/agents/:id/instructions-bundle?companyId=...`: every current agent has a managed bundle with no warnings and at least these files: `AGENTS.md`, `references/company-operating-model.md`, `references/standards.md`, `references/learning-and-self-correction.md`, `references/hiring-and-agent-governance.md`, `references/secrets-deploy-evidence.md`, `references/end-to-end-operating-flow.md`, and `references/departments-and-naming.md`.
- Managed instruction bundles also now include shared architecture execution references: `references/product-architecture-source-of-truth.md`, `references/delegation-and-reporting-contract.md`, `references/delivery-closure-loop.md`, and `references/gap-detection-and-learning-packets.md`, and `references/procedures-and-task-lifecycle.md`.
- Canonical department map lives at `.agents/state/softwarehouse-departments.md`. Department naming convention is `NN NazwaDziaĹ‚u - concise title` for department-owned routines, goals, issues, reports, work products, approvals, and notes.
- Resource policy lives at `.agents/state/softwarehouse-resource-policy.md`.
  Prefer local/free verification and report paid-plan or quota constraints
  instead of inventing unavailable GitHub-based solutions.
- Resource access matrix lives at
  `.agents/state/softwarehouse-resource-access-matrix.md` and covers secrets,
  skills, tools, markdown resources, routines, repos, deployments, and
  production test accounts.
- Product architecture index lives at
  `.agents/state/softwarehouse-product-architecture-index.md`. It identifies
  Soar and Roost repo paths, their `docs/architecture` sources of truth, and
  the preflight required before product work.
- Autonomous delivery architecture lives at
  `.agents/state/softwarehouse-autonomous-delivery-architecture.md`. It defines
  the top-down delegation contract, duplicate-prevention rule, PDCA checkpoint,
  commit/push/Coolify/production-smoke closure loop, and learning packet path.
- Architecture gap analysis lives at
  `.agents/state/softwarehouse-architecture-gap-analysis.md`. Current finding:
  no new permanent agents are required before Stage 1; run the current company
  with controlled activation and use governed hiring packets when real gaps are
  proven.
- Procedure system lives at `.agents/state/softwarehouse-procedure-system.md`.
  Task lifecycle contract lives at
  `.agents/state/softwarehouse-task-lifecycle-contract.md`. Agents should not
  create tasks unless they can connect goal, procedure, parent, child,
  evidence, closure, retrospective, and improvement path.
- Owner interface contract lives at
  `.agents/state/softwarehouse-owner-interface-contract.md`. Stage 1 owner
  communication should route through `00 AIA` in clear Polish, while internal
  company operating assets stay English-first.
- Recommended first Stage 1 action lives at
  `.agents/state/softwarehouse-stage1-recommended-first-action.md`: a narrow
  controlled Soar dry run through AIA before broad agent activation.
- Agent learning/self-correction is encoded in shared instructions at individual, department, and company levels. Agents must produce learning packets; they may not edit their own instructions, skills, permissions, or routines directly.
- Hiring governance is encoded in instructions and permissions. Only `06 AIM (AI Agent Manager)` currently has `permissions.canCreateAgents: true`; all other agents are false. `06 AIM` belongs to department `06 People and AI Workforce` and is the governed AI-agent hiring manager.
- Runtime still contains old company instruction/runtime folders for company id `f13051a7-d0aa-4261-9254-d3ab90735de5`. These old folders should not be blindly copied because their agent ids do not match the current company agents.
- Secrets: company has 29 Stage 0 managed secrets in `local_encrypted`.
  Values are not stored in memory files. Current refs include Coolify base/API
  URL, login email/password, separate read/deploy API tokens, LuckySparrow team
  id/name, Soar Coolify project/environment/resource ids, Roost Coolify app id,
  Soar/Roost production URLs, and one production test account per app.
  Coolify read/resource refs are bound to 16 deployment/coordinating agents.
  Coolify deploy token and login/password refs are restricted to `00 AIA`,
  `09 CTO`, `09 DRE`, `10 SPA`, and `12 CEO`. Soar/Roost app test-account refs
  are bound to 10 app-relevant roles each. All agents remain paused.
  `local_encrypted` is configured with `strictMode: true` in
  `.paperclip/config.json`, but provider health still warns that the local key
  file permissions are `666`. A Windows ACL tightening attempt made the key
  unreadable to the local runtime, so the working readable ACL was restored and
  the warning remains a known v0 blocker/risk. AWS/GCP/Vault providers are not
  configured.
- Database backups are enabled in `.paperclip/config.json`; latest remembered manual DB backup is `.paperclip/runtime/home/instances/default/data/backups/paperclip-20260704-033055.sql.gz`. DB backups do not include local storage, instruction files, or the local encrypted secrets key.
- Latest lightweight Stage 0 memory/config snapshot exists at `.agents/state/backups/stage0-memory-config-20260704-031638.zip`. It captures repo-local Stage 0 memory/plan, `.codex/PROJECT_CONTEXT.md`, `.paperclip/config.json`, and the project-memory workflow. It intentionally does not store secret values or full runtime folders.
- CLI caveat: `pnpm paperclipai skills browse` attempted dependency install and failed on Windows with `EPERM` while creating a plugin SDK symlink. Use HTTP API/file inspection until that tooling issue is repaired.
- Catalog install caveat: the catalog install API failed on a pinned hash mismatch for `paperclipai:bundled:docs:doc-maintenance:SKILL.md`; local official skill directory imports were used instead.

## Stage 0 Readiness Gates

1. Baseline inventory is documented: company, agents, projects, skills, routines, issues, secrets, runtime paths.
2. Agent instructions bundles exist for every active agent and include shared company standards plus role-specific files.
3. Company skills are installed or created, then attached to relevant agents using Paperclip desired-skill sync.
4. Secrets are declared through Paperclip secret refs; no raw secret values are stored in memory files, instructions, activity logs, or issue comments.
5. Coolify/VPS access model is defined as secret refs and operational routines, with permission boundaries and deploy evidence expectations.
6. Core routines exist but do not create noisy work: owner direction/proposal review, controlled activation, liveness, portfolio truth, PDCA review, evidence-gate review, source-control/deploy readiness, secrets/Coolify/VPS readiness, finance/cost review, and agent hiring/governance review. In Stage 0 they must remain `paused` with disabled triggers.
7. Stage 1 activation packets for Soar and Roost exist with clear owners, acceptance criteria, and evidence gates. During Stage 0 these remain repo-local plans, not Paperclip issues, unless the owner explicitly approves issue creation.
8. Paperclip CLI/tooling blockers are either repaired or documented with API fallback.
9. A backup/export point exists before enabling autonomous work.
10. Resource realism is explicit: no paid GitHub assumptions and no
    notification-heavy automation without owner approval.
11. Resource access matrix exists for least-privilege assignment of secrets,
    skills, tools, markdown resources, routines, repos, deployments, and
    production test accounts.
12. Board accepts a current readiness percentage and known residual risks.
13. Stage 1 autonomous delivery architecture is installed: product
    architecture preflight, top-down delegation, duplicate prevention,
    deploy/production closure, and governed learning packets.
14. Procedure-guided task lifecycle is installed: agents must connect work to a
    goal, procedure, parent issue, child issues, evidence, closure synthesis,
    retrospective, and improvement path.
15. Owner interface and language policy is installed: owner-facing decisions go
    through AIA in Polish; internal company work remains English-first.

## Current Stage 0 Estimate

As of this capture, Stage 0 is about 97% complete.

Completed or partly complete:

- Paperclip instance is healthy and fresh.
- Current company, agents, projects, issues, routines, live runs, skills, secrets, backup path, and key runtime paths are inventoried.
- Managed instruction bundles exist for all 38 current agents and encode Stage 0/1/2, APQC/PCF, MECE, PDCA, evidence gates, learning, self-correction, hiring, and secrets/deploy policy.
- Managed instruction bundles also include `references/end-to-end-operating-flow.md` so agents have a clear intake -> triage -> plan -> do -> check -> review -> act -> learning flow.
- Company skills increased from 8 to 18 and are attached by role through desired-skill sync.
- Department 05/06 naming is corrected: department 05 is customer success, and department 06 is people and AI workforce.
- All 38 agents have department metadata: department number, English process, Polish department name, and prefixed department display name.
- Goals now follow the English department naming convention:
  `NN Department: Element`.
- Routines now follow the English department naming convention:
  `NN Department - v1 Draft Paused - Element`.
- Projects now follow the English department project convention:
  `NN Department: Element`.
- GitHub/free-plan and notification-noise constraints are recorded in the
  resource policy and agent instruction bundles.
- Coolify base/login/read/deploy credentials are stored as Paperclip managed
  secrets and bound to selected agents through secret refs.
- Coolify browser login was verified; the active infrastructure team is
  `LuckySparrow`, not the default `ai's Team`.
- `coolify_read_api_token` was tested successfully against Coolify version,
  teams, projects, deployments, and applications endpoints.
- Soar production URL/API URL and Coolify project/resource ids are configured
  as refs.
- Roost production URL/API URL and Coolify app resource id are configured as
  refs.
- One Soar and one Roost production test account were created and stored as
  Paperclip secret refs.
- Login/password Coolify access has been narrowed to five governance,
  deployment, and security roles.
- Least-privilege resource matrix exists for current and future agent
  capabilities.
- Product architecture index exists for Soar and Roost, including repo paths
  and `docs/architecture` reading order.
- Shared autonomous delivery architecture exists for parent-child delegation,
  duplicate prevention, PDCA, commit/push/deploy closure, Coolify observation,
  production smoke evidence, and learning packets.
- All 38 managed instruction bundles include the new architecture/delegation/
  closure/learning references.
- All 38 managed instruction bundles include the procedure/task lifecycle
  reference.
- All 38 managed instruction bundles include the owner interface/language
  reference.
- Only `06 AIM (AI Agent Manager)` can create/hire agents, and only through the governed hiring path.
- Ten core routines exist as paused drafts with disabled schedules.
- All 38 agents are intentionally paused to prevent accidental wakeups during Stage 0.
- Durable memory records the Stage 0 boundary: Codex configures v0 directly; Paperclip agents remain idle.

Not yet complete:

- Secret provider health still has a Windows key-permission warning.
- Direct VPS SSH refs are not configured because they are not yet required for
  Stage 0 API/browser deployment observation.
- GitHub token is still optional/unconfigured; Stage 1 must not assume paid
  GitHub features.
- Stage 0 routines exist, but activation/resume remains owner-gated.
- Soar/Roost activation work is represented as draft repo-local Stage 1 activation packets, but not yet owner-approved for Paperclip issue creation or agent execution.
- A lightweight Stage 0 config snapshot exists after routines/agent pause, and a fresh manual DB backup exists. A full disaster-recovery backup still requires separate handling of local storage and the encrypted secrets key.
- Paperclip catalog install and CLI dependency/symlink tooling blockers remain documented but not repaired.

## Immediate Next Actions

- Review the configured Coolify/Soar/Roost secret-ref manifest without exposing
  values.
- Decide whether to accept the local Windows ACL warning temporarily or switch the secret provider strategy before entering real secrets.
- Review and approve or revise the draft Stage 1 activation packets for Soar
  and Roost against the new delivery architecture.
- Review the resource policy before Stage 1 so agents know when to use local
  checks versus owner-approved GitHub/cloud automation.
- Create a full Stage 0 backup/export checkpoint that includes DB backup plus current instruction/config files, while keeping the secrets key handled separately as sensitive material.
- Keep Stage 0 execution in this Codex chat and repo-local files until the
  owner approves Paperclip issue/routine creation for Stage 1.

## Correction

On 2026-07-04, Codex mistakenly created Paperclip backlog issues `LUC-7`
through `LUC-11` for Stage 0 configuration. The owner clarified that Stage 0
must be performed by Codex in this chat, not by creating Paperclip work for
Paperclip agents. Codex deleted those five issues immediately and verified no
live runs were active.

