# LuckySparrow Paperclip Extensions Audit

Date: 2026-05-15
Scope: audit Paperclip readiness as a Company OS control plane for LuckySparrow and plan safe extension rollout.

## Executive Summary

The current checkout is a strong base for LuckySparrow Company OS. Paperclip already has the core control-plane primitives needed for company-scoped autonomous operations: companies, agents, org structure, issues/tasks, comments, approvals, heartbeats, budgets, API keys, documents, work products, plugin runtime, plugin-owned database namespaces, plugin jobs, plugin logs, plugin webhooks, plugin UI slots, and the official MCP server package.

Do not install the requested integrations all at once. Treat every plugin as trusted code, install into a test company first, run a DB backup before each install, inspect logs, and only then promote to the main LuckySparrow company.

## Current Paperclip Version And Mechanisms

Local checkout:

- Branch: `main`
- Head commit: `36219a24a4535d56bf2fc55fb6c6b33c17ed333d`
- Head date: `2026-05-14T22:35:25+02:00`
- Head subject: `Redeploy Paperclip with generated proxy labels`
- Local package versions in source: `paperclipai` CLI `0.3.1`, `@paperclipai/server` `0.3.1`, `@paperclipai/mcp-server` `0.1.0`
- Published npm latest checked on 2026-05-15: `paperclipai`, `@paperclipai/plugin-sdk`, and `@paperclipai/mcp-server` are `2026.513.0`; canary is `2026.514.0-canary.1`.

Supported locally:

- Plugin runtime: yes. Implemented via `packages/plugins/sdk`, `server/src/services/plugin-*`, plugin DB tables, UI plugin manager, and CLI commands.
- npm plugin install: yes, via `paperclipai plugin install <package>`.
- local directory plugin install: yes, via `paperclipai plugin install <absolute-path>` or `--local`.
- MCP server: yes, package `@paperclipai/mcp-server` exists locally and on npm.
- Agent API keys/auth: yes, `agent_api_keys` stores hashed keys with company and agent scope.
- Heartbeats: yes, including scheduler/runtime state, logs, events, watchdog and wakeups.
- Approvals: yes, global approvals plus issue approvals and linked issue approval flows.
- Budgets: yes, company/agent/project-style policies, incidents, hard-stop pause behavior.
- Issue dependencies: yes, `issue_relations` supports blocking relationships and dependency wakeups.
- Company isolation: yes as a core invariant; business tables are company-scoped and authz tests exist.
- Backups: yes, `paperclipai db:backup`, `/api/instance/database-backups`, automatic backups, and plugin-owned schemas included in logical DB backups.
- Secrets: yes, company secrets and secret provider configs exist. Note plugin secret-ref handling is a sensitive area and must be tested per plugin.

Important plugin runtime caveats:

- Plugin UI runs same-origin inside the Paperclip app, not in an iframe sandbox.
- Plugin workers and plugin UI must be treated as trusted code.
- Manifest capabilities gate worker-side host APIs, but plugin UI can call ordinary Paperclip HTTP APIs.
- Runtime installs require writable persistent filesystem and npm access for npm installs.
- Dynamic plugin distribution is self-hosted/local-first, not cloud-ready for horizontally scaled ephemeral deployments.

Sources:

- Local docs: `doc/SPEC-implementation.md`, `doc/plugins/PLUGIN_SPEC.md`, `doc/plugins/PLUGIN_AUTHORING_GUIDE.md`, `doc/plugins/LOCAL_PLUGIN_DEVELOPMENT.md`, `doc/DEVELOPING.md`, `doc/DATABASE.md`
- Local code: `packages/db/src/schema/*`, `server/src/routes/plugins.ts`, `cli/src/commands/client/plugin.ts`, `packages/mcp-server/README.md`
- npm: `paperclipai`, `@paperclipai/plugin-sdk`, `@paperclipai/mcp-server`

## Plugin Status Matrix

