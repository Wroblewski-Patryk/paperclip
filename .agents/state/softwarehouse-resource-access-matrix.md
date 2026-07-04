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

## Current Hard Permissions

| Capability | Current implementation |
| --- | --- |
| Create/hire AI agents | Only `06 AIM (AI Agent Manager)` has `permissions.canCreateAgents: true`. |
| Stage 0 execution | All 38 agents are paused. No Paperclip issues/tasks or live runs. |
| Routines | 7 routines exist as paused assets only; every schedule trigger is disabled. |
| Secrets | Paperclip `local_encrypted` managed secrets with `secret_ref` env bindings only. |
| Self-modification | Forbidden by shared instructions. Agents produce learning/access-change packets instead. |

## Coolify Secret Access

Configured secrets:

- `coolify_base_url`
- `coolify_api_url`
- `coolify_login_email`
- `coolify_login_password`

Runtime env names:

- `COOLIFY_BASE_URL`
- `COOLIFY_API_URL`
- `COOLIFY_LOGIN_EMAIL`
- `COOLIFY_LOGIN_PASSWORD`

Access tiers:

| Tier | Agents | Bound env refs | Intended use |
| --- | --- | --- | --- |
| Coolify URL observer | `00 AIA`, `04 COO`, `04 DPM`, `06 AIM`, `09 CTO`, `09 TSA`, `09 CBE`, `09 FEW`, `09 IDE`, `09 QVE`, `09 RTE`, `09 DRE`, `10 SPA`, `11 SPM`, `11 RPM`, `12 CEO` | `COOLIFY_BASE_URL`, `COOLIFY_API_URL` | Know where Coolify/API is, report missing token/team/resource ids, prepare evidence paths. |
| Coolify login operator | `00 AIA`, `09 CTO`, `09 DRE`, `10 SPA`, `12 CEO` | all Coolify env refs including login email/password | Board-approved UI observation, team switching, deploy/resource discovery, failed deploy diagnosis. |

Current gap:

- `COOLIFY_API_TOKEN`, `COOLIFY_TEAM_ID`, `COOLIFY_PROJECT_ID_SOAR`,
  `COOLIFY_PROJECT_ID_ROOST`, `COOLIFY_RESOURCE_ID_SOAR`, and
  `COOLIFY_RESOURCE_ID_ROOST` are not yet configured.
- Once a read-only API token exists, prefer token-based observation over UI
  login/password and reduce password bindings further if possible.

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

Initial intended access:

| App | Primary agents | Verification agents | Security oversight |
| --- | --- | --- | --- |
| Soar | `11 SPM`, `09 FEW`, `09 CBE`, `09 IDE` as needed | `09 QVE`, `09 TAE`, `09 DRE` | `10 SPA` |
| Roost | `11 RPM`, `09 FEW`, `09 CBE`, `09 IDE` as needed | `09 QVE`, `09 TAE`, `09 DRE` | `10 SPA` |

Do not bind production test accounts to all agents. Bind only after the app's
Stage 1 activation packet names the first outcome and evidence path.

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

Editing policy:

- Agents may not directly edit their own instruction bundle.
- Learning or access improvements must be proposed as packets for review.
- Shared files should remain practical and concise; role-specific files carry
  department/role detail.

## Tools And Plugins

Current Stage 0 stance:

- No tool is treated as universally available to every role.
- Tool use should follow role scope, issue scope, explicit env bindings, and
  evidence gates.
- Plugin tools, browser tools, deployment tools, repo-write tools, and
  production-touching tools are high-risk until Stage 1 proves the flow.

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
