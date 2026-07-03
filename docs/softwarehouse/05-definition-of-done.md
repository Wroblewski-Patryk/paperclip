# Definition Of Done

Status: active baseline
Date: 2026-06-03
Owner: QA Regression Lead

An issue is DONE only when the result is usable, inspectable, and proven.

For Soar/Roost local-first shippability, use
`docs/softwarehouse/local-first-shippable-gate-bundle.md` as the active source
of truth for accepted gate states, owners, evidence packet types, protected
fail-closed rules, and release/deploy closure fields.

## Universal DONE Checklist

- result matches the issue goal and acceptance criteria
- affected files are listed
- verification was run or the missing verification is explicitly recorded
- evidence is attached or summarized
- documentation was updated, or a no-doc-change reason is stated
- risk and residual follow-up are stated
- next owner is named when more work remains
- commit SHA, push disposition, or no-commit reason is recorded for repo work

Use `docs/softwarehouse/templates/work-report-template.md` for the closure
report when an issue produces code, docs, proof, or coordination work.

## Code DONE Checklist

- code is in the intended module
- tests pass or missing tests are named as a gap
- lint/typecheck/build pass when relevant to the change
- contracts are synchronized across db/shared/server/ui when applicable
- no unrelated refactor is mixed in

## Deploy DONE Checklist

- source SHA or image is recorded
- build passed
- environment and secrets were checked without leaking values
- migrations are checked when applicable
- rollback path exists
- post-deploy smoke test exists
- deployment log is updated
