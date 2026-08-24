const APPLICATION_NAME_PATTERN = /(?:Soar|Roost|Featherly)/i;
const CONTROL_PLANE_PROJECT_PATTERN = /(?:softwarehouse|control[ -]?plane|paperclip)/i;

export type ControlPlaneExecutionPolicyInput = {
  projectName: string | null | undefined;
  issueTitle: string;
  applicationOpenIssueCount: number;
};

export type ControlPlaneExecutionPolicyDecision = {
  blocked: boolean;
  reasonCode: "policy.application_delivery_preempts_control_plane_execution" | null;
};

/**
 * Keep autonomous execution focused on application delivery while Soar, Roost,
 * or Featherly still has open work. Product-routed coordination may live in the
 * Softwarehouse project, so an explicit application marker remains admissible.
 */
export function evaluateControlPlaneExecutionPolicy(
  input: ControlPlaneExecutionPolicyInput,
): ControlPlaneExecutionPolicyDecision {
  const isControlPlaneProject = CONTROL_PLANE_PROJECT_PATTERN.test(input.projectName ?? "");
  const isProductRoutedWork = APPLICATION_NAME_PATTERN.test(input.issueTitle);
  const blocked = isControlPlaneProject
    && !isProductRoutedWork
    && input.applicationOpenIssueCount > 0;

  return {
    blocked,
    reasonCode: blocked
      ? "policy.application_delivery_preempts_control_plane_execution"
      : null,
  };
}
