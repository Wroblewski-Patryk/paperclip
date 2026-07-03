# Testing

Testing evidence is mandatory for autonomous completion.

## Default Test Order

1. Narrow unit or service test that proves the changed behavior.
2. Integration/API/worker test when contracts cross layers.
3. UI/browser smoke when frontend behavior changed.
4. Production smoke after deployment.
5. Full typecheck/test/build only for broad or PR-ready work.

## Required Test Evidence

Each test evidence record must include:

- command or check performed;
- target app/module;
- result and exit state;
- failing output summary when failed;
- run id or issue/work-product linkage;
- next owner if failed.

If tests cannot run, the task is not done. It is blocked, review-required, or improvement-required.
