# Softwarehouse Architecture Gap Analysis

Last updated: 2026-07-04

Scope: critical architecture review of the owner's desired autonomous
Softwarehouse loop against the current Stage 0 Paperclip configuration.

## Current Finding

Stage 0 is structurally strong: agents are paused, routines are paused, no
issues exist, secrets are configured through refs, departments are numbered,
and Soar/Roost are identified as first app lanes.

The main remaining gap was not "more agents". The gap was stronger operating
architecture between company intent, product architecture sources, delegation,
delivery closure, deployment observation, production smoke tests, and learning.

This pass implements those missing contracts in state docs and shared agent
instructions. It still does not approve Stage 1 execution.

## Gap Register

| Gap | Risk if missing | Resolution now |
| --- | --- | --- |
| Product architecture source-of-truth index | Agents change code without reading Soar/Roost architecture and create drift. | Added `.agents/state/softwarehouse-product-architecture-index.md` and shared agent reference. |
| Delegation / parent-reporting contract | Agents create child work silently; parent loses context; task tree becomes noisy. | Added top-down/bottom-up hierarchy and child-work preflight in delivery architecture plus shared reference. |
| Duplicate-prevention before task creation | Agents rediscover the same gap and create parallel work. | Added queue/docs/memory search requirement before new work. |
| Commit -> push -> Coolify -> prod smoke closure | Agents stop after local tests or push without observing deployment. | Added deployment closure loop and evidence-of-done contract. |
| Learning without self-editing | Agents either do not learn or edit themselves unsafely. | Added learning packet path at individual/department/company level. |
| Soar/Roost app-specific evidence | Production checks need app-specific refs and architecture constraints. | Product index documents Soar/Roost architecture entry points and production/deploy expectations. |
| Authority boundary for hiring/access changes | Agent count may grow incorrectly or roles get broad access. | Existing `06 AIM` rule is kept; delivery architecture requires hiring/access packets. |
| 02 vs 09 role ambiguity | Product/design roles may be put under Technology, or engineering may make product decisions. | Clarified layer ownership: 02 owns product/design standards, 09 owns technical execution; 11 app PMs own product lane outcomes. |
| End-to-end company value flow | App work can become pure coding without sales/support/finance/learning context. | Roost global business flow is captured as future company-operating context; delivery architecture keeps evidence and feedback loop. |

## Agent Architecture Observations

Current distribution is acceptable for Stage 1 v0:

- `09 Technologia` is intentionally heavy because near-term work is software
  creation, verification, deployment, and runtime operation.
- `11 Innowacje` owns active app lanes such as Soar and Roost product
  management. This is reasonable because the company is still building new
  business capabilities.
- `02 Produkt` owns cross-product product/design standards and UX direction,
  not every app-specific PM lane.
- `04 Operacje` needs to be the work-system stabilizer so 09 and 11 do not
  create unmanaged execution trees.
- `06 Kadry` is correctly the agent/human-capital department; `06 AIM` remains
  the only AI-agent hiring/creation authority.

No new permanent agents are required before Stage 1. The first safer path is
to run with current roles and use governed hiring packets when repeated gaps
prove that a role is missing.

## Recommended Stage 1 Activation Shape

Do not bulk-resume every agent. Prefer controlled activation:

1. `00 AIA` to route and decide whether owner approval is needed.
2. `12 CEO`, `04 COO` or `04 DPM`, and the relevant app PM
   (`11 SPM` for Soar, `11 RPM` for Roost) for parent control.
3. `09 CTO`, `09 QVE`, `09 DRE`, and one relevant implementer for technical
   cycle closure.
4. `10 SPA` only when secrets, production, auth, privacy, or security-sensitive
   smoke tests are involved.
5. `06 AIM` only when a hiring/access/role-change packet is needed.

This preserves the top-down chain while avoiding the old high-noise pattern.

## Remaining True Gaps

These should remain visible before Stage 1 approval:

- Local encrypted secret key still has a Windows permission warning. Either
  accept temporarily for local v0 or change provider/launch ACL strategy.
- Full disaster recovery still needs explicit handling for local storage and
  the encrypted secrets key outside repo memory.
- Paperclip CLI/catalog install blockers remain documented; API/file fallback
  works.
- Stage 1 activation packets are still draft plans, not owner-approved
  Paperclip work.
- The operating contracts need one dry-run review by the owner before agents
  are unpaused.

## V0 Estimate After This Pass

With the architecture contracts installed, v0 readiness is estimated at about
96%.

The remaining 4% is not documentation volume. It is owner acceptance of the
Stage 1 activation path, explicit treatment of the local secret-provider
warning, disaster-recovery handling of secret material, and a final quiet-state
verification immediately before unpausing anything.
