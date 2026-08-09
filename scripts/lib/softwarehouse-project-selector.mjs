const INACTIVE_PROJECT_STATUSES = new Set(["cancelled", "archived"]);

export function projectByNameOrUrlKey(items, names, urlKeys = []) {
  const matches = items.filter((item) => names.includes(item.name) || urlKeys.includes(item.urlKey));
  const operationalMatches = matches.filter((item) => !INACTIVE_PROJECT_STATUSES.has(item.status));
  const candidates = operationalMatches.length > 0 ? operationalMatches : matches;

  return candidates.find((item) => names.includes(item.name))
    ?? candidates.find((item) => urlKeys.includes(item.urlKey))
    ?? null;
}
