# Source Control Closure

Paperclip agents may finish implementation work with commits when the project
workspace policy enables `commitPerCompletedTask` and the issue asks for a
durable change. A commit is part of the proof trail, not a cleanup ritual.

Paperclip is the control-plane repo. Product applications live in separate
local repos under `C:/Personal/Projekty/Aplikacje/<Application>` and may have
their own remotes and Coolify auto-redeploy wiring. Run git commands in the app
repo you changed, not in Paperclip, unless the issue is about Paperclip itself.

## Commit Rules

- Dirty worktree triage:
  - continue without asking when existing dirty files are relevant to the same
    issue/lane and you can preserve them;
  - write a baseline note before editing: observed dirty files, ownership
    assumption, intended touched files, and verification boundary;
  - do not revert, overwrite, or stage unrelated work;
  - stop and escalate only for real conflicts: unrelated changes would need to
    be modified, secrets/local env/log artifacts may be exposed, merge conflicts
    exist, generated churn cannot be attributed, or the action would push,
    deploy, mutate production, change credentials, or delete/move files broadly.
- Commit only your own coherent change set for the current issue.
- Never include secrets, local env files, logs with tokens, screenshots with
  private data, database dumps, or unrelated generated churn.
- Before committing, run the smallest meaningful verification available for the
  touched layer and record the command/result.
- Inspect `git status --short` and separate unrelated user/agent work from your
  own changes. Do not revert or stage unrelated changes.
- Use a clear message with the project/lane intent, such as
  `fix: restore Soar protected route smoke` or
  `docs: add Roost takeover baseline`.
- If verification cannot run, a commit may still be allowed only when the issue
  records the blocker and why the change is still worth preserving.

## Push Rules

Push is allowed only when all of these are true:

- the issue, PM, Delivery Lead, or Ops gate explicitly expects a pushed branch
  or source ref;
- the application, repository path, local branch, remote target, and deployment
  branch meaning are known;
- the committed source SHA is recorded in the issue;
- required checks were run or blocked with evidence;
- no production mutation is implied by the push unless Ops/Security release
  rules approve the downstream action.
- the batch has a meaningful release reason: blocker/prod fix, coherent
  validated code/config/test/dependency set, stale source ref blocking deploy,
  or PM/Delivery/Ops release-ready decision.

For the current LuckySparrow active-app model, a push can intentionally trigger
Coolify auto-redeploy to VPS production. That is allowed for Soar first and
Roost second only when the local proof is recorded, the commit bundle is scoped,
the remote/branch are known, and Ops/DRE can verify Coolify redeploy plus
production smoke/readiness afterward. If Coolify status access, credentials,
target resource, rollback path, or approval is missing, create or reuse one
narrow unblock issue and stop instead of retrying or creating duplicate deploy
controllers.

After a Coolify-bound push, do not mark the implementation `done` until the
expected redeploy is observed and production smoke/readiness is recorded, or a
blocker records why redeploy did not happen. Diagnose failed auto-redeploy in
this order: remote branch/upstream, Coolify source binding/webhook,
team/workspace selector, resource identity, token scope, server capacity, build
logs.

Do not push from a dirty worktree. If the remote branch is protected, rejected,
behind, divergent, or unclear, stop and escalate to Engineering Delivery Lead or
Ops instead of forcing.

Hold push for docs/context/evidence-only commits, architecture graph refreshes,
and tiny cosmetic UI polish unless they unblock an active delivery gate. Record
`push status: held for batch` and the next batching condition in the closure
comment.

## Closure Comment

Every code/docs-producing agent must close the issue with:

- application/repo path affected;
- files changed;
- verification commands and results;
- commit SHA or `not committed` with reason;
- push status: `not needed`, `pending`, `pushed`, or `blocked`;
- deploy impact: `none`, `auto-redeploy expected`, `redeploy observed`,
  `requires Ops`, `blocked`, or `completed by Ops`;
- Coolify/resource evidence or redeploy blocker when production is affected;
- residual risk and next owner.

PM and Delivery Lead should treat an implementation lane without this closure
as incomplete even if the code looks correct.
