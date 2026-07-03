# Problem Statement

Last updated: 2026-05-26

## Purpose

LuckySparrow Software House exists to let local Paperclip agents take over
application development work in a disciplined, evidence-driven way.

The target is not a generic task board. The target is an AI-native engineering
organization that understands project structure, delegates narrowly, proves
work, updates shared memory, and keeps applications moving without repeated
manual nudges.

## Problem

- Primary problem: existing LuckySparrow applications have accumulated code,
  docs, deployments, agent notes, and evidence in many places, so agents can
  repeat fixes, miss blockers, or claim readiness without current proof.
- Who has this problem: the owner/operator and every project-level agent that
  must safely continue work on Soar, Roost, and future applications.
- Current workaround: manually ask Codex/Paperclip to inspect inboxes, restart
  lanes, reconcile docs, update root indexes, and re-check production gates.
- Why the workaround is painful: it burns time, creates stale status, and makes
  small tasks risky because the full project state is not always in front of
  the executing agent.
- What changes if solved: Paperclip becomes the local software-house control
  plane: it keeps project knowledge fresh, routes work to the right role,
  records evidence, and escalates only real operator decisions.

## Constraints

- Budget constraint: use local/free tooling first; do not assume paid SaaS or
  GitHub Actions billing.
- Safety constraint: no secrets, tokens, cookies, account data, or production
  mutations may be recorded in repo files.
- Product constraint: this instance is for application creation/development
  only, not sales, finance, marketing, legal, or customer support.
- Deployment constraint: Coolify/VPS operations require explicit recorded
  gates and reversible proof.
- Source-control constraint: commits may be prepared locally; push/deploy only
  when explicitly allowed.

## Non-Solutions

| Non-solution | Why it is insufficient |
| --- | --- |
| More TODO lists | TODOs without architecture, owner, proof, and blockers recreate the same chaos. |
| One broad lead agent doing everything | Broad ownership hides failures and weakens specialist accountability. |
| Blind automatic deploys | Deployment without SHA, smoke, rollback, and operator gate evidence can damage production. |
| Docs-only readiness claims | A project is not ready until implementation, tests, deployment, and user journeys have current proof. |

## Evidence

- Internal evidence: Soar known-state refresh now has a canonical command and
  generated ledger/scorecard artifacts.
- Internal evidence: Paperclip audit shows active projects, agent roster,
  routines, model governance, root portfolio drift checks, and no Spark-model
  drift.
- Internal evidence: `LUC-99` demonstrates the intended fail-closed behavior:
  agents captured SHA drift and worker-readiness uncertainty instead of
  pretending production was fully done.
- Open assumption: future applications can follow the same pattern once their
  docs/history/index backbone is installed and the project manager role is
  assigned.

## Maintenance Rule

When the software-house operating model changes, update this file before
changing agent hierarchy, routines, or project takeover instructions.
