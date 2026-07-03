# History Overview

Last updated: 2026-05-26

## Purpose

This folder stores durable evidence for the local LuckySparrow Software House
Paperclip instance.

Current operating rules belong in `docs/` and `softwarehouse/`. This folder is
for what happened: audits, task packets, proof snapshots, and migration notes.

## Current Evidence Families

| Family | Location | Meaning |
| --- | --- | --- |
| Software-house operating docs | `softwarehouse/*.md` | The current role, routine, hierarchy, and process model. |
| Architecture awareness exports | `docs/graphs/` | Generated/project graph and architecture-awareness reports. |
| Root portfolio state | `/Aplikacje/APPLICATIONS_INDEX.md` | Structural readiness radar for projects under `/Aplikacje`. |
| Paperclip audit | `node scripts/audit-luckysparrow-softwarehouse.mjs` output | Current live control-plane health, active runs, blockers, model drift, instruction drift. |
| Soar project evidence | `../Soar/history/` | Current pilot project proof, blocker packets, release/readiness artifacts. |

## 2026-05-26 Baseline

- Paperclip Softwarehouse has active Soar and planned Roost projects.
- Soar is the active pilot for autonomous project development.
- The main active Soar blocker family is `LUC-99`, which requires SHA
  reconciliation and explicit `workers-market-stream` readiness proof or an
  accepted deeper-blocker packet.
- Paperclip audit passes with no Spark-model drift, no instruction bundle
  drift, and no root portfolio drift.
- This repository received the same canonical docs/history/template backbone
  expected from managed applications so the software-house project is visible
  in the `/Aplikacje` index.

## Maintenance Rule

Every meaningful Paperclip operating-system change should add or update a
history entry when it changes agent behavior, project intake, routines,
deployment governance, or root portfolio truth.
