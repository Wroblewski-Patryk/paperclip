# Paperclip Project Memory Map

Last updated: 2026-07-22

## Files

| Path | Purpose | Update when |
| --- | --- | --- |
| `.codex/PROJECT_CONTEXT.md` | Compact bootstrap context for new Codex chats. | The top-level mission, active priorities, or key reading order changes. |
| `.agents/state/board-context.md` | User intent, collaboration style, and desired company shape. | The user clarifies what they want Paperclip/Softwarehouse to become. |
| `.agents/state/project-journal.md` | Dated diary of durable decisions and context captures. | Any conversation or work session should be preserved for future chats. |
| `.agents/state/active-mission.md` | Operational mission, gates, lanes, and recent checkpoints. | Live priorities, gates, owner paths, or proof status changes. |
| `.agents/state/responsibility-learning.md` | Lessons from repeated agent/process failures. | A repeated failure pattern or responsibility boundary change is identified. |
| `.agents/state/agent-evals.md` | Evaluations of agent behavior and quality. | Reviewing agent performance or learning-loop outcomes. |
| `.agents/workflows/context-capture.md` | Procedure for turning chats into memory. | The capture workflow itself changes. |
| `docs/softwarehouse/17-knowledge-governance.md` | Company rule for separating current truth, decisions, evidence, lessons, and archive. | Agents need to decide whether old run evidence should become durable truth or remain historical context. |
| `docs/softwarehouse/18-roost-company-knowledge-plane.md` | Canonical Paperclip/Roost/product-repo boundary, company knowledge model, provider-sync assumptions, context policy, and staged autonomy path. | Future work changes the Roost company-plane role, integration phases, provider sync, offering lifecycle, or autonomy boundary. |

## Boundaries

- `.agents` is operating memory for agents.
- `.codex` is compact Codex bootstrap context and local runtime scratch.
- `doc/` is product and engineering documentation.
- Paperclip issue documents are the source of truth for issue-specific plans.
- Generated deliverables should be attached as Paperclip work products when the issue workflow requires it.
- Old issue history, archived tasks, traces, and generated exports are evidence
  until promoted into current truth, a decision, or a lesson by an accountable
  owner.

## Update Granularity

Prefer one concise dated entry per meaningful session. Update summary files only when the new information will matter to future work.
