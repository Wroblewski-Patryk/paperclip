# Decision Register

Last updated: 2026-07-03

This file records durable Paperclip Softwarehouse decisions from recent owner
coordination.

| ID | Date | Decision | Status | Impact | Follow-up |
| --- | --- | --- | --- | --- | --- |
| DEC-PSH-001 | 2026-06-20 | Active Softwarehouse app defaults are `Soar` and `Roost`; future apps remain parked until explicit board activation. | accepted | Prevents routines and agents from spending capacity on Aviary/Nest/Featherly before they are reopened. | Keep default scripts/routines aligned to Soar/Roost. Use env overrides only for explicit activation. |
| DEC-PSH-002 | 2026-06-20 | Sellable apps require an app-completion index that connects architecture entities to user flows, frontend/backend state, auth, subscription, configuration, integrations, tests, docs, browser proof, and next owner. | accepted | Agents should not mark backend-only or frontend-only work done when the user flow is not proven end to end. | Maintain `docs/status/app-completion-index.json` and `.md` for active apps. |
| DEC-PSH-003 | 2026-06-20 | Takeover, repair, and greenfield app creation share one lifecycle standard and converge into the same proof/review loop. | accepted | Existing-app rescue and new-app creation both start with enough business/product/architecture context before coding. | Use `docs/softwarehouse/13-app-lifecycle-standard.md` for future app activation and app-building work. |
| DEC-PSH-004 | 2026-06-20 | Autonomous company work must stay grounded in human/business usefulness: target user, job-to-be-done, subscription/free boundary, risk, proof, owner acceptance, and review packets. | accepted | Prevents agents from optimizing code or process without a product/business reason. | Use `docs/softwarehouse/14-business-operating-standard.md` for product/company context gaps. |
| DEC-PSH-005 | 2026-06-20 | Active routine duplicate cleanup should preserve one canonical active routine and pause older duplicates. | accepted | Runtime had duplicate softwarehouse governance/review routines; active duplicate groups were reduced to zero. | Re-run duplicate checks before/after configurator changes. |
| DEC-PSH-006 | 2026-06-20 | Local active Softwarehouse runtime should be treated as `http://127.0.0.1:3200`; a failed probe to `localhost:3100`/`3101` alone does not prove Softwarehouse is down. | accepted | Prevents restarting or debugging the wrong Paperclip process. | Always read `.paperclip/config.json` and `/api/health` before runtime action. |
| DEC-PSH-007 | 2026-06-20 | Paperclip dev-server restart should wait for live-run queue to drain unless explicitly interrupted. | accepted | A restart was performed only after active run count reached zero. | Monitor live runs before future restart; verify health/root/data after restart. |
| DEC-PSH-008 | 2026-06-20 | A Codex automation should review complementary standards/frameworks/plugins that can improve Paperclip as an autonomous subscription-app company. | superseded | The review loop remains useful, but the separate weekly cadence was replaced by the consolidated 8-hour watchdog. | Superseded by `DEC-PSH-012`; do not recreate `paperclip-autonomous-company-standards-review` without an explicit owner request. |
| DEC-PSH-009 | 2026-07-03 | Superseded duplicate routines should be archived, not merely paused, while one canonical active routine remains. | accepted | Reduces routine dashboard noise and prevents duplicate governance loops from reappearing as ambiguous paused work. | Continue duplicate checks before/after routine configurator changes. |
| DEC-PSH-010 | 2026-07-03 | Paused agents should be resumed only for a specific active blocker, not mass-resumed. | accepted | Preserves intentional board pauses while allowing targeted unblocking, as with RTE and DPM during the queue cleanup. | Before resuming an agent, name the issue chain it unblocks and verify live-run health after. |
| DEC-PSH-011 | 2026-07-03 | Repeated queued wakeups for the same issue/agent should be coalesced in code rather than cleaned up manually on the board. | accepted | Reduces `issue_assignee_changed` cancellation churn and dashboard noise. | Confirm `server/src/services/heartbeat.ts` coalescing change and regression test are committed/preserved. |
| DEC-PSH-012 | 2026-07-03 | Keep one Codex-level Paperclip supervisor: `check-paperclip-soar-autonomy` / `Paperclip Softwarehouse liveness watchdog`, every 480 minutes, with strategic standards review, teacher-loop scope, and approve-task routing merged in. | accepted | Prevents two parent automations from diverging and gives Paperclip one temporary external supervisor while it learns to self-supervise through its own agents, routines, evidence gates, and owner approve tasks. | Verify the watchdog writes liveness/teacher reports, routes strategic owner decisions as Paperclip approve tasks, and retire it only when Paperclip has evidence-backed self-supervision. |

## Open Decision Queue

- Decide when, if ever, to activate Aviary/Nest/Featherly as active app lanes.
- Decide which consolidated watchdog recommendations should be implemented
  into Paperclip configuration, docs, skills, routines, tests, indexes, repair
  lanes, plugins, or owner approve tasks.
- Decide whether the heartbeat coalescing fix from the archived thread should
  become a PR-ready committed change if it is still only local.
