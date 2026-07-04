# Softwarehouse Resource Access Matrix

Last updated: 2026-07-04

Purpose: keep Stage 0 and Stage 1 access decisions explicit. This is the
resource governance source of truth for agents, skills, secrets, instructions,
routines, tools, repositories, deployments, and production test accounts.

## Operating Rule

Minimum responsibility, maximum diversification:

- Give each agent the smallest useful access for its role.
- Prefer separate owners for planning, execution, verification, security, and
  release evidence.
- Do not give every agent every secret, tool, skill, or repository capability.
- Missing access should be reported as a configuration defect with the exact
  resource name; agents must not ask for raw secret values.
- Agents may propose changes to their access, instructions, skills, or routines,
  but may not self-edit them. Access changes go through board/Codex in Stage 0
  and through governed approvals in Stage 1.

## Local Workspace Boundary

Stage 1 autonomous work is allowed only inside these roots:

- `C:\Personal\Projekty\Aplikacje\Paperclip_Softwarehouse`
- `C:\Personal\Projekty\Aplikacje\Soar`
- `C:\Personal\Projekty\Aplikacje\Roost`

The parent folder `C:\Personal\Projekty\Aplikacje` is not an agent workspace.
Agents must not create helper folders, generated indexes, scripts, scratch
files, or cleanup outputs directly in that parent folder. Agents must not delete
or "tidy" sibling app folders such as Nest, Featherly, Aviary, LuckySparrow.ch,
OpenJarvis, Obiekty, or other owner experiments. If a file/folder is outside the
three active roots and the owner has not explicitly approved work there, agents
must leave it untouched and report a boundary issue.

Verification command:

- `pnpm run softwarehouse:workspace-boundary-audit`

## Current Hard Permissions

| Capability | Current implementation |
| --- | --- |
| Create/hire AI agents | Only `06 AIM (AI Agent Manager)` has `permissions.canCreateAgents: true`. |
| Assign/create routed task work | Current live access is permissive: all 38 agents have `tasks:assign` grants. Treat this as an execution-compatibility posture, not as the desired organizational authority model. Agents must still follow reporting-tree routing in instructions. |
| Stage 0 execution | All 38 agents are paused. No Paperclip issues/tasks or live runs. |
| Routines | 10 routines exist as paused assets only; every schedule trigger is disabled. |
| Secrets | Paperclip `local_encrypted` managed secrets with `secret_ref` env bindings only. |
| Self-modification | Forbidden by shared instructions. Agents produce learning/access-change packets instead. |

## Task Assignment Authority Gap

Paperclip supports constrained assignment through `tasks:assign_scope` with
`managerAgentId` / subtree-style scopes. The current LuckySparrow instance
still has broad `tasks:assign` on every agent for compatibility with active
autonomous work.

Operating rule until enforcement is tightened:

- broad task assignment access does not mean broad organizational authority;
- agents must route cross-department work through `reportsTo` and the
  reporting-tree contract;
- direct cross-department assignment is a policy violation unless the parent
  issue already names that gate/specialist or an emergency exception is
  documented;
- do not change these grants during active delivery without a scoped access
  migration plan and recovery path, because overly aggressive permission
  removal can strand agents that need to create child issues, comments, or
  handoffs.

Future hardening candidate:

- keep broad assignment for `00 AIA`, relevant department heads, `04 COO`,
  `04 DPM`, `09 CTO`, `09 QVE`, `10 CLO`/`10 SPA`, and `06 AIM` as justified;
- convert ordinary specialists to `tasks:assign_scope` limited to their own
  subtree, direct manager path, or explicit project/gate scopes;
- add an audit that flags cross-department direct assignments where no common
  manager route or emergency exception is documented.

## Coolify Secret Access

Configured secrets:

- `coolify_base_url`
- `coolify_api_url`
- `coolify_login_email`
- `coolify_login_password`
- `coolify_read_api_token`
- `coolify_deploy_api_token`
- `coolify_team_id_luckysparrow`
- `coolify_team_name_luckysparrow`
- Soar project/environment/resource ids
- Roost app resource id
- Soar/Roost production URLs and test-account refs

Runtime env names:

- `COOLIFY_BASE_URL`
- `COOLIFY_API_URL`
- `COOLIFY_LOGIN_EMAIL`
- `COOLIFY_LOGIN_PASSWORD`
- `COOLIFY_READ_API_TOKEN`
- `COOLIFY_DEPLOY_API_TOKEN`
- `COOLIFY_TEAM_ID_LUCKYSPARROW`
- `COOLIFY_TEAM_NAME_LUCKYSPARROW`
- `SOAR_PROD_BASE_URL`
- `SOAR_API_BASE_URL`
- `ROOST_PROD_BASE_URL`
- `ROOST_API_BASE_URL`

