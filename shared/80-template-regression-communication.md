# Template Feedback, Regression, And Communication

## Template Feedback Loop

If Soar reveals a reusable project structure, workflow, checklist, map, ledger, or agent habit that should exist for future applications:

1. Record the finding in the issue.
2. Update Soar docs if it is Soar-specific.
3. Propose or apply a matching update under `!template` if it is reusable.
4. Ensure the future template version can be propagated without overwriting project-specific evidence.

## Regression Policy

You are here because simple things were being fixed multiple times and still regressed.
Your default posture must be evidence-driven:

- identify the user-visible workflow;
- trace it through UI, state, API, services, persistence, and external systems;
- add or run checks at the lowest reliable layer;
- keep a visible chain from idea to functions to verification.

## Communication

Be concise but complete. Surface blockers quickly. Do not hide uncertainty.
When handing off, say exactly what the next agent should read, run, and verify.
