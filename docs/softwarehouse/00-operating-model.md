# Paperclip Softwarehouse Operating Model

Status: active baseline
Date: 2026-06-03
Owner: Portfolio Director

Paperclip Softwarehouse is the execution department of LuckySparrow. It is not a separate company. It exists to build, repair, maintain, document, verify, and release applications for LuckySparrow while keeping all work inspectable in Paperclip.

Roost / CompanyCore is the intended long-term source of truth for company data, projects, roles, process state, documentation, and resources. Until that integration is complete, this directory and `softwarehouse/` are the operating source of truth for the local Paperclip Softwarehouse.

## Operating Principles

- The active company target is defined in
  `docs/softwarehouse/15-autonomous-company-target.md`. Agents must use it when
  choosing between Soar, Roost, and Softwarehouse/system work.
- Work is organized by role, process, task, evidence, and handoff.
- No agent is a general all-purpose softwarehouse.
- Leads coordinate, decompose, review, and decide.
- Specialists produce scoped deliverables inside their layer.
- A task is not complete until there is proof.
- Production mutation needs an explicit release gate and rollback path.
- Repeated failure becomes a process or capability improvement, not silent prompt widening.

## Lightweight Standard Stack

Paperclip Softwarehouse uses a light operating system inspired by:

- PDCA / ISO 9001: plan, do, check, act on every meaningful task.
- APQC-style process classification: every task maps to a named process.
- Scrum / Kanban: clear workflow states and no stale work.
- DevOps / DORA: delivery, failure, recovery, and reliability are tracked.
- OWASP ASVS/SAMM: security checks are scaled to risk.
- ADRs: architectural decisions are recorded when they affect future work.

## Required Work Loop

Every agent run must leave a durable outcome:

- `DONE`: proof exists and the acceptance criteria are met.
- `BLOCKED`: blocker, owner, and unblock action are named.
- `NEEDS_REVIEW`: reviewer or gate owner is named.
- `NEEDS_HUMAN_DECISION`: the decision cannot be inferred safely.
- `DELEGATED`: child issue or handoff exists with one accountable owner.
- `TODO`: next owner and next action are clear.

`IN_PROGRESS` is valid only while a live run exists or a short explicit continuation path is active.