| Priority | Integration | Candidate | Status | Decision |
|---:|---|---|---|---|
| 1 | Hindsight Memory | `@vectorize-io/hindsight-paperclip` `0.2.1` | ready / beta | Accept for isolated test first |
| 2 | Telegram plugin | `paperclip-plugin-telegram` `0.6.1` | risky | Test only after verifying current secret-ref compatibility |
| 3 | Paperclip MCP Server | `@paperclipai/mcp-server` `2026.513.0` npm, local package present | ready | Accept |
| 4 | Obsidian Paperclip | `github.com/istib/obsidian-paperclip`; no npm package found | beta / risky | Evaluate from source only, no main-company install yet |
| 5 | GitHub Issues Sync | `github.com/mvanhorn/paperclip-plugin-github-issues`; no npm package found | beta / risky | Evaluate from source only |
| 6 | Aperture / Focus | `@tomismeta/paperclip-aperture` `0.4.4` | beta / risky | Defer until memory/comms/MCP are stable |
| 7 | Company Wizard | `@yesterday-ai/paperclip-plugin-company-wizard` `0.1.16` | beta | Inspiration and test import only |
| 7 | Companies catalog | `paperclip-agent-companies-plugin` `0.9.0`, `companies.sh` `2026.325.2` | beta | Use as template source, not blind import |
| optional | Compass | `paperclip-plugin-compass` `1.1.7` | beta | Possible strategic advisor, not required for first rollout |
| optional | LLM Wiki | local `@paperclipai/plugin-llm-wiki` | beta / local | Better near-term Obsidian-like knowledge base candidate |

## Accepted Plugin Install Instructions

### Common Safe Install Procedure

Run this for each plugin separately:

1. Stop or pause non-test agents.
2. Create or select a test company: `LuckySparrow Lab`.
3. Run backup:

```sh
pnpm paperclipai db:backup
```

4. Install only one plugin.
5. Configure via Paperclip Settings -> Plugins.
6. Run a minimal smoke test in the test company.
7. Inspect:

```sh
pnpm paperclipai plugin list
pnpm paperclipai plugin inspect <plugin-key>
```

8. Check server logs and plugin logs in UI.
9. Decide: `zostaje`, `do poprawy`, or `odrzucic`.

### Hindsight Memory

Install:

```sh
pnpm paperclipai plugin install @vectorize-io/hindsight-paperclip
```

Configure:

- Use Hindsight Cloud or self-hosted Hindsight.
- Store Hindsight token/URL as secrets/config, not in repo files.
- Use company+agent bank isolation first: `paperclip::{companyId}::{agentId}`.

Smoke test:

- Heartbeat 1: ask a test agent to remember a harmless preference.
- Heartbeat 2: ask a related task and confirm recall appears without manually restating the preference.

Reads/writes:

- Reads issue/run context and agent/company IDs.
- Writes memory to Hindsight backend.
- Risk: cross-company or cross-agent memory bleed if bank scope is wrong.

Decision: accepted for first isolated test.

### Paperclip MCP Server

Install/use:

```sh
npx -y @paperclipai/mcp-server
```

Environment:

```sh
PAPERCLIP_API_URL=http://localhost:3100
PAPERCLIP_API_KEY=<agent-or-board-api-key>
PAPERCLIP_COMPANY_ID=<test-company-id>
PAPERCLIP_AGENT_ID=<optional-agent-id>
```

Smoke test:

- From Codex/Claude/Jarvis MCP client, call read tools first: `paperclipMe`, `paperclipListIssues`, `paperclipGetIssue`.
- Then test one write in test company: create a low-risk issue/comment.

Reads/writes:

- Reads Paperclip REST API through bearer auth.
- Writes issues, comments, documents, approvals depending on key permissions and tool used.
- Risk: overly privileged API key gives external MCP client broad write access.

Decision: accepted.

### Telegram Plugin

Candidate:

```sh
pnpm paperclipai plugin install paperclip-plugin-telegram
```

Precondition:

- Inspect upstream README/issues before install.
- Verify whether the current Paperclip build accepts plugin secret references. Search result for the plugin warns that post-2026-05-09 master builds may reject plugin configs containing secret-ref UUIDs until a company-scoped plugin config follow-up lands.

Configure:

- Create Telegram bot via BotFather.
- Store bot token in Paperclip secrets.
- Restrict allowed chat IDs.
- Start with notifications only; enable approvals/commands after smoke test.

