# AGENTS.md

Guidance for human and AI contributors working in this repository.

## 1. Purpose

Paperclip is a control plane for AI-agent companies.
The current implementation target is V1 and is defined in `doc/SPEC-implementation.md`.

## 2. Read This First

Start with `docs/documentation-contract.json`. Read its bounded
`defaultAgentContext`, then add only task-relevant sources. Before making
changes, the core contract order is:

1. `doc/GOAL.md`
2. `doc/PRODUCT.md`
3. `doc/SPEC-implementation.md`
4. `doc/DEVELOPING.md`
5. `doc/DATABASE.md`

`doc/SPEC.md` is long-horizon product context.
`doc/SPEC-implementation.md` is the concrete V1 build contract.
Generated graphs, `docs/status/`, `.agents/state/`, `.paperclip/agent-instructions/`,
task packets, and historical evidence are investigation inputs, not a mandatory
startup payload and not higher-authority truth.

## 3. Repo Map

- `server/`: Express REST API and orchestration services
- `ui/`: React + Vite board UI
- `packages/db/`: Drizzle schema, migrations, DB clients
- `packages/shared/`: shared types, constants, validators, API path constants
- `packages/adapters/`: agent adapter implementations (Claude, Codex, Cursor, etc.)
- `packages/adapter-utils/`: shared adapter utilities
- `packages/plugins/`: plugin system packages
- `doc/`: operational and product docs
- `.codex/PROJECT_CONTEXT.md`: compact Codex routing bootstrap, not a live-state copy
- `.agents/skills/`: provider-neutral repository workflows and specialist guidance
- `.agents/state/`: curated, provider-neutral Softwarehouse operating memory
- `history/agent-memory/`: archived journals and superseded agent-context snapshots
- `.agents/skills/paperclip-project-memory/`: workflow for saving chat context and updating project memory

When the user asks to "zapisz do dziennika", "przeanalizuj i zapisz", or otherwise preserve context for future chats, use `.agents/skills/paperclip-project-memory/SKILL.md` and update the relevant `.agents/state/` files.

## 4. Dev Setup (Auto DB)

Use embedded PGlite in dev by leaving `DATABASE_URL` unset.

```sh
pnpm install
pnpm dev
```

This starts:

- API: `http://localhost:3100`
- UI: `http://localhost:3100` (served by API server in dev middleware mode)

LuckySparrow Software House local instance:

- Active API/UI base: `http://127.0.0.1:3200`
- Prefer `PAPERCLIP_API_URL` when present; otherwise use the active local
  Softwarehouse base above for supervision scripts and board mutations.
- A failed probe to `localhost:3100`/`3101` alone does not prove this
  Softwarehouse instance is down.

Quick checks:

```sh
curl http://localhost:3100/api/health
curl http://localhost:3100/api/companies
curl http://127.0.0.1:3200/api/health
curl http://127.0.0.1:3200/api/companies
```

Reset local dev DB:

```sh
rm -rf data/pglite
pnpm dev
```

## 5. Core Engineering Rules

1. Keep changes company-scoped.
Every domain entity should be scoped to a company and company boundaries must be enforced in routes/services.

2. Keep contracts synchronized.
If you change schema/API behavior, update all impacted layers:
- `packages/db` schema and exports
- `packages/shared` types/constants/validators
- `server` routes/services
- `ui` API clients and pages

3. Preserve control-plane invariants.
- Single-assignee task model
- Atomic issue checkout semantics
- Approval gates for governed actions
- Budget hard-stop auto-pause behavior
- Activity logging for mutating actions

4. Do not replace strategic docs wholesale unless asked.
Prefer additive updates. Keep `doc/SPEC.md` and `doc/SPEC-implementation.md` aligned.

5. Keep repo plan docs dated and centralized.
When you are creating a plan file in the repository itself, new plan documents belong in `doc/plans/` and should use `YYYY-MM-DD-slug.md` filenames. This does not replace Paperclip issue planning: if a Paperclip issue asks for a plan, update the issue `plan` document per the `paperclip` skill instead of creating a repo markdown file.

6. Attach inspectable generated artifacts.
When your task produces a user-inspectable deliverable file, follow the Paperclip skill's "Generated Artifacts and Work Products" workflow before final disposition. In this repo, prefer the self-contained Node helpers at `skills/paperclip/scripts/paperclip-upload-artifact.mjs` and `skills/paperclip/scripts/paperclip-issue-update.mjs`, especially on Windows, so the file is available through the Paperclip API without ad-hoc `powershell.exe -Command ... curl.exe ...` mutation chains. Create/update an artifact work product when the file is the deliverable, link the uploaded artifact in the final issue comment, and then set status. Do not rely on local filesystem paths as the only access path. If an important file intentionally remains workspace-only, create/update a work product with `metadata.resourceRef.kind: "workspace_file"` and a workspace-relative path, then name that work product and path in the final comment. Treat browse/search as a fallback for recovering workspace files, not the preferred deliverable path. See `doc/AGENT-ARTIFACTS.md` for details and `.mp4`/`.webm` examples.

