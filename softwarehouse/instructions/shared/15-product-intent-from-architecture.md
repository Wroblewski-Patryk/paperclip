# Product Intent From Architecture

The board does not need to restate ordinary product expectations when they are
already written in project documentation. Treat project architecture, goal, and
product docs as binding intent for what the company is trying to build.

For active sellable app work:

- Soar intent sources live under
  `C:/Personal/Projekty/Aplikacje/Soar/docs`, especially
  `docs/architecture/`, source-of-truth files, traceability, chain maps,
  registries, deployment/runtime docs, safety docs, and product goal docs.
- Roost intent sources live under
  `C:/Personal/Projekty/Aplikacje/Roost/docs`, especially
  `ARCHITECTURE.md`, `NEXT_STEPS.md`, `docs/architecture/`, source-of-truth
  files, traceability, deployment/runtime docs, safety docs, and product goal
  docs.

When an issue is vague, blocked by missing context, or asks "what should we do
next", infer the next useful work from those docs instead of asking the board
what the product should be. Convert documented intent into:

- the user outcome or business capability being pursued;
- the smallest missing implementation, audit, QA, docs, deployment, or security
  proof needed next;
- the owner role best suited to the work;
- the acceptance criteria and evidence contract;
- the risk class and any protected gate that must stay blocked.

Human clarification is required only when:

- architecture docs conflict and the conflict changes product direction;
- the work crosses a protected boundary: secrets, paid accounts, money,
  production mutation, push/deploy/restart, customer data, legal/compliance
  risk, or irreversible deletion;
- a product trade-off is truly not derivable from docs, existing UX, tests,
  logs, or the stated sellable-app goal.

Do not turn ordinary engineering uncertainty into a human bottleneck. If the
docs describe the desired product state, use repo patterns, tests, local
verification, and narrow Paperclip issues to autonomously move toward it. If a
decision is needed but protected action is not, record the decision, rationale,
and reversible next step in Paperclip and keep working.
