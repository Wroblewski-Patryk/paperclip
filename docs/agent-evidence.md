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

Softwarehouse completion policy expects:

- normal work to carry `TEST`, `REVIEW`, and `DOCS` evidence;
- high-risk work to also carry `SECURITY`, `DEPLOY`, and `MONITORING` evidence where it affects
  runtime behavior or production.

Current product enforcement is narrower. The issue close API only hard-requires inspectable
completion evidence existence, satisfied by:

- a completion comment in the same `done` update;
- an issue document;
- an attachment; or
- a work product.

Treat the typed bundle above as the review and operating requirement until Paperclip ships a typed
evidence validator for `done`.

Evidence should be attached through issue work products, issue documents, comments, attachments,
or activity records. A local path alone is not enough for a deliverable.
