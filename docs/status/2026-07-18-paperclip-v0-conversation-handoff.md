# Paperclip Softwarehouse V0 - conversation handoff and gap report

Snapshot: 2026-07-18 20:10 CEST

Workspace: `C:\Personal\Projekty\Aplikacje\Paperclip_Softwarehouse`

Live Paperclip: `http://127.0.0.1:3200`

Company: `ae26bb8b-8f5f-4a85-b341-78d4e1985975` (`LuckySparrow`)

## 1. Executive verdict

The Softwarehouse foundation is substantial and currently operational, but V0
is not 100% complete.

Verified strengths:

- Paperclip is healthy in `local_trusted/private` mode on strict port 3200.
- Exactly one canonical checkout exists for Paperclip, Soar, and Roost; all
  three repositories are clean.
- The 39-agent roster, role settings, instruction/persona bundles, runtime path
  references, and the 30-active/9-paused scope all pass their audits.
- Nine bounded internal routines are active and ten superseded/broad routines
  are paused.
- Central role- and task-aware model routing is active. Current agent primaries
  are diversified across GPT-5.4 mini, GPT-5.4, and GPT-5.5, with a GPT-5.4
  mini cheap fallback for every agent.
- Quota is not currently blocking work: the observed Codex weekly window was
  8% used and resets on 2026-07-25 03:25 UTC.
- Source control, instruction recovery, runtime topology, workspace boundaries,
  Coolify read access, Artifacts, Softwarehouse, Memory, and Learning surfaces
  are present and inspectable.
- Roost public web/API health and readiness probes pass.

V0 remains open because:

- Soar `/ready` returns 503 and Coolify reports Redis as
  `restarting:unhealthy`.
- This is classified as a failed desired state, not merely an application that
  Paperclip did not start. Soar's production topology defines Redis as a
  long-running managed dependency with expected status `running:healthy`, and
  production `/ready` requires a successful Redis check by default. An
  intentionally stopped or scale-to-zero service would be acceptable only when
  an explicit desired-state/maintenance record says so and the operator UI
  distinguishes it from a crash loop. Coolify `restarting:unhealthy` does not
  satisfy that contract.
- The currently bound Coolify credential can read the full Soar inventory but
  does not have the narrow `deploy` permission required for the one approved
  Redis recovery mutation.
- A credential rotation chain created after a prior transcript exposure remains
  open. The affected credentials must be treated as compromised until provider
  rotation and invalidation are proved.
- Soar deployment provenance remains blocked behind that credential chain.
- Current project-truth indexes contain 66 unresolved proof/readiness gaps: 56
  for Soar and 10 for Roost.
- The Softwarehouse longevity audit currently fails on two control-plane
  regressions described in section 6.

The correct description is therefore: **healthy local autonomous control-plane
foundation, limited local delivery allowed, protected production closure still
blocked**.

## 2. Canonical stage definition

### V0 - current target

Paperclip stays local on Windows and autonomously plans, implements, tests,
reviews, documents, commits, deploys, monitors, and repairs Soar and Roost. Soar
and Roost run on the VPS and must be owner-usable there. Paperclip, Soar, and
Roost remain three separate Git repositories.

### V1 - later target

After V0 is accepted and Roost is sufficiently complete, move Paperclip itself
to the VPS and connect the hosted control plane with Soar and the wider
Roost-backed ecosystem.

`LUC-25`, `00 General: Deliver Soar and Roost to Usable VPS Production`, is the
hard V0 product-delivery parent. It must not close for plans, reports, issue
trees, or stale historical evidence.

## 3. Conversation requests and implementation state

