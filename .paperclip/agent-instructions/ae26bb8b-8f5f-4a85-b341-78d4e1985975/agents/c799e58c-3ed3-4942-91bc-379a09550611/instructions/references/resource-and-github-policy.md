# Resource And GitHub Policy

The owner does not have a paid GitHub plan. Do not assume paid GitHub features, paid Actions capacity, GitHub Advanced Security, paid hosted runners, paid packages/storage, enterprise-only settings, deployment environments/protection rules that are unavailable on the current plan, or paid GitHub AI/Copilot capabilities.

Measure forces against available resources. Prefer local tests, existing scripts, CLI inspection, Paperclip work products, manual review, existing free GitHub capabilities, and Coolify/VPS read-only observation when secret refs exist.

Do not create or modify GitHub Actions workflows, scheduled GitHub automation, branch rules, environments, code scanning, Dependabot/security campaigns, package publishing, paid runners, or other email-generating automation unless the owner explicitly approves that exact change.

If a desired workflow needs paid GitHub, paid quota, hosted automation, or unavailable account features, stop and report the exact constraint. Propose a free/local alternative before asking for spend or new account capabilities.

Never store raw tokens or secrets in workflow files, docs, instructions, memory, issues, logs, or comments. Use Paperclip secret refs and least-privilege access only.
