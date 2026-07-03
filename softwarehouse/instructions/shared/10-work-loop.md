# Non-Negotiable Work Loop

## Work Modes

Before acting, classify the requested work mode and keep the disposition aligned
with that mode:

- `Ask`: answer or clarify; do not mutate state unless explicitly requested.
- `Analyse`: inspect evidence and return findings, risks, or options.
- `Plan`: produce an owner/action/proof plan without executing implementation.
- `Execute`: make the smallest coherent change and verify it.
- `Review`: evaluate completed or proposed work against defects, evidence, and
  gates.
- `Improve`: update a reusable process, instruction, skill, routine, or
  capability rule after an evidence-backed pattern.
- `Publish`: prepare release, handoff, artifact, docs, or board-facing output
  with proof.
- `Monitor`: observe health/progress and intervene only on concrete drift.

If the issue or board request does not imply execution, do not treat analysis
as permission to change code or configuration. If the mode changes during work,
state the new mode and why in the durable issue comment.

## Pre-Action Gate

Before any broad, risky, cross-role, or repeat operation, check:

- whether a similar attempt, failure, success, rollback, or decision already
  exists in issue history, project docs, ledgers, or `.agents/state`;
- whether the operation has an existing process, skill, script, routine, or
  owner path;
- whether the current agent has the role authority, workspace, credentials, and
  budget for the action;
- whether the change affects architecture, data, security, deploy, user-facing
  behavior, or another agent's ownership;
- what rollback or no-change path exists if verification fails.

If the gate finds meaningful risk, switch to `Analyse` or `Plan` first and
create the smallest owner-path issue instead of improvising execution.

## Execution Ledger Shape

Do not collapse task execution into completion. For non-trivial work, leave a
durable trace with:

`Task -> Execution -> Result -> Artifact -> Evaluation -> Approval or Rollback`

At minimum, name the task, commands/actions, outcome, work products or file
paths, verification/evaluation, and the next approval, rollback, or owner when
the loop is not closed.

1. Read the issue, project docs, architecture docs, root indexes, and relevant
   role instructions before touching code.
2. Treat project architecture and goal docs as product intent. If the issue is
   underspecified, infer the next useful action from those docs instead of
   asking the board what the product should be.
3. Build a known-state map: what exists, where it lives, what is missing, what
   is broken, what has evidence, and what doc-backed product outcome it blocks.
4. Prefer `rg` and project-native scripts over ad hoc searching.
5. Make the smallest coherent change that advances the issue.
6. Verify with tests, smoke checks, type checks, screenshots, logs, or code
   inspection as appropriate.
7. Update docs, indexes, ledgers, maps, or issue comments with evidence.
8. Never mark work done without proof. Unknown is better than pretending.
9. Before leaving a blocked issue, re-read its blockers. If every blocker or
   owner-path child is now terminal, finish the stale-blocker cleanup in the
   same heartbeat: close with evidence, or move the source back to `todo` with
   one concrete next owner/action.
10. Use issue-comment `resume` as a wake signal, not as punctuation. Do not
    resume already-done work or healthy active runs unless a new execution path
    is deliberately required.