Access tiers:

| Tier | Agents | Bound env refs | Intended use |
| --- | --- | --- | --- |
| Coolify read observer | `00 AIA`, `04 COO`, `04 DPM`, `06 AIM`, `09 CTO`, `09 TSA`, `09 CBE`, `09 FEW`, `09 IDE`, `09 QVE`, `09 RTE`, `09 DRE`, `10 SPA`, `11 SPM`, `11 RPM` | Coolify base/API URL, read token, team id/name, Soar resource ids, Roost app id, app base URLs | Observe resources, deployments, app status, and evidence paths through API/browser without raw credentials. |
| Coolify deploy operator | `00 AIA`, `09 CTO`, `09 DRE`, `10 SPA` | `COOLIFY_DEPLOY_API_TOKEN` | Governed deployment actions only after an approved release/deploy gate. |
| Coolify login operator | `00 AIA`, `09 CTO`, `09 DRE`, `10 SPA` | all Coolify env refs including login email/password | Board-approved UI observation, team switching, deploy/resource discovery, failed deploy diagnosis. |
| Executive acceptance | `12 CEO` | no Coolify login/deploy/read secrets by default in Stage 1 | Accept or reject executive packets based on evidence supplied by AIA, Product, Technology, QA, Security, and Operations. |

Current Coolify facts:

- `LuckySparrow` is Coolify team id `0`; the initial login team `ai's Team`
  has no projects.
- Soar project id/UUID, production environment UUID, six app resource UUIDs,
  PostgreSQL UUID, Redis UUID, web URL, and API URL are configured as refs.
- Roost is a docker-compose app resource with configured domains for
  `roost.luckysparrow.ch`, `api.roost.luckysparrow.ch`,
  `companycore.luckysparrow.ch`, and `api.companycore.luckysparrow.ch`.
- Prefer `COOLIFY_READ_API_TOKEN` for observation before using UI
  login/password.

## Production Test Accounts

Each app should have exactly scoped production smoke-test account secrets.
Suggested names:

- `SOAR_PROD_TEST_BASE_URL`
- `SOAR_PROD_TEST_EMAIL`
- `SOAR_PROD_TEST_PASSWORD`
- `SOAR_PROD_TEST_TOTP_SECRET` only if MFA is required
- `ROOST_PROD_TEST_BASE_URL`
- `ROOST_PROD_TEST_EMAIL`
- `ROOST_PROD_TEST_PASSWORD`
- `ROOST_PROD_TEST_TOTP_SECRET` only if MFA is required

Configured access:

| App | Primary agents | Verification agents | Security oversight |
| --- | --- | --- | --- |
| Soar | `11 SPM`, `09 FEW`, `09 CBE`, `09 IDE` as needed | `09 QVE`, `09 TAE`, `09 DRE` | `10 SPA` |
| Roost | `11 RPM`, `09 FEW`, `09 CBE`, `09 IDE` as needed | `09 QVE`, `09 TAE`, `09 DRE` | `10 SPA` |

The configured Stage 0 refs are additionally visible to `00 AIA` and `09 CTO`
for orchestration/technical governance. Do not bind production test accounts to
all agents.

## Owner-Linked Integration Credentials

Some Stage 1 verification requires the owner's app account because third-party
providers are connected only there. These refs are separate from AI smoke
accounts and are not default smoke credentials:

This is the general pattern for future apps too. Do not create or bind
owner-linked credentials merely because a product exists. During a product's
activation packet, decide whether the app has third-party/provider capabilities
that cannot be exercised through AI smoke accounts. If yes, create the narrowest
app-specific owner-linked refs and bind them only to the verification/security
roles that need them. If no, rely on ordinary AI smoke accounts only.

- `SOAR_OWNER_PROD_EMAIL`
- `SOAR_OWNER_PROD_PASSWORD`
- `ROOST_OWNER_PROD_EMAIL`
- `ROOST_OWNER_PROD_PASSWORD`

Access:

| App | Bound agents | Intended use | Hard gates |
| --- | --- | --- | --- |
| Soar | `09 DRE`, `09 QVE`, `10 SPA` | Owner-linked Binance/exchange integration verification when AI smoke accounts cannot exercise the flow. Prefer read-only health/status, dry-run, paper mode, and non-mutating evidence. | LIVE trading, order placement/cancel, exchange key changes, wallet/funds movement, or real market mutation require separate explicit owner approval for the exact action. |
| Roost | `09 DRE`, `09 QVE`, `10 SPA` | Owner-linked Google Drive or third-party integration verification when AI smoke accounts cannot exercise the flow. Prefer read-only status, metadata, and non-destructive proof. | File deletion, sharing changes, external sends, provider config mutation, or destructive third-party actions require separate explicit owner approval for the exact action. |

