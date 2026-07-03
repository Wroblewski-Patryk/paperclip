# Pipeline And Supervision Contract

Work from broad context to narrow execution and back to broad integration:

`intent -> map -> lanes -> implementation -> verification -> integration -> decision -> memory`

During active takeover this loop repeats continuously:

`Portfolio/PM -> Delivery -> Specialist -> QA/Ops/Security -> Delivery -> PM -> Docs/Memory -> next lane`

The direction matters. Supervisors decide priority and split work downward;
specialists return evidence upward; QA/Ops/Security can block; Docs/Memory makes
the current truth durable; PM starts the next narrow lane until the current
version is verified or explicitly blocked.

Every run must keep Paperclip state aligned with the written conclusion. If the
comment says `blocked`, set or request `blocked`. If work is complete, set or
request `done`. If another role owns the next step, create or request a child
issue with one owner and a proof contract.

## Single-Lane Execution

- One agent can actively execute only one lane at a time.
- A manager may coordinate many open lanes, but each manager run must make one
  clear decision or handoff before moving to the next lane.
- A specialist must not implement two unrelated requests in one run, and must
  not mix project contexts such as Soar and Roost in one execution.
- If two Project Managers need the same specialist, the second request waits as
  `todo/backlog/blocked` with dependency notes until the specialist's current
  lane has a durable disposition.
- Parallel work is allowed only across different agents on independent lanes,
  with no shared file, release, secret, or acceptance conflict.
- Before promoting Roost or any second project from preparation into full
  delivery, run `node scripts/check-two-project-readiness.mjs`. Shared
  supervision readiness is not full two-project delivery readiness.

The architecture graph is part of that state. Every implementation or proof lane
must identify:

- affected architecture entities;
- affected module/feature/component/API/model/test/doc paths;
- upstream dependencies;
- downstream tasks or parent decisions that depend on the result;
- proof required to move status from `implemented` to `tested` or `verified`.

If a lane cannot name these links, the correct next action is not coding. The
correct next action is an architectural-awareness scan or CTO/Docs Memory
reconciliation.

## Supervisor Flow

- Project Manager owns one application project, version target, queue, blockers,
  routine posture, and project-level status integration.
- Project Manager enforces no-stall flow: every open lane needs an owner,
  expected output, evidence requirement, and next integration point.
- Project Manager delegates in stages: map current state, request best-practice
  or architecture review when useful, propose the plan upward when the change is
  non-trivial, delegate exact implementation, request independent verification,
  request security/Ops review when risk requires it, then integrate evidence and
  route source-control closure.
- Project Manager checks every 30 minutes during Soar V1 takeover and must not
  leave stale `in_progress` issues without live execution.
- Specialist agents report lane status upward to Engineering Delivery Lead.
- Engineering Delivery Lead coordinates specialist lanes and parent issue state.
- Engineering Delivery Lead keeps the gap register alive and converts every
  failed proof into one-owner repair work.
- QA, Security, and Ops can block completion when evidence, safety, or release
  readiness is insufficient.
- CTO/Product/Portfolio make broad decisions after specialist evidence is known.
- Docs Memory updates indexes, history, evidence ledgers, and template feedback.

## Required Disposition

Leave exactly one durable disposition at the end of each run:

- `done`: verified and evidence-backed.
- `blocked`: concrete blocker with next owner/action.
- `in_review`: named reviewer/gate owner exists.
- `delegated`: child issue exists or is explicitly requested.
- `in_progress`: only when a live continuation path exists.

Do not rely on narrative-only completion. File edits, comments, and summaries are
supporting evidence; the Paperclip issue graph must also reflect the truth.

When the local Paperclip API is available to the agent, the final action must be
a real issue-state update, not only a comment. Use `PATCH /api/issues/{issueId}`
with the final `status` and a concise evidence comment. If a recovery action was
created only because the previous run had evidence but no durable disposition,
the recovery owner should resolve that recovery action and restore the source
issue to the evidence-backed status instead of creating another blocker.

Ownership or assignee correction is not an unblock signal. If a blocked issue is
only being moved to the right owner, preserve `status: blocked` in the same API
update and avoid ordinary comments that can wake a continuation. Use a separate
fresh operator approval comment only when the issue is intentionally allowed to
run one narrow gate recheck.

When `pnpm softwarehouse:control-tick` exposes
`operatorActionPacket.status=operator_input_or_gate_evidence_needed`, do not
invent filler work. Surface the redacted packet as the operator-facing unblock
summary, keep monitoring fresh, and wait for one accepted fresh fact before
resuming protected project mutation, commit, push, deploy, or restart work.
