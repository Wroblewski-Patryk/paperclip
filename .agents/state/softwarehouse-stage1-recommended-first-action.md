# Softwarehouse Stage 1 Recommended First Action

Last updated: 2026-07-04

Purpose: propose the most complementary first Stage 1 action for Paperclip
agents after the owner approves activation.

This is a recommendation, not approval to create Paperclip issues or resume
agents during Stage 0.

## Recommendation

Run a narrow `00 General: Stage 1 Controlled Activation Dry Run` before any
large Soar/Roost implementation push.

The dry run should prove the company operating loop itself:

```text
Owner decision -> AIA Polish decision packet -> parent issue -> one app lane
  -> product architecture preflight -> one small verification/fix slice
  -> local evidence -> parent synthesis -> AIA Polish report -> learning packet
```

## Why This First

This is the most complementary first action because it tests the whole
organization without creating broad product risk:

- AIA proves it can communicate with the owner in Polish.
- Parent/child issue rules are exercised once, not at scale.
- Soar/Roost architecture source-of-truth rules are tested.
- Evidence and closure rules are tested.
- Learning/procedure update path is tested.
- The owner can approve, correct, or stop the pattern before many agents run.

## Suggested Scope

Start with Soar because it is the first active app lane and has stronger
architecture documentation.

Suggested narrow task:

`11 Innovation: Soar - Architecture And Production Readiness Baseline`

Expected outcome:

- read Soar `docs/architecture/README.md` and
  `docs/architecture/architecture-source-of-truth.md`;
- verify local repo path and git state without changing files;
- verify configured Coolify read refs are sufficient to observe Soar deployment;
- verify production URL/test account can be used for a safe login/smoke path
  only if Stage 1 approval includes protected production smoke;
- produce a Polish AIA summary for the owner;
- produce one learning packet about missing context, if any.

## Minimal Activation Set

Do not bulk-resume all agents. For the dry run, activate only:

- `00 AIA` for owner interface and routing;
- `04 DPM` for parent/child task hygiene;
- `11 SPM` for Soar product lane ownership;
- `09 CTO` for technical direction;
- `09 QVE` for evidence/check quality;
- `09 DRE` only if deployment observation is included;
- `10 SPA` only if secrets, auth, production smoke, or security-sensitive
  checks are included.

## Owner Approval Packet

AIA should ask the owner in Polish:

```text
Czy akceptujesz pierwszy kontrolowany dry run Stage 1 dla Soar?

Zakres:
- bez masowego uruchamiania agentów;
- bez tworzenia szerokich zadań;
- bez push/deploy, chyba że osobno zaakceptujesz;
- celem jest sprawdzić ścieżkę AIA -> parent issue -> Soar preflight -> evidence -> raport.

Rekomendacja:
Tak, jako bezpieczny test organizacji przed większą pracą.
```

## Stop Conditions

Stop and report to the owner if:

- AIA cannot produce a clear Polish owner packet;
- agent hierarchy creates duplicate work;
- product architecture is unclear or contradictory;
- secrets or Coolify refs are insufficient;
- local repo state is dirty/diverged in a way that blocks safe inspection;
- production smoke would require a risky action not included in approval.
