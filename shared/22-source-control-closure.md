# Source Control Closure

Paperclip agents may finish implementation work with commits when the project
workspace policy enables `commitPerCompletedTask` and the issue asks for a
durable change. A commit is part of the proof trail, not a cleanup ritual.

Paperclip can coordinate work in many repositories. First identify which repo
you are changing:

- `Paperclip_Softwarehouse`: the control-plane app and Softwarehouse operating
  system.
- `C:/Personal/Projekty/Aplikacje/<Application>`: a product application repo
  created or maintained by agents, often with its own remote and Coolify
  deployment wiring.

Run git commands in the affected application repo, not in Paperclip, when the
issue is about that application.

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
- the application name, repository path, local branch, remote target, and
  deployment branch meaning are known;
- the committed source SHA is recorded in the issue;
- required checks were run or blocked with evidence;
- no production mutation is implied by the push unless Ops/Security release
  rules approve the downstream action.

If the application repo is wired to Coolify auto-redeploy, the push is the
production trigger. Before pushing, the issue must name the expected Coolify
project/environment/resource set and smoke plan. After pushing, do not mark the
issue `done` until redeploy is observed and production smoke/readiness evidence
is recorded, or until a blocker names why redeploy did not happen and who owns
the fix.

If auto-redeploy fails to start or points at the wrong SHA/ref, diagnose in this
order: remote branch/upstream, Coolify source binding/webhook, Coolify
team/workspace selector, resource identity, credentials/token scope, server
capacity/build logs. Retry only after the failing cause is corrected and the
retry action is allowed by the release policy.

Do not push from a dirty worktree. If the remote branch is protected, rejected,
behind, divergent, or unclear, stop and escalate to Engineering Delivery Lead or
Ops instead of forcing.

## Closure Comment

Every code/docs-producing agent must close the issue with:

- application/repo path affected;
- files changed;
- verification commands and results;
- commit SHA or `not committed` with reason;
- push status: `not needed`, `pending`, `pushed`, or `blocked`;
- deploy impact: `none`, `auto-redeploy expected`, `redeploy observed`,
  `requires Ops`, `blocked`, or `completed by Ops`;
- Coolify/resource evidence or redeploy blocker when push impacts production;
- residual risk and next owner.

PM and Delivery Lead should treat an implementation lane without this closure
as incomplete even if the code looks correct.
