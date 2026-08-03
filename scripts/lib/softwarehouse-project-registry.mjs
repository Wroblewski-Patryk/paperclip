import path from "node:path";

export const softwarehouseApplicationsRoot =
  process.env.LUCKYSPARROW_APPS_ROOT ?? "C:/Personal/Projekty/Aplikacje";

export const softwarehouseActiveApplicationProjects = Object.freeze([
  Object.freeze({
    key: "soar",
    name: "Soar",
    paperclipName: "11 Innovation: Soar",
    aliases: Object.freeze(["Soar", "11 Innovation: Soar"]),
    root: path.join(softwarehouseApplicationsRoot, "Soar"),
    managerRosterKey: "soar-product-manager",
    managerName: "11 SPM (Soar Product Manager)",
    secretPrefixes: Object.freeze(["SOAR_", "COOLIFY_SOAR_"]),
    lifecycleDepartment: "11 Innovation",
    promotionDepartment: "02 Products & Services",
    requiredDocumentationPaths: Object.freeze([
      "docs/README.md",
      "docs/documentation-contract.json",
      "docs/architecture/architecture-source-of-truth.md",
    ]),
    projectTruthPath: "docs/status/project-truth-index.json",
    releasePriority: 1,
    acceptanceLedgerPath: "report/soar-delivery-acceptance.latest.json",
  }),
  Object.freeze({
    key: "roost",
    name: "Roost",
    paperclipName: "11 Innovation: Roost",
    aliases: Object.freeze(["Roost", "11 Innovation: Roost"]),
    root: path.join(softwarehouseApplicationsRoot, "Roost"),
    managerRosterKey: "roost-product-manager",
    managerName: "11 RPM (Roost Project Manager)",
    secretPrefixes: Object.freeze(["ROOST_", "COOLIFY_ROOST_"]),
    lifecycleDepartment: "11 Innovation",
    promotionDepartment: "02 Products & Services",
    requiredDocumentationPaths: Object.freeze([
      "docs/README.md",
      "docs/documentation-contract.json",
      "docs/architecture/architecture-source-of-truth.md",
    ]),
    projectTruthPath: "docs/status/project-truth-index.json",
    releasePriority: 0,
    acceptanceLedgerPath: null,
  }),
  Object.freeze({
    key: "featherly",
    name: "Featherly",
    paperclipName: "11 Innovation: Featherly",
    aliases: Object.freeze(["Featherly", "11 Innovation: Featherly"]),
    root: path.join(softwarehouseApplicationsRoot, "Featherly"),
    managerRosterKey: "featherly-platform-manager",
    managerName: "11 FPM (Featherly Platform Manager)",
    secretPrefixes: Object.freeze(["FEATHERLY_", "COOLIFY_FEATHERLY_"]),
    lifecycleDepartment: "11 Innovation",
    promotionDepartment: "02 Products & Services",
    requiredDocumentationPaths: Object.freeze([
      "docs/README.md",
      "docs/documentation-contract.json",
      "docs/architecture/architecture-source-of-truth.md",
    ]),
    projectTruthPath: "docs/status/project-truth-index.json",
    releasePriority: 2,
    acceptanceLedgerPath: null,
  }),
]);

export const softwarehouseActiveApplicationProjectNames = Object.freeze(
  softwarehouseActiveApplicationProjects.map((project) => project.name),
);

export const softwarehouseProjectByName = new Map(
  softwarehouseActiveApplicationProjects.flatMap((project) =>
    project.aliases.map((alias) => [alias.toLowerCase(), project]),
  ),
);

export function canonicalSoftwarehouseProject(value) {
  if (typeof value !== "string") return null;
  return softwarehouseProjectByName.get(value.trim().toLowerCase()) ?? null;
}

export function projectMarker(value) {
  if (typeof value !== "string") return null;
  const match = value.match(/^\[(Soar|Roost|Featherly)(?:\]|\s[^\]]*\])/i);
  return match ? canonicalSoftwarehouseProject(match[1]) : null;
}

export function projectSpecificReleasePriority(name) {
  return canonicalSoftwarehouseProject(name)?.releasePriority ?? 99;
}
