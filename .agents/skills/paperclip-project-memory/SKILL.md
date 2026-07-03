---
name: paperclip-project-memory
description: Maintain durable Paperclip Softwarehouse project context, decision journals, and operating memory. Use when the user asks to analyze a conversation, save context, update the diary/dziennik, preserve lessons for future chats, coordinate the autonomous software company vision, or refresh `.agents`/`.codex` memory files for this repository.
---

# Paperclip Project Memory

## Overview

Use this skill to keep the repository-local memory coherent across Codex chats. The goal is to help the user run Paperclip as the control plane for an autonomous software company, not merely to collect notes.

## Startup

1. Read `AGENTS.md` first and follow its required repository docs for code changes.
2. Read `.codex/PROJECT_CONTEXT.md` for compact current context when present.
3. Read `.agents/state/board-context.md` for the user's intent and operating preferences.
4. Read `.agents/state/active-mission.md` when the work affects Softwarehouse priorities, Soar/Roost delivery, agents, gates, or production posture.
5. Read `.agents/state/project-journal.md` before appending a durable diary entry.
6. Use `.agents/workflows/context-capture.md` when the user asks to save or analyze a chat.

For file locations and update rules, see `references/memory-map.md`.

## Capture Workflow

When asked to save context from a conversation or recent work:

1. Extract decisions, goals, constraints, open questions, and concrete next actions.
2. Separate durable context from transient chat noise.
3. Append a dated entry to `.agents/state/project-journal.md`.
4. Update `.agents/state/board-context.md` only when the user's intent, preferences, or operating model changed.
5. Update `.agents/state/active-mission.md` only when priorities, gates, owners, or live project status changed.
6. Update `.agents/state/responsibility-learning.md` or `.agents/state/agent-evals.md` only for repeated agent behavior patterns, failures, or evaluations.
7. Keep product docs in `doc/` for product contracts and `.agents`/`.codex` for operating memory.

## What To Record

Record:

- the user's current vision for Paperclip and LuckySparrow Software House;
- decisions that should influence future chats;
- current project priorities, especially Soar-first and Roost-second posture;
- safety gates around production, secrets, deploys, pushes, and protected smoke tests;
- recurring problems with agents, routines, learning loops, or coordination;
- links to issues, commits, files, reports, or commands that prove the state.

Avoid recording:

- raw secrets, tokens, cookies, private keys, or credential values;
- unverified assumptions as facts;
- huge pasted transcripts when a concise synthesis is enough;
- product requirements that belong in `doc/SPEC-implementation.md` or issue documents.

## Writing Style

Write memory as concise, dated, inspectable notes. If the source is a chat rather than code, say "conversation summary" and name the uncertainty. If the source is a command or file, include the command/file path.

## Operating Principle

Be useful to future conversations. Preserve enough context that a new Codex can talk with the user naturally about the project, while still forcing fresh verification before code, production, money, or security-sensitive actions.
