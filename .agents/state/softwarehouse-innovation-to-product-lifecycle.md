# Softwarehouse Innovation To Product Lifecycle

Last updated: 2026-07-22

Purpose: define how LuckySparrow applications move from innovation work into
product/service ownership once they become usable and sellable.

## Principle

Department `11 Innovation` is an incubator, not a permanent home for every app.

An application starts in `11 Innovation` while the company is discovering,
validating, building, and proving the concept. Internal users, test users,
registration, or a deployed URL do not end incubation. When the application is
usable, supportable, deployable, and safe enough that the owner can responsibly
sell access, it should move to department `02 Product` for product/service
operation, refinement, and saleable access.

## Lifecycle

| Phase | Department | Meaning |
| --- | --- | --- |
| Idea / capability discovery | `11 Innovation` | Explore whether the app should exist and what it should become. |
| Architecture and MVP proof | `11 Innovation` | Validate architecture, core flows, deployment path, and evidence. |
| Usable product candidate | `11 Innovation` -> `02 Product` transition gate | Confirm the app can be used reliably and explained clearly. |
| Product/service refinement | `02 Product` | Shape packaging, UX, plans, entitlement, onboarding, and roadmap. |
| Market and sales motion | `03 Sales` with `02 Product` | Create offer, pricing, messaging, lead paths, and conversion evidence. |
| Delivery and operations | `04 Operations` with `09 Technology` | Keep delivery, deployments, monitoring, and production quality healthy. |
| Customer success | `05 Customer Success` | Support users, collect feedback, handle incidents, and feed improvements. |

## Transition Gate

Before a project is renamed or moved from `11 Innovation` to `02 Product`,
the accountable product/innovation owner should produce a transition packet:

- current product name and repo;
- owner and proposed new department;
- architecture source of truth;
- core user outcomes proven;
- local and production readiness evidence;
- supportability and monitoring evidence;
- known risks and blockers;
- pricing/access/entitlement assumptions if commercial;
- documentation/onboarding state;
- versioned sale-readiness scope and evidence for every required journey;
- security, data-isolation, permissions, backup/recovery, rollback, monitoring,
  incident-response, and supportability evidence appropriate to the product;
- explicit non-blocking deferrals and known limitations;
- owner decision requested: move now, keep incubating, or stop/park.

`100%` means complete against the explicit, versioned transition scope. It does
not mean that software can never contain another defect. Hidden unknowns,
unverified required journeys, or blocking risks keep the product in innovation.

## Naming Rule

During incubation:

- `11 Innovation: Soar`
- `11 Innovation: Roost`

After accepted product transition:

- `02 Product: Soar`
- `02 Product: Roost`

Do not rename a project to `02 Product` only because it has code or a deployed
URL. The product/service department means it is being shaped as something that
can be used, maintained, and sold or granted access to.

## Current State

- Soar: active in `11 Innovation`; first Stage 1 lane.
- Roost: active in `11 Innovation`; second Stage 1 lane and future company OS.
- Both may have internal/test users while incubating. Neither becomes a
  commercial product merely because registration or VPS deployment works.
- Featherly, Aviary, Nest: parked future portfolio lanes until VPS plus owner
  activation.

## Do Not

- Do not keep a validated product forever in innovation just because work
  continues.
- Do not move an unproven app to product/service just because it has a name or
  deployed shell.
- Do not create Paperclip work for parked apps before VPS and owner activation.
- Do not commercialize an app without product, operations, customer-success,
  finance, legal/security, and owner evidence appropriate to the risk.
