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

Current product enforcement is narrower. Agent-owned issue closure hard-requires inspectable
completion evidence through a typed `completionEvidence` bundle:

- normal `done` transitions require `TEST`, `REVIEW`, and `DOCS` categories;
- high-risk `done` transitions also require `SECURITY`, `DEPLOY`, and `MONITORING`; and
- each category must point at same-issue evidence through `request_comment`, `comment`, `document`,
  `attachment`, or `work_product`.

The board retains an audited V1 override with legacy inspectable evidence so operators and older
board-side janitors can resolve exceptional state without impersonating an agent. That enforcement
is scoped to issue closure. Treat the same typed bundle as the review and
operating requirement for broader release, deploy, and supervision flows until Paperclip ships a
shared read model that evaluates the same categories everywhere.

Evidence should be attached through issue work products, issue documents, comments, attachments,
or activity records. A local path alone is not enough for a deliverable.
