# Git, Push, Deploy, And Production Safety

Agents must treat commits, pushes, and deployments as release operations, not
as casual cleanup.

Paperclip is the control-plane repository. Softwarehouse product work often
targets a separate local application repository under
`C:/Personal/Projekty/Aplikacje/<Application>`. Each application repo has its
own git remote and may be wired to Coolify so a push to the deployment branch
automatically starts a production redeploy. Do not confuse Paperclip source
control with application source control.

- Commit only coherent, reviewed, validated work. Keep commits small and
  reversible.
- Code and docs agents may commit their own scoped change set when the project
  workspace policy enables `commitPerCompletedTask` and the issue has
  verification evidence or an explicit verification blocker.
- Do not push unless the relevant branch policy, tests, and user/project
  expectations are satisfied.
- A push must name the application, repository path, branch, remote, commit SHA,
  checks, and deploy impact.
- When an application repo is Coolify-bound, treat push as a production deploy
  trigger unless the project contract proves otherwise. Before pushing, record
  the expected Coolify project/environment/resource set, source SHA, rollback
  path, and smoke plan.
- Do not deploy uncommitted local changes.
- Do not deploy from a dirty worktree unless the user explicitly approves a
  temporary emergency exception and the exception is recorded.
- Before deploy: confirm source commit, target environment, migration risk,
  required secrets, rollback path, and smoke plan.
- After deploy: verify health checks, public routes, auth-sensitive smoke, logs,
  and known critical user journeys. Record exact evidence.
- After a Coolify-bound push, confirm whether the redeploy actually happened.
  Record the observed Coolify deployment state/source ref/resource health and
  production smoke result. If redeploy did not happen, diagnose webhook/source
  ref/resource binding/credential/team selector failures before retrying.
- If production smoke fails, stop further deploy work, preserve logs, alert the
  responsible lead, and either roll back or document why rollback is unsafe.

Coolify/VPS ownership belongs to Ops Release Lead. Security Review Lead owns
credential handling and can block production access. QA Regression Lead/Test
Automation Engineer own production smoke design and evidence. No other agent
should use Coolify credentials unless explicitly delegated for a narrow task.

The detailed commit/push closure contract is in
`shared/22-source-control-closure.md`.

For Soar, Coolify production is modeled as:

`Coolify project -> production environment -> resources`

The production environment can contain multiple applications/services plus
Postgres and Redis. Agents must inventory and name the exact resource they are
checking before reading logs, checking deploy status, or requesting a mutation.
Do not treat one `COOLIFY_SOAR_APP_ID` value as the whole Soar deployment.
If the expected project is not visible in Coolify, Ops should verify the current
team/workspace selector before declaring the credentials invalid.

Use `pnpm softwarehouse:release-governor` to inspect local application repo
push readiness across active apps. Use `pnpm softwarehouse:coolify-reconciler`
for read-only Coolify inventory/status when credentials are configured. These
reports are evidence helpers; they do not replace the release mutation permit
for deploy/restart/rollback/env/database changes.
