# LuckySparrow Software House

This Paperclip instance is a local software-house control plane for projects in:

`C:/Personal/Projekty/Aplikacje`

It is intentionally separate from the main Paperclip project/company instance.
Its job is narrower:

- take over existing application projects,
- create project boards and roadmap epics,
- assign work to role-specialized agents,
- keep project docs, evidence, and root indexes current,
- prevent repeated regressions through explicit QA and release gates.

## Local Runtime

- UI/API: `http://127.0.0.1:3200`
- Mode: local trusted loopback only
- Database: embedded PostgreSQL on port `54339`
- Storage/logs/backups: `.paperclip/runtime/`
- Heartbeat scheduler: active after local Codex runtime auth is configured
- Local ignored config: `.paperclip/config.json` and `.paperclip/.env`
- Tracked examples: `softwarehouse/local-config.example.json` and `softwarehouse/local-env.example`

## Operating Model

1. Portfolio Director reads `softwarehouse/portfolio/APPLICATIONS_INDEX.md`.
2. The 11 Innovations Director owns incubation for application projects inside
   LuckySparrow's `11 Innovations` department.
3. Each active or prepared application gets one Project Manager under
   11 Innovations Director.
4. Takeover epics start in backlog until the project manager takes ownership.
5. Project Manager owns one application project/version at a time after adapter readiness is proven.
6. Product and UX are embedded incubation roles here: they shape app value,
   acceptance, and workflow evidence before a future handoff into
   LuckySparrow's `02 Product/Service`; they are not the full business
   department yet.
7. Architecture, Delivery, Frontend, Backend, Data, Integration, AI Runtime, QA, Test Automation, Security, Ops, Docs, and UX agents create narrow child tasks.
8. No task is done until evidence exists in the project and the root index can be refreshed.
9. Runtime truth beats documentation. If a claim has no proof, mark it as unknown.

## Roadmap: V1 Local To VPS Paperclip

The local Paperclip softwarehouse is in V1. Its job now is to finish Soar and
Roost as active application lanes with indexed flow truth, local verification,
source-control closure, and gated deploy evidence.

Roadmap:

- V1: Paperclip runs locally and develops Soar and Roost through every layer.
- V2.1: a fully working Roost is connected back to Paperclip through the
  accepted Roost/CompanyCore API/MCP/data boundary.
- V2.2: Paperclip moves to a dedicated VPS for server-side app creation; app
  pushes flow through Coolify to production deployments.
- V3: additional projects join the same autonomous operating loop while Soar
  and Roost continue toward their next versions.

Protected production actions remain gated at every version: push, deploy,
restart, secrets, paid/live accounts, and irreversible mutation require an
explicit release/security path. Those gates must not block safe local work:
agents should keep known-state, repair, verification, docs, and source-control
closure moving for Soar and Roost.

Source files:

- Agent roster: `softwarehouse/agent-roster.json`
- Hierarchy and handoffs: `softwarehouse/agent-hierarchy.md`
- Pipeline model: `softwarehouse/pipeline-model.md`
- Autonomous operating model: `softwarehouse/autonomous-operating-model.md`
- Operating processes: `softwarehouse/operating-processes.md`
- Talent and capability system: `softwarehouse/talent-and-capability-system.md`
- Operational audit: `softwarehouse/softwarehouse-operational-audit.md`
- Coolify resource model: `softwarehouse/coolify-resource-model.md`
- Role coverage audit: `softwarehouse/role-coverage-audit.md`
- Paperclip unification plan: `softwarehouse/paperclip-unification-plan.md`
- Paperclip app feature backlog: `softwarehouse/paperclip-app-feature-backlog.md`
- Command safety catalog: `docs/automation/agent-command-catalog.csv`
- Runtime config ledger: `docs/operations/runtime-config-ledger.csv`
- Coolify/VPS deployment contract: `docs/operations/coolify-vps-deployment-contract.md`
- Coordination memory: `.agents/state/*.md` and `.agents/workflows/softwarehouse-coordination.md`
- Shared instruction modules: `softwarehouse/instructions/shared/*.md`
- Role instructions: `softwarehouse/instructions/roles/*.md`

