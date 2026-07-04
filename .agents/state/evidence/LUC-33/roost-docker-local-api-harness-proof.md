# LUC-33 Roost Docker-backed local API harness proof

Date: 2026-07-04
Agent: 09 QVE (QA and Verification Engineer)
Issue: LUC-33
Repo: C:/Personal/Projekty/Aplikacje/Roost

## Scope

Prove or explicitly block Roost's Docker-backed local API harness after LUC-24
only verified public route/API behavior because Docker/Linux runtime was
unavailable.

## Architecture Read

Read first:

- docs/architecture/README.md
- docs/architecture/architecture-source-of-truth.md

Architecture fit: PASS. The harness fits approved architecture because
PostgreSQL is the source of truth, API is the supported access layer, and
workspace/API smoke checks are required before v1 stability. No architecture
conflict was found and no schema/API/UI change was needed.

## Repo Posture

Before verification:

```text
## main...origin/main [ahead 2]
 M .agents/state/active-mission.md
 M .agents/state/module-confidence-ledger.md
 M .agents/state/next-steps.md
 M .agents/state/system-health.md
 M .codex/context/PROJECT_STATE.md
 M .codex/context/TASK_BOARD.md
?? docs/planning/luc-22-roost-local-architecture-and-repo-preflight.md
?? docs/planning/luc-24-roost-bounded-local-route-api-evidence-slice.md
```

Existing dirty/ahead state was preserved; no cleanup, overwrite, push, deploy,
restart, rollback, production mutation, secret read, or paid/noisy GitHub
automation was performed.

After verification:

```text
## main...origin/main [ahead 3]
```

`git diff --stat` returned no output after the harness. The verification run did
not leave source changes from this heartbeat.

## Docker Evidence

Initial Docker check:

```text
Docker CLI version: 28.3.2
Context: desktop-linux
Linux engine unavailable: open //./pipe/dockerDesktopLinuxEngine: The system cannot find the file specified.
```

The project-native harness is designed to launch Docker Desktop on Windows when
allowed. Running `npm run test:api:local` brought the engine up. Post-run check:

```text
docker info --format '{{.ServerVersion}}'
28.3.2
```

Cleanup check:

```text
docker ps -a --filter name=companycore-test-postgres --format '{{.Names}} {{.Status}}'
```

Result: no rows.

## Command Result

Command:

```text
npm run test:api:local
```

Result: PASS.

Observed sequence:

- `npm run build`
- `npm run build:server`
- `npm run build:web`
- `npm run prisma:migrate:deploy`
- `npm run seed`
- `node --test dist/tests/api.test.js`

Database proof:

- Disposable PostgreSQL database: `companycore_test`
- URL host/port: `127.0.0.1:55432`
- Migrations applied: 31/31

Node test proof:

```text
1..8
# tests 8
# suites 0
# pass 8
# fail 0
# cancelled 0
# skipped 0
# todo 0
# duration_ms 59751.1004
```

Subtests passed:

1. production environment validation fails closed when required secrets are missing
2. production environment validation rejects committed development secret placeholders
3. production environment validation keeps API key hash fallback compatible
4. production health reports safe Coolify build metadata
5. production CORS allows approved origins and rejects unknown browser origins
6. production defaults recognize Roost web and API domains
7. account and workspace settings profile contract exposes active owner workspace
8. CompanyCore v1 protected API flow

Build note: Vite reported `/vendor/phosphor/bold/style.css doesn't exist at
build time, it will remain unchanged to be resolved at runtime`. This did not
fail the build or tests and is consistent with a runtime-resolved asset note,
not a blocker for the DB-backed API harness.

## Evidence Classes

- test: `npm run test:api:local` passed with 8/8 API subtests and 31/31 migrations.
- docs: required architecture docs read; this bundle records the QA proof and no docs change was required by the behavior.
- review: QA review conclusion is pass for the narrow harness; no implementation defect found to route.
- security: no raw secrets read or emitted; production env validation and CORS safety subtests passed; no production mutation.
- deploy: no deploy-impacting action performed; local-only Docker/PostgreSQL harness.
- monitoring: cleanup and post-run state checked; disposable test container absent after run; Docker engine available after harness.

## Routing Decision

LUC-33 can close. This removes the Docker/Linux-runtime uncertainty from LUC-24.
Roost DB-backed local API proof is now available and should unblock LUC-29 /
LUC-25 for the Roost readiness lane, subject to their other blockers.
