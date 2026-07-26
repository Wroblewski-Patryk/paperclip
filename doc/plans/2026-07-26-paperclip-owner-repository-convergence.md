# Paperclip Local Control Plane, Owner Repository, And VPS Retirement Plan

Date: 2026-07-26
Status: hosted retirement complete; repository publication pending
Owner repository: `https://github.com/Wroblewski-Patryk/paperclip`
Tracking issue: `LUC-1896`

## Objective

Make the owner's repository the durable home of the local Softwarehouse
Paperclip lineage, keep Paperclip local as the control plane for developing
applications, and retire only the obsolete first-attempt Paperclip deployment
from the capacity-constrained VPS. Soar, Roost, and every other existing or
started VPS application remain preserved.

## Verified Baseline

- Owner repository `main`: `522099418d678acb50759597ca5ce6bf814917ec`.
- Public `https://paperclip.luckysparrow.ch/api/health` returns HTTP 200 with
  authenticated deployment mode and ready bootstrap state.
- The public root reports a last-modified time matching the owner-repository
  commit time. This strongly suggests that `owner/main` is the serving source,
  but exact Coolify `git_commit_sha` evidence is still required.
- The owner has declared that hosted instance obsolete and authorized its
  removal. It is not a migration target for the local Paperclip lineage.
- Hosted retirement completed under `LUC-1897`/`LUC-1898`: exact application
  and exclusive volume removed, with all other Coolify resources preserved.
- Local Paperclip remains authoritative on strict ports `3200` and `54329`.
- VPS capacity is reserved for deployable products, including Soar, Roost, and
  other existing or started applications that local Paperclip will help finish.
- Local branch at analysis time: `codex/rolling-work-queue` at `72cdc8b0`.
- Git reports no merge base between local HEAD and `owner/main`.
- The owner lineage has 39 commits unavailable locally; the local lineage has
  2938 commits unavailable on `owner/main`.
- The working tree contains pre-existing unrelated changes, so publishing the
  local lineage is currently held.
- The local lineage is within GitHub object limits: packed objects total about
  73.6 MiB, the largest reachable blob is about 19.4 MiB, and no reachable blob
  exceeds 50 MiB.
- Gitleaks `8.30.1` reported 37 historical findings, all currently located in
  documentation, test fixtures, smoke scripts, or sandbox-provider code. They
  require explicit false-positive/real-secret classification before any full
  history publication; no secret values were printed during the scan.

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

### 1. Freeze And Identify The Decommission Target

- identify the exact Coolify application serving
  `paperclip.luckysparrow.ch`, including project, environment, UUID, repository,
  branch, SHA, deployment, storage, database, and network relationships;
- explicitly prove the target is not Soar, Roost, or another preserved VPS
  application and shares no required dependency with them;
- record a redacted reconstruction manifest and the smallest safe backup of
  unique state worth retaining without worsening VPS capacity pressure;
- require independent security/scope evidence before deletion.

### 2. Preserve Both Histories

- keep `owner/main` unchanged while it is the suspected production branch;
- preserve the old hosted lineage as a recoverable Git branch or tag;
- publish the clean local lineage to a new non-deployment branch such as
  `softwarehouse-v1`, only after worktree ownership and secret/history scans;
- retain immutable refs for the confirmed hosted baseline and the first local
  canonical candidate;
- never force-push or merge unrelated histories; no Paperclip branch is to be
  bound to Coolify after hosted retirement.

### 3. Retire Only Hosted Paperclip

- use `LUC-1897` for the read-only deletion-boundary PASS/BLOCK decision;
- allow `LUC-1898` to proceed only after that PASS and a fresh exact-target
  check;
- take before evidence for Paperclip, Soar, Roost, every other existing VPS
  resource, and disk usage;
- stop and delete only the verified obsolete Paperclip application and storage
  proven exclusive to it;
- do not delete its GitHub repository or rewrite its history.

### 4. Prove Unaffected VPS State

- verify `paperclip.luckysparrow.ch` no longer serves Paperclip;
- verify Soar, Roost, and all other pre-existing resources remain present and
  healthy;
- record the exact deleted UUIDs and recovered VPS disk capacity;
- keep reconstruction information available without retaining another running
  Paperclip copy.

### 5. Canonicalize The Local Repository Lineage

- verify local Paperclip health, persistence, agent execution, and backups;
- scan the local history for secrets and inappropriate large objects;
- push the local lineage to a clean branch in
  `Wroblewski-Patryk/paperclip` without touching the hosted legacy ref;
- select the local lineage as the repository default only after its remote
  integrity is proven;
- document that Paperclip is local-only and that product applications, not the
  control plane, are deployed to VPS.

## Completion Evidence

- exact legacy Coolify target and exclusive dependency proof;
- independent security PASS and redacted reconstruction manifest;
- deletion proof for only the hosted Paperclip UUIDs;
- before/after capacity evidence and unaffected-resource health evidence;
- healthy authoritative local Paperclip with backup proof;
- clean owner-repository branch containing the local lineage;
- one documented canonical repository/local-runtime relationship and no hosted
  Paperclip deployment.

## Current Decision

The hosted retirement and unaffected-resource proof are complete. The remaining
lane is repository-only. Object-size checks pass, while the local-history push
is held behind classification of 37 redacted Gitleaks findings. After that gate
passes, publish to a non-deployment branch, verify remote integrity, then select
the canonical default branch without deploying Paperclip again.