| Area | Requested outcome | Current state | Remaining limitation |
| --- | --- | --- | --- |
| Hard delivery mission | Keep working until Soar and Roost are usable on VPS | Implemented as LUC-25 and child gates | Product closure is still blocked |
| Three-repo boundary | One repo each for Paperclip, Soar, Roost | Verified; all clean and singleton | Preserve on every workspace change |
| No scattered worktrees/clones | Prevent duplicate instances and accidental sibling cleanup | Boundary and topology audits pass | Docker container inventory is unavailable while Docker Desktop is off |
| Strict local runtime | One Paperclip on 3200 and embedded PostgreSQL on 54329 | Verified | Keep fail-closed startup behavior |
| Dashboard blank/stale UI | Serve the actual current UI build | Fixed; `ui/dist` and `server/ui-dist` are synchronized by the build flow | Re-run build/served-asset verification after UI changes |
| Owner UI coverage | Expose important hidden layers | Softwarehouse, Artifacts, Memory, Learning, Costs/Limits, effective models, and project truth are surfaced | Project-truth backlog still needs closure |
| Short URLs | Use `/LUC/memory` and `/LUC/learning` | Implemented with redirects for legacy routes | None known |
| Inbox/blocked work | Nudge safe work, route owner decisions, avoid silent stalls | Continuation, autonomy, gate freshness, longevity, and janitor routines exist | Four current in-review interactions need typed decisions; stale-gate owner action regressed |
| Anti-churn | Avoid circular reviews, duplicate issues, and runaway watchdogs | Bounded routines, dedupe, cooldowns, WIP guards, and reusable routine issues exist | Continue measuring false recovery/productivity loops |
| Agent scope | Keep app-factory core active and unrelated roles paused | Verified: 30 active/idle or running, 9 paused | Do not activate parked roles blindly |
| Agent instructions | Rich Markdown role/persona/shared guidance for every agent | Verified: 39 unique bundles, at least 40 Markdown files each, all required signals present | A full instance restore drill is still absent |
| Repo-managed instructions | Keep recoverable instructions under the project | Active roots resolve to repo-managed runtime bundles | Auth, DB, logs, uploads, and secrets key still require runtime backup, not Git alone |
| Windows script execution | Do not open `.mjs`/`.js` in editors | All 39 bundles require explicit `node` invocation for issue/artifact helpers | Keep tests for this contract |
| Windows resource safety | Avoid duplicate heavy processes and host freezes | Sequential-test and PID-tree guidance is implemented | Broad embedded-Postgres suites remain slow; runner cleanup hardening is partial |
| Backup/retention | Protect DB/runtime state and control disk growth | 21 current backups, about 10.6 GB total, newest at 20:04 CEST; retention guards exist | No proved end-to-end restore drill |
| Model Router | Central selection independent of agent prompts | Implemented with versioned role, title, context, escalation, and quota fallback rules | Automatic outcome-based profile tuning is only planned |
| Agent/model diversification | Match models to role and task | Verified: 30 GPT-5.4, 2 GPT-5.4 mini, 7 GPT-5.5 primaries; all 39 have mini cheap fallback | Spark is intentionally disabled locally after unreliable probes |
| Effective model visibility | Show requested/applied profile on runs | Implemented in run metadata, Agent Detail, and Live Runs | Keep adapter config from being mistaken for the effective run model |
| Quota-aware scheduling | Continue lanes with capacity and resume after reset | Implemented with soft fallback and hard holds; current weekly usage is 8% | Provider exposes one observed window, not proven independent caps per model |
| Costs/Limits UI | Separate subscription quota from dollar spend | Implemented, including weekly window/reset and model-lane mapping | Exact per-model token bars cannot be invented when provider telemetry omits caps |
| Company thresholds | Configurable start/hold behavior | Implemented through quota/budget policy settings | Revalidate when provider semantics change |
| Provider catalog | Add models without editing agents | Config-driven profiles/catalog foundation exists | Catalog is partial and must be refreshed against official docs and live CLI probes |
| Coolify/VPS access | Discover resources and permit safe deploy/recovery | Read access is verified for eight Soar resources; IDs are bound through secret refs | Narrow Redis mutation permission is still missing |
| Constructive deploy policy | Allow safe push/auto-redeploy with evidence and post-check | Standing owner policy is recorded | No force push, broad restart, rollback, or secret mutation without the named gate |
| Source control closure | Classify dirty histories/evidence and keep repos clean | Verified clean for all three repositories | Keep app-agent ownership and narrow commits |
| Duplicate Docker runs | Avoid retained compose one-offs and duplicate app backends | Topology audit and one-off cleanup rules exist | Current Docker Desktop is off, so local container inventory was not observable |
| Evidence gates | Do not mark work done without tests/review/docs and high-risk proof | Typed evidence bundles and high-risk categories are implemented | 66 current product proof gaps remain |
| Organizational Learning | Capture outcomes/causes/learning candidates | 15 proposed learning observations exist | None is validated or promoted yet; the gate test has one source/test drift failure |
| Organizational Memory | Store governed assumptions, commitments, and decisions | Typed DB/API/UI lifecycle exists | Count is intentionally zero until a material record is explicitly created |
| Artifacts | Keep generated work inspectable through Paperclip | Company route, UI, work products, and upload helper are implemented | Continue enforcing artifact linkage at closeout |
| Docs and durable memory | Preserve this work for future chats | 94-row solution index, 26-row regression register, journal, mission, and this report exist | The two CSV indexes contain stale 10-17 July statuses and need reconciliation |

## 4. Current live snapshot

At the time of this report:

