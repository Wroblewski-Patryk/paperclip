# Continuous Improvement

Status: active baseline
Date: 2026-06-03
Owner: Docs Memory Lead

The softwarehouse should improve after every meaningful delivery, failed run, blocked deploy, or repeated confusion.

## Improvement Inputs

- repeated blockers
- failed checks
- stale runs
- done-without-proof findings
- unclear ownership
- missing docs
- deploy gate failures
- security review failures
- user feedback
- redacted SafeTraceLog records
- AgentFeedback from human, model, QA, security, test, or monitoring sources
- failed or flaky AgentEval/EvalRun results

## Improvement Outputs

- updated standard
- updated template
- updated role boundary
- new audit script
- new routine
- capability gap note
- proposed role split
- project follow-up issue
- AgentImprovementTask with EvalRun PASS close evidence
- current-truth, decision-log, lesson, or archive update when the finding
  changes what future agents should trust

## Anti-Chaos Rules

- no large change without a plan
- no architecture change without ADR when it changes future constraints
- no DONE without proof
- no ignoring documentation
- no parallel solution when an existing module should be extended
- no incidental refactor outside task scope
- no feature deletion without dependency check
- no production deployment without gate
- no vague final "done" report
- no AgentImprovementTask closure without EvalRun PASS
- no repeated agent failure without feedback, eval/regression decision, and prevention path
- no old evidence treated as current truth without promotion and supersession
  check

## Learning Loop Hygiene

- When the organizational learning loop finds a repeated pattern that is already
  covered by an existing learning issue or duplicate-suppression rule, record a
  no-op or suppression on the existing issue instead of cloning the pattern
  into a new capability-gap issue.
- Create a new capability-gap issue only when the repeated pattern still lacks a
  process, role, routine, instruction, or template improvement.

## Agent Improvement Flywheel

The canonical loop is:

AgentRun -> SafeTraceLog -> AgentFeedback -> AgentEval -> EvalRun -> AgentImprovementTask ->
process or implementation fix -> EvalRun PASS -> done.

See:

- `../agent-improvement-flywheel.md`
- `../evals-and-regression-gates.md`
- `../safe-trace-logging.md`
- `../agent-feedback-loop.md`
- `17-knowledge-governance.md`
