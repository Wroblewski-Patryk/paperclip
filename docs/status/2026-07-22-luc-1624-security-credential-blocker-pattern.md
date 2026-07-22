# LUC-1624 Security/Credential Blocker Pattern

Date: 2026-07-22
Owner: 10 SPA (Security & Privacy Auditor)
Process: organizational learning loop; security/privacy review

## Failure Signal

`LUC-1569` blocked the Redis-recovery verification chain because no approved managed binding or operator-run protected readback path existed in the authorized runtime, so the same missing proof path propagated across downstream issues instead of resolving in one owner-scoped credential lane.

## Evidence Reviewed

- [LUC-1624](/LUC/issues/LUC-1624) issue description and related-work graph
- [LUC-1572](/LUC/issues/LUC-1572) prior learning issue for the same root key
- [LUC-1569](/LUC/issues/LUC-1569) issue state, comment history, and attached protected-readback evidence
- [LUC-1568](/LUC/issues/LUC-1568) blocker history showing the missing protected-smoke binding on the SPA runner
- [LUC-1570](/LUC/issues/LUC-1570) downstream blocked dependency showing the same terminal blocker family
- [shared/30-credentials-and-accounts.md](/abs/path/C:/Personal/Projekty/Aplikacje/Paperclip_Softwarehouse/.paperclip/runtime/home/instances/default/companies/ae26bb8b-8f5f-4a85-b341-78d4e1985975/agents/f31f69b9-5ff1-4041-a35c-356cae76031a/instructions/shared/30-credentials-and-accounts.md)
- [docs/status/2026-07-22-luc-1619-security-credential-blocker-pattern.md](/abs/path/C:/Personal/Projekty/Aplikacje/Paperclip_Softwarehouse/docs/status/2026-07-22-luc-1619-security-credential-blocker-pattern.md)

## Findings

- `LUC-1569` already captured the exact missing-access shape on July 21, 2026: the authorized DRE runtime lacked an approved `ROLLBACK_GUARD_*`, `SOAR_PROD_*`, `PROD_DB_CHECK_*`, `PRODUCTION_DB_CHECK_*`, `RC_*`, or `GATE*` binding for the protected readback, and the correct next step was a typed owner confirmation for an approved `SMOKE_AUTH_*` path or direct operator-run proof.
- `LUC-1568` already encoded the correct least-privilege boundary: SPA must not retry locally, request raw secret material, or widen access; it must wait on the managed-binding owner path.
- `LUC-1572` already promoted the organizational learning for this exact root key: when the role lacks the managed-reference/runtime binding, route the protected readback to the authorized DRE lane instead of retrying locally.
- The current shared credential contract already covers the governing behavior: classify the blocker as an authorized owner-path restoration, preserve redacted evidence, and avoid turning provider/access mismatches into retry loops or broader secret handling.
- This recurrence increases the observed issue count, but it does not add a new causal class beyond the learning already captured in `LUC-1572`.

## Decision

No change, no follow-up issue.

This issue does not justify a role-instruction update, routine update, guardrail command, or project-template feedback. The company already has the correct rule in the shared credential contract and already recorded the specific `LUC-1569` lesson in `LUC-1572`. The right action here is duplicate suppression and merge-back, not another standing learning branch.

## Retirement Condition

Retire `LUC-1624` immediately by merging it back into the existing `LUC-1572` coverage for root key `LUC-1569`.

Reopen learning for this blocker family only if at least one of these becomes false:

1. the issue chain no longer names the exact missing managed-binding or operator-run access path;
2. the prescribed unblock path is no longer one narrow owner-scoped credential/action lane; or
3. the existing `LUC-1572` learning stops being sufficient to suppress duplicate capability-gap issues for the same root cause.
