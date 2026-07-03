# Incident And Bugfix Process

Status: active baseline
Date: 2026-06-03
Owner: QA Regression Lead

Bugfixes and incidents must leave learning behind.

## Bugfix Flow

1. Capture symptom.
2. Reproduce or record observed evidence.
3. Identify likely root cause.
4. Make the smallest fix.
5. Add regression proof or name the missing-test gap.
6. Verify the fix.
7. Update known issues, runbook, or changelog when useful.
8. Report risk and next action.

## Incident Flow

1. Stabilize or block unsafe action.
2. Identify owner and scope.
3. Collect logs/evidence without leaking secrets.
4. Decide rollback, hotfix, or wait.
5. Verify recovery.
6. Record timeline and root cause.
7. Create follow-up for prevention.

## Status Rules

- `BLOCKED` requires blocker, owner, and unblock action.
- `NEEDS_HUMAN_DECISION` requires one concrete question and a recommended decision.
- `DONE` requires proof that the symptom is resolved or the incident is safely closed.

