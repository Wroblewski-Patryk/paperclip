export function issueList(value) {
  if (Array.isArray(value)) return value;
  if (Array.isArray(value?.value)) return value.value;
  return [];
}

export function exactIssueByIdentifier(candidates, identifier) {
  return issueList(candidates).find((issue) => issue?.identifier === identifier) ?? null;
}

export async function resolveIssuesByIdentifier({
  companyId,
  identifiers,
  issues,
  request,
}) {
  const byIdentifier = new Map(issueList(issues).map((issue) => [issue.identifier, issue]));
  const missingIdentifiers = [...new Set(identifiers)]
    .filter((identifier) => identifier && !byIdentifier.has(identifier));

  for (const identifier of missingIdentifiers) {
    const directIssue = await request("GET", `/api/issues/${encodeURIComponent(identifier)}`)
      .catch(() => null);
    if (
      exactIssueByIdentifier([directIssue], identifier)
      && (!directIssue.companyId || directIssue.companyId === companyId)
    ) {
      byIdentifier.set(identifier, directIssue);
      continue;
    }

    const result = await request(
      "GET",
      `/api/companies/${companyId}/issues?q=${encodeURIComponent(identifier)}&limit=20`,
    ).catch(() => []);
    const issue = exactIssueByIdentifier(result, identifier);
    if (issue) byIdentifier.set(identifier, issue);
  }

  return byIdentifier;
}
