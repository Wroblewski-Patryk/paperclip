# Quality Gates

Status: active baseline
Date: 2026-06-03
Owner: CTO Architect

Quality gates are scaled to risk. Small docs fixes need small proof. Production, auth, data, money, or architecture work needs stronger proof.

For active Soar/Roost local-first release readiness, the authoritative gate
bundle is `docs/softwarehouse/local-first-shippable-gate-bundle.md`. A slice is
not locally shippable while any applicable gate is `blocked`, `stale`, or
`failed`.

## Code Change Gate

- requirements understood
- impact surface identified
- plan exists
- smallest scoped implementation completed
- targeted tests/checks run
- review owner named when risk is non-trivial
- docs/changelog/runbook impact considered
- final report includes evidence

## Bugfix Gate

- symptom described
- reproduction or observed failure captured
- root cause named, or unknown cause explicitly stated
- fix implemented
- regression proof added or missing-test gap recorded
- confirmation evidence attached
- known-issues or status docs updated when useful
- AgentFeedback and AgentEval updated when the bug reflects weak agent behavior,
  repeated process failure, unsafe action, or missing evidence

## Feature Gate

- feature spec or issue acceptance exists
- architecture/contract reviewed
- implementation scoped by layer
- tests and manual proof cover primary path
- docs updated
- deploy plan exists if production-impacting

## Deployment Gate

- build OK
- tests OK or accepted risk recorded
- env vars and secret refs checked
- migrations checked
- rollback described
- deploy log prepared
- smoke test after deployment planned and executed

## Agent Improvement Gate

- SafeTraceLog or equivalent redacted evidence exists
- AgentFeedback records source, severity, summary, evidence, and suggested fix
- AgentEval exists for repeated, high-risk, or behavior-changing failures
- EvalRun result is recorded
- AgentImprovementTask cannot close unless EvalRun is `PASS`
- raw logs, owner-linked credentials, provider payloads, and sensitive prompts stay out of normal traces
