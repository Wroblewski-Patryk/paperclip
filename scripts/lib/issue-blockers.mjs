const terminalStatuses = new Set(["done", "cancelled"]);

export function terminalBlockersFor(issue) {
  return (issue?.blockedBy ?? [])
    .flatMap((blocker) => blocker.terminalBlockers ?? [])
    .filter(Boolean);
}

export function rootBlockerIdentifierFor(issue) {
  const directActiveBlocker = (issue?.blockedBy ?? [])
    .find((blocker) => blocker?.identifier && !terminalStatuses.has(blocker.status));
  const terminalBlocker = terminalBlockersFor(issue)[0];
  return terminalBlocker?.identifier
    ?? directActiveBlocker?.identifier
    ?? issue?.blockerAttention?.sampleBlockerIdentifier
    ?? issue?.identifier
    ?? issue?.title;
}
