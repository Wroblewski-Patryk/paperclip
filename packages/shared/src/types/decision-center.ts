import type { Approval } from "./approval.js";
import type { Issue, IssueThreadInteraction, OwnerDecisionBriefing } from "./issue.js";

export type DecisionCenterSourceType = "interaction" | "approval";
export type DecisionCenterState = "ready" | "preparing" | "deferred" | "resolved";
export type DecisionCenterCategory =
  | "confirmation"
  | "information_request"
  | "task_proposal"
  | "formal_approval";

export interface DecisionCenterIssueSummary {
  id: string;
  identifier: string | null;
  title: string;
  status: Issue["status"];
  priority: Issue["priority"];
  projectId: string | null;
  assigneeAgentId: string | null;
}

export interface DecisionCenterItem {
  id: string;
  companyId: string;
  sourceType: DecisionCenterSourceType;
  sourceId: string;
  state: DecisionCenterState;
  category: DecisionCenterCategory;
  title: string;
  summary: string | null;
  whyOwner: string;
  recommendedAction: string | null;
  ownerBriefing: OwnerDecisionBriefing | null;
  risk: "low" | "medium" | "high" | "critical";
  urgency: "low" | "medium" | "high" | "critical";
  createdAt: Date | string;
  updatedAt: Date | string;
  deferredUntil: Date | string | null;
  deferNote: string | null;
  issue: DecisionCenterIssueSummary | null;
  interaction: IssueThreadInteraction | null;
  approval: Approval | null;
}

export interface DecisionCenterResponse {
  counts: {
    ready: number;
    preparing: number;
    deferred: number;
    allOpen: number;
  };
  items: DecisionCenterItem[];
}