Smoke test:

- Send notification for a test issue.
- Route one reply to a test issue comment.
- Test approve/reject button only on a non-destructive approval.

Reads/writes:

- Reads issues, approvals, activity, possibly comments.
- Writes comments, approval decisions, command-triggered actions.
- Risk: Telegram account/chat compromise becomes operational control path.

Decision: do not install until secret-ref compatibility is confirmed.

### Local LLM Wiki As Knowledge Base Bridge

Candidate already in repo:

```sh
pnpm --filter @paperclipai/plugin-llm-wiki build
pnpm paperclipai plugin install C:\Personal\Projekty\Aplikacje\Paperclip\packages\plugins\plugin-llm-wiki --local
```

Use before Obsidian if the goal is Paperclip-native markdown knowledge:

- Local folder-backed wiki.
- Managed Wiki Maintainer agent/project/routines.
- Paperclip issue/comment/document distillation.

Risk:

- Alpha/local package, not public stable install.
- Needs folder containment and event-ingestion settings reviewed.

Decision: promising internal candidate for LuckySparrow knowledge layer.

## Plugins To Evaluate From Source

### Obsidian Paperclip

Candidate: `https://github.com/istib/obsidian-paperclip`

Status:

- Found as community GitHub/Reddit reference.
- No `obsidian-paperclip` npm package found.
- Likely an Obsidian-side plugin, not a Paperclip runtime plugin.

Evaluation path:

- Clone to a separate review folder.
- Inspect manifest, dependencies, API token handling, and permissions.
- Use a test Obsidian vault and test company.
- Prefer a scoped API key with only required access if available.

Decision: beta/risky until source is reviewed.

### GitHub Issues Sync

Candidate: `https://github.com/mvanhorn/paperclip-plugin-github-issues`

Status:

- GitHub repo exists and documents bidirectional issue sync, comments, webhooks, and agent tools.
- `paperclip-plugin-github-issues` was not found in npm registry during audit.
- README says it was built ahead of plugin runtime landing and needs live validation.

Evaluation path:

- Clone source.
- Build locally.
- Install from local absolute path only into test instance/company.
- Use a test GitHub repo and fine-grained token limited to issues.

Risk:

- Bidirectional sync can create loops, status drift, comment duplication, and accidental public leakage.

Decision: beta/risky.

## Deferred Plugin Notes

### Aperture / Focus

Candidate: `@tomismeta/paperclip-aperture` `0.4.4`

Use case:

- Attention/prioritization layer over live company operations.

Why defer:

- It should consume reliable signals after memory, Telegram, and MCP are already stable.
- It can influence operator attention and approval urgency, so bad ranking can create operational blind spots.

Decision: defer to phase 3.

### Company Wizard / Companies Catalog

Candidates:

- `@yesterday-ai/paperclip-plugin-company-wizard` `0.1.16`
- `paperclip-agent-companies-plugin` `0.9.0`
- `companies.sh` `2026.325.2`
- `paperclip-plugin-compass` `1.1.7`

Use case:

- Source of role/workflow/templates for LuckySparrow.

Policy:

- Use as inspiration and import preview only.
- Never blindly import a company into production.
- Normalize roles, skills, routines, and budgets to LuckySparrow governance before enabling heartbeats.

## Custom Plugin Plan: `luckysparrow-companycore-bridge`

Purpose:

Provide a controlled bridge between Paperclip and LuckySparrow's external operating systems without weakening Paperclip's company-scoped governance.

Initial category:

- `connector`
- `automation`
- optional `ui`

Recommended architecture:

- Paperclip plugin runtime package, installed globally.
- Company-scoped settings for each integration.
- Secret refs for external tokens.
- Managed project: `LuckySparrow Ops Bridge`.
- Managed agent: `CompanyCore Bridge Operator`.
- Managed routines disabled by default until reviewed.
- Plugin database namespace for mappings and sync cursors.

External systems:

- CompanyCore API: canonical procedures, pipelines, goals, task structures.
- Google Drive/Docs/Sheets: document layer and spreadsheet-backed registers.
- ClickUp: optional task mirror, not source of truth initially.
- GitHub: development work and PR/issue references.
- Obsidian or markdown repo: knowledge base and operating handbook.

