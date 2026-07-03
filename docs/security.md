# Security

Security review focuses on secrets, permissions, auth, data exposure, deployment boundaries, and
destructive operations.

## SecurityEvidence

Security evidence should include:

- risk category;
- affected secrets, scopes, or permissions by reference only;
- files/routes/services reviewed;
- findings and severity;
- mitigation or approval;
- follow-up task if unresolved.

## Required Review Triggers

Security review is required for:

- secrets and provider vault changes;
- authentication or authorization changes;
- production deploy and infrastructure configuration;
- database migrations that affect sensitive data;
- destructive file, database, or git operations;
- cross-company access or company scoping changes.
