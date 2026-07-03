# Paperclip Project Memory Map

Last updated: 2026-07-03

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

## Boundaries

- `.agents` is operating memory for agents.
- `.codex` is compact Codex bootstrap context and local runtime scratch.
- `doc/` is product and engineering documentation.
- Paperclip issue documents are the source of truth for issue-specific plans.
- Generated deliverables should be attached as Paperclip work products when the issue workflow requires it.

## Update Granularity

Prefer one concise dated entry per meaningful session. Update summary files only when the new information will matter to future work.
