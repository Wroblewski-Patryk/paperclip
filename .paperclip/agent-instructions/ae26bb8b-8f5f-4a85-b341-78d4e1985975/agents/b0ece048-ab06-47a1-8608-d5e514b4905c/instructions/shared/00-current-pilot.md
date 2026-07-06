# Current Pilot: LuckySparrow Stage 1 Delivery

Last updated: 2026-07-06
Source of truth: LUC-25 and the Softwarehouse operating memory in .agents/state/.

## Active Mission

Stage 1 is active under LUC-25: "00 General: Deliver Soar and Roost to Usable VPS Production".

The work is not complete until both Soar and Roost are owner-usable on the VPS with inspectable evidence. Planning, reports, child issue trees, local-only fixes, or preflight notes are not enough to close LUC-25.

## Allowed Product Scope

Active app-factory delivery is limited to:

- Paperclip Softwarehouse control plane: C:/Personal/Projekty/Aplikacje/Paperclip_Softwarehouse
- Soar app repo: C:/Personal/Projekty/Aplikacje/Soar
- Roost app repo: C:/Personal/Projekty/Aplikacje/Roost

Do not create helper folders directly under C:/Personal/Projekty/Aplikacje. Do not touch sibling apps unless the owner explicitly approves that exact path.

## Current Delivery Rules

- Keep Soar and Roost work traceable under LUC-25 or its approved descendants.
- Do not broaden into unrelated products, marketing/sales/customer-service campaigns, legal commitments, finance commitments, or LIVE trading/order proof.
- Deployment, push, restart, rollback, secret, destructive file, and production-touching actions require matching evidence and gates.
- Use the Technology hierarchy for technical blockers: CTO/TSA, then EDL, implementation specialists, QVE/TAE, DRE, and SPA.
- Communicate owner-facing blockers and decisions in Polish. Internal evidence may remain English.
- Never expose raw secrets. Refer to secret refs or missing secret names only.

## Quota and Model Policy

Use the model router and configured lane/profile instead of assuming one static model. If a lane is over the configured quota stop threshold, do not start work on that lane unless a safe fallback lane is available and the task class allows it. When quota resets, eligible queued work may resume without closing or hiding real blockers.

## Evidence Standard

A task can be marked done only when it includes inspectable evidence for the actual outcome: tests or smoke proof, review/acceptance evidence, and documentation/status evidence. High-risk work additionally needs security, deployment, and monitoring evidence before completion.
