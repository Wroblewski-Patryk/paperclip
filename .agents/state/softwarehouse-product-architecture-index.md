# Softwarehouse Product Architecture Index

Last updated: 2026-07-04

Purpose: define where Paperclip agents must look before changing Soar or
Roost, and how product architecture truth should constrain autonomous work.

## Rule

Paperclip is the control plane. Soar and Roost are separate product repos.
Before a Stage 1 agent proposes or performs product work, it must identify the
product repo, read the product architecture source of truth, and state whether
the intended work fits the approved architecture.

Agents must not silently reinterpret unclear product architecture. If the
implementation conflicts with approved architecture, the agent records the
mismatch and escalates through the parent/owner chain.

## Active Product Lanes

| Product | Local repo | Stage 1 purpose | Architecture source |
| --- | --- | --- | --- |
| Soar | `C:/Personal/Projekty/Aplikacje/Soar` | first active app lane; personal capital-growth app | `docs/architecture/README.md`, then `docs/architecture/architecture-source-of-truth.md` |
| Roost | `C:/Personal/Projekty/Aplikacje/Roost` | second active app lane; future company operating system / CompanyCore lane | `docs/architecture/README.md`, then `docs/architecture/architecture-source-of-truth.md` |

## Parked Portfolio Lanes

The long-horizon LuckySparrow portfolio is Soar, Roost, Featherly, Aviary, and
Nest.

For Stage 0 and the first Stage 1 activation, only Soar and Roost are active.
Featherly, Aviary, and Nest are explicitly parked. Do not create Paperclip
projects, issues, routines, goals, or implementation work for Featherly,
Aviary, or Nest until the applications are on VPS and the owner explicitly
activates them.

## Portfolio Dependency Pattern

Future products may depend on other LuckySparrow products plus third-party
providers. Aviary is expected to be more complex than a standalone app: it may
consume or coordinate data from Nest and Roost, and those upstream apps may
themselves depend on external providers. The same pattern can appear in other
future products.

When a downstream product misbehaves, agents must not assume the downstream app
is the root cause. They must classify the failure across the dependency chain:

- downstream app behavior and UI/API handling;
- upstream LuckySparrow product data contract, freshness, completeness, and
  permissions;
- upstream app's third-party provider connection and owner-linked integration
  state;
- transformation/mapping logic between products;
- stale, partial, duplicated, or malformed data;
- missing owner-linked credential path or missing AI smoke account path.

For active products, this means a bug report should name the affected product,
the suspected upstream/downstream products, the data contract or feature slice,
and the evidence that locates the fault. For parked products such as Aviary,
Nest, and Featherly, record the pattern only; do not create product work until
the owner activates the lane.

## Innovation To Product Lifecycle

Active app lanes currently live in `11 Innovation` because they are still being
validated. This is not the final department for a usable/sellable application.

When an app is usable, supportable, deployable, and commercially meaningful, the
responsible owner should propose a transition from `11 Innovation: AppName` to
`02 Product: AppName`. The transition should use the gate in
`.agents/state/softwarehouse-innovation-to-product-lifecycle.md`.

After transition, `02 Product` owns product/service refinement, packaging,
entitlements, onboarding, and roadmap. `03 Sales`, `04 Operations`, `05 Customer
Success`, `07 Finance`, `09 Technology`, and `10 Legal` join according to the
commercial and production risks.

## Soar Architecture Notes

Observed from current Soar docs:

- `docs/architecture/` is canonical for system boundaries, runtime flows,
  ownership, invariants, deployment topology, evidence graph, and decisions.
- Implementation must match approved architecture. Workarounds that change
  architecture require explicit approval.
- Meaningful runtime or structure changes must update architecture, module,
  planning, operations, or product docs as appropriate.
- Coolify on VPS is the primary deployment target, with local `DEV`, VPS
  `STAGE`, and VPS `PROD` environments.
- Deployed topology expects separate web/API/worker ownership where documented;
  degraded or inline deployment modes must be explicit in health/readiness and
  operator evidence.

## Roost Architecture Notes

Observed from current Roost docs:

- Roost/CompanyCore is a company operating system, not an embedded AI runtime.
  Humans and AI agents are clients through web/API/MCP boundaries.
- CompanyCore owns validation, permissions, approvals, events, audit, and
  source-of-truth state.
- Departments are management systems over shared engines, not separate apps or
  duplicate databases.
- The company flow is cyclic: intent -> market -> lead -> opportunity ->
  discovery -> offer -> delivery -> acceptance -> payment -> support ->
  feedback -> improvement -> next intent.
- Future work must use scoped task contracts, command-shaped writes,
  permission gates, audit evidence, and module confidence updates.

## Product Work Preflight

Before creating Stage 1 work or changing files, the responsible agent must
record:

- product and repo path;
- active branch and dirty/diverged git state;
- architecture docs read;
- architecture fit: fits, unclear, or conflicts;
- expected user/product outcome;
- affected department owner and parent agent;
- evidence required before completion;
- deploy impact: none, local only, staging, production observation, or
  production change;
- owner approval need if the action is high-risk.

## Architecture Mismatch Path

When code, docs, or deployment reality disagree:

1. Stop expanding implementation scope.
2. Describe the mismatch and affected source-of-truth files.
3. Propose 2 or 3 valid options with tradeoffs.
4. Report to the parent/requesting agent.
5. Parent agent escalates upward until the accountable lead or owner can
   decide.
6. After decision, update product architecture/docs and implementation together.

## Do Not

- Do not create product tasks from vague discovery without a parent/owner.
- Do not let every agent rediscover the same architecture gap.
- Do not fix architecture by changing code only.
- Do not fix code by ignoring product architecture.
- Do not push, deploy, or production-test without the closure-loop evidence
  defined in `.agents/state/softwarehouse-autonomous-delivery-architecture.md`.
