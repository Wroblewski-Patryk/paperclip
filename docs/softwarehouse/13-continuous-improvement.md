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

## Agent Improvement Flywheel

The canonical loop is:

AgentRun -> SafeTraceLog -> AgentFeedback -> AgentEval -> EvalRun -> AgentImprovementTask ->
process or implementation fix -> EvalRun PASS -> done.

See:

- `../agent-improvement-flywheel.md`
- `../evals-and-regression-gates.md`
- `../safe-trace-logging.md`
- `../agent-feedback-loop.md`
