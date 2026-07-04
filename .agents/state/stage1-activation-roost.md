# Stage 1 Activation Packet: Roost

Last updated: 2026-07-04
Status: Draft, not approved for agent execution

## Purpose

Roost is the second active app lane and the future operating surface for the
autonomous digital-services company. Stage 1 should make Roost ready enough to
support the later VPS/company-operation story without broad uncontrolled work.

## Activation Preconditions

- Owner approves Stage 1 for Roost.
- Required secrets are present as Paperclip secret refs, not raw values.
- Paperclip agents needed for Roost are selectively resumed.
- Relevant routines are selectively activated only after owner approval.
- Roost repo path is freshly verified before work starts.
- Current git state is classified before any push or deploy.
- `.agents/state/softwarehouse-resource-policy.md` is reviewed. Roost work must
  not assume a paid GitHub plan, paid Actions capacity, Advanced Security, paid
  runners/packages/storage, enterprise-only controls, paid GitHub AI features,
  or notification-heavy automation.

## Known Context To Reverify

- Expected project/repo name: `Roost`.
- Product app should be handled in its own repo, not from the Paperclip control-plane repo.
- Roost is tied to Stage 2 readiness: Paperclip on VPS plus Roost as a company/customer/service interface.

## First User-Visible Outcome

Define and prove one narrow Roost outcome that helps the autonomous company
story, such as:

- a working local Roost app path;
- a verified dashboard/service workflow;
- a deploy readiness report;
- or a clear blocker report if hosting/database/payment/provider access is missing.

## Evidence Gates

- Repo path and git status captured.
- Required secret refs listed and missing refs reported by name only.
- Local verification result attached or summarized.
- If deploy-impacting: branch/push status and Coolify status captured.
- If production is touched: smoke evidence captured and board approval recorded.

## Suggested Initial Agents After Approval

- `11 RPM (Roost Project Manager)` for product scope.
- `09 CTO (Chief Technology Officer)` for technical map.
- `09 FEW`, `09 CBE`, `09 DBE`, `09 QVE`, `09 DRE` only as needed.
- `05 CCO` / `05 CSM` for customer/service workflow assumptions.
- `10 SPA` for secrets/security-sensitive paths.

## Do Not Do By Default

- Do not push, deploy, rotate secrets, or modify live accounts without the required gate.
- Do not create broad implementation trees before the activation packet is reviewed.
- Do not turn Roost into the whole company before the first narrow outcome is proven.
- Do not add GitHub workflows, scheduled checks, security campaigns, or other
  repeated-email automation without explicit owner approval.
