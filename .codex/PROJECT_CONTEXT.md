# Paperclip Softwarehouse Codex Context

Last updated: 2026-07-04

## What This Workspace Is

This repository is the user's local Paperclip Softwarehouse control-plane workspace. Paperclip is being used and developed as the operating layer for an autonomous software company: agents as employees, issues as work objects, artifacts as evidence, and board/operator governance as the safety layer.

## Read First

For repository work, follow `AGENTS.md` first. Then read:

1. `doc/GOAL.md`
2. `doc/PRODUCT.md`
3. `doc/SPEC-implementation.md`
4. `doc/DEVELOPING.md`
5. `doc/DATABASE.md`

For Softwarehouse operating context, read:

1. `.agents/state/board-context.md`
2. `.agents/state/active-mission.md`
3. `.agents/workflows/context-capture.md`
4. `.agents/state/project-journal.md`

Use `.agents/skills/paperclip-project-memory/SKILL.md` when the user asks to save context, update the diary, analyze old chats, or improve durable operating memory.

## Current North Star

Help the user build and run LuckySparrow Software House as an autonomous software company on top of Paperclip. The system should make autonomous agents more capable, governable, inspectable, and commercially useful while keeping human board control over risk, production, budget, and direction.

## Current Stage 0 State

The local Paperclip Softwarehouse instance has been reset to a quiet Stage 0
configuration phase. Codex in the current chat configures v0 directly; Paperclip
agents should not work yet.

Current verified direction:

- 38 agents exist and are intentionally paused.
- 7 routines exist only as inactive assets: routine `status: paused`, triggers `enabled: false`.
- 3 planned company goals exist with department prefixes.
- 0 issues/tasks and 0 live runs should remain true until owner approval.
- 18 company skills are attached by role.
- 29 Stage 0 secrets exist in Paperclip `local_encrypted` storage and are
  bound by secret refs to least-privilege agent groups. This includes Coolify
  login refs, separate Coolify read/deploy API tokens, Coolify team/resource
  ids, Soar/Roost production URLs, and one production test account per app.
  Values must not be written into memory or final responses.
- 38/38 managed instruction bundles are present and include shared standards,
  learning/self-correction, hiring governance, secrets/deploy policy, and
  end-to-end operating flow.
- Department 05 is customer success; department 06 is people and AI workforce.
- Canonical department map and naming convention live in
  `.agents/state/softwarehouse-departments.md`; department-owned work objects
  should start with `NN NazwaDziału - ...`.
- Projects use the English project naming convention
  `NN Department: Element`; current active lanes include
  `00 General: Softwarehouse`, `11 Innovation: Soar`,
  `11 Innovation: Roost`, and `11 Innovation: Aviary`.
- Goals also use the English naming convention `NN Department: Element`;
  current goals are `00 General: v0 Softwarehouse Readiness`,
  `11 Innovation: Stage 1 Soar Activation`, and
  `11 Innovation: Stage 1 Roost Activation`.
- Only `06 AIM (AI Agent Manager)` may create/hire AI agents.
- Secrets must be entered through Paperclip secret refs/provider flows, never
  chat or memory files.
- Resource policy lives in `.agents/state/softwarehouse-resource-policy.md`.
  The owner does not have a paid GitHub plan; do not assume paid GitHub
  features, paid Actions capacity, Advanced Security, paid runners/packages,
  enterprise-only controls, paid GitHub AI features, or notification-heavy
  automation.
- Resource access matrix lives in
  `.agents/state/softwarehouse-resource-access-matrix.md`. Follow least
  privilege for secrets, skills, tools, markdown resources, routines, repos,
  deployments, and production test accounts.
- Product architecture index lives in
  `.agents/state/softwarehouse-product-architecture-index.md`; Soar and Roost
  product work must start from each repo's `docs/architecture`.
- Autonomous delivery architecture lives in
  `.agents/state/softwarehouse-autonomous-delivery-architecture.md`; Stage 1
  work must follow top-down delegation, duplicate prevention, PDCA,
  commit/push/Coolify/production-smoke closure, and governed learning packets.
- Architecture gap analysis lives in
  `.agents/state/softwarehouse-architecture-gap-analysis.md`; current guidance
  is controlled activation with existing agents first, not adding new permanent
  agents before Stage 1 proves a gap.
- Procedure system lives in `.agents/state/softwarehouse-procedure-system.md`
  and task lifecycle contract lives in
  `.agents/state/softwarehouse-task-lifecycle-contract.md`; agents should
  create/update tasks only when work connects to goal, procedure, parent,
  child evidence, closure synthesis, retrospective, and improvement.
- Owner interface contract lives in
  `.agents/state/softwarehouse-owner-interface-contract.md`; after Stage 1
  activation, Paperclip should communicate with the owner through `00 AIA` in
  Polish, while internal company assets remain English-first.
- Recommended first Stage 1 action lives in
  `.agents/state/softwarehouse-stage1-recommended-first-action.md`: controlled
  Soar dry run through AIA before broad agent activation.

Read these current Stage 0 files before changing Softwarehouse configuration:

- `.agents/state/softwarehouse-stage0-foundation.md`
- `.agents/state/softwarehouse-v0-readiness-audit.md`
- `.agents/state/softwarehouse-departments.md`
- `.agents/state/softwarehouse-secret-requirements.md`
- `.agents/state/softwarehouse-resource-policy.md`
- `.agents/state/softwarehouse-resource-access-matrix.md`
- `.agents/state/stage1-activation-soar.md`
- `.agents/state/stage1-activation-roost.md`
- `.agents/state/softwarehouse-product-architecture-index.md`
- `.agents/state/softwarehouse-autonomous-delivery-architecture.md`
- `.agents/state/softwarehouse-architecture-gap-analysis.md`
- `.agents/state/softwarehouse-procedure-system.md`
- `.agents/state/softwarehouse-task-lifecycle-contract.md`
- `.agents/state/softwarehouse-owner-interface-contract.md`
- `.agents/state/softwarehouse-stage1-recommended-first-action.md`

## Collaboration Notes

- The user wants a warm, high-context collaborator, not a stateless code executor.
- Preserve useful context in files when asked; do not assume conversation memory alone will survive.
- Treat "zapisz do dziennika", "przeanalizuj i zapisz", and similar Polish phrases as requests to update durable memory.
- Keep notes concise and inspectable; avoid secrets and unverified claims.
