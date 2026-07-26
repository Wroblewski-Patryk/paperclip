# Paperclip Owner Repository Convergence And VPS Migration Plan

Date: 2026-07-26
Status: proposed governed V1 lane
Owner repository: `https://github.com/Wroblewski-Patryk/paperclip`
Tracking issue: `LUC-1896`

## Objective

Make the owner's repository the durable home for both the currently serving
VPS Paperclip lineage and the newer local Softwarehouse lineage, without
rewriting the deployed branch, losing data, or pretending two unrelated Git
histories can be merged safely.

## Verified Baseline

- Owner repository `main`: `522099418d678acb50759597ca5ce6bf814917ec`.
- Public `https://paperclip.luckysparrow.ch/api/health` returns HTTP 200 with
  authenticated deployment mode and ready bootstrap state.
- The public root reports a last-modified time matching the owner-repository
  commit time. This strongly suggests that `owner/main` is the serving source,
  but exact Coolify `git_commit_sha` evidence is still required.
- Local branch at analysis time: `codex/rolling-work-queue` at `72cdc8b0`.
- Git reports no merge base between local HEAD and `owner/main`.
- The owner lineage has 39 commits unavailable locally; the local lineage has
  2938 commits unavailable on `owner/main`.
- The working tree contains pre-existing unrelated changes, so publishing the
  local lineage is currently held.

## VPS-Lineage Capability Disposition

Evaluate selectively rather than merging whole histories:

1. retire Hindsight Memory and do not port it: the Softwarehouse already has
   governed memory mechanisms, while Hindsight adds token cost and requires
   registration with an external service;
2. evaluate the historical Knowledge and Tools APIs, settings, UI, and
   agent-scoped access only as possible input to the current Roost
   company-plane; use the name Roost in all current work;
3. evaluate the production Dockerfile, startup behavior, healthcheck, and
   Coolify configuration without carrying Hindsight dependencies forward;
4. evaluate the collapsible agent organization tree and heartbeat recovery
   cost guardrails against current local contracts;
5. retain deployment/build resource controls that remain relevant to the
   bounded VPS.

Every retained candidate must be compared with the current Roost
company-plane, memory, plugin, security, and lifecycle contracts. Duplicate or
older designs must be adapted or rejected, not copied blindly.

## Governed Sequence

### 1. Freeze And Identify Production

- read Coolify application metadata and record repository, branch,
  `git_commit_sha`, resource UUID, domains, deployment id, and image state;
- inventory persistent volumes, PostgreSQL location/version, auth mode,
  encrypted-secret key material location, and rollback target without exposing
  secret values;
- create and verify database/config/volume backups before any deployment
  binding changes.

### 2. Preserve Both Histories

- keep `owner/main` unchanged while it is the suspected production branch;
- publish the clean local lineage later to a new non-deployment branch such as
  `softwarehouse-v1`, only after worktree ownership and secret/history scans;
- retain immutable refs for the confirmed VPS baseline and the first local
  migration candidate;
- never force-push, merge unrelated histories, or repoint Coolify during this
  phase.

### 3. Harvest Features Locally

- create one scoped issue per capability group;
- port against current local contracts with db/shared/server/UI synchronization;
- add focused tests, security review, documentation, and migration notes;
- run locally on strict Paperclip ports `3200` and `54329`;
- keep hosted-only integrations disabled or read-only until separately proven.

### 4. Rehearse State Migration

- restore a redacted or protected production backup into an isolated rehearsal
  environment, never over the canonical local or production database;
- run schema migrations and verify companies, agents, issues, routines,
  approvals, secrets metadata, plugins, artifacts, and authentication;
- prove rollback from the candidate schema and application version;
- test browser flows on desktop and mobile with agents initially paused.

### 5. Stage And Cut Over

- build the candidate from an exact owner-repository branch and SHA;
- deploy to a separate staging/blue-green resource when capacity permits;
- verify health, auth, bootstrap, persistence, background execution, resource
  use, logs, and critical browser journeys;
- perform a controlled production cutover only with verified backup, rollback,
  exact source SHA, monitoring, and owner acceptance;
- promote the accepted lineage to the canonical release branch only after the
  old service and data remain recoverable.

## Completion Evidence

- exact Coolify source/branch/SHA and current production deployment proof;
- verified backups and restore rehearsal;
- feature disposition matrix: port, adapt, replace, or retire;
- clean owner-repository branch containing the local candidate lineage;
- test, security, review, documentation, deployment, monitoring, and browser
  evidence attached to the Paperclip issue;
- rollback drill and final owner acceptance;
- one documented canonical repository/branch/deployment relationship.

## Current Decision

The repository is suitable as the future single owner-controlled source, but
not through an immediate push to `main`. The safe next implementation lane is
production-source verification plus a feature-disposition matrix, followed by
a clean non-deployment branch for the local lineage.
