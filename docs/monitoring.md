# Monitoring

Monitoring proves that a deployed change behaves correctly after it leaves the local workspace.

## MonitoringEvidence

Monitoring evidence should include:

- service/resource name;
- environment;
- commit/version;
- health endpoint or log source checked;
- status;
- observed errors or warnings;
- next action and owner.

## Minimum Production Checks

- application health endpoint or equivalent;
- critical background workers and routines;
- deployment status in Coolify or equivalent;
- recent logs for startup/runtime errors;
- smoke flow for the changed feature when possible.
