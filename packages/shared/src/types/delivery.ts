export const DELIVERY_STAGES = [
  "proposed", "admitted", "implementing", "evidence_complete", "review_rejected",
  "review_accepted", "integrated", "push_ready", "deployed", "observed_healthy",
  "rolled_back", "outcome_accepted",
] as const;
export type DeliveryStage = (typeof DELIVERY_STAGES)[number];

export const PRODUCT_OUTCOME_STATUSES = [
  "unachieved", "observing", "achieved", "accepted", "rejected", "rolled_back",
] as const;
export type ProductOutcomeStatus = (typeof PRODUCT_OUTCOME_STATUSES)[number];

export interface ProductDelivery {
  id: string;
  companyId: string;
  projectId: string;
  title: string;
  problemStatement: string;
  decisionContract: Record<string, unknown>;
  stage: DeliveryStage;
  ownerAgentId: string | null;
  localSha: string | null;
  originSha: string | null;
  integrationSha: string | null;
  deployedSha: string | null;
  deploymentUrl: string | null;
  blocker: string | null;
  needsDecision: boolean;
  evidence: Array<Record<string, unknown>>;
  observedAt: Date | null;
  createdAt: Date;
  updatedAt: Date;
}
