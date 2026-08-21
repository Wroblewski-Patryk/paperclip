# Coolify runtime-access bindings

Paperclip exposes provider reads only through bounded, audited runtime routes.

## Featherly inventory route

An active same-company agent runtime with persisted secret-ref bindings for
`COOLIFY_BASE_URL` and `COOLIFY_API_TOKEN` can call:

~~~text
GET /api/companies/:companyId/softwarehouse/coolify/featherly-inventory
~~~

The route is intentionally fixed to Coolify project
`a14a7zgzt6r13wtqxe5c916y`, environment
`gz5uke25v3tpqcc0o47gyw2e`, and application
`dc1mn3hep62twm6ih582kblw`. It accepts no target, method, host, or endpoint
input. The token binding must resolve to the `coolify_read_api_token` secret
alias, and the base URL binding must resolve to `coolify_base_url`.

Paperclip performs only the three fixed provider GETs for project,
environment, and application identity. Redirects are not followed. Returned
evidence is limited to HTTP result categories, verified scope links, redacted
identity/status fields, the heartbeat session/audit references, and explicit
`providerWriteAttempted: false` / `secretsReturned: false` assertions.
Board sessions, agent keys without a heartbeat run, plain-text bindings,
different secret aliases, scope mismatches, non-HTTPS origins, URL paths,
credentials, query strings, fragments, and non-443 ports fail closed.

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
