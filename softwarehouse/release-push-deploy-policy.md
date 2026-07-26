# Release, Push, Deploy, And Coolify Policy

## Purpose

Paperclip should move applications to production without pretending every commit
is a release. The system batches low-risk work, pushes meaningful release
packages, verifies Coolify redeploys resource-by-resource, and stops before any
action likely to overload the VPS or mutate live accounts without a clear gate.

## Default Owner Consent

Patryk grants Paperclip permission for autonomous local development, validation,
source-control closure, and routine release preparation when actions satisfy
this policy. This standing consent does not allow reckless production mutation.
Agents must still fail closed when the target, resource count, team/workspace,
rollback path, server capacity, or required credentials are unknown.

This standing consent also satisfies the approval requirement for pushing a
meaningful, evidence-backed application batch to its known deployment branch
when the expected downstream action is the project's normal Coolify
auto-redeploy. Agents must not stop to ask which qualifying commits to push.
They must push the coherent batch, observe the redeploy, verify the deployed SHA
and resource health, perform the relevant public browser/readiness smoke, and
record the result before treating delivery as complete. Manual deploys,
restarts, rollbacks, force-pushes, secret changes, destructive actions, and live
account mutations remain separately gated.

## Commit Policy

Local commits are expected when a lane has a coherent output and validation or
an explicit validation blocker:

- docs, architecture maps, evidence, and context updates may be committed in
  small batches after redaction and relevance review;
- tiny UI polish, such as a color tweak, may be committed but should usually
  wait for a broader UI/release batch before push;
- code, config, dependency, migration, auth, trading, payment, deploy, or
  runtime changes require the smallest relevant test/build/lint proof before
  commit or a recorded blocker explaining why proof cannot run;
- unrelated dirty files must not be staged together.

## Push Policy

Push is a release-supply action, not a cleanup action. Do not push every local
commit immediately.

Push may proceed when all are true:

- the branch, remote, upstream state, and commit SHA are known;
- the worktree is clean except for ignored runtime reports;
- local validation has passed or the issue records a deliberate blocker;
- the batch contains a meaningful release reason:
  - production/blocker fix;
  - multiple coherent validated commits;
  - code/config/dependency/test change needed by active app delivery;
  - deploy source ref is stale and blocks Coolify redeploy;
  - Portfolio/PM/Ops marks the batch as release-ready;
- deploy impact is known as `none`, `auto-redeploy expected`, `manual Ops
  redeploy required`, or `blocked`.

Hold push when the batch is only docs/context/evidence, cosmetic UI polish,
architecture graph refresh, or local planning evidence unless it unblocks an
active delivery/release gate.

Never force-push, push a divergent branch, push secrets, push from a dirty
worktree, or push when server pressure/redeploy risk is unknown for a production
impacting batch.

## Coolify Deploy Policy

Coolify is a hierarchy:

`team/workspace -> project -> environment -> resources`

Before checking deploy status or requesting redeploy, Ops must confirm the
expected Coolify team/workspace, project, environment, and resource inventory.
For Soar, production currently expects multiple resources, not one application:
six app/service resources plus Postgres and Redis unless the resource ledger
documents a newer topology.

After any pushed batch that is expected to auto-redeploy:

1. Ops reads Coolify status using the configured team/project/environment.
2. Ops records each affected resource, source SHA/ref, deploy state, health,
   logs summary, and whether cleanup is needed.
3. If auto-redeploy did not happen, Ops diagnoses webhook/source-ref/resource
   binding first. A manual redeploy requires a release mutation permit.
4. QA/Test Automation runs only the smoke plan appropriate for the changed
   resource and risk.
5. Docs Memory records the release evidence and residual risks.

## Server Safety And Cleanup

The VPS is capacity constrained. Release agents must:

- check container/service status and recent logs before and after deploy;
- avoid parallel redeploys that can starve CPU/RAM;
- prefer one resource at a time unless the topology requires an atomic batch;
- clean stale build/temp/cache artifacts only through documented safe cleanup
  commands;
- stop and create a blocker when disk, memory, restart loops, migration risk, or
  unknown resource identity makes continued deploy unsafe.

## Missing Access Or Account Data

If Paperclip needs Patryk's account, a protected smoke account, exchange-linked
Soar access, Coolify team/project data, or a secret binding, it must create an
operator task that explains:

- what is missing;
- why it is needed;
- the safest way to provide it;
- what Paperclip will do after receiving it;
- what it will not do with the access.

Agents must never ask for secret values in chat or documents. They should ask
for binding/setup through Paperclip secrets or the approved local secret store.
