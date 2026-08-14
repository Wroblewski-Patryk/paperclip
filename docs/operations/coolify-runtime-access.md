# Coolify runtime-access bindings

The helper at scripts/configure-coolify-runtime-access.mjs audits and updates
Paperclip secret-ref environment bindings for the configured Coolify access
plans. It resolves opaque references through the same-company
/secrets/metadata endpoint. It does not read the board-only secret endpoint.

## Dry-run modes

The compatibility audit remains read-only and may inspect every configured
agent and routine:

~~~powershell
pnpm softwarehouse:coolify-runtime-access
~~~

For a bounded dry-run, select exactly one target and at least one environment
binding name:

~~~powershell
node scripts/configure-coolify-runtime-access.mjs --agent '09 DRE (Deployment & Reliability Engineer)' --binding COOLIFY_API_TOKEN,COOLIFY_BASE_URL
~~~

Use --routine followed by an ID or exact title instead of --agent for a
routine. Selectors match only an ID or an exact case-insensitive name/title.
Binding names may be comma-separated or supplied through repeated --binding
options.

## Scoped apply

Apply mode is fail-closed unless all of these conditions are true:

- exactly one agent or one routine is selected;
- the binding selection is explicit, non-empty, and has no duplicate names;
- every selected binding has a configured secret alias present in metadata;
- PAPERCLIP_RUN_ID is present in the active run context.

~~~powershell
node scripts/configure-coolify-runtime-access.mjs --routine '[Soar] Coolify production deploy' --binding COOLIFY_BASE_URL --apply
~~~

Every PATCH includes X-Paperclip-Run-Id. The helper merges only the selected
bindings into the current agent adapter configuration or routine environment;
unselected environment entries and unrelated configuration keys remain
unchanged.

Output is names-only. It reports target names, binding names, and secret alias
names, but never secret IDs, values, provider references, or account data.

## Focused verification

~~~powershell
node --test scripts/configure-coolify-runtime-access.test.mjs
~~~

On a restricted Windows host that denies the test runner's worker process, run
the same tests in-process:

~~~powershell
node --test --experimental-test-isolation=none scripts/configure-coolify-runtime-access.test.mjs
~~~
