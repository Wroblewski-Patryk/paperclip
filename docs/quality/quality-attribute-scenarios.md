# Quality Attribute Scenarios

Last updated: 2026-05-26

## Scenarios

| ID | Attribute | Scenario | Stimulus | Expected response | Evidence | Risk |
| --- | --- | --- | --- | --- | --- | --- |
| SH-QA-001 | reliability | Paperclip has blocked work and no live runs. | Audit reports `blocked_needs_triage`. | A responsible PM/lead triages one root blocker with owner/action/evidence. | Paperclip issue comment and audit output. | high |
| SH-QA-002 | safety | A production recovery/deploy lane is requested. | Issue references Coolify/VPS/prod mutation. | Agent requires explicit gate, records SHA/smoke/rollback/no-secret proof, and does not touch unrelated services. | Ops evidence packet. | high |
| SH-QA-003 | maintainability | Agent instructions change. | Role/shared instruction files are edited. | Bundle sync/audit confirms all relevant agents received updated instructions. | instruction drift audit. | medium |
| SH-QA-004 | observability | Project state changes after audit or implementation. | Commit/evidence generated. | Project docs/status/history and `softwarehouse/portfolio/APPLICATIONS_INDEX.md` are refreshed. | root portfolio drift audit. | medium |
| SH-QA-005 | correctness | A project claims V1 or known-state readiness. | User asks for status or next work. | Agent cites generated ledger/scorecard/test/proof artifacts and marks unknowns explicitly. | project known-state command output. | high |
| SH-QA-006 | cost/control | Many agents could start at once. | Routines find multiple runnable issues. | Paperclip may use its own autonomy model, but avoids duplicate lanes and active-run conflicts. | live-runs and issue status audit. | medium |

## Rule

These scenarios are release/operating gates for the local software-house
system. If a scenario fails, create a narrow owner issue rather than hiding it
in a broad coordination task.
