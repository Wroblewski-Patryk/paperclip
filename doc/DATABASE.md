# Database

Paperclip uses PostgreSQL via [Drizzle ORM](https://orm.drizzle.team/). There are three ways to run the database, from simplest to most production-ready.

## 1. Embedded PostgreSQL — zero config

If you don't set `DATABASE_URL`, the server automatically starts an embedded PostgreSQL instance and manages a local data directory.

```sh
pnpm dev
```

That's it. On first start the server:

1. Creates a `~/.paperclip/instances/default/db/` directory for storage
2. Ensures the `paperclip` database exists
3. Runs migrations automatically for empty databases
4. Starts serving requests

Data persists across restarts in `~/.paperclip/instances/default/db/`. To reset local dev data, delete that directory.

If you need to apply pending migrations manually, run:

```sh
pnpm db:migrate
```

When `DATABASE_URL` is unset, this command targets the current embedded PostgreSQL instance for your active Paperclip config/instance.

Issue reference mentions follow the normal migration path: the schema migration creates the tracking table, but it does not backfill historical issue titles, descriptions, comments, or documents automatically.

To backfill existing content manually after migrating, run:

```sh
pnpm issue-references:backfill
# optional: limit to one company
pnpm issue-references:backfill -- --company <company-id>
```

Future issue, comment, and document writes sync references automatically without running the backfill command.

Typed issue completion evidence follows the normal migration path too: the schema can add the
`issues.completion_evidence` column before older `done` rows are repaired. To backfill recent
historical rows that already have same-issue proof comments or artifacts, run:

```sh
pnpm issue-completion-evidence:backfill -- --company <company-id>
```

Optional flags:

- `--hours <n>` limits the repair window (default `72`)
- `--limit <n>` caps scanned terminal rows
- `--dry-run` reports repaired/skipped candidates without mutating the DB

The repair is intentionally conservative: it only fills `completion_evidence` when the issue
already contains substantive same-issue closeout evidence. Existing documents, attachments, and
work products are preferred. When no richer artifact exists, same-issue closeout comments must
explicitly record verification, review disposition, and the documentation outcome before they can
satisfy the typed evidence bundle. High-risk production, deployment, credential, secret, security,
privacy, rollback, restart, Coolify, VPS, and destructive-operation issues always remain on the
manual evidence path. Rows without enough inspectable proof remain unchanged instead of receiving
fabricated metadata.

This mode is ideal for local development and one-command installs.

Docker note: the Docker quickstart image also uses embedded PostgreSQL by default. Persist `/paperclip` to keep DB state across container restarts (see `doc/DOCKER.md`).

## 2. Local PostgreSQL (Docker)

For a full PostgreSQL server locally, use the included Docker Compose setup:

```sh
docker compose up -d
```

This starts PostgreSQL 17 on `localhost:5432`. Then set the connection string:

```sh
cp .env.example .env
# .env already contains:
# DATABASE_URL=postgres://paperclip:paperclip@localhost:5432/paperclip
```

Run migrations:

```sh
DATABASE_URL=postgres://paperclip:paperclip@localhost:5432/paperclip \
  pnpm db:migrate
```

Start the server:

```sh
pnpm dev
```

## 3. Hosted PostgreSQL (Supabase)

For production, use a hosted PostgreSQL provider. [Supabase](https://supabase.com/) is a good option with a free tier.

### Setup

1. Create a project at [database.new](https://database.new)
2. Go to **Project Settings > Database > Connection string**
3. Copy the URI and replace the password placeholder with your database password

### Connection string

Supabase offers two connection modes:

**Direct connection** (port 5432) — use for migrations and one-off scripts:

```
postgres://postgres.[PROJECT-REF]:[PASSWORD]@aws-0-[REGION].pooler.supabase.com:5432/postgres
```

**Connection pooling via Supavisor** (port 6543) — use for the application:

```
postgres://postgres.[PROJECT-REF]:[PASSWORD]@aws-0-[REGION].pooler.supabase.com:6543/postgres
```

### Configure

For the application runtime, use a direct PostgreSQL connection unless the database client has explicit prepared-statement configuration for your pooling mode:

```sh
DATABASE_URL=postgres://postgres.[PROJECT-REF]:[PASSWORD]@aws-0-[REGION].pooler.supabase.com:5432/postgres
```

If you later run the app with a pooled runtime URL, set `DATABASE_MIGRATION_URL` to the direct connection URL. Paperclip uses it for startup schema checks/migrations and plugin namespace migrations, while the app continues to use `DATABASE_URL` for runtime queries:

```sh
DATABASE_URL=postgres://postgres.[PROJECT-REF]:[PASSWORD]@aws-0-[REGION].pooler.supabase.com:6543/postgres
DATABASE_MIGRATION_URL=postgres://postgres.[PROJECT-REF]:[PASSWORD]@aws-0-[REGION].pooler.supabase.com:5432/postgres
```

If your hosted database requires transaction-pooling-only connections, use a direct or session-pooled connection for Paperclip until runtime pooling support is documented in this guide. Do not edit database client source files as part of deployment setup.

### Push the schema

```sh
# Use the direct connection (port 5432) for schema changes
DATABASE_URL=postgres://postgres.[PROJECT-REF]:[PASSWORD]@...5432/postgres \
  pnpm db:migrate
```

### Free tier limits

- 500 MB database storage
- 200 concurrent connections
- Projects pause after 1 week of inactivity

See [Supabase pricing](https://supabase.com/pricing) for current details.

## Switching between modes

The database mode is controlled by `DATABASE_URL`:

| `DATABASE_URL` | Mode |
|---|---|
| Not set | Embedded PostgreSQL (`~/.paperclip/instances/default/db/`) |
| `postgres://...localhost...` | Local Docker PostgreSQL |
| `postgres://...supabase.com...` | Hosted Supabase |

Your Drizzle schema (`packages/db/src/schema/`) stays the same regardless of mode.

## Resource membership tables

Paperclip stores current-user sidebar membership state in:

- `project_memberships`
- `agent_memberships`

These rows are company-scoped and user-scoped. A missing row means the user is joined, so existing users keep seeing projects and agents in the sidebar until they explicitly leave them. Rows only control sidebar visibility; they do not affect project/agent detail access, all-pages, selectors, assignment flows, or existing company permissions.

Both tables use a unique key on `(company_id, user_id, resource_id)` and keep `state` as `joined` or `left`. Join/leave mutations are idempotent board-user `/me` operations and write activity entries when the effective state changes.

## Plugin database namespaces

The plugin runtime tracks plugin-owned database namespaces and migrations in `plugin_database_namespaces` and `plugin_migrations`. Hosted deployments that separate runtime and migration connections should set `DATABASE_MIGRATION_URL`; plugin namespace migration work uses the migration connection when present.

## Backups

Paperclip supports automatic and manual logical database backups. These dumps include
non-system database schemas such as `public`, the Drizzle migration journal, and
plugin-owned database schemas. See `doc/DEVELOPING.md` for the current
`paperclipai db:backup` / `pnpm db:backup` commands and backup retention
configuration. The server merges the daily/weekly/monthly policy from Instance
Settings with the instance-file `maxTotalBytes` and `minFreeBytes` capacity guards;
manual and scheduled backups therefore enforce the same disk safety policy.

When both `local_disk` storage and `local_encrypted` secrets are active, server-run
backups publish a matching `<backup>.restore-coupled` sidecar. It contains the local
storage snapshot and an AES-256-GCM-wrapped copy of the secrets master key; it never
contains the plaintext master key. The wrapping key stays outside the backup directory,
defaults to `backup-recovery.key` beside the configured master key, is created with
restricted permissions, and can be overridden with
`PAPERCLIP_BACKUP_RECOVERY_KEY_FILE`. Protect and back up that recovery key separately:
the database/sidecar and recovery key are intentionally insufficient on their own.
Workspace files are not part of this bundle and require their own backup policy.

## Secret storage

Paperclip stores secret metadata and versions in:

- `company_secrets`
- `company_secret_versions`
- `company_secret_bindings`
- `secret_access_events`

Secret-aware env bindings are supported by agents, projects, and routines. Routine env lives in `routines.env`, is captured in `routine_revisions.snapshot`, and routine dispatches store `routine_runs.routine_revision_id` so runtime secret resolution uses the env snapshot that existed when the run was created. Routine secret refs bind with `target_type = 'routine'`, `target_id = routines.id`, and `config_path` values under `env.*`.

For local/default installs, the active provider is `local_encrypted`:

- Secret material is encrypted at rest with a local master key.
- Default key file: `~/.paperclip/instances/default/secrets/master.key` (auto-created if missing).
- CLI config location: `~/.paperclip/instances/default/config.json` under `secrets.localEncrypted.keyFilePath`.
- Server backup/restore requires the database sidecar bundle plus the separately protected backup recovery key; either artifact alone is insufficient.
- The server best-effort enforces `0600` key file permissions and provider health reports permission warnings.

Optional overrides:

- `PAPERCLIP_SECRETS_MASTER_KEY` (32-byte key as base64, hex, or raw 32-char string)
- `PAPERCLIP_SECRETS_MASTER_KEY_FILE` (custom key file path)

Strict mode to block new inline sensitive env values:

```sh
PAPERCLIP_SECRETS_STRICT_MODE=true
```

You can set strict mode and provider defaults via:

```sh
pnpm paperclipai configure --section secrets
```

Inline secret migration command:

```sh
pnpm paperclipai secrets migrate-inline-env --company-id <company-id> --apply

# direct database maintenance fallback
pnpm secrets:migrate-inline-env --apply
```

Hosted AWS provider notes live in [SECRETS-AWS-PROVIDER.md](./SECRETS-AWS-PROVIDER.md).

## Organizational deliberation records

`organizational_records` is a company-scoped typed lifecycle table for
assumptions, commitments, and decisions. Cross-company references are rejected
by the service even where a foreign key alone cannot express that invariant.

Migration `0101_reconcile_schema_snapshot_ancestry` linearizes the historical
0095/0098 Drizzle snapshot branch and reconciles migrations 0098-0100
idempotently. Migration 0102 adds the organizational record table, and 0103
preserves the project icon column while bringing it back into the canonical
schema snapshot.

## Organizational observations and learning

`organizational_observations` stores company-scoped, source-backed outcomes,
causal findings, external signals, and learning candidates. It carries explicit
provenance, observation time, freshness, typed links, supersession, measurement,
and promotion targets. Migration 0104 adds the table. Service rules enforce
same-company references, kind-specific lifecycle transitions, atomic supersession,
and the `proposed -> validated -> promoted` learning gate.

## Admission control persistence

Native maintenance and work-admission state is persisted in:

- `admission_controls`: one versioned current-state row for a company or project
  scope, including drain/replay evidence snapshots and maintenance ownership;
- `admission_control_transitions`: the append-only, idempotent transition ledger;
- `agent_wakeup_requests`: the existing durable wake ledger, extended with project,
  admission, dedupe, deferral, replay, and replay-result fields.

Migration `0107_admission_control` maps legacy non-budget company pauses to a
company-scoped `maintenance` control. Active, archived, and budget-paused companies
receive an `open` admission control; archive and budget rules remain separate gates.
The migration does not enqueue work.

Deferred maintenance wakes are unique by `(company_id, dedupe_key)` while they remain
`deferred_by_maintenance`. Transition retries are unique by control and idempotency
key. `heartbeat_runs.wakeup_request_id` is unique when present so one durable wake
cannot create more than one run. The migration fails before adding that last index if
legacy duplicate wake-to-run rows exist; operators must reconcile the duplicates
instead of silently discarding execution history.

The server now mediates wakeups through this state before run creation and checks the
state again before claim, scheduled retry, process-loss retry, missing-comment retry,
deferred-work promotion, and automatic recovery. `draining`, `maintenance`, and
`reopening` therefore block new execution. Maintenance wakeups are retained as
deduplicated `deferred_by_maintenance` rows with the deciding control id/version and
do not create heartbeat runs.

Board operators can inspect controls with
`GET /api/companies/{companyId}/admission-controls` and request an idempotent staged
transition with `POST /api/companies/{companyId}/admission-controls/transition`.
The legal company path is `open -> draining -> maintenance -> reopening -> open`;
reopening and opening require an evidence array. Returning to `open` synchronizes the
legacy company status, but should only be requested after the safety suite passes.

## Autonomous decision persistence

Migration `0119_sad_kitty_pryde` adds five company-scoped control tables:

- `operational_constraints`: current constraint, affected issues, evidence,
  response, flow SLO, and resolution criteria;
- `autonomy_envelopes`: per-action-class authority stage, scope, budget,
  concurrency, allowed actions, rollback, and graduation metrics;
- `autonomy_decisions`: deduplicated world-state decision records with layered
  vectors, evidence TTL, invalidation rules, and expected outcomes;
- `autonomy_decision_evaluations`: evaluator verdicts attached to decisions,
  keeping oracle agreement distinct from actual outcome quality;
- `autonomy_executions`: idempotent dispatch, execution, outcome, impact, and
  cost-coverage postconditions.

These tables reference canonical issues, goals indirectly through decision
evidence, supervision cycles, agents, and heartbeat runs. They do not replace
issue or ProductDelivery/ProductOutcome state machines.

Migration `0120_abnormal_morbius` adds the Iteration 5 bootstrap and governance
projection. `issue_intents` makes issue-level intent status, owner, source,
confirmation, expiry, hierarchy, and Paperclip-to-Roost canonical ownership
explicit. `autonomy_canary_authorizations` is a time-bounded board authority
record tied to an unchanged envelope and, normally, one decision/issue; it does
not change envelope stage or graduation history. `autonomy_interrupts` stores
scoped expiring preemption signals. `learned_policies` and `policy_exceptions`
store versioned, reversible learning and bounded exceptions.

The same migration versions decision samples and calibration cohorts, separates
oracle/operator/counterfactual signals, records execution liveness and
preemption class, and adds evidence-backed constraint-impact fields. Dependency
edges now carry type, resolving predicate, owner, verification/expiry, status,
and resolution evidence. Existing edges intentionally start as stale/untyped
debt until revalidated; migration does not invent semantics for historical
relations.
