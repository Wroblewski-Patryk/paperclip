export const ORGANIZATIONAL_RECORD_KINDS = ["assumption", "commitment", "decision"] as const;
export type OrganizationalRecordKind = (typeof ORGANIZATIONAL_RECORD_KINDS)[number];

export const ASSUMPTION_STATUSES = [
  "proposed",
  "active",
  "validated",
  "contradicted",
  "expired",
  "superseded",
] as const;
export const COMMITMENT_STATUSES = [
  "proposed",
  "active",
  "fulfilled",
  "breached",
  "renegotiated",
  "cancelled",
  "superseded",
] as const;
export const DECISION_STATUSES = ["proposed", "accepted", "rejected", "reversed", "superseded"] as const;

export type AssumptionStatus = (typeof ASSUMPTION_STATUSES)[number];
export type CommitmentStatus = (typeof COMMITMENT_STATUSES)[number];
export type DecisionStatus = (typeof DECISION_STATUSES)[number];
export type OrganizationalRecordStatus = AssumptionStatus | CommitmentStatus | DecisionStatus;

export interface OrganizationalEvidenceRef {
  kind: "issue" | "work_product" | "document" | "approval" | "metric" | "external" | "other";
  ref: string;
  label?: string | null;
  observedAt?: string | null;
}

export interface OrganizationalRecord {
  id: string;
  companyId: string;
  kind: OrganizationalRecordKind;
  status: OrganizationalRecordStatus;
  title: string;
  statement: string;
  rationale: string | null;
  consequences: string | null;
  resolution: string | null;
  confidence: number | null;
  ownerAgentId: string | null;
  ownerUserId: string | null;
  goalId: string | null;
  projectId: string | null;
  issueId: string | null;
  supersedesId: string | null;
  evidence: OrganizationalEvidenceRef[];
  dueAt: Date | null;
  reviewAt: Date | null;
  expiresAt: Date | null;
  resolvedAt: Date | null;
  createdByAgentId: string | null;
  createdByUserId: string | null;
  createdAt: Date;
  updatedAt: Date;
}
