# System Health

Last updated: 2026-07-03

## Local Paperclip Softwarehouse Instance

Known working runtime from the recent restart:

- Base URL: `http://127.0.0.1:3200`
- Company name: `LuckySparrow`
- Company id: `f13051a7-d0aa-4261-9254-d3ab90735de5`
- Deployment mode: `local_trusted`
- Exposure: `private`
- Auth ready: `true`
- Bootstrap status after restart: `ready`
- Root `/` returned `200`
- `/api/companies` returned the `LuckySparrow` company
- Live runs after restart: `0`
- Agent count after restart: `38`
- Project count after restart: `18`
- Routine count after restart: `52`
- Active routine count after restart: `38`
- Active routine duplicate groups after restart: `[]`

If health omits `devServer` after restart, treat `status=ok` and
`bootstrapStatus=ready` plus working companies/live-runs endpoints as the
minimum runtime proof. Check `.paperclip/dev-server-status.json` separately
when investigating stale restart banners.

Follow-up cleanup from the archived dashboard/routines/agents thread:

- Active local base remained `http://127.0.0.1:3200`.
- After routine cleanup: `active: 42`, `archived: 4`, `paused: 6`.
- After targeted agent cleanup: `errors: 0`, with AIA, RTE, and DPM observed
  running live work and `outputSilence: ok`.
- `LUC-6595` was reopened from a stale completed blocker and moved to
  `in_progress`.

## Restart Notes

On 2026-06-20 the runtime reported `restartRequired=true` because backend
files changed. The live-run queue was monitored until it reached zero. The
process listening on `127.0.0.1:3200` was then restarted and verified stable.

`pnpm dev:list` may show a separate managed dev runner around `3100`; do not
assume it is the active Softwarehouse runtime. For Softwarehouse supervision
scripts, prefer `PAPERCLIP_API_URL` when present, otherwise use
`http://127.0.0.1:3200`.

## 2026-07-01 Database-Unreachable Incident

Observed failure mode:

- Browser showed only `database_unreachable`.
- Web server on `127.0.0.1:3200` could serve HTML, but API data requests failed.
- `/api/health` returned `503` or timed out because the DB probe failed.
- Server logs showed `connect ECONNREFUSED 127.0.0.1:54345`.
- `Get-NetTCPConnection` showed port `3200` listening while `54345` was not.
- Embedded Postgres data directory was repo-local: `.paperclip/runtime/db`.
- `postmaster.opts` pointed at:
  `node_modules/.pnpm/@embedded-postgres+windows-x64@18.1.0-beta.16/.../postgres.exe -D .paperclip/runtime/db -p 54345`.

Recovery that worked:

1. Stop stale/unhealthy dev watcher with `pnpm dev:stop` when registered.
2. Run `pnpm rebuild sqlite3` if startup fails with a missing native sqlite binding.
3. Restart the Paperclip dev runner with `pnpm dev`.
4. If web server is alive but embedded Postgres is not listening and
   `.paperclip/runtime/db/postmaster.pid` is absent, manually start embedded
   Postgres with the same datadir and port:

```powershell
$pg = 'C:\Personal\Projekty\Aplikacje\Paperclip_Softwarehouse\node_modules\.pnpm\@embedded-postgres+windows-x64@18.1.0-beta.16\node_modules\@embedded-postgres\windows-x64\native\bin\postgres.exe'
$db = 'C:\Personal\Projekty\Aplikacje\Paperclip_Softwarehouse\.paperclip\runtime\db'
Start-Process -FilePath $pg -ArgumentList @('-D', $db, '-p', '54345') -WindowStyle Hidden
```

Postgres recovery log ended with `database system is ready to accept connections`.
After recovery, `/api/health` returned `status: ok`, `/api/companies` returned
`LuckySparrow`, and `/LUC/inbox/all` rendered as `Inbox • LuckySparrow • Paperclip`.

## 2026-07-01 SQLite Binding Incident

Startup also failed once with:

- `Error: Could not locate the bindings file`
- missing `sqlite3` native binding under `node-v127-win32-x64`
- `Node.js v22.13.0`

Recovery:

```powershell
pnpm rebuild sqlite3
```

## Verification Commands Used Recently

- `pnpm softwarehouse:test-gates` passed with `48/48`.
- `pnpm softwarehouse:architecture-lifecycle` passed for
  `Paperclip`, `Soar`, and `Roost`.
- Node syntax checks passed for touched softwarehouse scripts during the
  configuration update.

## Automation

Codex app automation:

- Active ID: `check-paperclip-soar-autonomy`
- Name: `Paperclip Softwarehouse liveness watchdog`
- Schedule: every 480 minutes
- Workspace: `C:\Personal\Projekty\Aplikacje\Paperclip_Softwarehouse`
- Purpose: parent-level liveness, autonomy, repair, and learning supervision
  for Paperclip until Paperclip can reliably supervise itself.
- Scope now includes the old weekly strategic standards review plus a teacher
  loop that records durable lessons into
  `report/codex-automation/paperclip-teacher-lessons.latest.*`.
- Scope also includes approve-task routing: when watchdog findings need owner
  acceptance, the desired path is a Paperclip approve/decision task with clear
  recommendation and resume conditions.
- Deleted/merged automation: `paperclip-autonomous-company-standards-review`
  was removed on 2026-07-03 after its useful scope was folded into the
  watchdog. Future checks should expect one Paperclip Codex watchdog, not two.