7. Preserve softwarehouse evidence gates.
For autonomous softwarehouse work, use the canonical operating model in `docs/architecture.md`,
`docs/softwarehouse-sdlc.md`, and `docs/agent-policy-gates.md`. Do not mark issue work as
`done` unless the issue or its work products include inspectable test evidence, review evidence,
and documentation evidence. High-risk work, including deployment, secrets, destructive file
operations, production configuration, and security-sensitive changes, also requires security,
deployment, and monitoring evidence before completion.

8. Keep agent work isolated and traceable.
Agents should work on scoped branches or Paperclip execution workspaces/worktrees. They must
record the next action or blocker in the issue thread, keep generated artifacts attached as work
products, and avoid broad rewrites that make ownership, review, or rollback unclear.

9. Preserve local application boundaries.
Stage 1 autonomous agents may work only inside these local roots unless the owner explicitly
approves a different root in the current thread or Paperclip approval:
- `C:\Personal\Projekty\Aplikacje\Paperclip_Softwarehouse`
- `C:\Personal\Projekty\Aplikacje\Soar`
- `C:\Personal\Projekty\Aplikacje\Roost`
- `C:\Personal\Projekty\Aplikacje\Featherly`

Do not create helper folders, generated indexes, scripts, or scratch files directly under
`C:\Personal\Projekty\Aplikacje`. Do not delete or clean up sibling app folders such as
Nest, Featherly, Aviary, or other experiments. If ownership is unclear, report the path as
a boundary issue and leave it untouched. Run `pnpm run softwarehouse:workspace-boundary-audit`
after configuration changes that affect projects, routines, workspaces, or autonomous lanes.
The four approved roots are singleton checkouts: do not create additional clones or worktrees.
Paperclip must stay on strict port `3200` with its canonical embedded PostgreSQL on strict port
`54329`; never start a fallback instance. Run `pnpm run softwarehouse:runtime-topology-audit`
after runtime, workspace, or service configuration changes.

10. Invoke scripts through their runtime on Windows.
Never execute a `.js`, `.mjs`, `.cjs`, or `.ts` file by entering only its path, with
`Invoke-Item`, or with `Start-Process` pointed at the script. Windows may follow the file
association and open the source in an editor instead of running it. Use `node <script-path>`
for JavaScript modules and `pnpm exec tsx <script-path>` for TypeScript. In child-process
code, use `process.execPath` plus the script path. For Paperclip helpers, use:

```powershell
$issueHelper = Join-Path $env:LUCKYSPARROW_SOFTWAREHOUSE_ROOT 'skills/paperclip/scripts/paperclip-issue-update.mjs'
node $issueHelper --issue-id $env:PAPERCLIP_TASK_ID --status in_review --comment-file .\closeout.md

$artifactHelper = Join-Path $env:LUCKYSPARROW_SOFTWAREHOUSE_ROOT 'skills/paperclip/scripts/paperclip-upload-artifact.mjs'
node $artifactHelper .\path\to\artifact.md --title 'Artifact title'
```

## 6. Database Change Workflow

When changing data model:

1. Edit `packages/db/src/schema/*.ts`
2. Ensure new tables are exported from `packages/db/src/schema/index.ts`
3. Generate migration:

```sh
pnpm db:generate
```

4. Validate compile:

```sh
pnpm -r typecheck
```

Notes:
- `packages/db/drizzle.config.ts` reads compiled schema from `dist/schema/*.js`
- `pnpm db:generate` compiles `packages/db` first

## 7. Verification Before Hand-off

Default local/agent test path:

```sh
pnpm test
```

This is the cheap default and only runs the Vitest suite. Browser suites stay opt-in:

```sh
pnpm test:e2e
pnpm test:release-smoke
```

Run the browser suites only when your change touches them or when you are explicitly verifying CI/release flows.

For normal issue work, run the smallest relevant verification first. Do not default to repo-wide typecheck/build/test on every heartbeat when a narrower check is enough to prove the change.

Run this full check before claiming repo work done in a PR-ready hand-off, or when the change scope is broad enough that targeted checks are not sufficient:

```sh
pnpm -r typecheck
pnpm test:run
pnpm build
```

Windows resource safety:
- Run package typechecks and embedded-Postgres suites sequentially; do not overlap them with repo-wide validation.
- Prefer targeted Vitest files with one worker while the live local Paperclip database is running.
- After any external timeout or interrupted test, verify that no `vitest` process or temporary `paperclip-*-service-*` Postgres master remains before retrying.
- A command timeout is not a passing test. Record the unverified suite and continue with narrower evidence instead of repeatedly spawning it.
- Embedded-Postgres cleanup on Windows must own exact PID trees. Protect the canonical database dynamically from the listener on strict port `54329`, rescan the owned tree for late reparented `io_worker` children, and require several consecutive snapshots with no listener before declaring a test port released. Never kill every `postgres.exe` by name.
- Node child-process code that launches pnpm should prefer `process.execPath` plus `process.env.npm_execpath`; if a bare launcher fallback is unavoidable on Windows, use a deliberately scoped shell invocation. Do not assume `spawnSync("pnpm", ...)` resolves a `.cmd` shim.
- This Windows 11 host is one bounded workstation. Do not overlap repo-wide builds, typechecks,
  browser suites, or embedded-Postgres suites; avoid full `Win32_Process` serialization and broad
  process-name kills. Inspect and terminate only a verified PID tree.

