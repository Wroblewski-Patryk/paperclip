---
title: Organizational records
summary: Assumptions, commitments, and decision memory
---

Organizational records make normally implicit premises, promises, and decisions
inspectable without turning them into hidden execution authority.

## Endpoints

```
GET  /api/companies/{companyId}/organizational-records
POST /api/companies/{companyId}/organizational-records
GET  /api/organizational-records/{id}
PATCH /api/organizational-records/{id}
```

List queries may filter by `kind`, `status`, `ownerAgentId`, `goalId`,
`projectId`, `issueId`, or `attention=true`.

Every record has one of three kinds:

- `assumption`: a premise with optional confidence, review, expiry, and evidence;
- `commitment`: a promise with an owner, due time, fulfilment/breach lifecycle,
  and explicit renegotiation;
- `decision`: a proposed or accepted direction with rationale, consequences,
  evidence, and reversal/supersession history.

Records may link to a goal, project, issue, owner, evidence references, and a
predecessor they supersede. References must belong to the same company. Creating
or updating a commitment without an owner is rejected. Agent-authenticated
writes are always agent-owned and cannot be transferred to a board user; records
created from the board default to the current board user as owner. Creating a
replacement atomically marks its same-kind predecessor as `superseded`.

Records are created explicitly through the board, API, or the deduplicating
agent helper. Paperclip does not harvest free-form issue comments into durable
memory: the executing agent captures a qualifying assumption or commitment when
it has enough evidence and context to classify it safely.

Board users with mutation access may manage company records. Agents may create
records owned by themselves and update only records they own or created. Every
mutation writes an activity entry. An accepted decision remains descriptive: it
does not bypass approvals, budgets, permissions, security policy, or evidence gates.
