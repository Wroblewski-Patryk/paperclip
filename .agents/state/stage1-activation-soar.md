# Stage 1 Activation Packet: Soar

Last updated: 2026-07-04
Status: Draft, not approved for agent execution

## Purpose

Soar is the first active app lane and is personally important for capital
growth. Stage 1 activation should focus on making Soar verifiably usable and
deployable before broad feature expansion.

## Activation Preconditions

- Owner approves Stage 1 for Soar.
- Required secrets are present as Paperclip secret refs, not raw values.
- Paperclip agents needed for Soar are selectively resumed.
- Relevant routines are selectively activated only after owner approval.
- Soar repo path is freshly verified before work starts.
- Current git state is classified before any push or deploy.
- `.agents/state/softwarehouse-resource-policy.md` is reviewed. Soar work must
  not assume a paid GitHub plan, paid Actions capacity, Advanced Security, paid
  runners/packages/storage, enterprise-only controls, paid GitHub AI features,
  or notification-heavy automation.

## Known Context To Reverify

- Expected project/repo name: `Soar`.
- Product app should be handled in its own repo, not from the Paperclip control-plane repo.
- Prior memory reported Soar source-control risk: branch ahead/behind and dirty lines. Treat this as stale until reverified, but do not ignore it.

## First User-Visible Outcome

Define and prove one narrow Soar outcome that matters to the owner, such as:

- a working local app path;
- a production readiness/smoke status;
- a verified core flow related to capital-growth assumptions;
- or a clear blocker report if credentials/exchange/provider access is missing.

## Evidence Gates

- Repo path and git status captured.
- Required secret refs listed and missing refs reported by name only.
- Local verification result attached or summarized.
- If deploy-impacting: branch/push status and Coolify status captured.
- If production is touched: smoke evidence captured and board approval recorded.

## Suggested Initial Agents After Approval

- `11 SPM (Soar Product Manager)` for product scope.
- `09 CTO (Chief Technology Officer)` for technical map.
- `09 FEW`, `09 CBE`, `09 DBE`, `09 QVE`, `09 DRE` only as needed.
- `10 SPA` for secrets/security-sensitive paths.

## Do Not Do By Default

- Do not push, deploy, rotate secrets, or modify live accounts without the required gate.
- Do not create broad implementation trees before the activation packet is reviewed.
- Do not treat old source-control memory as current without fresh verification.
- Do not add GitHub workflows, scheduled checks, security campaigns, or other
  repeated-email automation without explicit owner approval.
