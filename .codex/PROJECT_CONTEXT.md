# Paperclip Softwarehouse Codex Bootstrap

Last updated: 2026-08-08

This file is a compact router for new Codex sessions. It is not a second
product specification, live-status dashboard, or execution log. Re-verify all
runtime, issue, branch, deployment, and credential facts before acting.

## Authority Order

1. Follow `AGENTS.md` and `docs/documentation-contract.json`.
2. For product intent and V1 behavior, use `doc/GOAL.md`, `doc/PRODUCT.md`, and
   `doc/SPEC-implementation.md`.
3. For architecture and operations, load only the task-relevant sources named
   by the documentation contract.
4. For current Softwarehouse direction, read
   `.agents/state/current-focus.md`, then `.agents/state/active-mission.md`.
5. Use `.agents/state/decision-register.md` for rationale and
   `.agents/state/responsibility-learning.md` for promoted reusable lessons.
6. Use `.agents/state/project-journal.md` only for recent memory work. Search
   `history/agent-memory/` only when historical reconstruction is necessary.

Higher-authority product and implementation sources override agent memory.
Current state overrides archive. Evidence does not become current truth until
it is explicitly promoted into the appropriate current-truth source.

## Task Routing

- Repository change: start with the bounded default context from
  `docs/documentation-contract.json`, then add the relevant engineering docs.
- Softwarehouse priorities or gates: read `current-focus.md` and
  `active-mission.md`, then verify the live Paperclip API.
- User intent or collaboration preferences: read `board-context.md`.
- Durable memory update: use
  `.agents/skills/paperclip-project-memory/SKILL.md`.
- UI work: use `.agents/skills/design-guide/SKILL.md` and
  `doc/UI-DESIGN-SYSTEM.md`.
- Historical investigation: search `history/`, `docs/status/`, issue comments,
  and work products; never load them as a default bundle.

## Stable Operating Boundaries

- Paperclip is the local control plane for LuckySparrow Software House.
- The approved singleton workspaces are Paperclip Softwarehouse, Soar, Roost,
  and Featherly under their declared roots in `AGENTS.md`.
- Paperclip must remain on strict ports `3200` and `54329`; never start a
  fallback instance.
- Keep work company- and project-scoped, preserve approval/evidence gates, and
  never expose secret values in prompts, logs, documentation, or comments.
- Do not infer that an old issue, report, journal entry, or deployment snapshot
  is still current. Re-check the authoritative source before mutation.

## Memory Hygiene

- `.agents/` is the provider-neutral canonical home for agent skills and
  operating memory.
- `.codex/` contains only this tracked bootstrap; local logs and generated
  evidence remain ignored scratch data.
- Active memory stays concise. Full historical journals and superseded context
  live under `history/agent-memory/` and are read on demand.
- Record one meaningful decision or session summary, not repeated no-change
  checkpoints. Promote durable rules into the relevant contract, procedure,
  skill, eval, or decision register.

## North Star

Help the owner build a capable, governable, inspectable autonomous software
company. Optimize for verified product outcomes and safe autonomy rather than
task volume, agent activity, or documentation volume.
