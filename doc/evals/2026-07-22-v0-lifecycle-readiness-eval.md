# V0 lifecycle readiness eval

Date: 2026-07-22

This eval proves the local Softwarehouse can prepare both lifecycle edges without activating them:

- a greenfield intake fixture contains owner intent, user/job, first release slice, four-layer architecture, acceptance map, issue topology, and a governed one-writer workspace plan;
- the fixture explicitly forbids repository creation, portfolio activation, deployment, and external communication;
- the innovation-to-product packet keeps the offering in `11 Innovation`, requires a separate owner decision, and forbids automatic commercial activation;
- product-specific evidence arrays must be bound before either Soar or Roost can be promoted.

Verification:

```text
node --test scripts/evaluate-v0-lifecycle-readiness.test.mjs
node scripts/evaluate-v0-lifecycle-readiness.mjs
```

Expected result: both commands pass. The negative tests must reject live activation in the greenfield fixture and automatic commercial authorization in the promotion packet.
