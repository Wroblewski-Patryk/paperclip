# Softwarehouse Stage 0 Foundation Plan

Date: 2026-07-04
Status: Active planning and configuration baseline

## Purpose

Configure the fresh LuckySparrow Paperclip Softwarehouse instance before
autonomous agents start work. The goal is to avoid the old high-volume,
low-signal task state and create a practical operating system for agents,
projects, secrets, routines, evidence, and learning.

## Verified Baseline

- Paperclip base: `http://127.0.0.1:3200`
- Health: `ok`, version `0.3.1`, `local_trusted/private`
- Company: `LuckySparrow`
- Company id: `ae26bb8b-8f5f-4a85-b341-78d4e1985975`
- Prefix: `LUC`
- Agents: 38
- Projects: 6
- Goals: 3 planned company goals, department-prefixed
- Issues: 0 after removing mistakenly created Stage 0 backlog issues
- Routines: 7, all `paused`; all schedule triggers `enabled: false`
- Live runs: 0
- Agents: 38/38 intentionally `paused` as Stage 0 quiet mode
- Company skills: 18, attached by role through desired-skill sync
- Company secrets: 4 Coolify Stage 0 managed secrets, bound by `secret_ref` to
  selected deploy-capable/coordinating agents
- Secrets provider: `local_encrypted` with strict mode configured in `.paperclip/config.json`, but Windows key permissions warning remains
- Catalog: app-shipped skills catalog exists at `packages/skills-catalog/generated/catalog.json`
- Current-agent managed instruction bundles: 38/38 verified, managed mode, no warnings
- Agent creation authority: only `06 AIM (AI Agent Manager)` has `permissions.canCreateAgents: true`
- Department map: `.agents/state/softwarehouse-departments.md`
- Backup checkpoint: manual DB backup `paperclip-20260704-022924.sql.gz` plus config snapshot `.agents/state/backups/stage0-config-20260704-022934.zip`
- V0 audit: `.agents/state/softwarehouse-v0-readiness-audit.md`
- Resource policy: `.agents/state/softwarehouse-resource-policy.md`
- Resource access matrix: `.agents/state/softwarehouse-resource-access-matrix.md`
- Stage 1 draft activation packets: `.agents/state/stage1-activation-soar.md` and `.agents/state/stage1-activation-roost.md`

## Non-Negotiables

- No broad autonomous agent execution during Stage 0.
- No Paperclip issue/task creation during Stage 0 unless the owner explicitly
  asks for it. Codex in this chat should implement/configure v0 directly.
- Paperclip routines may be prepared during Stage 0 only as inactive assets:
  routine `status: paused` and every trigger `enabled: false`.
- Agents should remain paused/quiet in Stage 0 to avoid accidental wakeups.
- Department-owned routines, goals, issues, work products, reports, and similar
  objects should use `NN NazwaDziału - ...` naming.
- No raw secrets in chat, memory files, instructions, docs, issue comments, or logs.
- Do not give every agent every resource. Apply least privilege to secrets,
  skills, tools, markdown resources, routines, repos, deployment access, and
  production test accounts.
- Prefer Paperclip-native configuration: managed instructions, company skills,
  routines, secret refs, company packages, issue documents, and work products.
- Add code only after verifying that configuration or official extension paths
  are insufficient.
- Keep Soar and Roost as first active app lanes. Other apps stay parked unless
  the board reactivates them.
- The owner does not have a paid GitHub plan. Do not assume paid Actions
  capacity, Advanced Security, paid runners/packages/storage, enterprise-only
  controls, paid GitHub AI features, or notification-heavy GitHub automation.
  Prefer local/free checks and ask for an explicit owner gate before adding
  workflows or anything likely to produce repeated emails.

## Workstreams

### 1. Runtime and Data Integrity

- Confirm current company id and remove stale assumptions about the old company id.
- Rebuild current-agent managed instruction bundles. **Done for 38/38 agents.**
- Verify no current agent points at missing instruction files before activation. **Done for current bundle API checks.**
- Create an export/backup point before enabling routines or scheduled work.
  **Partial done:** manual DB backup plus lightweight config/instruction snapshot exist; full local-storage and secrets-key disaster recovery still needs owner handling.

### 2. Agent Operating Model

- Define shared company instructions:
  - mission and stage model
  - APQC/PCF process taxonomy as role map
  - MECE decomposition rule
  - PDCA improvement loop
  - evidence gates and definition of done
  - secrets/deploy policy
  - learning-from-errors loop
