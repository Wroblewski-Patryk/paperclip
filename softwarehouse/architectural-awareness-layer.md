# Architectural Awareness Layer

The Architectural Awareness Layer is the project nervous system for LuckySparrow
Software House. It is not a task manager and not a code generator. It is the
canonical model that lets agents understand where code, tasks, docs, tests,
owners, and runtime evidence fit in the same project organism.

## Purpose

The layer must keep every active project in a known state:

- what exists;
- what is planned;
- what is implemented but unverified;
- what is verified;
- what is blocked;
- which agent owns the next step;
- which files, tests, docs, commits, and tasks prove the claim.

Agents must use this layer before broad changes, during handoff, and after
verification. A task is not complete when a comment says it is complete; it is
complete when the issue graph, architecture graph, proof, and project memory say
the same thing.

## Canonical Entities

Every indexed item is an architecture entity with:

| Field | Meaning |
| --- | --- |
| `id` | Stable local id derived from project, type, path, and name. |
| `type` | `project`, `module`, `feature`, `component`, `function`, `route`, `api_endpoint`, `model`, `migration`, `task`, `document`, `test`, or `agent`. |
| `name` | Human-readable name. |
| `path` | Repo path, URL, or Paperclip object reference. |
| `description` | Short evidence-backed description. |
| `status` | `planned`, `in_progress`, `implemented`, `tested`, `verified`, `deprecated`, or `blocked`. |
| `owner` | Responsible agent, role, or local project owner. |
| `dependencies` | Direct dependency entity ids when known. |
| `related_entities` | Non-blocking related entity ids. |
| `updated_at` | Last scan/update timestamp. |

## Canonical Relations

The graph uses these relation kinds:

- `uses`
- `depends_on`
- `implements`
- `tests`
- `documents`
- `owns`
- `extends`
- `connected_to`

Relations must be directional and evidence-backed. When evidence is weak, the
relation can exist but the status must stay below `verified`.

## Status Rules

- `planned`: named in roadmap/task/docs but no implementation evidence.
- `in_progress`: active live run or explicit continuation path exists.
- `implemented`: code exists, but proof is incomplete.
- `tested`: test file or command exists and is linked.
- `verified`: behavior is proven by fresh command/browser/deploy evidence.
- `deprecated`: intentionally superseded.
- `blocked`: owner and unblock action are known.

## Proof Of Implementation

Every feature and task must link to proof:

- affected files;
- tests and exact commands;
- docs/index entries;
- commits when available;
- runtime or browser evidence when relevant;
- Paperclip issue ids and child dependencies.

Claims must use the evidence language from the shared operating context:

- `implemented and verified`;
- `implemented but not verified`;
- `present in code, behavior unknown`;
- `missing`;
- `blocked by error`.

## Required Exports

Each active project should maintain these generated or curated artifacts:

- `docs/graphs/architecture-awareness.json`
- `docs/graphs/architecture-awareness.csv`
- `docs/graphs/architecture-proof-register.csv`
- `docs/graphs/architecture-graph.md`
- `docs/graphs/architecture-graph.mmd`
- `docs/graphs/architecture-health.json`
- `docs/status/architecture-awareness-report.md`
- `docs/status/architecture-dependency-report.md`
- `docs/status/architecture-ownership-report.md`
- `docs/status/task-synchronization-report.md`
- `docs/status/app-completion-index.json`
- `docs/status/app-completion-index.md`

These files are the portable source for Obsidian, Mermaid, CSV viewers, and
future graph visualizers.

## Agent Contract

### CTO Architect

Owns the graph contract, relation quality, architectural drift detection, and
cross-layer consistency. CTO decides whether a change is safe enough to split
into implementation lanes.

### Engineering Delivery Lead

Uses the graph to split work by layer. Every child issue must name affected
entities, dependencies, files, tests, docs, and proof expectations.

### Docs Memory Lead

Keeps generated graph exports, markdown indexes, evidence ledgers, and template
feedback synchronized. Docs Memory separates structural docs from work history.

### Specialist Agents

Before coding, specialists read the relevant graph slice. After coding, they
update or request updates to affected entities and proof links.

### Project Manager

Uses the graph to see whether the current version target is actually complete.
PM blocks vague work and asks for the smallest missing proof lane.

## Health Checks

The layer must surface:

- tasks without architecture entities;
- features without tests;
- implementation without docs;
- docs without implementation evidence;
- routes/endpoints without proof;
- duplicate or disconnected modules;
- stale blocked issues without owner/action;
- verified claims without fresh proof;
- agent ownership gaps.

## First Implementation

The first local implementation is the repo scanner:

```bash
node scripts/build-architecture-awareness-index.mjs --project Paperclip --root .
```

The scanner creates the required exports from repo files, imports, routes,
tests, docs, migrations, agents, and task/history files. It is intentionally
conservative: generated graph output is a baseline, not a substitute for CTO
review.

The scanner also emits three operational reports for agents:

- dependency report: what depends on what;
- ownership report: which role owns each slice of the organism;
- task synchronization report: which tasks lack architecture links and which
  implementations lack task/proof links.

The app-completion scanner converts architecture entities into user-facing
completion lanes:

```bash
node scripts/build-app-completion-index.mjs --project Soar --root ../Soar
```

For sellable apps, agents must treat this as the bridge between code truth and
product truth. A feature is not complete just because an API route exists. The
completion lane must state:

- what the user is trying to do;
- which screen/route/component exposes it;
- which API endpoint, model, integration, or background flow backs it;
- whether login, subscription, or configuration is required;
- whether exchange credentials such as Binance or Gate.io are involved;
- which automated tests and browser/clickthrough proof verify it;
- what screenshot or visual review evidence exists when the frontend matters;
- the next owner/action when any layer is missing, broken, confusing, or
  intentionally parked.

If backend works but the frontend is wrong, the lane is `implemented but not
verified` until browser proof or a UX/Frontend repair issue exists. If frontend
exists but the backend/config/subscription gate is missing, the lane is also not
verified. If neither side exists, create a Product/PM known-state or design lane
before implementation.

The software-house lifecycle guard checks whether every controlled project has
the required exports and whether they are fresh enough for autonomous work:

```bash
pnpm softwarehouse:architecture-lifecycle
pnpm softwarehouse:architecture-lifecycle:apply
```

Known-state lanes and control ticks must use this guard before treating a
project as understood.
