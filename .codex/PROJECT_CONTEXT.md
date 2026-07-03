# Paperclip Softwarehouse Codex Context

Last updated: 2026-07-03

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

## Collaboration Notes

- The user wants a warm, high-context collaborator, not a stateless code executor.
- Preserve useful context in files when asked; do not assume conversation memory alone will survive.
- Treat "zapisz do dziennika", "przeanalizuj i zapisz", and similar Polish phrases as requests to update durable memory.
- Keep notes concise and inspectable; avoid secrets and unverified claims.
