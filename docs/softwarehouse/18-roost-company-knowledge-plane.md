# Roost Company Knowledge Plane

Status: approved architectural direction
Date: 2026-07-22
Owner: Board / 00 AIA / 04 COO / 11 CINO

## Purpose

LuckySparrow Software House uses Paperclip and Roost as complementary systems.
Paperclip is the governed control plane for autonomous agent work. Roost is the
company knowledge and management plane used by humans and Paperclip agents
through scoped API and MCP interfaces.

This contract records the intended V0-to-V1 boundary. It does not authorize
unscoped production writes, direct database access, secret disclosure, or the
activation of currently parked business departments.

## System Boundaries

| System | Canonical responsibility |
| --- | --- |
| Paperclip | Agents, reporting hierarchy, execution assignments, issues, runs, routines, budgets, approvals, evidence gates, and board intervention. |
| Roost / CompanyCore | Company structure, departments, offerings, business goals, processes, procedures, pipelines, tasks/records, clients, resources, knowledge, KPIs, decisions, and integration state. |
| Product repositories | Product intent, architecture, code, tests, deployment contracts, operational proof, and actual product behavior. |
| ClickUp and Google Drive | Human-facing provider surfaces synchronized through Roost under explicit field ownership and conflict rules. |
| Human owner / board | Direction, risk boundaries, commercial activation, autonomy promotion, and governed exceptions. |

Paperclip must not become a duplicate CRM, document suite, business-plan
system, or provider-integration hub. Roost must not become a duplicate agent
orchestration engine, task checkout authority, budget governor, or heartbeat
runtime.

## Knowledge Layers

Company truth is deliberately split into three layers:

1. **Paperclip operating truth**: what agents are assigned, allowed, spending,
   running, blocked by, and required to prove.
2. **Roost company truth**: consolidated company structure, knowledge,
   management records, provider-backed information, decisions, and processes.
3. **Product truth**: project-native documentation and evidence inside Soar,
   Roost, and later product/service repositories.

Roost may index and relate product sources, but it must not silently replace
their architecture or runtime truth. Paperclip may project company context into
agent work, but it must not silently fork Roost records.

When sources disagree, an agent must identify the conflict, inspect current
evidence, determine the factual state, update the accountable source, and mark
the older statement stale or superseded. Last-write-wins is not an acceptable
truth policy for semantic conflicts.

## Truth Lifecycle

Durable company knowledge follows this path:

```text
observation -> evidence -> claim -> verification -> current truth
  -> freshness review -> confirmed, contradicted, or superseded
```

Important facts should carry:

- stable identity and scope;
- source and evidence references;
- observed and verified timestamps;
- accountable owner;
- confidence and freshness boundary;
- lifecycle status;
- supersession link when replaced;
- unresolved uncertainty or conflict.

Agents may automatically refresh mechanical facts such as commit IDs, test
results, provider revision IDs, health states, and timestamps when the source
is verified. Architecture, commercial readiness, policy, responsibility,
client commitments, and other semantic facts require accountable promotion.

## Organization Model

The target organization uses distinct concepts:

| Concept | Meaning |
| --- | --- |
| Department | Durable company function with an aligned goal, accountable owner, responsibilities, people/agents, work, processes, and metrics. |
| Team | Durable specialist group inside a department. |
| Squad | Temporary cross-department delivery group for an initiative or outcome. |
| Role | Responsibility and authority independent of the current holder. |
| Member | Human or AI agent holding a role and participating in departments, teams, or squads. |
| Initiative | Time-bounded project or program that advances a goal. |

Departments remain aligned to one company mission and communicate through
explicit handoffs, shared processes, dependencies, approvals, and evidence.
Teams do not become isolated companies, and cross-functional product squads do
not duplicate permanent departments.

## Offering And Lifecycle Model

Roost should model a durable `Offering` that can be a product, service, or
hybrid. A Paperclip project is an execution initiative, not the permanent
identity of an offering.

An offering may have:

- type, owner, department, lifecycle stage, and commercial status;
- target users and intended outcomes;
- repositories, environments, resources, and knowledge roots;
- goals, initiatives, pipelines, procedures, risks, metrics, and evidence;
- dependencies on other LuckySparrow offerings or external providers.

Soar and Roost remain durable products while their lifecycle and accountable
department change. During incubation they belong to `11 Innovation` and may
have internal/test users. They move to `02 Product` only when the owner accepts
that access can be sold responsibly.

