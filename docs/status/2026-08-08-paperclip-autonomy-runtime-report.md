# Paperclip autonomy runtime report — 2026-08-08

## A. Executive status

Material autonomy controls are implemented and locally verified. Paperclip can
now stop a runaway local Codex session while it is running, reject unsupported
delivery acceptance claims, prevent false-green native supervision, recover
bounded orphan state, route unowned executable work, and turn external-only
assurance gaps into native learning work. External assurance is not ready for
retirement yet.

## B. Session runtime budget

One cumulative budget is keyed to the adapter session and spans all related
runs. It records raw/uncached/cache/output tokens, reads, referenced files,
iterations, retries, and elapsed time. States: `healthy`, `warning`, `throttle`,
`near_limit`, `stopped_by_session_budget`. The local Codex child is terminated
at a hard limit and future runs in the exhausted session fail before invocation.

## C. ProductDelivery acceptance

Outcomes now store typed predicate definitions, predicate results, and an
acceptance decision. Missing, failed, stale, or expired required evidence
blocks `accepted`. Board-only, time-bounded `accepted_with_risk` preserves the
exact failed predicate list. Legacy narrative acceptances can be reopened for
revalidation instead of remaining falsely final.

## D. Native supervision actions

Watchdog detects active severe findings, orphan execution locks, completions
without evidence, accepted outcomes without typed decisions, cost telemetry
gaps, and external-only shadow gaps. It can clear a stale lock tied to a
terminal run, route an unassigned task to a project/hierarchy owner, wake the
bounded owner path, and assign a Doctor finding after admitted dispatch.

## E. False-green and external learning

A cycle with unresolved severe truth cannot report a green metrics result.
External-only signals create a native core finding and record
`externalInterventionRequired`, the missing capability, safeguard target, and
required regression. External checks remain read-only assurance.

## F. Daily economics

Daily Integrity aggregates the previous 24 hours of sessions/runs/outcomes,
raw/uncached/cache/output tokens, reads, retries, estimated wasted input, waste
ratio, and top agents/sessions/context sources.

## G. Roost defect

Root cause was isolated: a correctly rejected old projection replay was kept in
quarantine, but later reads treated that audit-only event as a current conflict.
Roost commit `e52e607fe5ff39f78a58258e37b37b4e1abb8c46` preserves rejection and
audit while reserving public conflict for a real same-snapshot/different-digest
collision. A second production-discovered defect was fixed by
`62ed064af428204cdf8f473d546a8fa5a440b9ce`: another offering's SHA drift now
stays item-scoped and cannot poison an aligned Roost projection. The second
commit is deployed and verified.

## H. Verification evidence

- Paperclip runtime/delivery/supervision: 23 tests exercised; 22 passed on the
  combined run and one new assertion-shape mistake failed; the corrected test
  passed on rerun. Native supervision passed 8/8.
- Roost projection: targeted tests passed 8/8.
- Roost release gates: server/web build passed, architecture chain gate 34/34,
  evidence gate passed, and route-capability check passed 183 routes/36 files.
- Paperclip migration 0118 is applied to canonical embedded PostgreSQL on
  strict port 54329; migration runner reports no pending migrations.

## I. Live state

Paperclip health is `ok` on strict `127.0.0.1:3200`; PostgreSQL listens on
strict 54329. Protected Roost readback at
`62ed064af428204cdf8f473d546a8fa5a440b9ce` passed all ten predicates:
health, exact deployed SHA, published outbox, protected read, exact snapshot,
no conflict, current freshness (40,199 ms under 900,000 ms TTL), digest match,
read-key write denial, and duplicate idempotency. ProductDelivery
`006c4a3c-6f17-4d7e-a423-3ec0069de2b8` was reopened, assigned ten typed
predicates, and independently reaccepted with 10 passed / 0 failed.

The first native control tick exposed the original ownership bug directly:
the learning loop tried to create executable `todo` work with no assignee and
received `422`. Owner resolution now matches name/title/role aliases and has a
safe hierarchy fallback. The repaired loop created `LUC-2531` as `todo`
assigned to `09 EDL (Engineering Delivery Lead)`. A complete subsequent
control tick finished `ok=true`; its learning-loop step also passed.

## J. Retirement gate

Do not disable external Codex automations yet. Require 14 consecutive daily
windows with zero external-only critical gaps, zero false-green cycles, full
cost/session telemetry coverage, no orphan locks, no evidence-free completion,
typed fresh predicates for every accepted real delivery, and passing native
regressions for every prior external intervention class.

## K. Remaining work

1. Resolve or absorb the remaining historical external-only shadow classes;
   the native finding now records the missing capability and regression need.
2. Revalidate the remaining legacy accepted outcomes without typed predicates.
3. Reduce historical completion-evidence and cost-telemetry debt through
   bounded owned lanes; do not bulk-mark evidence as present.
4. Add a dedicated audited board configuration surface for changing session
   runtime limits; current defaults are core-controlled and agent-immutable.
5. Begin the 14-day retirement observation only after those gaps are closed.
