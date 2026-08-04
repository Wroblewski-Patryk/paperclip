# Product Intent, Assumptions, Architecture, And Observed Truth

The board does not need to restate product expectations already captured in a
project's current documentation authority. It also must not be surprised by an
agent treating an old idea, generated report, or unresolved assumption as an
approved feature.

## Authority Order

Read `docs/documentation-contract.json` in the assigned application first. Use
only its declared current sources and keep these meanings separate:

1. **Owner intent**: what Patryk asked the product to do. Conversation is input;
   capture confirmed behavior in the declared `docs/product/` authority.
2. **Assumption**: a hypothesis, inference, or unclear consequence. Keep a
   durable register in `docs/product/assumptions.md` only when needed, or use
   the declared open-decisions source. Pending assumptions are not authority.
3. **Product contract**: approved users, journeys, behavior, scope, non-goals,
   and acceptance boundary under the declared product authority.
4. **Architecture contract**: the declared architecture/ADR/decision sources
   explaining how approved product behavior is realized.
5. **Observed truth**: current code, tests, browser/runtime behavior, deployment
   identity, and the declared project-truth index.

Observed behavior can prove a gap; it cannot silently replace intended
behavior. Architecture must not invent product meaning. Product text must not
pretend an unverified implementation already works.

Legacy owner ideas inside `docs/architecture/` remain valid input. Before using
one, classify it as approved product intent, approved architecture, unresolved
assumption, superseded material, or conflict. Move or link the rule to the
narrowest canonical source when touched; never delete historical context just
to make an audit green.

## Required Trace Before Autonomous Implementation

This gate is for application behavior changes and product-bound safety or
reliability changes. Known-state refresh, observation, proof collection,
documentation/architecture maintenance, and Softwarehouse control work retain
their own evidence contracts; do not fabricate owner intent for them. Use the
canonical work-class title tags so routing is machine-readable. Adding an
explicit trace opts the issue into the product gate regardless of its title.

Every issue admitted into an autonomous ProductDelivery must contain this
completed block with repo-relative authoritative paths:

```markdown
<!-- softwarehouse-product-intent-trace:v1 -->
## Product Intent Trace

- Owner intent: docs/product/<current-source>.md
- Product contract: docs/product/<current-source>.md#relevant-section
- Architecture contract: docs/architecture/<current-source>.md#relevant-section
- Observed gap: <evidence-backed difference between intended and actual state>
- Assumption disposition: none | validated - <evidence> | owner_approved - <decision> | rejected - <reason> | experiment_only - <bounded non-production scope>
- Expected outcome: <smallest owner-visible or necessary risk-reducing state change>
- Acceptance evidence: <tests, browser/QA, review, deploy, and observation proof required>
```

`Architecture contract` may be `not_applicable - <substantive rationale>` only
for work that truly changes no product architecture. `pending`, `unknown`,
`unvalidated`, `needs_decision`, or `conflict` keeps implementation blocked.

## Reconciliation And Derivation

- If the owner adds a compatible consequence to an existing journey, Product
  may derive the smallest complete behavior and record it before task creation.
  Example: a Settings sidebar link implies an authenticated route, navigation
  state, authorization, empty/error states, and a return path; it does not
  authorize unrelated account features.
- If sources disagree but the resolution is technical, reversible, and inside
  approved product behavior, Product plus Architecture may decide and record an
  ADR or product clarification within their authority.
- If the choice changes owner-visible behavior, business scope, safety,
  privacy, money, production authority, or another approved owner rule, present
  the conflict and 2-3 options to the owner. Do not guess.
- Missing or conflicting traceability creates exactly one project-scoped PM
  reconciliation child that blocks the implementation source. The child fixes
  the canonical source and patches the source issue; it does not implement the
  feature and does not manufacture a backlog tree.

The executable check is `pnpm softwarehouse:product-intent-traceability`.
ProductDelivery admission independently rejects an incomplete trace even if a
caller bypasses the normal autonomous dispatcher.
