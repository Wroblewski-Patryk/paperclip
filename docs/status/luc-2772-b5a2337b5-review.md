# LUC-2772 review of `b5a2337b5`

Reviewed commit: `b5a2337b52c14d994cad7f3333661629c1c65053`
Review date: 2026-08-15
Scope: the 42 paths outside the three packets declared by LUC-2765

## Disposition

The broad commit must not be accepted unchanged. Two production defects require a
bounded follow-up commit:

1. A running-issue continuation bypassed the issue WIP check but still counted its
   existing run against the project and organization WIP ceilings. With the default
   project limit of one, the continuation was still rejected.
2. Liveness-recovery cleanup treated a remaining `cancelled` blocker as resolved and
   could move the source out of `blocked`, even though cancellation does not resolve a
   first-class blocker relation.

The bounded repair excludes one existing run from project/organization WIP accounting
only for a verified same-issue continuation, and keeps the source blocked until every
remaining blocker is `done` or its relation is explicitly removed.

The other production changes are internally coherent:

- OpenAPI additions register existing assignment, delegation, delivery, project-truth,
  supervision, and autonomy routes.
- Suggested and helper-created child issues remain `backlog` while unassigned and become
  `todo` only when an assignee exists, matching the executable-issue ownership invariant.
- Windows workspace commands fall back to `ComSpec`/`cmd.exe` instead of assuming `sh`.
- The heartbeat follow-up classifier remains serialized by the existing issue execution
  lock; only its WIP accounting needed correction.

## Path attribution

The comparison uses the 24-path declared set recorded on LUC-2765. Everything below is
one of the 42 unexpected paths.

### Attributed to the runtime/autonomy packet preserved by LUC-2722

LUC-2722 explicitly preserved these runtime/recovery paths and routed them to the active
runtime repair lane, including LUC-2641. The exact post-preservation hunks were later
committed by `b5a2337b5`, but the path owner and packet are evidenced.

- `server/src/services/heartbeat.ts`
- `server/src/services/recovery/service.ts`
- `server/src/__tests__/heartbeat-process-recovery.test.ts`
- `server/src/__tests__/heartbeat-retry-scheduling.test.ts`

### Prior LUC-2697 packet lineage; exact `b5a2337b5` hunk producer unowned

LUC-2697 lists these paths in its earlier 75-path operating-system consolidation. That
establishes lineage but not an issue-ledger producer for the additional hunks in
`b5a2337b5`; the new hunks are therefore classified as unowned.

- `server/src/routes/openapi.ts`
- `server/src/services/admission-control.ts`
- `server/src/services/issues.ts`
- `server/src/__tests__/admission-control-service.test.ts`
- `server/src/__tests__/openapi-routes.test.ts`

### Unowned capability/runtime fixture alignments

These changes align capability defaults, model-profile expectations, test-home isolation,
or runtime fixtures with already-present behavior. No producing issue or owner was found
in the issue ledger.

- `packages/adapters/codex-local/src/server/execute-auth-guard.test.ts`
- `server/src/__tests__/acpx-local-skill-sync.test.ts`
- `server/src/__tests__/agent-adapter-validation-routes.test.ts`
- `server/src/__tests__/agent-live-run-routes.test.ts`
- `server/src/__tests__/agent-skills-routes.test.ts`
- `server/src/__tests__/claude-local-skill-sync.test.ts`
- `server/src/__tests__/codex-local-skill-sync.test.ts`
- `server/src/__tests__/grok-local-skill-sync.test.ts`
- `server/src/__tests__/low-trust-red-team-routes.test.ts`
- `server/src/__tests__/permissions-upgrade-boundary-routes.test.ts`
- `server/src/__tests__/roost-product-map-outbox.test.ts`
- `server/src/__tests__/workspace-resource-claims.test.ts`

### Unowned issue-route and child-lifecycle alignments

These changes repair route-service mocks or align unassigned child expectations with
`backlog`. No producing issue or owner was found in the issue ledger.

- `server/src/services/issue-thread-interactions.ts`
- `server/src/__tests__/document-annotation-routes.test.ts`
- `server/src/__tests__/environment-selection-route-guards.test.ts`
- `server/src/__tests__/issue-activity-events-routes.test.ts`
- `server/src/__tests__/issue-agent-mutation-ownership-routes.test.ts`
- `server/src/__tests__/issue-assigned-backlog-contract-routes.test.ts`
- `server/src/__tests__/issue-attachment-routes.test.ts`
- `server/src/__tests__/issue-closed-workspace-routes.test.ts`
- `server/src/__tests__/issue-comment-cancel-routes.test.ts`
- `server/src/__tests__/issue-dependency-wakeups-routes.test.ts`
- `server/src/__tests__/issue-document-restore-routes.test.ts`
- `server/src/__tests__/issue-feedback-routes.test.ts`
- `server/src/__tests__/issue-identifier-routes.test.ts`
- `server/src/__tests__/issue-telemetry-routes.test.ts`
- `server/src/__tests__/issue-thread-interaction-routes.test.ts`
- `server/src/__tests__/issue-thread-interactions-service.test.ts`
- `server/src/__tests__/issue-update-comment-wakeup-routes.test.ts`
- `server/src/__tests__/issue-workspace-command-authz.test.ts`
- `server/src/__tests__/multilingual-issues-routes.test.ts`

### Unowned Windows shell fallback

LUC-2237 recorded `spawn sh ENOENT` as a known Windows workspace-runtime failure, but it
did not own this later fallback change. The exact producer remains unowned.

- `server/src/services/workspace-runtime.ts`
- `server/src/__tests__/workspace-runtime.test.ts`

## Evidence sources

- Paperclip issue LUC-2765: declared packet boundary and focused verification.
- Paperclip issue LUC-2722: runtime/autonomy preservation and ownership classification.
- Paperclip issue LUC-2697: prior 75-path operating-system packet and commit evidence.
- Paperclip issue LUC-2237: prior independent workspace-runtime failure classification.
- Git commits `9d0b3d49c`, `a24094af8`, and `b5a2337b5`.
- `doc/GOAL.md`, `doc/PRODUCT.md`, and the issue/blocker/liveness sections of
  `doc/SPEC-implementation.md`.

## Verification

The bounded follow-up passed these focused checks on 2026-08-15:

- `pnpm exec vitest run server/src/__tests__/admission-control-service.test.ts --project @paperclipai/server --no-file-parallelism --maxWorkers=1 --minWorkers=1 --reporter=dot` — 12/12 tests passed.
- `pnpm exec vitest run server/src/__tests__/heartbeat-issue-liveness-escalation.test.ts --project @paperclipai/server --no-file-parallelism --maxWorkers=1 --minWorkers=1 --reporter=dot` — 14/14 tests passed.
- `pnpm --filter @paperclipai/server typecheck` — passed.

No deployment, production mutation, history rewrite, discard, or secret access was
performed as part of this bounded repair.
