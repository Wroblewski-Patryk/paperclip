# Agent Evidence

Agent evidence is any inspectable record that proves work was planned, changed, tested, reviewed,
documented, deployed, or monitored.

## Evidence Types

- `PLAN`: accepted plan, issue document, architecture note.
- `CODE`: commit, diff, branch, PR, changed file list.
- `TEST`: test command, result, screenshot, smoke output, coverage where relevant.
- `QA`: acceptance result, browser/mobile/manual check, reproduction confirmation.
- `SECURITY`: secret handling, auth/permission review, threat/risk note, scan result.
- `REVIEW`: code review, supervisor review, approval, resolved finding.
- `DOCS`: updated docs, evidence map row, operator note.
- `DEPLOY`: push/deploy id, Coolify resource state, version, release note.
- `MONITORING`: health check, logs, metrics, alert state, production smoke.
- `RETRO`: failure cause, recurrence, learning, follow-up task.

## Done Bundle

Normal work requires `TEST`, `REVIEW`, and `DOCS` evidence before `done`.

High-risk work also requires `SECURITY`, `DEPLOY`, and `MONITORING` evidence where it affects
runtime behavior or production.

Evidence should be attached through issue work products, issue documents, comments, attachments,
or activity records. A local path alone is not enough for a deliverable.
