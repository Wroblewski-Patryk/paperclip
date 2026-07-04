# Softwarehouse Standard Stack

Status: active baseline
Date: 2026-07-04
Owner: Portfolio Director

Purpose: keep the autonomous Paperclip organization coherent without turning
every agent into a generalist or creating process theater. Standards are used
only when they reduce ambiguity, improve evidence, protect risk, or speed up
delivery.

## Core Complementary Standards

| Standard | What it solves | How agents use it |
| --- | --- | --- |
| APQC/PCF-style process map | Organizational coverage: no missing business process class. | Map work to one department/process before creating routines, goals, or broad tasks. |
| MECE decomposition | Clean task splits: no gaps, no overlaps. | Split parent issues into mutually exclusive child lanes that together cover acceptance. |
| Kanban | Daily work visibility and WIP control. | Treat Paperclip issues as cards moving through backlog, todo, in progress, review, blocked, done, or cancelled. |
| PDCA | Continuous improvement. | Plan the lane, do the work, check evidence, then act by updating docs, process, skill, or follow-up. |
| RACI/DACI-lite | Decision clarity and responsibility boundaries. | Every non-trivial lane names owner, reviewers/consulted roles, approver or decision owner, and informed parent. |
| Definition of Ready / Definition of Done | Start and finish quality. | Do not start unclear work; do not close without evidence and acceptance. |
| ADR/RFC-lite | Durable technical and product decisions. | Record non-trivial architecture, integration, data, security, or product tradeoffs before future agents rely on them. |
| C4/traceability-lite | Cross-layer product understanding. | Connect user flows, frontend, backend, data, jobs, integrations, tests, docs, and deployment evidence. |
| DevOps/DORA/SRE-lite | Delivery reliability. | Track deploy evidence, change failure, recovery, rollback, smoke checks, and operational health. |
| OWASP ASVS/SAMM + least privilege | Security and secrets discipline. | Scale security checks by risk; use secret refs only; gate production, auth, and data-sensitive actions. |
| ITIL-inspired incident/problem/change | Operational recovery without chaos. | Separate incident containment, root cause/problem learning, and controlled change/release approval. |
| Value-stream/no-waste review | Cost, token, and cycle-time control. | Remove duplicate searches, stale blockers, broad tasks, repeated failed wakes, and unnecessary context. |
| Knowledge governance | Memory signal-to-noise and staleness control. | Separate current truth, decisions, evidence, lessons, and archive before loading context or updating memory. |

## Decision Rule

When an agent is unsure which standard applies, use this order:

1. APQC/PCF: which department/process owns this?
2. RACI/DACI-lite: who is accountable, consulted, approver, and informed?
3. MECE: what is the smallest clean lane or child issue?
4. Kanban: what board state should the lane be in?
5. DoR/DoD: is it ready to start and provable to close?
6. ADR/RFC/C4: does this change architecture, contracts, or cross-layer flow?
7. Security/DevOps/ITIL: does this touch secrets, deploy, production, incident,
   rollback, money, legal, or live user/trading risk?
8. PDCA: what should improve before the next similar run?
9. Knowledge governance: is this current truth, decision, evidence, lesson, or
   archive, and what does it supersede?

## No-Wake Change Hygiene

Paperclip comments can reopen or wake blocked/done work. Treat comments as
signals, not punctuation.

- If the purpose is to continue execution, comment normally and expect a wake.
- If the purpose is final documentation or operator closure, prefer status
  updates, issue documents, work products, or an explicit no-continuation path
  when available.
- If a closure comment accidentally wakes an agent, cancel the unintended run,
  restore the correct issue state, resume the agent if it entered error, and
  record the learning without adding another wake-producing comment.
- Agents should not interpret an operator finalization comment on a terminal
  issue as permission to restart work unless the comment explicitly asks for a
  new action.

## Anti-Pattern Guardrails

- Do not create a new issue for every observation. Use comments or documents
  when no separate owner/proof lane is needed.
- Do not hide executable work inside prose. Create a child issue when another
  owner must act.
- Do not use standards as a reason to stop delivery. Standards exist to move
  Soar/Roost toward usable production with fewer mistakes.
- Do not certify or overformalize. Use lightweight, evidence-backed versions
  of each standard.
- Do not load or cite old issue history as binding truth until it is checked
  against current-truth and decision sources.
