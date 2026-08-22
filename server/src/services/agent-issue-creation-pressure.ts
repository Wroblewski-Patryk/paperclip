export const DEFAULT_AGENT_OPEN_ISSUE_SOFT_LIMIT = 80;
export const DEFAULT_SATURATED_PARENT_CHILD_LIMIT = 3;
export const DEFAULT_SATURATED_CREATOR_LIMIT = 5;

export type AgentIssueCreationPressureInput = {
  actorType: string;
  title: string;
  parentId?: string | null;
  openIssueCount: number;
  duplicateOpenTitleCount: number;
  openDirectChildCount: number;
  openCreatedByActorCount: number;
  openIssueSoftLimit?: number;
  saturatedParentChildLimit?: number;
  saturatedCreatorLimit?: number;
};

export type AgentIssueCreationPressureDecision = {
  allowed: boolean;
  code: string;
  message: string;
  saturated: boolean;
};

export function normalizeIssueTitleForPressure(title: string): string {
  return title.trim().replace(/\s+/g, " ").toLocaleLowerCase("en-US");
}

export function evaluateAgentIssueCreationPressure(
  input: AgentIssueCreationPressureInput,
): AgentIssueCreationPressureDecision {
  if (input.actorType !== "agent") {
    return { allowed: true, code: "board_creation_allowed", message: "Board creation is not governed by the autonomous agent pressure gate.", saturated: false };
  }

  const openIssueSoftLimit = input.openIssueSoftLimit ?? DEFAULT_AGENT_OPEN_ISSUE_SOFT_LIMIT;
  const saturated = input.openIssueCount >= openIssueSoftLimit;
  if (input.duplicateOpenTitleCount > 0) {
    return {
      allowed: false,
      code: "duplicate_open_issue",
      message: "An open issue with the same normalized title already exists. Reuse or update it instead of creating another task.",
      saturated,
    };
  }
  if (!saturated) {
    return { allowed: true, code: "portfolio_below_soft_limit", message: "Agent issue creation is below the portfolio soft limit.", saturated };
  }
  if (!input.parentId) {
    return {
      allowed: false,
      code: "saturated_portfolio_root_creation_blocked",
      message: `The portfolio has ${input.openIssueCount} open issues (soft limit ${openIssueSoftLimit}). Autonomous agents must close or update existing work; they cannot create another root issue.`,
      saturated,
    };
  }
  const childLimit = input.saturatedParentChildLimit ?? DEFAULT_SATURATED_PARENT_CHILD_LIMIT;
  if (input.openDirectChildCount >= childLimit) {
    return {
      allowed: false,
      code: "saturated_parent_fanout_blocked",
      message: `The parent already has ${input.openDirectChildCount} open direct children (limit ${childLimit} while saturated). Close, cancel, or consolidate existing children first.`,
      saturated,
    };
  }
  const creatorLimit = input.saturatedCreatorLimit ?? DEFAULT_SATURATED_CREATOR_LIMIT;
  if (input.openCreatedByActorCount >= creatorLimit) {
    return {
      allowed: false,
      code: "saturated_creator_wip_blocked",
      message: `This agent already owns the creation of ${input.openCreatedByActorCount} open issues (limit ${creatorLimit} while saturated). It must resolve or consolidate them before delegating more work.`,
      saturated,
    };
  }
  return {
    allowed: true,
    code: "bounded_child_creation_allowed",
    message: "One bounded child remains allowed under the saturated portfolio fan-out limits.",
    saturated,
  };
}

