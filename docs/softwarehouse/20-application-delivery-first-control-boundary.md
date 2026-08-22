# Application-Delivery-First Control Boundary

Status: active operating contract

Owner: Board

Last updated: 2026-08-22

## Purpose

LuckySparrow exists to finish Soar, Roost, and Featherly. Task, run, finding,
training, review, and documentation volume are not outcomes. Paperclip may
coordinate application delivery and deterministic runtime hygiene; it must not
turn observations about itself into a second autonomous product backlog.

## Authority split

| Layer | May do | Must not do |
| --- | --- | --- |
| Four external Codex automations | Read, compare, and publish shadow assurance evidence | Mutate Paperclip, create Paperclip issues, or dispatch agents |
| Native supervision | Detect, deduplicate, classify, reconcile stale runtime state, and perform whitelisted deterministic recovery | Edit Paperclip code, policy, instructions, skills, or routines; create recursive diagnosis trees |
| Host control tick | Reconcile existing work, quota/admission, live runs, dependencies, source-control closure, and runtime hygiene | Seed planning, learning, backlog, or self-improvement work while application debt exists |
| Paperclip agents | Implement, test, review, commit, push, deploy, and observe application work through declared gates | Create Paperclip self-improvement work while an application issue remains open |
| Owner + Codex | Decide and implement Paperclip code/policy/routine corrections from one canonical finding | Bypass application safety, quota, or protected-action gates |

## Runtime invariants

1. Open application debt activates `application_delivery_first`.
2. In that state, issue-generating control-tick steps are skipped and every
   invoked child receives `SOFTWAREHOUSE_EXISTING_ISSUES_ONLY=1`.
3. The learning loop, organizational-orientation promotion, and worker-backlog
   decomposition are permanently externalized from the automatic tick.
4. Model-backed Softwarehouse routines remain archived. Project truth is
   refreshed by deterministic host checks and real source/delivery events.
5. An agent cannot create a control-plane issue while any active application
   project has open work. Board-authored repair remains possible.
6. Re-observing identical finding evidence updates `lastSeenAt`; it does not
   increment occurrence/recurrence, append evidence, or redispatch diagnosis.
7. Model Doctor dispatch is disabled by default. A finding requiring a
   Paperclip change is a single owner/Codex repair packet.
8. Quota hold blocks runs and new work without converting the hold into an
   application failure.

## Improvement lifecycle

```text
external assurance -> canonical finding -> owner/Codex repair
-> regression test -> observation window -> resolve or revert
```

Paperclip continues deterministic application/runtime work during this
lifecycle where admission permits it. A repair is successful only when its
regression passes and the observation window shows reduced recurrence or
improved verified application throughput.

## Verification map

- Tick policy: `scripts/lib/softwarehouse-app-first-control-policy.mjs`
- Tick integration: `scripts/run-softwarehouse-control-tick.mjs`
- Creation admission: `server/src/services/agent-issue-creation-pressure.ts`
- Finding idempotency: `server/src/services/supervision-registry.ts`
- Doctor boundary: `server/src/services/native-supervision-engine.ts`
- Routine posture: `scripts/lib/softwarehouse-active-routines.mjs`
- Archived-envelope cleanup: `scripts/cleanup-archived-routine-envelopes.mjs`
- Regressions: `scripts/softwarehouse-app-first-control-policy.test.mjs`,
  `server/src/__tests__/agent-issue-creation-pressure.test.ts`,
  `server/src/__tests__/supervision-registry-service.test.ts`, and
  `server/src/__tests__/native-supervision-engine.test.ts`
