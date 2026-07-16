import type { OrganizationalEvidenceRef } from "./organizational-record.js";

export const ORGANIZATIONAL_OBSERVATION_KINDS = ["outcome", "causal", "external_signal", "learning"] as const;
export type OrganizationalObservationKind = (typeof ORGANIZATIONAL_OBSERVATION_KINDS)[number];

export const ORGANIZATIONAL_OBSERVATION_STATUSES = [
  "proposed", "active", "current", "verified", "validated", "accepted", "disputed",
  "contradicted", "stale", "promoted", "rejected", "superseded", "archived",
] as const;
export type OrganizationalObservationStatus = (typeof ORGANIZATIONAL_OBSERVATION_STATUSES)[number];

export const OUTCOME_LAYERS = ["output", "acceptance", "outcome", "impact"] as const;
export type OutcomeLayer = (typeof OUTCOME_LAYERS)[number];
export const OUTCOME_RESULTS = ["success", "failure", "mixed", "neutral"] as const;
export type OutcomeResult = (typeof OUTCOME_RESULTS)[number];
export const CAUSAL_ROLES = ["symptom", "contributing_cause", "root_cause", "prevention", "success_factor"] as const;
export type CausalRole = (typeof CAUSAL_ROLES)[number];
export const EXTERNAL_SIGNAL_CATEGORIES = ["production", "customer", "business", "market", "regulatory"] as const;
export type ExternalSignalCategory = (typeof EXTERNAL_SIGNAL_CATEGORIES)[number];
export const LEARNING_TARGET_KINDS = ["procedure", "skill", "template", "eval", "routine", "policy", "issue"] as const;
export type LearningTargetKind = (typeof LEARNING_TARGET_KINDS)[number];

export interface OrganizationalMeasurement {
  name: string;
  value: number | string;
  unit?: string | null;
  baseline?: number | string | null;
  target?: number | string | null;
}

export interface LearningPromotionTarget {
  kind: LearningTargetKind;
  ref: string;
  label?: string | null;
}

export interface OrganizationalObservation {
  id: string;
  companyId: string;
  kind: OrganizationalObservationKind;
  status: OrganizationalObservationStatus;
  title: string;
  summary: string;
  sourceClass: string;
  provenance: OrganizationalEvidenceRef[];
  confidence: number | null;
  observedAt: Date;
  validUntil: Date | null;
  freshnessWindowHours: number | null;
  goalId: string | null;
  projectId: string | null;
  issueId: string | null;
  agentId: string | null;
  runId: string | null;
  parentObservationId: string | null;
  supersedesId: string | null;
  outcomeLayer: OutcomeLayer | null;
  outcomeResult: OutcomeResult | null;
  causalRole: CausalRole | null;
  externalCategory: ExternalSignalCategory | null;
  measurement: OrganizationalMeasurement | null;
  promotionTarget: LearningPromotionTarget | null;
  promotedAt: Date | null;
  createdByAgentId: string | null;
  createdByUserId: string | null;
  createdAt: Date;
  updatedAt: Date;
}
