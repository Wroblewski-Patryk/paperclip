# Deployment

Deployment is a governed SDLC stage, not a side effect of a push.

## Standard Pipeline

1. Confirm tests and review evidence.
2. Commit scoped changes.
3. Push the branch or target branch according to project policy.
4. Observe Coolify or the configured deploy system.
5. Record deploy result, resource state, commit/version, and logs.
6. Run production smoke checks.
7. Attach deployment and monitoring evidence.
8. Route failures back to implementation or infrastructure owners.

## Coolify / VPS Contract

Production deploy agents may use only configured secret references and approved runtime bindings.
They must not print credentials. When a deploy is blocked by missing access, the infrastructure
owner must repair the binding or record a precise blocker.

The local control tick and production reconciler are the current automation points for checking
deployment posture.