Commercial transition is not triggered by registration, deployment, or the
absence of known bugs alone. It requires a versioned sale-readiness contract
whose in-scope requirements have current evidence or explicitly accepted,
non-blocking deferrals. The gate includes product journeys, security, data
isolation, permissions, deployment, monitoring, backup/recovery, rollback,
supportability, documentation, onboarding, known limitations, and applicable
commercial/legal/finance readiness.

## Repeatable Innovation-To-Product Flow

The intended reusable flow is:

```text
direction -> discovery -> incubation -> architecture -> implementation
  -> verification -> production readiness -> sale-readiness decision
  -> product operation -> feedback -> improvement -> next release
```

The same company engines should later support services and hybrid offerings.
Type-specific delivery steps may differ, but discovery, agreement, planning,
execution, acceptance, evidence, feedback, and improvement remain shared.

## Work Object Boundary

ClickUp tasks, Roost tasks, and Paperclip issues serve related but different
purposes:

| Object | Responsibility |
| --- | --- |
| ClickUp task | Human-facing provider representation synchronized with Roost. |
| Roost task/work item | Canonical normalized company work record, business relationship context, provider identity, and accepted outcome state. |
| Paperclip issue | Executable unit assigned to one AI agent or board owner, with checkout, run, blocker, approval, and evidence semantics. |

A Roost work item may require one or many Paperclip issues. Paperclip issues
must carry a stable Roost/external reference when they originate from company
work. Their intermediate execution status must not blindly overwrite the Roost
or ClickUp outcome state. The accountable parent or integration policy should
aggregate child evidence and publish an accepted progress/result transition to
Roost, after which the provider adapter may synchronize the allowed fields to
ClickUp.

Paperclip may also create internal execution, recovery, review, security, or
evidence issues that never become ClickUp tasks. Roost and ClickUp should not be
filled with every technical subtask or heartbeat artifact unless the governing
mapping explicitly promotes it.

## Provider Synchronization

Roost is the consolidation and management boundary for ClickUp and Google
Drive. Bidirectional synchronization requires an explicit authority matrix per
object and field; central consolidation does not imply that Roost blindly wins
every concurrent edit.

Every synchronized record should retain provider ID, workspace/account scope,
provider revision or change token, normalized Roost ID, last successful sync,
source of the last accepted change, idempotency metadata, and conflict state.
Webhook/event delivery should be complemented by bounded reconciliation so a
missed event does not create permanent drift.

Required safeguards:

- loop prevention for Roost -> provider -> Roost echoes;
- optimistic version checks and idempotent commands;
- explicit conflict queue instead of silent overwrite;
- tombstone/archive semantics for deletion;
- retry and dead-letter visibility;
- auditable source attribution;
- scoped provider credentials and workspace isolation;
- repair and resynchronization procedures.

Google Docs -> Markdown and Google Sheets -> CSV are normalized agent-readable
projections, not inherently lossless replacements. Roost must retain the native
provider identity and revision. Write-back is allowed only for a documented
supported subset; rich formatting, comments, suggestions, formulas, multiple
sheets, validation, and other provider-native features must not be silently
destroyed.

## Local V0 Knowledge And Graph Projections

The V0 repository layout remains layered instead of adding a competing
`company/` warehouse:

- `docs/softwarehouse/` holds stable company standards and architecture;
- `.agents/state/` holds current operating memory, decisions, missions, and
  dated observations;
- product-repository `docs/` folders hold product truth;
- Paperclip issues and work products hold issue-specific execution and proof;
- Roost becomes the central company source as its governed interfaces mature.

Use formats by purpose:

- Markdown for human/agent-readable meaning, policies, and source indexes;
- CSV for registries, matrices, node/edge tables, and generated status views;
- Mermaid as a generated/readable visualization, not the sole source of truth;
- Turtle/RDF later when a portable semantic company graph is justified;
- BPMN later for processes requiring formal interchange or execution semantics;
- GraphML as an optional generated interchange format for graph tools.

Canonical IDs and relations must remain stable across projections. Generated
Mermaid, GraphML, reports, and snapshots must identify their source registry
and generation time; they do not become independent truth stores.

## Agent Context Contract

Agents receive the smallest sufficient context packet:

