# Git, Push, Deploy, And Production Safety

Agents must treat commits, pushes, and deployments as release operations, not
as casual cleanup.

Current environment model:

- Paperclip is the control-plane repository. Active product work usually
  happens in separate local application repositories under
  `C:/Personal/Projekty/Aplikacje/<Application>`, each with its own git remote
  and possible Coolify production deploy wiring.
- Until a separate staging VPS exists, the active app path is local
  verification -> coherent commit bundle -> push -> Coolify automatic
  redeploy on the VPS production environment -> smoke/readiness proof.
- VPS production is the owner-usable verification environment after feasible
  local checks. It is not permission to ship untested work.
- Future target path is local -> staging VPS -> production. When staging
  exists, production testing should shrink to final smoke/regression only.
- Soar has priority 1. Roost has priority 2. Other app streams stay deferred
  unless the board explicitly reopens them.

- Commit only coherent, reviewed, validated work. Keep commits small and
  reversible.
- Code and docs agents may commit their own scoped change set when the project
  workspace policy enables `commitPerCompletedTask` and the issue has
  verification evidence or an explicit verification blocker.
- Do not push every commit. Batch docs/context/evidence and minor polish until
  there is a meaningful release reason. Push only when branch policy, tests,
  server/deploy posture, and user/project expectations are satisfied.
- A meaningful push reason is a production/blocker fix, a coherent validated
  code/config/test/dependency batch, a stale source ref blocking deploy, or an
  explicit PM/Delivery/Ops release-ready decision.
- Hold push for documentation-only, context-only, architecture graph, evidence,
  or tiny cosmetic UI changes unless they unblock an active delivery gate.
- A push must name the branch, remote, commit SHA, checks, and deploy impact.
- For application repositories, a push must also name the application, repo
  path, expected deployment branch, Coolify project/environment/resource set,
  rollback path, and smoke plan when auto-redeploy is expected.
- Do not deploy uncommitted local changes.
- Do not deploy from a dirty worktree unless the user explicitly approves a
  temporary emergency exception and the exception is recorded.
- Before deploy: confirm source commit, target environment, migration risk,
  required secrets, rollback path, and smoke plan.
- Contract marker: `release-blocker-closure:v1`. Before dependent implementation
  or QA lanes open behind a release/deploy blocker, run
  `pnpm softwarehouse:release-blocker-preflight -- <closure-packet.json>`. The
  gate must fail closed unless one packet contains `blockerRef`, full
  `candidateSha`, distinct `candidateParentSha`, `sourceRepository`,
  `sourceBranch`, `targetEnvironment`, `lineageEvidenceRef`, exactly one
  `unblockOwner`, `protectedGateContract`, `protectedGateStatus`,
  `protectedGateEvidenceRef`, `rollbackPath`, `rollbackOwner`,
  `freshVerificationEvidence`, matching `verifiedCandidateSha`, `verifiedAt`,
  positive `verificationMaxAgeHours`, and exact `dependentLaneRefs`. Only
  `mayOpenDependentLanes: true` admits fan-out.
- When the project uses Coolify auto-redeploy, a push can be the production
  mutation trigger. Treat that push as a production-impacting action and record
  the expected Coolify redeploy/readiness check before pushing.
- After deploy: verify health checks, public routes, auth-sensitive smoke, logs,
  and known critical user journeys. Record exact evidence.
- After a Coolify-bound push, verify that redeploy actually happened for the
  expected resource(s) and source SHA/ref. If it did not happen, diagnose
  remote branch/upstream, Coolify source binding/webhook, team selector,
  resource identity, token scope, capacity, and build logs before retrying.
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

The standing operating policy is in
`softwarehouse/release-push-deploy-policy.md`. It records Patryk's default
permission for autonomous local development, validation, source-control closure,
and release preparation, while keeping push/deploy/restart/live-account mutation
fail-closed when team, resource, rollback, capacity, or credential facts are
missing.
