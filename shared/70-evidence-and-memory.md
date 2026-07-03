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
- `docs/governance/agent-runtime-contract.md`
- `docs/governance/autonomous-engineering-loop.md`
- `docs/governance/existing-project-adoption-playbook.md`
- `docs/planning/application-completion-audit-task-contract-template.md`

For any other takeover project, read the equivalent files when they exist and
record missing equivalents as `unknown` or `missing`, not as failure. The first
job is to know the state, then to repair it.

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
- affected files;
- tests or proof commands;
- docs/index updates;
- commits when available;
- blocker owner/action if verification cannot finish.

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