1. company mission, role, authority, and safety gates;
2. relevant department/team responsibilities and procedures;
3. offering and initiative context, including lifecycle and source roots;
4. current issue, parent intent, blockers, acceptance, and required evidence;
5. deeper history and archives only on demand.

`AGENTS.md` and managed instruction bundles are entry points and reading maps,
not copies of all company knowledge. Context should be selected by company,
role, department, offering, project, task, risk, and freshness. Large provider
exports and historical run artifacts are not default prompt context.

## Progressive Autonomy

Autonomy advances through evidence-backed levels:

| Level | Default capability |
| --- | --- |
| L0 Observe | Read and report only. |
| L1 Draft | Prepare proposals, documents, messages, or commands without executing them. |
| L2 Approve each | Execute only after a human approves the individual action. |
| L3 Bounded autonomy | Execute an approved action class inside explicit scope, limits, and monitoring. |
| L4 Exception supervision | Operate autonomously while the human reviews exceptions, outcomes, and periodic reports. |

Agents may propose promotion and attach eval evidence. They may not grant
themselves new authority. Promotion considers corrections, failures,
incidents, policy adherence, regression evals, reversals, cost, and outcome
quality, not only the number of successful repetitions.

External communication, offers, legal/financial commitments, production and
provider mutations, secret use, destructive actions, and autonomy changes stay
fail-closed until their policy explicitly permits the action class.

## Paperclip-To-Roost Integration

The approved direction is:

```text
Paperclip agent runtime
  -> governed Roost connector / MCP bridge
  -> Roost HTTPS API on VPS
  -> workspace-scoped validation, permissions, approvals, events, and audit
  -> Roost PostgreSQL
```

Agents and Paperclip plugins must never access the Roost database directly.
MCP remains a thin agent-facing projection over Roost HTTP commands.

In Paperclip terminology, Roost is primarily an integration/plugin/tool
provider, not an execution adapter such as Codex, Claude, or Pi. The eventual
Paperclip integration should manage company-to-workspace mapping, secret refs,
capability profiles, MCP lifecycle, manifest/health visibility, and audit
provenance without copying the whole Roost data model into Paperclip.

### First Authorized Phase

A bounded local Paperclip -> hosted Roost read-only canary is authorized as a
V0 transition aid, provided it does not displace the Soar-first and Roost-second
completion mission.

The first canary should use one accountable agent, preferably `00 AIA` or
`04 COO`, one LuckySparrow workspace, TLS, a least-privilege read-only service
key stored as a Paperclip secret reference, and the default read-only MCP
command mode.

Acceptance evidence must cover:

- public and protected health/readiness as applicable;
- authenticated `/v1/mcp/manifest` and `tools/list`;
- one representative company/department/process/knowledge read;
- blocked write attempt;
- blocked cross-workspace access;
- Roost audit visibility;
- timeout and unavailable-Roost behavior;
- key revocation/rotation path;
- no raw secret in docs, logs, prompts, comments, or artifacts.

### Later Phases

1. Read-only packets for selected managers and product owners.
2. Draft/proposal writes such as notes, decisions, and prepared messages.
3. Approval-aware task and workflow commands.
4. Bounded autonomous command classes with eval and monitoring evidence.
5. Hosted Paperclip V1 using the same logical boundary.

No later phase is implicitly authorized by completion of the read-only canary.

## V0 And V1 Sequence

V0 keeps Paperclip on the approved local Windows host while agents finish Soar
first and Roost second. Local company files and product repositories remain
sufficient to operate if hosted Roost is unavailable. V0 should establish
stable IDs, ownership, provenance, knowledge layers, context rules, lifecycle
gates, and the bounded read-only bridge; it does not need to populate or
autonomously operate every future business department.

V1 moves Paperclip to VPS after V0 acceptance and expands the governed Roost
connection. Business-plan, CRM, sales, marketing, finance, customer-success,
and wider department operation belong to later activated scopes, but the data,
authority, synchronization, and audit foundations must support them from the
start.

## Non-Goals For Current V0

- Do not build a second Roost inside Paperclip.
- Do not move product architecture truth out of product repositories.
- Do not activate marketing, sales, customer communication, or commercial
  commitments merely because their future model is documented.
- Do not bulk-inject all company knowledge into every agent prompt.
- Do not use two-way sync without conflict, version, loop, and deletion rules.
- Do not call an offering commercially ready without an explicit scoped gate.
- Do not let integration work become a substitute for finishing Soar and Roost.