- Define role-specific instruction files for each agent or role family. **Initial `AGENTS.md` generated for every current agent.**
- Use Big Five-style traits only where they create concrete behavior guidance. **Initial profiles are encoded in each agent entry file.**
- Agents must learn through learning packets and review flow, not by editing their own instructions, skills, permissions, or routines.
- Department 06 owns people and AI workforce. `06 AIM` is the only governed AI-agent hiring manager; other agents may request hiring but cannot hire directly.
- Shared end-to-end operating flow now exists in every agent bundle:
  intake, triage, plan, do, check, review, act, and learning handoff.
- Shared department naming instructions now exist in every agent bundle.
- Shared resource/GitHub policy now exists in every agent bundle.

### 3. Skills

- Install or create a first skill set:
  - Paperclip operations
  - issue triage
  - task planning
  - QA acceptance
  - doc maintenance
  - GitHub PR workflow
  - browser verification
  - product/design critique
- Attach skills to agents through desired-skill sync, not only by installing
  them in the company library. **Initial role attachments are done.**
- Keep custom skills small and inspectable.

### 4. Secrets and VPS/Coolify Access

- Fix or explicitly accept the local encrypted key permission warning.
- Enable a strict secret-ref policy before storing sensitive values if compatible
  with the current instance. **Strict mode is enabled in config; the running provider still reports a Windows ACL warning.**
- Add required secrets through Paperclip secret create/link flows using env/UI
  value entry, never chat text.
- Model Coolify/VPS access as least-privilege operational capability:
  - deploy/readiness status
  - logs and failed deploy diagnosis
  - production smoke evidence
  - no irreversible production changes without board gate

### 5. Routines

- Add only a small number of routines:
  - Softwarehouse liveness and stuck-work review
  - portfolio truth/index review
  - PDCA improvement review
  - evidence-gate review
  - source-control/deploy readiness review
  - agent learning and failure-pattern review
- Keep schedules conservative until Stage 1 proves signal quality.
- During Stage 0, routines may exist in Paperclip only as paused drafts with
  disabled triggers. **Done:** seven v0 paused routines now exist, including a
  dedicated secrets/Coolify/VPS readiness routine and agent hiring/governance
  routine.

### 6. Soar and Roost Activation

- Draft Stage 1 activation packets for Soar and Roost. **Done as repo-local
  drafts; not approved for agent execution.**
- Each activation packet must include known repo path, deploy context, current
  readiness, first user-visible outcome, verification plan, and evidence gates.
- Do not let agents create broad implementation work before activation packets
  are reviewed.

## Readiness Estimate

Current Stage 0 readiness: about 86%.

Reasons:

- Healthy fresh instance and company structure exist.
- Official Paperclip configuration mechanisms are available.
- Durable Stage 0 memory and plan now exist.
- Current agent instruction bundles, role skill attachments, learning rules,
  and governed agent-hiring authority are now implemented through Paperclip
  configuration.
- Core routines now exist in a non-running state, and all agents are paused for
  quiet-mode safety.
- V0 audit and draft Soar/Roost activation packets exist.
- Department metadata and naming conventions are implemented for current agents,
  routines, and planned goals.
- Resource constraints are implemented: no paid GitHub assumptions and no
  noisy notification automation without explicit owner approval.
- Coolify base/login credentials are stored as Paperclip managed secrets and
  bound to selected agents through `secret_ref` env bindings.
- Coolify login/password bindings are restricted to `00 AIA`, `09 CTO`,
  `09 DRE`, `10 SPA`, and `12 CEO`; broader deployment/coordinating roles only
  receive URL/API URL refs.
- Least-privilege resource access matrix exists.
- Missing: skill-by-agent audit, future tool/plugin enforcement review,
  Coolify API token/team/resource ids, tested read-only deployment access,
  product-app production test-account secrets, accepted/fixed Windows secret
  key warning, full local-storage/secrets-key disaster recovery, and final
  board verification.

## Immediate Next Actions

1. Draft the secret-ref manifest for Coolify/VPS/GitHub/product app access.
2. Decide whether local Windows `local_encrypted` key warning is acceptable for
   Stage 0 or whether to switch provider/launch context before entering values.
3. Keep Stage 0 execution in Codex/repo-local configuration work, not Paperclip
   issues, until the owner approves Stage 1.
4. Draft Stage 1 activation packets for Soar and Roost.
5. Produce a Stage 0 readiness report before enabling agent heartbeats.

## Correction

Codex mistakenly created `LUC-7` through `LUC-11` as Stage 0 backlog issues.
The owner clarified that Stage 0 should be handled by Codex in this chat until
v0 is 100% and the owner approves the transition to Stage 1. Codex deleted all
five issues and verified there were no live runs.
