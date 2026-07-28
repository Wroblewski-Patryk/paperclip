const projectAliases = new Map([
  ["Soar", ["11 Innovation: Soar", "Soar"]],
  ["Roost", ["11 Innovation: Roost", "Roost"]],
  ["Featherly", ["11 Innovation: Featherly", "Featherly"]],
  ["Aviary", ["Aviary", "Personality"]],
]);

export function selectExecutiveProject(projects, projectName) {
  const aliases = projectAliases.get(projectName) ?? [projectName];
  const activeProjects = (projects ?? []).filter((project) => !project?.archivedAt);
  for (const alias of aliases) {
    const project = activeProjects.find((candidate) => candidate.name === alias);
    if (project) return project;
  }
  return null;
}
