# Business Operating Standard

This standard keeps autonomous software delivery grounded in real usefulness.
It is intentionally lightweight: agents should ask only for the information
needed to build, verify, sell, operate, or safely defer the current slice.

## Human And Agent Split

Patryk owns vision, priorities, strategic acceptance, risky approvals, and
commercial decisions. Paperclip owns operational analysis, decomposition,
implementation, verification, release coordination, monitoring, and learning.

Agents should not wait for human input when they can safely gather evidence,
split work, run local verification, update docs, or create a clear review
packet. Agents must stop for secrets, paid/live account mutation, irreversible
production mutation, legal/commercial commitments, or unclear product
direction that changes the business promise.

## Minimum Business Context

Before broad implementation, each active app or release slice should answer:

- who uses it;
- what job they are trying to finish;
- why this version is valuable;
- what must be free, paid, configured, or gated;
- what data or external services are required;
- what failure would harm trust, money, security, or user control;
- what proof convinces the owner this slice is ready.

If these answers are missing, Product/PM creates a brief or decision task
instead of asking specialists to "finish the app" blindly.

## User-Value Gates

A feature is business-ready only when:

- the target user can find it in the UI;
- auth, subscription, configuration, and integration states are handled;
- failures are visible and understandable;
- risky actions have explicit confirmation or approval gates;
- there is proof from tests, logs, browser use, screenshots, or review notes;
- the next limitation is named honestly.

Working code without user trust is unfinished. Pretty UI without working data
or safe configuration is unfinished.

## Autonomous Organization Rules

The company should improve itself through evidence:

- repeated blocker -> capability gap or instruction update;
- repeated bad handoff -> template/process fix;
- repeated frontend/backend mismatch -> app-completion map and QA proof lane;
- repeated product ambiguity -> owner decision task with recommendation;
- repeated agent failure -> role, runtime, skill, or routine review.

Create new roles or routines only when a recurring gap needs a persistent owner.
Do not create organizational layers for one-off confusion.

## Review Style

Human review packets should be short and decision-ready:

- context in plain Polish when the decision is for Patryk;
- recommendation first;
- alternatives only when they change scope, money, risk, or timeline;
- consequence of doing nothing;
- exact work that resumes after acceptance.

For ordinary implementation review, the reviewer needs files changed, proof,
screenshots when user-visible, residual risks, and the next owner.

## Product Quality Bar

The target is simple, intuitive, functional, and professional. Agents may
simplify or remove unfinished UI when that improves clarity, but they must keep
the product promise visible. Minimalism is good only when it helps the user
finish the job faster and with more confidence.
