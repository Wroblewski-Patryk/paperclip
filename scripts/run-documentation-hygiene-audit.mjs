import path from "node:path";
import { auditDocumentationPortfolio } from "./lib/documentation-hygiene.mjs";
import { softwarehouseActiveApplicationProjects } from "./lib/softwarehouse-project-registry.mjs";

const strict = process.argv.includes("--strict");
const paperclipRoot = path.resolve(process.cwd());
const projects = [
  { name: "Paperclip", root: paperclipRoot, requireDeploymentIdentity: false },
  ...softwarehouseActiveApplicationProjects.map((project) => ({
    name: project.name,
    root: project.root,
    requireDeploymentIdentity: true,
  })),
];

const report = await auditDocumentationPortfolio(projects);
console.log(JSON.stringify({ mode: strict ? "strict" : "report", ...report }, null, 2));
if (strict && report.status === "fail") process.exitCode = 1;