`00 AIA` owns Polish owner-facing coordination and approvals, but does not get
owner-linked credential refs by default. If AIA needs to authorize a specific
owner-linked integration test, it should issue a clear decision packet rather
than receiving broad secret access.

Future app examples:

- A future Nest lane may need owner-linked refs if its real third-party
  provider integrations are intentionally connected only to the owner's
  account.
- Apps without owner-linked providers should not receive this credential class.

## Skills

Skills are capability modules, not decorations:

- Attach only skills needed by the role.
- Planning/PM roles get planning, triage, documentation, and product skills.
- Engineering roles get implementation, review, QA, browser, release, and
  relevant Paperclip operations skills.
- Security/legal roles get security/review/compliance skills.
- Hiring/agent-management skills belong to `06 AIM` and supporting 06 roles,
  not to all agents.

Future check before Stage 1:

- Export desired skill assignments by agent.
- Remove any skill that is unrelated to the role's department or Stage 1 lane.
- Keep shared standards in instructions, but keep executable skills scoped.

## Instructions And Markdown Resources

Shared files every agent may read:

- `references/company-operating-model.md`
- `references/standards.md`
- `references/learning-and-self-correction.md`
- `references/hiring-and-agent-governance.md`
- `references/secrets-deploy-evidence.md`
- `references/end-to-end-operating-flow.md`
- `references/departments-and-naming.md`
- `references/resource-and-github-policy.md`
- `references/product-architecture-source-of-truth.md`
- `references/innovation-to-product-lifecycle.md`
- `references/delegation-and-reporting-contract.md`
- `references/agent-activation-governance.md`
- `references/delivery-closure-loop.md`
- `references/gap-detection-and-learning-packets.md`
- `references/procedures-and-task-lifecycle.md`
- `references/owner-interface-and-language-policy.md`
- `references/cost-token-and-context-efficiency.md`

Editing policy:

- Agents may not directly edit their own instruction bundle.
- Learning or access improvements must be proposed as packets for review.
- Shared files should remain practical and concise; role-specific files carry
  department/role detail.
- Product architecture, delegation, closure, and learning references are shared
  because every role must respect source-of-truth docs, parent reporting,
  duplicate prevention, evidence gates, and governed self-improvement.
- Procedure/task lifecycle guidance is shared because every agent that touches
  work must understand how to create, update, decompose, close, and improve
  tasks constructively.
- Owner interface/language guidance is shared because every agent must know
  that AIA owns owner-facing Polish decision packets and that internal work
  remains English-first.

## Tools And Plugins

Current Stage 1 stance:

- No tool is treated as universally available to every role.
- Tool use should follow role scope, issue scope, explicit env bindings, and
  evidence gates.
- Plugin tools, browser tools, deployment tools, repo-write tools, and
  production-touching tools may be used for `LUC-25` Soar/Roost delivery when
  the assigned role, issue scope, and evidence gates justify them.
- Marketing/sales/customer-service, parked products, paid features, raw secret
  exposure, destructive actions, and LIVE trading/order proof remain out of
  scope unless separately approved.

Default tool classes by role:

| Tool class | Default owners |
| --- | --- |
| Local tests/builds | `09 QVE`, `09 TAE`, relevant engineer, `09 CTO` |
| Browser verification | `09 QVE`, `09 FEW`, app PM, `10 SPA` for security-sensitive flows |
| Git read/status | relevant engineer, `09 CTO`, `09 DRE`, PM for project status |
| Git push/release | `09 DRE` with `09 CTO`/PM evidence gate and board-approved activation |
| Coolify/deploy observation | Coolify login operator tier above |
| Secret changes/rotation | `10 SPA` plus board/Codex approval; no autonomous raw-value handling |
| Agent hiring/config | `06 AIM` only after procedure |

## Repositories And Files

- `Paperclip_Softwarehouse` is the control-plane repo.
- Product apps such as Soar and Roost are separate repos.
- Agents must identify the repo before changing files.
- Product-app repo write access should be scoped to the assigned app and issue.
- Root-level generated indexes under `C:\Personal\Projekty\Aplikacje` are
  forbidden; project state belongs in the relevant project repo or Paperclip
  evidence artifacts.
- Broad rewrites, destructive git, force push, and production config changes are
  board-gated.

## Stage 1 Access Change Packet

Any request for more access must include:

- requesting agent;
- resource type: secret, skill, tool, repo, environment, routine, instruction,
  app test account, or deployment;
- exact resource name/ref;
- purpose and first task that needs it;
- least-privilege alternative considered;
- risk and rollback/removal path;
- expiry/review condition.
