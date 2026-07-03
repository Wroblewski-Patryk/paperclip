function normalizeActions(actions) {
  return Array.isArray(actions) ? actions : [];
}

export function resolveRuntimeBindingRepairSummary(runtimeBindingRepair = {}, projectOwnershipAssignment = {}) {
  const runtimeActions = normalizeActions(runtimeBindingRepair.actions);
  const ownershipActions = normalizeActions(projectOwnershipAssignment.actions);
  const resolvedManualAssignmentIds = new Set(
    ownershipActions
      .filter((action) => action?.action === "assigned_issue_to_project_pm" && typeof action.identifier === "string")
      .map((action) => action.identifier),
  );

  const actions = runtimeActions.filter((action) => {
    if (action?.type !== "needs_manual_assignment") return true;
    if (typeof action.identifier !== "string") return true;
    return !resolvedManualAssignmentIds.has(action.identifier);
  });

  return {
    ...runtimeBindingRepair,
    actionCount: actions.length,
    reassignCount: actions.filter((action) => action?.type === "reassign_runtime_binding_owner").length,
    manualCount: actions.filter((action) => action?.type === "needs_manual_assignment").length,
    actions,
  };
}
