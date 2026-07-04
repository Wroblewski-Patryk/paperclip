# Evidence And Project Memory

## Evidence Standard

Every important claim must say one of:

- `implemented and verified`
- `implemented but not verified`
- `present in code, behavior unknown`
- `missing`
- `blocked by error`, with exact command/error/log reference

When a verification command fails, record the command, failure, and next step.

## Project Memory Sources

Read these Softwarehouse control-plane files before broad coordination,
automation, deploy, or project takeover work:

- `.agents/state/active-mission.md`
- `.agents/state/responsibility-learning.md`
- `.agents/state/agent-evals.md`
- `.agents/workflows/softwarehouse-coordination.md`
- `softwarehouse/paperclip-unification-plan.md`
- `docs/automation/agent-command-catalog.csv`
- `docs/automation/tooling-contract.md`
- `docs/operations/runtime-config-ledger.csv`
- `docs/operations/service-topology.md`
- `docs/operations/coolify-vps-deployment-contract.md`

Read these first when working on Soar:

- `AGENTS.md`
- `README.md`
- `DEFINITION_OF_DONE.md`
- `NO_TEMPORARY_SOLUTIONS.md`
- `AI_TESTING_PROTOCOL.md`
- `INTEGRATION_CHECKLIST.md`
- `DEPLOYMENT_GATE.md`
- `docs/documentation-map.md`
- `docs/documentation-overview.md`
- `docs/graphs/architecture-awareness.json`
- `docs/graphs/architecture-awareness.csv`
- `docs/graphs/architecture-graph.md`
- `docs/graphs/architecture-graph.mmd`
- `docs/graphs/function-journey-index.json`
- `docs/graphs/user-action-index.json`
- `docs/status/architecture-awareness-report.md`
- `docs/status/app-completion-index.md`
- `docs/status/app-completion-index.json`
- `docs/governance/agent-runtime-contract.md`
- `docs/governance/autonomous-engineering-loop.md`
- `docs/governance/existing-project-adoption-playbook.md`
- `docs/planning/application-completion-audit-task-contract-template.md`

For any other takeover project, read the equivalent files when they exist and
record missing equivalents as `unknown` or `missing`, not as failure. The first
job is to know the state, then to repair it.

## Memory Ledger Events

Significant actions should be recorded in the narrowest durable place available
without creating duplicate bureaucracy. Use issue comments, work products,
status docs, `.agents/state`, project ledgers, or architecture/app-completion
indexes as appropriate.

Before recording or using old material, classify it as one of:

- `current_truth`: short current operating or product fact that future agents
  should trust until superseded;
- `decision`: accepted, rejected, superseded, temporary, or obsolete decision
  with rationale;
- `evidence`: inspectable proof from a run, test, deploy, review, smoke, or
  artifact; useful but not automatically current truth;
- `lesson`: reusable prevention rule promoted into a procedure, eval, checklist,
  role boundary, or guardrail;
- `archive`: historical context retained for investigation only.

Use `docs/softwarehouse/17-knowledge-governance.md` as the company contract.
Do not treat archived issues, old reports, or old CSV/JSON exports as binding
truth when a newer current-truth or decision source exists.

Record these event types when they materially affect future work:

- `decision`
- `attempt`
- `failure`
- `success`
- `regression`
- `test_result`
- `review`
- `architecture_change`
- `deployment`
- `rollback`
- `optimization`
- `capability_gap`
- `handoff`

Each ledger event should include the agent/owner, issue or project, action,
evidence, affected files/entities, result, and next owner/action. Never print
secret values. For failed or repeated attempts, include the exact reason future
agents should avoid or retry the path.

If the event changes what future agents should trust, state the promotion path:
`current truth updated`, `decision recorded`, `evidence attached only`,
`lesson promoted`, `archived as historical`, or `no knowledge change`.

## Trace Minimum

For work that changes code, configuration, deployment state, runtime behavior,
agent instructions, routines, skills, or governance, record enough trace to
reconstruct the operation:

- agent and role;
- model/adapter when available;
- issue/run/routine source;
- commands, tools, or scripts used;
- files, architecture entities, user flows, or APIs touched;
- tests, screenshots, logs, artifacts, or work products;
- cost/token/time data when available;
- handoff owner and final disposition.

## Architectural Awareness

The canonical project model lives in the Architectural Awareness Layer:

- Paperclip contract: `softwarehouse/architectural-awareness-layer.md`
- Scanner/exporter: `node scripts/build-architecture-awareness-index.mjs --project Soar --root ../Soar`

Use the graph before broad changes and after every meaningful handoff. A task
must name affected architecture entities or explicitly say the entity is missing
and needs to be added. If the generated graph disagrees with a hand-written doc,
record the conflict and route it to CTO Architect plus Docs Memory Lead.

Every feature/task proof should link:

- affected entities from `architecture-awareness.json`;
- affected user flow from `app-completion-index.json` when the behavior is
  user-facing;
- affected files;
- tests or proof commands;
- docs/index updates;
- browser screenshot/clickthrough evidence when frontend behavior, layout,
  navigation, login, subscription, or configuration is involved;
- commits when available;
- blocker owner/action if verification cannot finish.

## App Completion Evidence

For sellable apps, especially Soar and Roost, "the code exists" is not enough.
Before planning broad work or closing a user-facing issue, check or request:

```bash
node C:/Personal/Projekty/Aplikacje/Paperclip_Softwarehouse/scripts/build-app-completion-index.mjs --project Soar --root C:/Personal/Projekty/Aplikacje/Soar
```

Use `docs/status/app-completion-index.md` to decide the next lane. Each
user-facing capability must answer:

- can the user reach it after login;
- does it require subscription or entitlement;
- does it require configuration such as API keys;
- do Binance, Gate.io, or another integration have names-only configured proof;
- does the backend/API behavior work;
- does the frontend render the behavior clearly and minimally;
- is there automated proof and browser/clickthrough/screenshot proof;
- who owns the next missing layer.

If backend proof exists but browser proof fails, create a frontend/UX repair
lane. If frontend exists but config/subscription/API proof is missing, create a
backend/integration/config lane. If the user flow is not in the index, create a
PM/Docs/CTO mapping lane before implementation.

## Known-State Before Coding

If the issue is a takeover, PM, architecture, QA, docs, or planning lane, do not
jump straight to implementation. First produce the smallest useful
works/fails/unknown map:

- capability or workflow name;
- expected behavior;
- files/routes/functions/docs/tests involved;
- current evidence;
- status: `verified`, `implemented but not verified`, `present in code,
  behavior unknown`, `missing`, or `blocked by error`;
- next owner and proof required.

Implementation issues created from that map must include enough context that the
worker does not need to guess what to change or how to prove it.
