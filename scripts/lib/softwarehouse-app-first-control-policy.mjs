import { evaluateOutcomeFirstPortfolio } from "./outcome-first-portfolio-policy.mjs";

export const CONTROL_PLANE_PROJECT_NAME_PATTERN = /softwarehouse|control[ -]?plane/i;

export const ISSUE_GENERATING_CONTROL_STEPS = new Set([
  "projectTruthGapDispatcher",
  "safeArchitecturePlanningSeeder",
  "safeNonproductionLaneSeeder",
  "projectKnownStateHarvester",
  "localRepairLaneStarter",
  "workerBacklogDecompositionSeeder",
  "learningLoop",
  "organizationalOrientation",
  "blockedTriageLaneStarter",
  "architecturePlanningSeeder",
  "soarArchitectureBacklogMaterializer",
  "accessUnblockTaskSeeder",
]);

export const PERMANENTLY_EXTERNALIZED_IMPROVEMENT_STEPS = new Set([
  "learningLoop",
  "organizationalOrientation",
  "workerBacklogDecompositionSeeder",
]);

export function classifySoftwarehouseProject(project) {
  if (!project || project.archivedAt || ["cancelled", "completed"].includes(project.status)) return "inactive";
  return CONTROL_PLANE_PROJECT_NAME_PATTERN.test(project.name ?? "") ? "control_plane" : "application";
}

export function buildAppFirstControlPolicy({ issues = [], projects = [], openIssueSoftLimit } = {}) {
  const portfolioPressure = evaluateOutcomeFirstPortfolio(issues, { openIssueSoftLimit });
  const projectKindById = new Map(projects.map((project) => [project.id, classifySoftwarehouseProject(project)]));
  const openIssues = issues.filter((issue) => !["done", "cancelled"].includes(issue?.status));
  const applicationOpenIssueCount = openIssues.filter((issue) => projectKindById.get(issue.projectId) === "application").length;
  const controlPlaneOpenIssueCount = openIssues.filter((issue) => projectKindById.get(issue.projectId) === "control_plane").length;
  const protectApplicationDelivery = portfolioPressure.closureOnly || applicationOpenIssueCount > 0;

  return {
    profile: "application_delivery_first",
    ...portfolioPressure,
    applicationOpenIssueCount,
    controlPlaneOpenIssueCount,
    protectApplicationDelivery,
    existingIssuesOnly: protectApplicationDelivery,
    skippedStepNames: [...new Set([
      ...PERMANENTLY_EXTERNALIZED_IMPROVEMENT_STEPS,
      ...(protectApplicationDelivery ? ISSUE_GENERATING_CONTROL_STEPS : []),
    ])],
    reason: protectApplicationDelivery
      ? `Application delivery debt is open (${applicationOpenIssueCount} issue(s)); Paperclip may reconcile existing work but cannot seed self-improvement or planning work.`
      : "No open application delivery debt is visible and the portfolio is below pressure limits.",
  };
}

export function shouldSkipControlStep(stepName, policy) {
  return PERMANENTLY_EXTERNALIZED_IMPROVEMENT_STEPS.has(stepName)
    || (policy?.protectApplicationDelivery === true && ISSUE_GENERATING_CONTROL_STEPS.has(stepName));
}
