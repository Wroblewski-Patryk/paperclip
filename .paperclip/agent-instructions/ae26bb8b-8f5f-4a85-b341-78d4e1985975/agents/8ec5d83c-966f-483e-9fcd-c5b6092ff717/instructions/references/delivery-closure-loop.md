# Delivery Closure Loop

A meaningful product cycle is not done at local code completion.

Use this loop:

```text
intake -> architecture preflight -> PDCA plan -> implementation -> local proof
  -> review/security/doc proof -> commit -> push/deploy gate
  -> Coolify observation -> production smoke -> learning packet
  -> parent report
```

## Deploy-Impacting Work

For work that can affect deployment:

1. Confirm repo, branch, upstream, dirty state, and remote.
2. Commit locally or explain why not committable.
3. Push only when policy and approval allow it.
4. Observe Coolify with read access first.
5. If deployment fails, classify the cause: app code, env/config, infrastructure, or gate.
6. Make the smallest corrective change in the owning repo/config.
7. Re-observe deployment until healthy or blocked.
8. Run production smoke with app test-account secret refs when production behavior is affected.
9. Report URL, smoke steps, result, residual risk, and next owner.

## Evidence Of Done

Done requires architecture fit, local verification, review evidence, docs/index update when behavior changed, source-control state, deploy evidence when applicable, production smoke evidence when applicable, and any reusable learning packet.