- Health: `ok`, Paperclip 0.3.1, auth ready.
- Agents: 39 total; 30 idle, 9 paused after the current run finished; no error
  agents.
- Routines: 19 total; 9 active, 10 paused, each active routine has one trigger.
- Company issue board: 40 open, 15 blocked, 4 in review, 13 todo, 8 backlog,
  1378 done.
- Pending approval records: 0.
- Pending typed review interactions: 4.
- LUC-25 descendants: 73 total; 71 done, LUC-1387 in review, LUC-1374
  blocked by LUC-1387.
- Source control: Paperclip `3777000f`, Soar `debd02548`, Roost `49f0655a`;
  all clean on `main`.
- Coolify: eight expected Soar resources visible. PostgreSQL is healthy; Redis
  is `restarting:unhealthy`; the six application/worker resources report
  running with health unknown from this API projection.
- Public runtime: Roost web/build-info/API health/API ready all return 200.
  Soar web/build-info/API health return 200, but API ready returns 503.
- Model/cost: observed weekly quota 8%, no active budget incident, no quota-held
  error agents, no OpenAI API-key-backed lane configured.
- Memory/Learning: 0 governed memory records; 15 proposed learning records.
- Backups: 21 files, about 10.6 GB, newest created during this audit window.

Six of the latest 100 heartbeat runs were `process_lost`, clustered around the
two earlier Paperclip service restarts used for UI work. Their associated issue
work subsequently reached terminal states or recovery. This is historical
restart fallout, not proof of a current quota outage, but future restarts must
continue to wait for or explicitly cancel live runs.

## 5. Product delivery blockers

### P0. Soar production readiness

Availability findings must be classified against desired state. `stopped` can
be expected for a documented on-demand or maintenance mode; `restarting` with
failed health checks means the platform is actively trying and failing to keep
the resource alive. In the observed Soar state, Web and API `/health` were up,
API `/ready` was down, Redis had accumulated 682 restarts, and the Soar
production topology plus smoke contract require Redis to remain
`running:healthy`. Therefore this P0 is a real dependency failure rather than
normal Paperclip inactivity.

1. `LUC-1359` - Soar `/ready` 503.
2. `LUC-1368` - provide a deploy-capable Redis recovery path.
3. `LUC-1374` - diagnose/recover Redis `restarting:unhealthy`.
4. `LUC-1387` - restore the least-privilege owner path for exactly one Redis
   recovery action. This issue is in review and has a typed confirmation
   interaction.

Read-only Coolify access is not the missing fact. The missing fact is effective
write authorization for the one narrow action. The next conversation must not
replace it with a broad token or guess a deployment target.

### P0. Credential rotation and provenance

1. `LUC-494` - rotate credentials exposed in an earlier transcript.
2. `LUC-496` - coordinate the rotation.
3. `LUC-972` - protected owner/security execution gate.
4. `LUC-507` and `LUC-448` - restore authoritative Soar deployment provenance
   after the credential chain is resolved.

Do not repeat any credential value from chat history, logs, issues, or this
report. Rotation requires provider-side replacement/invalidation evidence and
then secret-ref rebinding plus read-only verification.

### P1. Product truth backlog

- Soar: 56 current gaps. One is a critical runtime error, two are operational
  gate gaps, and 53 are app-completion proof gaps, mostly missing browser or
  test linkage.
- Roost: 10 current gaps, currently missing test-link proof for mounted API
  route families.

These rows are not automatically 66 code defects. Each must be classified as
working-with-proof, smallest repair, intentionally unsupported, or obsolete.
Only real gaps should produce implementation work.

## 6. Fresh control-plane defects found by this audit

### P1. Stale protected gates can miss an owner action

`node scripts/audit-luckysparrow-softwarehouse.mjs` fails because the latest
control tick reports two stale blocked gates but does not include a
`Stale gate owner` action. Tests cover the intended behavior, so the live-data
composition or action-merging path has regressed. `LUC-1377` is already in
review for this repair and has a typed confirmation interaction.

### P1. Gate suite source/test drift

`pnpm run softwarehouse:test-gates` is 176/177. The one failing test expects
learning-loop enrichment only for `ops-release`, while the implementation now
correctly covers both `ops-release` and `security-credentials`. Reconcile the
test and implementation intentionally; do not weaken the bounded enrichment
guard.

### P1. Executive health reads archived project aliases

`scripts/check-softwarehouse-executive-health.mjs` finds exact project names
`Soar` and `Roost` without excluding archived rows. It therefore reports the
archived legacy IDs as active projects. The canonical active projects are
`11 Innovation: Soar` and `11 Innovation: Roost`. Fix project selection and add
a regression test before trusting this part of the green executive verdict.

