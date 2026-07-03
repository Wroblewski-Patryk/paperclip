# Release Checklist

## Target

- Release id / issue:
- Project:
- Environment:
- Resource or resource group:

## Source branch / SHA

- Branch:
- Exact source SHA:
- Push status: not needed / pending / pushed / blocked
- Source ref available to deploy target: yes / no / not applicable

## Build result

- Command:
- Result:
- Evidence:

## Test result

- Command:
- Result:
- Evidence:

## Env / secrets check

- Required env vars / secret refs checked:
- Secret values exposed: no
- Missing or blocked bindings:

## Migration impact

- Impact: none / checked / requires migration gate / unknown
- Migration command or review evidence:
- Rollback impact:

## Security review

- Required: yes / no
- Reviewer or gate owner:
- Status: clear / blocked / needs human decision
- Stop conditions from `docs/softwarehouse/07-security-standard.md`:

## Rollback path

- Rollback action:
- Stop condition:
- Recovery owner:
- Expected proof of recovery:

## Deployment action

- Action: none / deploy / restart / rollback / env change / database migration
- Production mutation permit linked: yes / no / not applicable
- Deploy log:

## Smoke test

- Smoke plan:
- Smoke command or manual proof:
- Result:
- Reliability / stability notes:

## DORA snapshot

- Deployment frequency contribution: 0 / 1 / not applicable
- Lead time for changes:
- Change failure status:
- Mean time to recovery:
- Reliability / smoke stability:

## Release decision

GO / NO-GO / NEEDS_HUMAN_DECISION

## Follow-up

- Linked failure / unknown issues:
- Next owner:
