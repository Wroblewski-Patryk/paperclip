function issueKey(issue) {
  return issue?.identifier ?? issue?.id ?? null;
}

export async function collectNonTerminalBlockerLeaves({
  rootIssue,
  loadIssue,
  terminalStatuses = new Set(["done", "cancelled"]),
  maxNodes = 64,
}) {
  const queue = Array.isArray(rootIssue?.blockedBy) ? [...rootIssue.blockedBy] : [];
  const visited = new Set();
  const leaves = new Map();

  while (queue.length > 0 && visited.size < maxNodes) {
    const summary = queue.shift();
    const key = issueKey(summary);
    if (!key || visited.has(key)) continue;
    visited.add(key);

    let issue = summary;
    try {
      issue = (await loadIssue(key)) ?? summary;
    } catch {
      // A failed detail read is retained as a leaf so readiness fails closed.
    }

    if (terminalStatuses.has(issue?.status)) continue;
    const activeChildren = (Array.isArray(issue?.blockedBy) ? issue.blockedBy : [])
      .filter((child) => !terminalStatuses.has(child?.status));
    if (activeChildren.length === 0) {
      leaves.set(issueKey(issue) ?? key, issue);
      continue;
    }
    queue.push(...activeChildren);
  }

  return {
    leaves: [...leaves.values()],
    visitedCount: visited.size,
    truncated: queue.length > 0,
  };
}
