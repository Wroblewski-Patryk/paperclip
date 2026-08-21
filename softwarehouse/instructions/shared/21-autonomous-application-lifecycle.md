# Autonomous Application And Business Lifecycle

Before broad application work, release work, or claiming an app outcome, use
`docs/softwarehouse/19-autonomous-application-business-lifecycle.md` from the
Softwarehouse root as the canonical lifecycle contract.

## Required Operating Shape

Do not reduce application delivery to code, commit, push, and deploy. Preserve
the full accountable flow:

`direction -> validated problem -> business/product/UX contract -> architecture and risk -> plan -> implementation -> automated proof -> browser/QA -> independent review -> docs/operations -> release decision -> commit/push -> deploy/migrate -> production acceptance -> operate/support/measure -> retrospective/improvement`.

The expanded start of that chain is mandatory:

`owner direction -> captured intent -> assumptions classified -> approved product contract -> architecture contract -> observed-state gap -> bounded task`.

Before ProductDelivery admission, require the completed
`softwarehouse-product-intent-trace:v1` block from shared instruction 15. If it
is missing or conflicting, use the single PM reconciliation lane produced by
the autonomous cycle. Do not implement first and reconcile intent afterward.

For the current issue:

- name the lifecycle stage and accountable owner;
- state the entry fact, required output, applicable gates, and exit evidence;
- create only the smallest executable child lane needed for the next legal
  transition;
- keep product, architecture, security, test, review, documentation,
  deployment, monitoring, and learning owners independent where the risk needs
  independent judgment;
- never treat a local test, commit, push, healthy endpoint, or visual render as
  proof of all other stages;
- keep the declared personal-use, guided-pilot, self-serve, and commercial
  boundary explicit;
- after a qualifying Coolify-bound push, observe the deployment, exact SHA,
  resources, health/readiness, browser journey, errors/restarts/capacity, and
  record the outcome before closing;
- route failed production proof into one bounded recovery path and preserve
  rollback/forward-fix evidence;
- turn repeated/systemic failures into a durable prevention control and
  regression/eval signal.

## Temporary Managed Resources

Treat every non-production environment, application, database, service,
container, volume, branch, preview, sandbox, and test process as a leased
resource rather than permanent background state.

- Before creating one, search the provider and Paperclip for a compatible
  active resource. Reuse it when isolation and purpose match; never create a
  duplicate merely because a new issue or agent started.
- Record `softwarehouse-managed-resource-lifecycle:v1` with the provider,
  exact project/environment/resource identifiers, purpose, accountable owner,
  source issue, creation time, expiry/next review, dependencies, protected
  exclusions, retention reason, and teardown trigger.
- Default to the smallest local or existing environment that can produce the
  required proof. A scarce hosted QA/stage resource requires evidence that the
  local or existing route cannot satisfy the current gate.
- Completion or supersession triggers cleanup in the same delivery chain.
  A teardown plan is not teardown evidence. Closure requires provider
  readback that the exact resource and its exclusive configurations, volumes,
  networks, processes, and disposable files are gone, while every named
  production/shared exclusion still resolves.
- If a resource must be retained, record the concrete current use, owner,
  bounded expiry/next review, and cost/capacity impact. Indefinite retention,
  absent ownership, or an expired lease is a blocker and cleanup finding.
- Destructive teardown remains exact-target and approval-gated. Never widen a
  resource-scoped authorization into a project, server, shared destination,
  production environment, or broad Docker/filesystem cleanup.

Paperclip owns live execution, gates, and evidence. Roost may present the
company-facing procedure, offering, decision, dependency, and KPI projection.
Product repositories own versioned product, source, architecture, test, and
release truth. Resolve conflicts at the accountable source; do not let one
projection silently overwrite another.

## ProductDelivery Ledger

When the wake payload or run context contains `deliveryId`, the issue is part
of a persisted ProductDelivery and the delivery ledger is mandatory, not an
optional report:

- read `GET /api/deliveries/{deliveryId}` before implementation and before
  every handoff;
- advance only the next legal stage through
  `POST /api/deliveries/{deliveryId}/transition` with an idempotency key and
  inspectable evidence;
- record exact `integrationSha`, `originSha`, `deployedSha`, and
  `deploymentUrl` at their corresponding stages; never infer deployment from
  a local commit or push;
- after deployment, record production observation before updating the outcome
  through `POST /api/deliveries/{deliveryId}/outcome`;
- the delivery owner must not approve their own review or accept their own
  product outcome. Hand the delivery to a distinct reviewer or owner actor;
- reach `outcome_accepted` only after the independent outcome status is
  `accepted`. A done issue by itself is never a delivered application result;
- if a gate fails, persist the blocker or rollback evidence on the delivery and
  return to the legal corrective stage instead of starting a parallel ledger.
