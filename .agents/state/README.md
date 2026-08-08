# Paperclip Softwarehouse Project Memory

Last updated: 2026-08-08

This folder stores curated operating memory for future Codex/Paperclip work in
`Paperclip_Softwarehouse`. The documentation contract names the small subset
that is audited as active state. Explicitly labeled historical baselines may
remain here as indexed references, but bulk journals belong in `history/`.

Use `.agents/skills/paperclip-project-memory/SKILL.md` as the update workflow.

Read order:

1. `current-focus.md`
2. `active-mission.md`
3. `softwarehouse-stage1-delivery-foundation.md`
4. `decision-register.md`
5. `next-steps.md`
6. `risk-register.md`
7. `system-health.md`

Do not read this entire directory by default. Load the narrowest file that
answers the task, then verify volatile facts against the live authority.

Additional files capture specific context:

- `project-journal.md` for recent, meaningful conversation decisions and
  memory-system changes.
- `responsibility-learning.md` for recurring process/agent failure patterns.
- `agent-evals.md` for behavior and quality evaluations.
- `project-memory.md` for the consolidated archived dashboard/routines/agents
  cleanup summary.
- `softwarehouse-stage0-foundation.md` and `softwarehouse-v0-readiness-audit.md`
  are historical baselines. Current operating guidance starts with Stage 1
  delivery files above.

## Archive Policy

- Full journals and superseded bootstrap snapshots live in
  `history/agent-memory/`.
- Archives preserve detail but never override current truth.
- Rotate the active journal at a natural checkpoint before it exceeds the
  active-state byte budget. Preserve the old file intact, add it to the archive
  index, and carry forward only unresolved decisions and navigation.
- Repeated no-change checks belong in issue/run evidence, not in the durable
  journal.