If anything cannot be run, explicitly report what was not run and why.

## 8. API and Auth Expectations

- Base path: `/api`
- Board access is treated as full-control operator context
- Agent access uses bearer API keys (`agent_api_keys`), hashed at rest
- Agent keys must not access other companies

When adding endpoints:

- apply company access checks
- enforce actor permissions (board vs agent)
- write activity log entries for mutations
- return consistent HTTP errors (`400/401/403/404/409/422/500`)

## 9. UI Expectations

- Keep routes and nav aligned with available API surface
- Use company selection context for company-scoped pages
- Surface failures clearly; do not silently ignore API errors
- Follow `doc/UI-DESIGN-SYSTEM.md` for structural surfaces and agent identity. Use
  the shared `Card`/`.paperclip-surface` system rather than introducing another
  generic card treatment, and preserve semantic or interaction-specific exceptions.

## 10. Pull Request Requirements

When creating a pull request (via `gh pr create` or any other method), you **must** read and fill in every section of [`.github/PULL_REQUEST_TEMPLATE.md`](.github/PULL_REQUEST_TEMPLATE.md). Do not craft ad-hoc PR bodies — use the template as the structure for your PR description. Required sections:

- **Thinking Path** — trace reasoning from project context to this change (see `CONTRIBUTING.md` for examples)
- **What Changed** — bullet list of concrete changes
- **Verification** — how a reviewer can confirm it works
- **Risks** — what could go wrong
- **Model Used** — the AI model that produced or assisted with the change (provider, exact model ID, context window, capabilities). Write "None — human-authored" if no AI was used.
- **Checklist** — all items checked

## 11. Definition of Done

A change is done when all are true:

1. Behavior matches `doc/SPEC-implementation.md`
2. Typecheck, tests, and build pass
3. Contracts are synced across db/shared/server/ui
4. Docs updated when behavior or commands change
5. PR description follows the [PR template](.github/PULL_REQUEST_TEMPLATE.md) with all sections filled in (including Model Used)

## 11. Fork-Specific: HenkDz/paperclip

This is a fork of `paperclipai/paperclip` with QoL patches and an **external-only** Hermes adapter story on branch `feat/externalize-hermes-adapter` ([tree](https://github.com/HenkDz/paperclip/tree/feat/externalize-hermes-adapter)).

### Branch Strategy

- `feat/externalize-hermes-adapter` → core has **no** `hermes-paperclip-adapter` dependency and **no** built-in `hermes_local` registration. Install Hermes via the Adapter Plugin manager (`@henkey/hermes-paperclip-adapter` or a `file:` path).
- Older fork branches may still document built-in Hermes; treat this file as authoritative for the externalize branch.

### Hermes (plugin only)

- Register through **Board → Adapter manager** (same as Droid). Type remains `hermes_local` once the package is loaded.
- UI uses generic **config-schema** + **ui-parser.js** from the package — no Hermes imports in `server/` or `ui/` source.
- Optional: `file:` entry in `~/.paperclip/adapter-plugins.json` for local dev of the adapter repo.

### Local Dev

- Fork runs on port 3101+ (auto-detects if 3100 is taken by upstream instance)
- `npx vite build` hangs on NTFS — use `node node_modules/vite/bin/vite.js build` instead
- Server startup from NTFS takes 30-60s — don't assume failure immediately
- Kill ALL paperclip processes before starting: `pkill -f "paperclip"; pkill -f "tsx.*index.ts"`
- Vite cache survives `rm -rf dist` — delete both: `rm -rf ui/dist ui/node_modules/.vite`

### Fork QoL Patches (not in upstream)

These are local modifications in the fork's UI. If re-copying source, these must be re-applied:

1. **stderr_group** — amber accordion for MCP init noise in `RunTranscriptView.tsx`
2. **tool_group** — accordion for consecutive non-terminal tools (write, read, search, browser)
3. **Dashboard excerpt** — `LatestRunCard` strips markdown, shows first 3 lines/280 chars

### Plugin System

PR #2218 (`feat/external-adapter-phase1`) adds external adapter support. See root `AGENTS.md` for full details.

- Adapters can be loaded as external plugins via `~/.paperclip/adapter-plugins.json`
- The plugin-loader should have ZERO hardcoded adapter imports — pure dynamic loading
- `createServerAdapter()` must include ALL optional fields (especially `detectModel`)
- Built-in UI adapters can shadow external plugin parsers — remove built-in when fully externalizing
- Reference external adapters: Hermes (`@henkey/hermes-paperclip-adapter` or `file:`) and Droid (npm)
