# Context Capture Workflow

Last updated: 2026-08-08

Use this workflow when the user asks to save, summarize, or transfer context from another chat into this repository's durable memory.

## Steps

1. Identify the source: conversation summary, pasted transcript, issue, diff, command output, or file set.
2. Extract only durable content: decisions, goals, constraints, next actions, lessons, and evidence.
3. Append a dated entry to `.agents/state/project-journal.md` only when there
   is a durable delta. Otherwise report `no knowledge change` without growing
   the journal.
4. Update `.agents/state/board-context.md` if the user's long-term intent or collaboration preference changed.
5. Update `.agents/state/active-mission.md` if project priorities, gates, lane status, or proof state changed.
6. Update `.agents/state/responsibility-learning.md` or `.agents/state/agent-evals.md` only for repeated agent/process patterns.
7. Keep issue-specific plans and proof in the relevant Paperclip issue/document/work product, not only in repo memory.
8. When the active journal approaches the configured active-state byte budget,
   move it intact to `history/agent-memory/`, start a small active journal with
   an archive link, and do not load the archive by default.

## Quality Bar

- Include dates and issue/run ids when known.
- Distinguish verified facts from conversation summaries.
- Do not store raw secrets or credentials.
- Keep entries short enough that future chats can actually use them.
- If a note changes product behavior or user-facing docs, update the canonical `doc/` file too.
