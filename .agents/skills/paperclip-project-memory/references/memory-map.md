# Paperclip Project Memory Map

Last updated: 2026-08-08

## Files

| Path | Purpose | Update when |
| --- | --- | --- |
| `.codex/PROJECT_CONTEXT.md` | Compact routing bootstrap for new Codex chats; no volatile status duplication. | Authority, task-routing, or stable workspace boundaries change. |
| `.agents/state/board-context.md` | User intent, collaboration style, and desired company shape. | The user clarifies what they want Paperclip/Softwarehouse to become. |
| `.agents/state/project-journal.md` | Active diary of recent durable decisions and context captures. | A conversation creates a meaningful durable delta. |
| `history/agent-memory/` | Immutable historical journals and superseded bootstrap snapshots. | Active memory is rotated at a natural checkpoint or approaches its byte budget. |
| `.agents/state/active-mission.md` | Operational mission, gates, lanes, and recent checkpoints. | Live priorities, gates, owner paths, or proof status changes. |
| `.agents/state/responsibility-learning.md` | Lessons from repeated agent/process failures. | A repeated failure pattern or responsibility boundary change is identified. |
| `.agents/state/agent-evals.md` | Evaluations of agent behavior and quality. | Reviewing agent performance or learning-loop outcomes. |
| `.agents/workflows/context-capture.md` | Procedure for turning chats into memory. | The capture workflow itself changes. |
| `docs/softwarehouse/17-knowledge-governance.md` | Company rule for separating current truth, decisions, evidence, lessons, and archive. | Agents need to decide whether old run evidence should become durable truth or remain historical context. |
| `docs/softwarehouse/18-roost-company-knowledge-plane.md` | Canonical Paperclip/Roost/product-repo boundary, company knowledge model, provider-sync assumptions, context policy, and staged autonomy path. | Future work changes the Roost company-plane role, integration phases, provider sync, offering lifecycle, or autonomy boundary. |
| `docs/softwarehouse/19-autonomous-application-business-lifecycle.md` | Canonical end-to-end application/business lifecycle, stage ownership, evidence gates, release loop, operating path, and learning contract. | Work changes how an application is validated, built, verified, released, operated, commercialized, or improved. |
| `doc/plans/2026-07-22-local-softwarehouse-v0-implementation.md` | Canonical implementation and acceptance plan for the local application-building Softwarehouse V0. | V0 scope, workstream order, issue anchors, acceptance gates, or the V1 handoff boundary changes. |

## Boundaries

- `.agents` is the provider-neutral canonical home for operating memory and
  reusable repository skills.
- `.codex` is a compact Codex routing bootstrap plus ignored local scratch.
- `doc/` is product and engineering documentation.
- Paperclip issue documents are the source of truth for issue-specific plans.
- Generated deliverables should be attached as Paperclip work products when the issue workflow requires it.
- Old issue history, archived tasks, traces, and generated exports are evidence
  until promoted into current truth, a decision, or a lesson by an accountable
  owner.

## Update Granularity

Prefer one concise dated entry per meaningful session. Do not append a
no-change heartbeat merely because a review occurred. Update summary files
only when the new information will matter to future work.

When the active journal approaches `maxActiveStateFileBytes`:

1. Move the complete journal to `history/agent-memory/` with a bounded date in
   the filename.
2. Start a small active journal with an archive link and only unresolved or
   newly durable context.
3. Do not summarize away or delete the archived source.
4. Never load all archives unless the task is explicitly historical.
