# 2026-05-27 LUC-275 Priority Test Links Backfill

## Scope

- Issue: `LUC-275` (`[LUC-265] Backfill priority test links for architecture entities`)
- Goal: backfill explicit test relations for high-priority API endpoints that were listed in
  `docs/status/architecture-awareness-report.md` under `Top Missing Test Links`.

## Changes Applied

1. Added curated priority-test link ingestion to
   `scripts/build-architecture-awareness-index.mjs`.
   - New behavior: consumes optional
     `docs/architecture/relations/priority-test-links.csv` and adds explicit
     `test -> entity` graph relations.
2. Added `docs/architecture/relations/priority-test-links.csv` with curated
   test links for high-priority access/auth/invite endpoints.
3. Updated architecture source-of-truth contract in
   `docs/architecture/architecture-evidence-graph-system.md` to include
   `priority-test-links.csv`.
4. Regenerated architecture exports with:
   - `node scripts/build-architecture-awareness-index.mjs --project Paperclip --root . --out docs`

## Verification Evidence

- Health signal delta in `docs/status/architecture-awareness-report.md`:
  - `Implementation entities without inferred tests`:
    - before: `9338` (report timestamp `2026-05-27T01:30:38.657Z`)
    - after: `9317` (report timestamp `2026-05-27T08:23:46.521Z`)

## Priority Links Backfilled

- `server/src/app.ts#/api` <- `server/src/__tests__/auth-routes.test.ts`
- `server/src/routes/access.ts#/admin/users` <- `server/src/__tests__/access-routes-permissions-upgrade.test.ts`
- `server/src/routes/access.ts#/admin/users/:userId/company-access` <- `server/src/__tests__/access-routes-permissions-upgrade.test.ts`
- `server/src/routes/access.ts#/board-claim/:token` <- `server/src/__tests__/auth-session-route.test.ts`
- `server/src/routes/access.ts#/board-claim/:token/claim` <- `server/src/__tests__/auth-session-route.test.ts`
- `server/src/routes/access.ts#/cli-auth/challenges` <- `server/src/__tests__/cli-auth-routes.test.ts`
- `server/src/routes/access.ts#/cli-auth/challenges/:id` <- `server/src/__tests__/cli-auth-routes.test.ts`
- `server/src/routes/access.ts#/cli-auth/challenges/:id/approve` <- `server/src/__tests__/cli-auth-routes.test.ts`
- `server/src/routes/access.ts#/cli-auth/challenges/:id/cancel` <- `server/src/__tests__/cli-auth-routes.test.ts`
- `server/src/routes/access.ts#/cli-auth/me` <- `server/src/__tests__/cli-auth-routes.test.ts`
- `server/src/routes/access.ts#/cli-auth/revoke-current` <- `server/src/__tests__/cli-auth-routes.test.ts`
- `server/src/routes/access.ts#/companies/:companyId/invites` <- `server/src/__tests__/invite-create-route.test.ts`
- `server/src/routes/access.ts#/companies/:companyId/invites` <- `server/src/__tests__/invite-list-route.test.ts`
- `server/src/routes/access.ts#/companies/:companyId/join-requests` <- `server/src/__tests__/join-request-dedupe.test.ts`
- `server/src/routes/access.ts#/companies/:companyId/members` <- `server/src/__tests__/access-routes-permissions-upgrade.test.ts`
- `server/src/routes/access.ts#/companies/:companyId/openclaw/invite-prompt` <- `server/src/__tests__/openclaw-invite-prompt-route.test.ts`
- `server/src/routes/access.ts#/invites/:token` <- `server/src/__tests__/invite-summary-route.test.ts`
- `server/src/routes/access.ts#/invites/:token/accept` <- `server/src/__tests__/invite-accept-replay.test.ts`
- `server/src/routes/access.ts#/invites/:token/logo` <- `server/src/__tests__/invite-logo-route.test.ts`
- `server/src/routes/access.ts#/invites/:token/test-resolution` <- `server/src/__tests__/invite-test-resolution-route.test.ts`
- `server/src/routes/access.ts#/join-requests/:requestId/claim-api-key` <- `server/src/__tests__/invite-join-grants.test.ts`
- `server/src/routes/access.ts#/skills/:skillName` <- `server/src/__tests__/invite-onboarding-text.test.ts`
- `server/src/routes/access.ts#/skills/index` <- `server/src/__tests__/invite-onboarding-text.test.ts`

## Residual Gaps (Next Backfill Candidates)

Top unresolved priority routes still in missing list include:

- `/api/auth`
- `/assets`
- `/admin/users/:userId/demote-instance-admin`
- `/admin/users/:userId/promote-instance-admin`
- `/companies/:companyId/join-requests/:requestId/approve`
- `/companies/:companyId/join-requests/:requestId/reject`
- `/companies/:companyId/members/:memberId/archive`
- `/companies/:companyId/members/:memberId/permissions`
- `/companies/:companyId/members/:memberId/role-and-grants`
- `/invites/:inviteId/revoke`
- `/invites/:token/skills/:skillName`
- `/invites/:token/skills/index`
- `/skills/available`

## Project Consolidation Handoff

- 2026-05-27: Board comment `efbc90fd-8861-44e1-8260-06a0630d6641` indicates operating-system tracking moved from duplicate `Paperclip_Softwarehouse` into canonical `Softwarehouse` workspace/project bucket.
- `LUC-275` implementation/backfill is complete in this workspace and should be treated as the transfer source set for the canonical project thread:
  - `scripts/build-architecture-awareness-index.mjs`
  - `docs/architecture/relations/priority-test-links.csv`
  - `docs/architecture/architecture-evidence-graph-system.md`
  - `docs/status/architecture-awareness-report.md`
- Remaining action is administrative issue-thread closure in the canonical project bucket, not additional code changes for this issue scope.