Phase 1 MVP:

- Read CompanyCore procedures/pipelines/goals.
- Create/update Paperclip documents and issues in a test company.
- Store mapping rows in plugin DB namespace.
- Generate operation issues for each sync run.
- No destructive writes to CompanyCore, Google Drive, ClickUp, or GitHub.

Phase 2:

- Google Drive export/import with explicit approval gates.
- GitHub issue/PR reference linking.
- Obsidian/markdown writeback through local folder or repo PRs.

Phase 3:

- ClickUp optional mirror.
- Bidirectional sync only for explicitly linked tasks.
- Human approval required for external destructive updates.

Required capabilities:

- `companies.read`
- `projects.read`
- `projects.managed`
- `issues.read`
- `issues.create`
- `issues.update`
- `issue.comments.create`
- `issue.documents.write`
- `activity.log.write`
- `plugin.state.read`
- `plugin.state.write`
- `database.namespace.migrate`
- `database.namespace.read`
- `database.namespace.write`
- `http.outbound`
- `secrets.read-ref`
- `jobs.schedule`
- `routines.managed`
- `agents.managed`
- `ui.page.register`
- `instance.settings.register`

Security model:

- No tokens in repo.
- Token values only in Paperclip secrets/provider vaults.
- Per-company enable/disable.
- Read-only first.
- Dry-run preview before writes.
- All bridge writes create activity log entries and operation issues.
- External writes require approvals until proven safe.

Data policy:

- Reads: CompanyCore metadata, selected Google docs/sheets, selected ClickUp tasks, selected GitHub issues/PRs, selected markdown vault paths.
- Writes phase 1: Paperclip issues/documents/comments/plugin namespace only.
- Writes later: external writes only after explicit settings and approvals.

## Recommended Rollout Order

1. Create `LuckySparrow Lab` test company and backup current DB.
2. Configure MCP server with a narrowly scoped test agent key.
3. Install and test Hindsight Memory in the lab company.
4. Test Paperclip-native LLM Wiki or Obsidian source integration with non-sensitive notes.
5. Test Telegram notifications only.
6. Add Telegram approval buttons and commands after auth/secret behavior is confirmed.
7. Evaluate GitHub Issues Sync against a disposable repo.
8. Evaluate Aperture / Focus after operational signal quality is high.
9. Evaluate Company Wizard / Companies catalog for templates only.
10. Build `luckysparrow-companycore-bridge` MVP as read-only/dry-run first.

## Backup And Rollback Plan

Before each plugin:

```sh
pnpm paperclipai db:backup
pnpm paperclipai plugin list --json
```

Rollback:

```sh
pnpm paperclipai plugin disable <plugin-key>
pnpm paperclipai plugin inspect <plugin-key>
```

Only purge after confirming data is no longer needed:

```sh
pnpm paperclipai plugin uninstall <plugin-key> --force
```

Also back up:

- instance config
- local storage files
- plugin data directory
- secrets master key
- any local wiki/Obsidian/markdown folders

## Main Risks

- Trusted plugin code can execute within the local self-hosted trust boundary.
- Same-origin plugin UI is not a hard browser security boundary.
- Secrets can leak through bad plugin config, logs, or external command routing.
- Memory integrations can leak context across companies/agents if bank scope is wrong.
- Telegram creates an external command/approval channel; chat membership must be tightly controlled.
- Bidirectional sync integrations can loop, duplicate, or overwrite statuses.
- External docs/task systems may become accidental second source of truth.
- Plugin runtime is alpha/local-first and not yet cloud marketplace-grade.

## Final Recommendation

Proceed, but treat this as a staged Company OS hardening project rather than a plugin shopping spree.

The best first production-shaped stack for LuckySparrow is:

1. Paperclip core with strict company isolation and backups.
2. MCP server for agent tooling.
3. Hindsight Memory with company+agent scoped banks.
4. Paperclip-native wiki/local markdown knowledge layer.
5. Telegram notifications, then approvals after secret handling is verified.
6. Custom `luckysparrow-companycore-bridge` as the controlled integration spine.

