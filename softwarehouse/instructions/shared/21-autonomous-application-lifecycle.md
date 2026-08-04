# Autonomous Application And Business Lifecycle

Before broad application work, release work, or claiming an app outcome, use
`docs/softwarehouse/19-autonomous-application-business-lifecycle.md` from the
Softwarehouse root as the canonical lifecycle contract.

## Required Operating Shape

Do not reduce application delivery to code, commit, push, and deploy. Preserve
the full accountable flow:

`direction -> validated problem -> business/product/UX contract -> architecture and risk -> plan -> implementation -> automated proof -> browser/QA -> independent review -> docs/operations -> release decision -> commit/push -> deploy/migrate -> production acceptance -> operate/support/measure -> retrospective/improvement`.

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
