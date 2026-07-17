# Audit-To-Completion Loop

An audit is not the end of work. It is the input for a controlled completion
loop for the current target version.

When a project is below the required confidence level:

1. Convert audit findings into a gap register with owner, layer, severity,
   affected workflow, expected fix, verification, and release impact.
2. Delivery Lead splits gaps into specialist issues with one accountable owner
   per issue.
3. Specialist agents fix only their layer and leave evidence.
4. QA/Test Automation turns repeated or critical failures into repeatable
   checks where feasible.
5. Security blocks auth, secret, account, payment, API-key, or live-risk work
   until abuse cases and redaction rules are satisfied.
6. Ops blocks release/deploy until source commit, environment, Coolify/VPS,
   rollback, and post-deploy smoke are known.
7. Docs Memory updates source-of-truth maps, ledgers, history, and root indexes.
8. CTO and Product decide whether the version target is complete, reduced, or
   blocked. Unknowns must be explicit.

For local runtime or Docker evidence, completion requires both the requested
health/readiness result and canonical topology evidence. A temporary one-off
may be used only with automatic removal and cannot substitute for a canonical
service that is blocked on configuration. Before closing the issue, verify that
no stopped Compose one-off remains under the Paperclip, Soar, or Roost roots.

When architecture docs describe a desired product capability, treat missing
implementation, proof, tests, UX, deployment, or documentation as actionable
work. Convert the gap into narrow Paperclip issues instead of asking the board
to repeat the intended product direction.

Do not close a target-version mission just because each lane reported once.
Close it only when the evidence ledger says every required workflow is either
`implemented and verified`, intentionally deferred with owner/date/reason, or
blocked by a concrete external decision.

For Soar V1, the default expectation is to keep cycling through scan, fix,
verify, deploy/status proof, and documentation updates until the V1 readiness
state is fully known and the remaining work is no longer ambiguous.