The guiding rule is minimum responsibility per agent. Leads coordinate and review; specialist agents implement or verify only inside their layer.
The pipeline rule is broad context, narrow owned execution, then broad integration with evidence and aligned issue disposition.
The autonomy rule is active work until every relevant perspective is verified, delegated, blocked, deferred, or covered by monitoring routines.
The learning rule is evidence-backed improvement: repeated failure becomes a
capability gap, then a small role/process proposal, approval gate, measured
trial, and memory update.
Project managers enforce that rule at the application level: a stalled open
queue must be woken, split, reassigned, deferred, blocked with an unblock
condition, or escalated.
The tooling rule is catalog-first: if a script, provider action, or automation
is not classified in `docs/automation/agent-command-catalog.csv`, agents treat
it as risky until the responsible lead classifies it.
The runtime rule is ledger-first: local config, auth, secret aliases, project
workspace paths, and VPS/Coolify facts belong in
`docs/operations/runtime-config-ledger.csv` or a per-project deployment
contract before agents depend on them.

## Startup

```powershell
.\scripts\start-luckysparrow-softwarehouse.ps1
.\scripts\status-luckysparrow-softwarehouse.ps1
.\scripts\stop-luckysparrow-softwarehouse.ps1
```

## Bootstrap

After the server is running:

```powershell
node .\scripts\bootstrap-luckysparrow-softwarehouse.mjs
node .\scripts\configure-soar-pilot.mjs
node .\scripts\sync-luckysparrow-agent-instructions.mjs
node .\scripts\configure-soar-control-center.mjs
node .\scripts\configure-softwarehouse-processes.mjs
node .\scripts\configure-softwarehouse-local-codex-auth.mjs
node .\scripts\configure-soar-secret-placeholders.mjs
node .\scripts\repair-softwarehouse-codex-auth.mjs
node .\scripts\doctor-luckysparrow-softwarehouse.mjs
node .\scripts\audit-luckysparrow-softwarehouse.mjs
```

The bootstrap script creates the LuckySparrow Software House company, core agents,
portfolio projects, and takeover audit epics.
The Soar pilot script removes non-pilot project boards and keeps only `Soar`
plus the internal `Softwarehouse Operating System` board.
The instruction sync script pushes a managed multi-file bundle into each agent:
`AGENTS.md` as the entry index, shared modules under `shared/`, one role file
under `roles/`, and `metadata.md`.
The control-center script adds Soar goals, labels, role lanes, paused routines,
workspace policy, issue documents, and evidence work products.
The softwarehouse process script adds company-level operating routines for
daily control, stale board hygiene, agent/model health, intake/index sync,
release governance, and retrospective/template improvement.
The local Codex auth script removes `OPENAI_API_KEY` bindings from Codex agents
so Paperclip uses the local Codex login flow. Paperclip seeds each managed
agent `CODEX_HOME` from the shared local Codex home (`CODEX_HOME` env var or
`~/.codex`). On Windows, local Codex adapter probes use the managed `CODEX_HOME`
flow rather than a Unix shell wrapper.
The secret placeholder script creates encrypted secret slots for Soar live
testing and Coolify/VPS access, then binds them only to the agents that should
use them.
It also maps the Soar release-smoke contract to agent env names:
`SMOKE_AUTH_TOKEN`, `SMOKE_AUTH_EMAIL`, `SMOKE_AUTH_PASSWORD`, and optional
`SMOKE_OPS_*` entries are secret refs backed by the protected production audit
credentials, so Ops/QA/Security can prove `/workers/ready` without printing
values.
After local Codex auth exists, the auth repair script smoke-tests a Codex
agent, clears stale agent `error` states, and closes the runtime-auth blocker
only if the smoke test passes.
The doctor script checks API health, active projects, agent adapter probes,
live runs, and whether active routines match the expected operating model.
The audit script checks operating maturity: project-manager coverage, routine
triggers, stale agent error states, open issue ownership, and live-run counts.

If a bootstrap run ever starts work before the adapter is ready, reset the seed state:

```powershell
node .\scripts\reset-luckysparrow-softwarehouse-seed.mjs
```
