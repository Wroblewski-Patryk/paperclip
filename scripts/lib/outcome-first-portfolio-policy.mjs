const terminalStatuses = new Set(["done", "cancelled"]);

export const DEFAULT_OPEN_ISSUE_SOFT_LIMIT = 80;

export function evaluateOutcomeFirstPortfolio(
  issues,
  { openIssueSoftLimit = DEFAULT_OPEN_ISSUE_SOFT_LIMIT } = {},
) {
  const openIssues = (Array.isArray(issues) ? issues : [])
    .filter((issue) => !terminalStatuses.has(issue?.status));
  const assignedExecutable = openIssues.filter((issue) =>
    issue?.assigneeAgentId
      && ["backlog", "todo", "in_progress"].includes(issue.status)
      && issue.originKind !== "routine_execution"
  );
  const closureOnly = openIssues.length >= openIssueSoftLimit;

  return {
    openIssueCount: openIssues.length,
    openIssueSoftLimit,
    assignedExecutableCount: assignedExecutable.length,
    closureOnly,
    reason: closureOnly
      ? `Open issue inventory (${openIssues.length}) reached the ${openIssueSoftLimit} soft limit; issue creation and truth/triage fan-out must stop until existing delivery debt closes.`
      : `Open issue inventory (${openIssues.length}) remains below the ${openIssueSoftLimit} soft limit.`,
  };
}