### P1. Four typed review interactions await disposition

- `LUC-1387`: approve or reject exactly one least-privilege Redis recovery
  owner path.
- `LUC-1236`: record the typed outcome for a stale closed-run tail.
- `LUC-1459`: decide whether to route a separate source-control follow-up.
- `LUC-1377`: accept or revise the stale-gate owner-action repair.

These are not approval-table rows, which is why `/approvals?status=pending`
returns zero while the Inbox can still show owner work.

### P2. Restore proof is missing

Backups and retention are active, but Git plus backup configuration is not a
proved disaster-recovery path until a disposable restore drill reconstructs the
database, storage references, secrets key binding, instruction roots, and health
without touching the live instance.

### P2. Model economics are not fully self-optimizing

The router, role defaults, task overrides, escalation, quota fallback, and
effective-run observability work. Two requested ambitions remain incomplete:

- conservative automatic profile tuning from measured task success is still a
  planned foundation;
- provider model/limit discovery is partial and must not manufacture separate
  hard caps or token counts that OpenAI/Codex does not expose.

Spark exists as a profile/catalog entry but is intentionally disabled for this
local Softwarehouse because prior live probes were unreliable. It should return
only after a bounded pinned-CLI smoke proves it.

### P2. Learning has not reached promotion

The system has 15 proposed observations and zero governed Memory records. The
empty Memory page is not a rendering bug. The next learning maturity step is to
validate useful observations, promote them into a named procedure/skill/policy
or reject them, and create Memory records only for material assumptions,
commitments, or decisions.

## 7. What must not be rebuilt

The next conversation should extend and repair the existing mechanisms, not
create parallel replacements for:

- model routing, model economics, quota guards, Costs/Limits, or effective-model
  metadata;
- agent rosters, role/persona bundles, instruction mirrors, or runtime roots;
- continuation/autonomy/gate/longevity/learning/backup routines;
- source-control closure, project-truth, Coolify reconciliation, or evidence
  bundles;
- Softwarehouse, Artifacts, Memory, Learning, or route-registry UI surfaces;
- the three canonical repositories or their singleton workspaces.

The 94-row solution index and 26-row regression register are inventories, not
permission to trust stale `last_verified` dates.

## 8. Recommended closure order

1. Fix the 176/177 gate test drift and the archived-project selection defect;
   run targeted tests.
2. Diagnose and repair the live stale-gate owner-action composition; verify
   `softwarehouse:longevity-doctor` passes.
3. Review the four pending typed interactions. Apply the owner's standing
   constructive-change policy where evidence is sufficient; ask only for a
   genuine risk/secret/provider decision.
4. Establish the least-privilege one-action Redis mutation path, execute only
   the named recovery, then verify Coolify resource health, Soar `/ready`, logs,
   rollback readiness, and public smoke.
5. Complete provider-side credential rotation/invalidation, rebind secret refs,
   and close Soar provenance with readback evidence.
6. Refresh the LUC-25 acceptance ledger and LUC-30/31/32 evidence. Historical
   July 4 passes are not fresh closure proof.
7. Drain the 66 product-truth gaps by evidence-first classification and bounded
   worker lanes; prioritize owner-visible flows.
8. Run a disposable full-instance restore drill and document the result.
9. Reconcile both CSV indexes with current evidence and only then assess LUC-25
   for closure.

## 9. V0 acceptance checklist

| Acceptance condition | Current result |
| --- | --- |
| Paperclip local health and singleton topology | Pass |
| Three clean canonical repositories | Pass |
| Agent roster/settings/instructions | Pass |
| Bounded routines and no duplicate active routine triggers | Pass |
| Model routing and quota-aware dispatch | Pass with provider-telemetry caveat |
| Source-control and evidence contracts | Pass as infrastructure |
| Roost public runtime readiness | Pass for current public probes |
| Soar public runtime readiness | Fail: `/ready` 503, Redis unhealthy |
| Protected deployment authority | Fail for narrow Redis mutation |
| Credential safety after prior exposure | Fail until provider rotation proof |
| Fresh product acceptance evidence | Partial/stale |
| Product-truth proof backlog | Fail: 66 gaps |
| Longevity/control audit | Fail: stale owner action + gate test drift |
| Full backup restore proof | Not proved |

## 10. Ready-to-paste prompt for a new Codex conversation

