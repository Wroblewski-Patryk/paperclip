# Softwarehouse Resource Policy

Last updated: 2026-07-04

Purpose: keep Paperclip Softwarehouse work realistic for the owner's actual
resources. This file stores operating constraints, not secrets.

## Owner Resource Constraint

- Do not assume the owner has a paid GitHub plan.
- Do not assume paid GitHub Actions capacity, GitHub Advanced Security, paid
  hosted runners, paid packages/storage, enterprise-only settings, deployment
  environments/protection rules that are unavailable on the current plan, or
  paid GitHub AI/Copilot capabilities.
- Do not design a solution that depends on unavailable paid services, quotas,
  hosted automation, or account features unless the owner explicitly approves
  acquiring or enabling them.
- Avoid creating or modifying notification-heavy automation. The owner does not
  want repeated emails caused by agent-created workflows, watchers, scheduled
  checks, security campaigns, or CI noise.

## Preferred Execution Model

- Measure forces against resources: use what exists before proposing more spend.
- Prefer local verification, local scripts, existing package commands, manual
  or CLI inspection, Paperclip work products, and Coolify/VPS read-only
  observation when secret refs exist.
- Prefer lightweight, explicit, owner-approved GitHub use: repo status, branch
  state, pull requests, checks/log reading, and intentional pushes when allowed
  by the issue or activation gate.
- Treat GitHub Actions and workflow changes as gated work, not a default answer.
- If GitHub or another provider lacks the required plan/quota/capability, report
  the exact constraint and propose a free/local alternative.

## Disallowed By Default

- Adding GitHub Actions workflows or scheduled GitHub automation.
- Enabling code scanning, dependency/security campaigns, branch protection,
  required reviewers, environments, rulesets, packages, paid runners, or other
  plan-dependent GitHub features.
- Creating automation that is likely to send frequent emails or account
  notifications.
- Storing raw tokens or secrets in docs, instructions, memory, issues, logs, or
  workflow files.

## Allowed With Explicit Owner Gate

- A small, manual GitHub workflow when local verification is insufficient and
  the owner accepts the plan/quota/noise tradeoff.
- A paid or hosted capability after a written cost/resource note and owner
  approval.
- Notification automation only when the destination, frequency, and failure mode
  are approved in advance.
