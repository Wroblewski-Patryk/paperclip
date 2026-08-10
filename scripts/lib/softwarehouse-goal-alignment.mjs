export const SOFTWAREHOUSE_GOAL_TITLES = Object.freeze({
  root: "11 Innovation: Softwarehouse Long-Term Autonomy and Self-Maintenance",
  portfolio: "11 Innovation: Portfolio Delivery and Promotion to Products & Services",
  soarTakeover: "Soar autonomous delivery and takeover",
  roostTakeover: "Roost autonomous delivery and takeover",
  featherlyTakeover: "Featherly autonomous delivery and takeover",
  soarMaturation: "11 Innovation: Soar Product Maturation and Sale Readiness",
  roostMaturation: "11 Innovation: Roost Product Maturation and Sale Readiness",
  duplicateRoot: "Softwarehouse long-term autonomy and self-maintenance",
});

const TERMINAL_ISSUE_STATUSES = new Set(["done", "cancelled"]);

function projectKind(project) {
  const value = `${project?.name ?? ""} ${project?.urlKey ?? ""}`.toLowerCase();
  if (value.includes("featherly")) return "featherly";
  if (value.includes("roost")) return "roost";
  if (value.includes("soar")) return "soar";
  if (value.includes("softwarehouse") || value.includes("00 general")) return "operating";
  return null;
}

function sameIds(left, right) {
  return left.length === right.length && left.every((id) => right.includes(id));
}

export function buildSoftwarehouseGoalAlignmentPlan({ goals, projects, routines, issues }) {
  const goalByTitle = new Map(goals.map((goal) => [goal.title, goal]));
  const required = ["root", "portfolio", "soarTakeover", "roostTakeover", "featherlyTakeover"];
  const missingGoals = required
    .filter((key) => !goalByTitle.get(SOFTWAREHOUSE_GOAL_TITLES[key]))
    .map((key) => SOFTWAREHOUSE_GOAL_TITLES[key]);
  if (missingGoals.length > 0) return { missingGoals, projectUpdates: [], routineUpdates: [], issueUpdates: [], goalUpdates: [] };

  const canonical = Object.fromEntries(
    Object.entries(SOFTWAREHOUSE_GOAL_TITLES).map(([key, title]) => [key, goalByTitle.get(title) ?? null]),
  );
  const projectGoalKeys = {
    operating: ["root"],
    soar: ["soarTakeover", "soarMaturation"],
    roost: ["roostTakeover", "roostMaturation"],
    featherly: ["featherlyTakeover"],
  };
  const desiredByProjectId = new Map();
  const projectUpdates = [];
  for (const project of projects.filter((item) => !item.archivedAt && item.status !== "archived")) {
    const kind = projectKind(project);
    if (!kind) continue;
    const desired = projectGoalKeys[kind].map((key) => canonical[key]?.id).filter(Boolean);
    desiredByProjectId.set(project.id, desired[0]);
    const current = project.goalIds ?? (project.goalId ? [project.goalId] : []);
    if (!sameIds(current, desired)) {
      projectUpdates.push({ id: project.id, name: project.name, goalIds: desired });
    }
  }

  const staleGoalReplacement = new Map();
  for (const goal of goals) {
    if (goal.status !== "achieved" && goal.id !== canonical.duplicateRoot?.id) continue;
    const title = goal.title.toLowerCase();
    const replacement = title.includes("soar") ? canonical.soarTakeover
      : title.includes("roost") ? canonical.roostTakeover
        : title.includes("stage 1") ? canonical.portfolio
          : canonical.root;
    staleGoalReplacement.set(goal.id, replacement.id);
  }

  const routineUpdates = [];
  for (const routine of routines.filter((item) => item.status === "active")) {
    const desiredGoalId = desiredByProjectId.get(routine.projectId) ?? canonical.root.id;
    if (routine.goalId !== desiredGoalId) {
      routineUpdates.push({ id: routine.id, title: routine.title, goalId: desiredGoalId });
    }
  }

  const issueUpdates = [];
  for (const issue of issues) {
    if (TERMINAL_ISSUE_STATUSES.has(issue.status)) continue;
    const desiredGoalId = staleGoalReplacement.get(issue.goalId)
      ?? (!issue.goalId ? desiredByProjectId.get(issue.projectId) : null);
    if (desiredGoalId && desiredGoalId !== issue.goalId) {
      issueUpdates.push({ id: issue.id, identifier: issue.identifier, goalId: desiredGoalId });
    }
  }

  const duplicateStillReferenced = routines.some((item) => item.status === "active" && item.goalId === canonical.duplicateRoot?.id)
    || issues.some((item) => !TERMINAL_ISSUE_STATUSES.has(item.status) && item.goalId === canonical.duplicateRoot?.id)
    || projects.some((item) => !item.archivedAt && (item.goalIds ?? []).includes(canonical.duplicateRoot?.id));
  const goalUpdates = canonical.duplicateRoot && canonical.duplicateRoot.status !== "cancelled"
    ? [{ id: canonical.duplicateRoot.id, title: canonical.duplicateRoot.title, status: "cancelled", afterRelink: duplicateStillReferenced }]
    : [];

  return { missingGoals, projectUpdates, routineUpdates, issueUpdates, goalUpdates };
}
