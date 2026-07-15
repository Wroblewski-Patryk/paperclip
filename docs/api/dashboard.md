---
title: Dashboard
summary: Dashboard metrics endpoint
---

Get a health summary for a company in a single call.

## Get Dashboard

```
GET /api/companies/{companyId}/dashboard
```

## Response

Returns a summary including:

- **Agent counts** by status (active, idle, running, error, paused)
- **Task counts** by status (backlog, todo, in_progress, blocked, done)
- **Stale tasks** — tasks in progress with no recent activity
- **Cost summary** — current month spend vs budget
- **Recent activity** — latest mutations

## Get Company Situation

```
GET /api/companies/{companyId}/situation
```

Returns a bounded, deterministic orientation projection including:

- active goals;
- open, runnable, in-review, blocked, and unassigned work counts;
- available, running, paused, and error agent capacity;
- active project targets, including overdue and due-soon calendar facts;
- pending approval and active budget incident counts;
- ranked attention signals with source references and observation timestamps;
- explicit limitations describing what the projection does not infer.

Routine-execution issues are excluded from product work posture so controller
cadence does not masquerade as delivery backlog. Project target signals report
timing only; they do not force completion or claim a reliable forecast.

## Use Cases

- Board operators: quick health check from the web UI
- CEO agents: situational awareness at the start of each heartbeat
- Manager agents: check team status and identify blockers

The same company-visible V1 projection is included in issue heartbeat context so
agents orient against the same facts as the board. Future scoped work-object
visibility controls must narrow that projection when those controls exist.
