# Softwarehouse Feature Slice Traceability Audit

Last updated: 2026-07-04

Purpose: capture the owner's requirement that Soar and Roost delivery must be
driven by cross-layer feature/function maps, not by isolated tasks or reports.

## Owner Requirement

Paperclip should keep working until Soar and Roost are usable on the VPS. To do
that without noise, agents need a current picture of:

- what is implemented;
- what is implemented but not proven;
- what is planned;
- which frontend, backend, data, worker, API, integration, and deployment
  surfaces each feature uses;
- which functions call or are called by the changed surface;
- which tests, browser checks, production smokes, docs, and evidence prove the
  feature;
- which parent/child issue owns the next action.

## Current Paperclip Capability

Paperclip already has the right foundation:

- active routines for liveness, portfolio truth, evidence gates,
  source-control and deploy readiness, learning, owner direction, cost,
  secrets, and agent governance;
- Stage 1 parent `LUC-25`, with children for delivery control, Soar, Roost,
  implementation, deployment, production readiness, and security;
- softwarehouse policies for architecture preflight, PDCA, duplicate
  prevention, evidence gates, source-control/deploy closure, and learning
  packets;
- scripts and status files for architecture awareness, project truth, event
  chains, and app-completion indexes.

This is enough for controlled autonomous delivery, but it is not enough to
claim the apps are complete.

## Current Soar Evidence

Observed on 2026-07-04:

- git state: `main...origin/main [ahead 25]`;
- recent commits include source-control gates, app-completion refreshes,
  known-state drift sweeps, architecture awareness refreshes, Coolify status
  access proof, production health watches, runtime smoke validation, and
  account-access proof work;
- `docs/status/app-completion-index.md` reports `3555` app-completion items,
  `8` user flows, `452` items needing browser/screenshot review, `979`
  missing test links, `1998` missing doc links, `113` implemented-needs-proof
  items, and `3542` known non-ok risk items;
- `docs/status/project-truth-index.md` reports status
  `gaps_require_routing`, `0` incomplete event chains, `0` critical runtime
  findings, and `3542` app-completion gaps;
- `docs/graphs/function-journey-index.json` tracks `27` chains, `38` web
  journeys, `97` API routes, `0` critical gaps, and `28` high gaps;
- `docs/graphs/user-action-index.json` tracks `41` actions and `39` high
  gaps;
- historical `v1-completion-scorecard-2026-06-11.md` says `GO`, but it is a
  planning/evidence snapshot and does not override the fresher July
  app-completion and production-readiness gaps.

Assessment: Soar has a strong traceability backbone, but current truth still
requires gap routing and protected proof. It should not be treated as
production-complete until the outstanding proof/deploy gates are resolved or
accepted.

## Current Roost Evidence

Observed on 2026-07-04:

- git state: `main...origin/main [ahead 3]`;
- recent commits include Roost source-control gate closure, settings proof,
  public readiness probes, architecture export refreshes, known-state evidence,
  account-access proof, and many evidence packets;
- `docs/status/app-completion-index.md` reports `1237` app-completion items,
  `5` user flows, `0` browser/screenshot review items, `1201` missing test
  links, `20` missing doc links, `11` implemented-needs-proof items, and
  `1232` known non-ok risk items;
- `docs/status/project-truth-index.md` reports status
  `gaps_require_routing`, `0` incomplete event chains, `0` critical runtime
  findings, and `1232` app-completion gaps;
- `docs/graphs/architecture-health.json` reports `2794` entities and `6524`
  relations, but current registry CSVs are shallow compared with
  `docs/architecture/nodes/*`; this should be treated as a normalization or
  source-of-truth routing gap before broad feature claims;
- `docs/pipelines/pipeline-registry.md` still contains template/example-style
  content and needs promotion of real Roost flows when used for acceptance.

Assessment: Roost has a broad architecture/evidence system and production
proof history, but the current app-completion index is mostly missing test
links. It is less ready than Soar for autonomous "trust the map"
implementation unless agents refresh or normalize the feature-slice surfaces
before coding.

## Extracted Old-Agent Mechanisms To Preserve

The old Paperclip-created history shows useful mechanisms that should remain
the model:

- known-state baseline before broad work;
- architecture awareness and graph refreshes;
- app-completion index refreshes;
- function journey and user action indexes;
- source-control closure gates before push/deploy;
- evidence packets tied to LUC issue ids;
- production health watch and protected smoke evidence;
- queue expeditor/no-stall routing when work is blocked;
- documentation/source-of-truth updates in the same lane as code or proof.

## Gaps To Correct In Agent Behavior

1. Agents must not stop after creating reports. Reports are routing surfaces,
   not completion.
2. Every implementation/repair issue needs a named feature slice and parent
   outcome.
3. Backend changes require frontend and caller/callee impact checks when the
   behavior is user-visible.
4. Frontend changes require API/data impact checks when they depend on backend
   state.
5. App-completion and project-truth indexes must be current enough for the
   issue being closed, or the issue must record why they are stale and who owns
   refresh.
6. Local commits ahead of origin are not VPS delivery. Push/deploy status must
   be proven separately through DRE/SPA/QVE gates.
7. Roost registry-vs-nodes differences and template pipeline entries need
   normalization before agents rely on them as complete current truth.

## Operating Rule Added

The mandatory `Feature Slice Traceability Contract` is now part of
`.agents/state/softwarehouse-autonomous-delivery-architecture.md`.

Practical effect: future Soar/Roost issue work should include cross-layer
feature-slice context, impact analysis, evidence, and parent reporting before
being closed.

## Current Readiness Estimate

- Paperclip operating model for this kind of work: about 75%.
- Soar traceability foundation: about 80%, but production completion is still
  blocked by proof/deploy gates and local commits ahead of origin.
- Roost traceability foundation: about 65%, because architecture tooling is
  broad but current app-completion gaps and registry normalization are still
  material.
- Overall Stage 1 autonomous delivery confidence: about 70% after this
  contract update; enough to keep working under supervision, not enough to
  remove external monitoring or claim autonomous completion.
