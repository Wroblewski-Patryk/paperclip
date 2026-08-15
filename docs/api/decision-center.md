# Decision Center API

Decision Center is a company-scoped board projection over canonical issue-thread
interactions and formal approvals. It is not a second task or approval store.

## List

`GET /api/companies/:companyId/decisions`

Returns ready, incomplete, deferred, and recent resolved items. Ready items are
ranked by risk, urgency, and age. Approval payloads pass through the normal
redaction boundary.

## Defer

`PUT /api/companies/:companyId/decisions/:sourceType/:sourceId/defer`

```json
{
  "deferredUntil": "2026-08-16T10:00:00.000Z",
  "note": "Wait for the owner maintenance window."
}
```

`sourceType` is `interaction` or `approval`. Deferral does not resolve or mutate
the canonical decision source and therefore does not falsely unblock work.

## Return to ready

`DELETE /api/companies/:companyId/decisions/:sourceType/:sourceId/defer`

All deferral mutations are board-only, company-scoped, and activity logged.

## Decision readiness

Board-facing interaction payloads should include `decisionContext`. Requests
with a non-board audience, `decisionReady: false`, or recognized legacy
technical-handoff wording are shown under **Needs information**, not in the
ready owner queue. Legacy requests remain readable for migration compatibility.

`ownerBriefing` always carries the auditable decision, current facts, compared
options, recommendation, next actions, and rollback. AIA should also populate
the optional owner-comprehension fields whenever they are relevant:

- `plainLanguageSummary` — what happened, without internal terminology;
- `scope` — exactly what an approval or answer enables;
- `outOfScope` — explicit exclusions, especially production, money, secrets, or destructive actions;
- `openQuestions` — evidence or owner knowledge that is genuinely still missing;
- `safetyConstraints` — fail-closed conditions that remain binding after approval.

Do not duplicate the raw issue description. Explain whether the request is
historical or current and name likely adjacent functionality that is not part of
the decision when confusion would otherwise be plausible.

Never put secret values in a decision. Request or answer with a configured
secret-reference alias.
