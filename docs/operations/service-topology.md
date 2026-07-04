# Service Topology

Last updated: 2026-07-04

## Purpose

Map the local Paperclip Software House runtime and the project systems it
coordinates.

## Local Control Plane

| Service | Runtime | Path / target | Depends on | Health/readiness | Owner |
| --- | --- | --- | --- | --- | --- |
| Paperclip app/API | local dev server | `http://127.0.0.1:3200` | local workspace, Paperclip runtime data | `/api/health`, softwarehouse audit script | Softwarehouse OS / CTO |
| Paperclip runtime home | local filesystem | `.paperclip/runtime/home/...` | Codex auth, model adapters, agent configs | agent status + live-runs audit | CTO / Agent Health |
| Agent instruction bundles | repo files + Paperclip agent docs | `softwarehouse/instructions/` | sync script, role roster | instruction drift audit | Docs Memory / CTO |
| Workspace boundary audit | local filesystem + Paperclip API | `pnpm run softwarehouse:workspace-boundary-audit` | allowed roots and active project records | no active project outside allowed roots; no generated root artifacts | Softwarehouse OS / CTO |

## Managed Application Projects

| Project | Status | Workspace | Primary current gate | Owner |
| --- | --- | --- | --- | --- |
| Soar | primary sellable lane | `C:/Personal/Projekty/Aplikacje/Soar` | `LUC-241` protected workers/readiness gate | Soar Project Manager |
| Roost | secondary thin-readiness lane | `C:/Personal/Projekty/Aplikacje/Roost` | `LUC-261` CompanyCore/Roost takeover gate | Roost Project Manager |
| Softwarehouse Operating System | planned | this repo | improve autonomy/process observability | Portfolio / CTO |

Stage 1 file operations are limited to:

- `C:/Personal/Projekty/Aplikacje/Paperclip_Softwarehouse`
- `C:/Personal/Projekty/Aplikacje/Soar`
- `C:/Personal/Projekty/Aplikacje/Roost`

Agents must not create generated files, helper scripts, indexes, or scratch
folders directly under `C:/Personal/Projekty/Aplikacje`. Sibling app folders are
parked or external owner assets: do not mutate or delete them without explicit
owner approval.

Deferred portfolio streams: Featherly, Nest, Aviary, LuckySparrow.ch,
OpenJarvis, Obiekty, Paperclip product work, and other experiments stay
backlog/archived until Soar/Roost release-readiness gates are stable or the
board explicitly reopens a stream.

## External Operational Surfaces

| Surface | Use | Safety boundary |
| --- | --- | --- |
| Coolify VPS | Soar deploy/status/recovery checks | Use configured secrets only inside Paperclip/local env; never persist values. |
| Soar production | Public smoke and authenticated proof where approved | No LIVE mutation or account data capture without explicit gate. |
| Git remotes | Source-control closure and optional deploy trigger | Commit locally when coherent; push only when explicitly allowed. |

## Dependency Graph

```text
operator
  -> Codex / Paperclip UI
  -> Paperclip issues + routines
  -> project manager agents
  -> specialist agents
  -> project repo docs/code/tests
  -> evidence/history
  -> project-local status and Paperclip evidence

Ops lanes:
Paperclip -> Coolify/VPS -> Soar API/Web/workers -> smoke/readiness evidence
```

## Maintenance Rule

When a project is added, a service changes, or an operational gate moves,
update this topology and the environment matrix.

## Gate Unblock Packet

Run `pnpm softwarehouse:unblock-packet` whenever the company is idle with
blocked delivery gates. The generated packet records the current blocker roots,
redacted secret metadata freshness, allowed next actions, forbidden actions, and
required evidence:

- `report/softwarehouse-unblock-packet.json`
- `docs/status/softwarehouse-unblock-packet.md`

Agents may use this packet to decide whether to stay quiet, resume exactly one
gate recheck lane, or ask the operator for a new fact. It is not approval for
production mutation.

For a full read-only supervision pass, run `pnpm softwarehouse:control-tick`.
It executes the janitor dry-run, gate watcher dry-run, unblock packet refresh,
source-control packet refresh, two-project readiness check, autonomy governor,
and softwarehouse audit in the expected order.

For a shorter PM/operator handoff after a control tick, run
`pnpm softwarehouse:readiness-snapshot`. It reads the latest control tick and
writes runtime-only snapshot files:

- `report/softwarehouse-readiness-snapshot.latest.json`
- `report/softwarehouse-readiness-snapshot.latest.md`

The control tick is the canonical execution handoff for routines and PMs:

- `nextControlActions` is the short ordered list to execute or report first.
- `nextControlActionStatus` verifies that the handoff is non-empty and not duplicated.
- `controlBrief.deliveryPermission` is the lane-start authority. If
  `canStartNewLane=false`, agents must not start a new lane even when no live
  runs exist; they may only execute the listed `allowedLaneTypes`.
- `controlBrief.autonomyDisposition` is the human-readable company state.
  `intentional_gate_hold` means the company is not idle; it is deliberately
  waiting on accepted gate facts while packet refresh, stale-gate owner
  escalation, and Paperclip OS process improvements remain allowed.
- `effectiveOperatingPosture` is the posture to obey when governor and readiness disagree.
- `postureConsistent=false` is a stop signal unless the tick explicitly marks a safe runtime overlay.
- `gateHandoffs` lists redacted gate facts and missing evidence so a blocked PM knows exactly which credential, approval, or proof must change before work can resume.
- `operatorActionPacket` is the redacted human-facing packet: blocked gates,
  evidence required, source-control gates, dirty project groups, and full
  delivery blockers. It is the preferred artifact to show the operator when
  autonomy is waiting for a new credential, smoke, approval, or project policy
  fact.

When a project is blocked by an operator/credential gate, `nextControlActions`
must include a concrete `Gate fact needed:` line. Agents should treat that line
as the operator handoff and must not replace it with broad retry work.

If a blocked gate has waited long enough to become stale, `nextControlActions`
also includes `Stale gate owner action:`. That line is safe organizational
escalation only: the named owner must obtain a fresh accepted operator or
credential fact, or keep the blocker closed with a next review condition. It is
not approval to run a protected recheck, mutate a repo, push, deploy, restart,
or touch secrets.

The source-control packet is runtime-only and ignored by git:

- `report/softwarehouse-source-control.latest.json`
- `report/softwarehouse-source-control.latest.md`

Use it to route commit/no-commit classification through the project PM and
source-control owner. It is not approval to push.

During a protected gate hold, source-control classification is allowed when the
control tick lists `source_control_classification`. Agents may read the
dirty-file packet, classify lanes, and record commit/no-commit evidence as a
Paperclip issue comment only. They must not write files in the project repo.
This is not approval to mutate the project repo, commit, push, deploy, restart,
or rerun protected smoke.

The same protected gate hold may allow `safe_architecture_planning` when listed
by the control tick. That lane may read existing architecture/docs/status
packets and create Paperclip backlog/issues, but it must not write files in the
project repo or perform protected delivery.
