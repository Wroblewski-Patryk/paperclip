const legacyAgentAliases = new Map([
  ["Portfolio Director", ["portfolio-director", "innovation-portfolio-manager", "chief-innovation-officer", "ai-assistant"]],
  ["11 Innovations Director", ["chief-innovation-officer", "innovation-portfolio-manager"]],
  ["CTO Architect", ["technical-solution-architect", "chief-technology-officer"]],
  ["Engineering Delivery Lead", ["delivery-project-manager", "chief-operating-officer"]],
  ["Docs Memory Lead", ["documentation-steward"]],
  ["Ops Release Lead", ["deployment-reliability-engineer"]],
  ["QA Regression Lead", ["qa-verification-engineer", "test-automation-engineer"]],
  ["Security Review Lead", ["security-privacy-auditor"]],
  ["Soar Project Manager", ["soar-project-manager", "soar-product-manager"]],
  ["Roost Project Manager", ["roost-project-manager", "roost-product-manager"]],
  ["Aviary Project Manager", ["aviary-project-manager", "aviary-product-manager", "personality-project-manager"]],
  ["Nest Project Manager", ["nest-project-manager", "nest-product-manager"]],
]);

function normalizeText(value) {
  return String(value ?? "").trim().toLowerCase();
}

function aliasesForName(name) {
  const normalizedName = normalizeText(name);
  const aliases = new Set(legacyAgentAliases.get(name) ?? []);

  for (const [canonicalName, canonicalAliases] of legacyAgentAliases.entries()) {
    if (normalizeText(canonicalName) === normalizedName) {
      for (const alias of canonicalAliases) aliases.add(alias);
    }
    if (canonicalAliases.some((alias) => normalizeText(alias) === normalizedName)) {
      aliases.add(canonicalName);
      for (const alias of canonicalAliases) aliases.add(alias);
    }
  }

  return Array.from(aliases);
}

export function agentRosterKey(agent) {
  return agent?.metadata?.rosterKey ?? agent?.urlKey ?? null;
}

export function isRunnableAgent(agent) {
  return Boolean(agent && !["paused", "terminated", "pending_approval"].includes(agent.status));
}

export function agentMatchesNameOrAlias(agent, name) {
  if (!agent || !name) return false;
  const normalizedName = normalizeText(name);
  if (normalizeText(agent.name) === normalizedName) return true;
  if (normalizeText(agent.title) === normalizedName) return true;
  const rosterKey = normalizeText(agentRosterKey(agent));
  if (rosterKey && rosterKey === normalizedName) return true;
  return aliasesForName(name).some((alias) => normalizeText(alias) === rosterKey);
}

export function findAgentByNameOrAlias(agents, name) {
  const runnableAgents = agents.filter(isRunnableAgent);
  const candidateAgents = runnableAgents.length > 0 ? runnableAgents : agents;
  const normalizedName = normalizeText(name);
  const exact = candidateAgents.find((agent) =>
    normalizeText(agent.name) === normalizedName
    || normalizeText(agent.title) === normalizedName
    || normalizeText(agentRosterKey(agent)) === normalizedName
  );
  if (exact) return exact;

  for (const alias of aliasesForName(name)) {
    const normalizedAlias = normalizeText(alias);
    const match = candidateAgents.find((agent) =>
      normalizeText(agent.name) === normalizedAlias
      || normalizeText(agent.title) === normalizedAlias
      || normalizeText(agentRosterKey(agent)) === normalizedAlias
    );
    if (match) return match;
  }

  return null;
}

export function buildAgentLookup(agents) {
  return {
    get(name) {
      return findAgentByNameOrAlias(agents, name);
    },
    byName(name) {
      return findAgentByNameOrAlias(agents, name);
    },
  };
}
