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

export function knownGateRootIdentifiers({
  configuredRootIdentifiers = [],
  protectedDeliveryBlockers = [],
  deliveryParentIdentifier = null,
  truncated = false,
}) {
  const identifiers = new Set(configuredRootIdentifiers);
  for (const blocker of protectedDeliveryBlockers) {
    const identifier = issueKey(blocker);
    if (identifier) identifiers.add(identifier);
  }
  if (truncated && deliveryParentIdentifier) {
    identifiers.add(deliveryParentIdentifier);
  }
  return identifiers;
}

export function mergeProtectedDeliveryGates({
  gateHandoffs = [],
  protectedDeliveryBlockers = [],
}) {
  const gatesByRoot = new Map(
    gateHandoffs
      .filter((gate) => gate?.rootBlocker)
      .map((gate) => [gate.rootBlocker, gate]),
  );

  for (const blocker of protectedDeliveryBlockers) {
    if (!blocker?.identifier || gatesByRoot.has(blocker.identifier)) continue;
    gatesByRoot.set(blocker.identifier, {
      project: "Soar/Roost",
      rootBlocker: blocker.identifier,
      status: "blocked",
      fresh: false,
      owner: blocker.owner ?? "Owner / Security gate",
      evidenceRequired: `Terminal disposition and inspectable evidence for: ${blocker.title}`,
      acceptedFreshFacts: [],
      operatorPrompt: `Resolve or explicitly reclassify ${blocker.identifier} before protected delivery.`,
      latestEvidence: null,
    });
  }

  return [...gatesByRoot.values()];
}
