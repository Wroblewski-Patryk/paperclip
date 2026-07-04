# Paperclip App Feature Backlog

Last updated: 2026-05-31

## Purpose

Track useful features that exist in the local `Paperclip` application code and
can be selectively backported or adapted into `Paperclip_Softwarehouse`.

Do not merge the whole app fork. Treat each item as a scoped feature with
database, shared schema, server, UI, tests, and operating-policy review.

## Best Candidates

### 1. CompanyCore Knowledge And Tools Bridge

Source in local `Paperclip`:

- `server/src/routes/companycore-bridge.ts`
- `server/src/services/companycore-bridge.ts`
- `packages/shared/src/validators/companycore.ts`
- `packages/db/src/schema/company_core_settings.ts`
- `packages/db/src/schema/agent_company_core_tools.ts`
- `packages/db/src/migrations/0085_company_core_settings.sql`
- `ui/src/api/companycore.ts`
- `ui/src/pages/Knowledge.tsx`
- `ui/src/pages/Tools.tsx`

Why it helps Softwarehouse:

- Gives agents a first-class Knowledge page rather than asking them to infer
  project truth from scattered docs.
- Provides a Tools page for MCP/tool capabilities, risk levels, approvals, and
  agent assignments.
- Adds agent endpoints `/agents/me/knowledge` and `/agents/me/tools`, which
  align well with Softwarehouse's role-scoped context model.
- Fits the current command catalog and runtime ledger direction.
- Serves the longer V2 direction where the local `Paperclip_Softwarehouse`
  operating loop can be moved into `paperclip_luckysparrow` on the VPS and
  communicate with Roost/CompanyCore as part of the live LuckySparrow operating
  system.

Backport risk:

- Medium-high. It touches database schema, shared validators, routes, UI, and
  navigation.
- Needs a Softwarehouse decision on whether CompanyCore means the external
  Roost/CompanyCore system, local wiki/architecture graph data, or both.
- The external Roost/CompanyCore connector must remain deferred until Soar is
  fully deployed/release-ready and Roost itself works without Paperclip.

Recommended implementation slices:

1. Schema and API read-only settings/health endpoints.
2. Read-only Knowledge map backed by Softwarehouse local graph/wiki data.
3. Tools catalog backed by `docs/automation/agent-command-catalog.csv`.
4. Agent-scoped `/agents/me/knowledge` and `/agents/me/tools` context.
5. Optional external CompanyCore connector after local read-only behavior works.
6. VPS migration design for `Paperclip_Softwarehouse` only after Soar and
   standalone Roost readiness gates are complete.

### 2. Hindsight Memory Plugin

Source in local `Paperclip`:

- `packages/plugins/plugin-hindsight-memory/`

Why it helps Softwarehouse:

- Gives agents a plugin-backed memory bank for lessons, repeated failures, and
  retrospective findings.
- Complements `.agents/state/responsibility-learning.md` and the
  Softwarehouse learning loop.
- Could reduce repeated regressions if tied to issue closeout and control tick
  summaries.

Backport risk:

- Medium. It is plugin-scoped, but still needs manifest/build integration and
  a policy for what becomes memory.

Recommended implementation slices:

1. Build/import plugin package into Softwarehouse workspace.
2. Register it disabled by default.
3. Add a memory write policy: only evidence-backed lessons, no secrets, no raw
   private logs.
4. Feed outputs from `softwarehouse:learning-loop` and retrospectives.

### 3. Knowledge And Tools UX Surfaces

Source in local `Paperclip`:

- `ui/src/pages/Knowledge.tsx`
- `ui/src/pages/Tools.tsx`

Why it helps Softwarehouse:

- Gives Portfolio/PM/Docs/CTO a dashboard-like way to inspect what agents know
  and what they are allowed to use.
- Converts hidden operating rules into visible UI.

Backport risk:

- Medium. These pages currently assume CompanyCore API types and routes.

Recommended implementation slices:

1. Create Softwarehouse-native read-only pages using existing local files:
   architecture graph, command catalog, runtime ledger, service topology.
2. Later swap or augment data sources with CompanyCore bridge endpoints.

### 4. CompanyCore Settings

Source in local `Paperclip`:

- settings validators and server settings endpoints in the CompanyCore bridge.

Why it helps Softwarehouse:

- Gives a safe place to configure external CompanyCore base URL, workspace id,
  knowledge/tool profile ids, and capability modes.
- Helps avoid scattering connector facts across local env files.

Backport risk:

- Medium. It stores API keys unless adapted to use Paperclip secret refs.

Recommended implementation slices:

1. Store non-secret metadata first: base URL, workspace id/name, enabled flags,
   command mode.
2. Store secret aliases or secret ids instead of raw API keys.
3. Add redacted health checks before enabling agent use.

## Lower Priority Candidates

### Application-Level Knowledge Screenshots And UX Evidence

The local `Paperclip` repo has many temporary screenshots of the Knowledge and
Tools surfaces. They are useful as visual reference only. Do not copy temporary
PNG artifacts into Softwarehouse source unless a task explicitly needs design
evidence.

### CompanyCore Database Tables As-Is

The schema is useful, but Softwarehouse should not copy it blindly. The first
Softwarehouse version should favor read-only local graph/wiki/catalog data and
add external CompanyCore persistence only after the data ownership model is
clear.

## First Recommended Build

Build a Softwarehouse-native `Knowledge`/`Tools` cockpit:

- Knowledge page reads:
  - `docs/graphs/architecture-awareness.json`
  - `docs/status/*architecture*`
  - `softwarehouse/*`
  - `softwarehouse/portfolio/APPLICATIONS_INDEX.md`
- Tools page reads:
  - `docs/automation/agent-command-catalog.csv`
  - `docs/automation/tooling-contract.md`
  - `docs/operations/runtime-config-ledger.csv`
- No external secrets.
- No provider writes.
- No database migration in the first slice.

This gives most of the operator/agent value with the lowest risk. After that,
wire in CompanyCore bridge storage and external connector settings.