```text
Continue Paperclip Softwarehouse V0 closure in
C:\Personal\Projekty\Aplikacje\Paperclip_Softwarehouse.

Read AGENTS.md, .codex/PROJECT_CONTEXT.md,
.agents/state/board-context.md, .agents/state/active-mission.md, and
docs/status/2026-07-18-paperclip-v0-conversation-handoff.md first. Treat the
handoff as a dated hypothesis and re-verify live state at
http://127.0.0.1:3200 for company ae26bb8b-8f5f-4a85-b341-78d4e1985975.

Goal: make V0 genuinely complete. Paperclip remains local on Windows; Soar and
Roost are separate repositories and must be owner-usable on VPS. Do not move
Paperclip to VPS yet. Do not close LUC-25 for reports, plans, issue volume, or
stale evidence.

Start with the fresh control-plane defects:
1. Fix the single failing softwarehouse gate test without removing the bounded
   learning-loop enrichment guard.
2. Fix executive-health so archived Soar/Roost aliases cannot be reported as
   active canonical projects; add a regression test.
3. Repair the missing stale-gate owner action and make
   softwarehouse:longevity-doctor pass.
4. Inspect and disposition the current typed review interactions, especially
   LUC-1387 and LUC-1377. Apply the owner's standing approval for constructive,
   evidence-backed changes; ask the owner only for a genuine protected decision.

Then close the protected delivery chain safely:
- LUC-1359/LUC-1368/LUC-1374/LUC-1387: obtain a least-privilege path for exactly
  one Soar Redis recovery action, execute only that named action, and prove
  Coolify health, Soar /ready, monitoring, smoke, and rollback readiness.
- LUC-494/LUC-496/LUC-972: rotate and invalidate previously exposed provider
  credentials, never echoing values; rebind managed secret refs and prove
  readback.
- LUC-507/LUC-448: reconcile authoritative Soar deployment provenance after
  credential safety is restored.

Continue safe local non-production lanes while protected production mutation is
blocked. Classify the 56 Soar and 10 Roost project-truth gaps as proved, smallest
repair, unsupported, or obsolete; do not turn every evidence row into speculative
code work. Preserve one owner, one scope, and one evidence contract per lane.

Model routing already exists. Do not build a second router. Current live policy
uses GPT-5.4 mini, GPT-5.4, and GPT-5.5; Spark is intentionally disabled locally.
Provider telemetry currently exposes one observed weekly quota window, not
independent hard caps per model. Never invent exact token bars. Remaining model
work is conservative outcome-based tuning and provider-catalog refresh after
official-doc and pinned-CLI verification.

Preserve strict ports 3200/54329, one checkout per repo, repo-managed instruction
bundles, and Windows sequential resource safety. Do not run broad validations in
parallel. Do not expose raw secrets, use destructive infrastructure actions,
activate parked roles/products, or touch sibling apps.

Before claiming completion, run targeted tests plus:
- softwarehouse:test-gates
- softwarehouse:executive-health
- softwarehouse:agent-settings-audit
- softwarehouse:agent-instructions-audit
- softwarehouse:runtime-file-state-audit
- softwarehouse:operating-standard-audit
- softwarehouse:runtime-topology-audit
- softwarehouse:workspace-boundary-audit
- softwarehouse:source-control
- softwarehouse:project-truth
- softwarehouse:two-project-readiness
- softwarehouse:coolify-reconciler
- softwarehouse:longevity-doctor

Also perform a disposable full-instance restore drill before calling disaster
recovery complete. Update docs/softwarehouse-v0-v1-solution-index.csv,
docs/softwarehouse-feature-regression-register.csv, the project journal, and
this handoff with verified dates. Commit only narrow, tested changes and leave
all three repositories clean or explicitly owned by an active Paperclip lane.
```

## 11. Verification performed for this report

Passing checks:

- `softwarehouse:executive-health` (with the archived-project caveat above)
- `softwarehouse:agent-settings-audit`
- `softwarehouse:agent-instructions-audit`
- `softwarehouse:runtime-file-state-audit`
- `softwarehouse:operating-standard-audit`
- `softwarehouse:runtime-topology-audit` (Docker inventory warning only)
- `softwarehouse:workspace-boundary-audit`
- `softwarehouse:source-control`
- `softwarehouse:project-truth` as a readable-index audit
- `softwarehouse:two-project-readiness`
- `softwarehouse:coolify-reconciler`
- `softwarehouse:next-legal-action` dry-run
- `audit-softwarehouse-model-cost-readiness.mjs`

Failing checks:

- `softwarehouse:test-gates`: 176/177; learning-loop source/test drift.
- `softwarehouse:longevity-doctor`: stale-gate owner action missing and gate
  suite red.
- `audit-luckysparrow-softwarehouse.mjs`: same stale-gate owner-action defect.

No production mutation, secret readout, approval resolution, deploy, restart,
rollback, or product repository edit was performed while preparing this report.
