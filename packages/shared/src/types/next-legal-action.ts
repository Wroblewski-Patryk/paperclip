export const NEXT_LEGAL_ACTION_CLASSES = [
  "READY_FOR_EXECUTION",
  "READY_FOR_REVIEW",
  "WAITING_FOR_DEPENDENCY",
  "WAITING_FOR_OWNER",
  "WAITING_FOR_EVIDENCE",
  "WAITING_FOR_DECISION",
  "HELD_BY_POLICY",
  "BLOCKED_BY_CONFLICT",
  "OUTCOME_ALREADY_SATISFIED",
  "INTENT_CONFIRMATION_REQUIRED",
  "RECONCILIATION_REQUIRED",
  "INVALID_STATE",
  "TERMINAL",
] as const;

export type NextLegalActionClass = (typeof NEXT_LEGAL_ACTION_CLASSES)[number];
export type NextActionEligibility = "eligible" | "ineligible" | "unknown";
export type NextActionEpistemicState = "known" | "insufficient_evidence";
export type NextActionConfidence = "high" | "medium" | "low";
export type NextActionValueState = "valuable_now" | "not_prioritized" | "unknown";
export type IntentStatus = "ACTIVE" | "RECONFIRM_REQUIRED" | "SUPERSEDED" | "OBSOLETE" | "SATISFIED_ELSEWHERE" | "UNKNOWN";
export type VerificationIndependenceClass = "SELF_REPORTED" | "SAME_SYSTEM" | "INDEPENDENT_INTERNAL" | "EXTERNAL" | "HUMAN";

export interface NextLegalActionEvidence {
  code: string;
  state: "passed" | "failed" | "unknown";
  entityType: string;
  entityId: string;
  observedAt: string;
  sourceUpdatedAt: string;
  freshUntil: string;
  summary: string;
}

export interface NextLegalActionPriority {
  valueState: NextActionValueState;
  declaredPriority: string;
  goalImportance: "linked" | "unlinked" | "unknown";
  unblockValue: number;
  ageHours: number;
  constraintEffect: "helps_current_constraint" | "neutral" | "worsens_current_constraint" | "unknown";
  reasons: string[];
}

export interface NextLegalAction {
  issueId: string;
  identifier: string | null;
  title: string;
  currentState: string;
  actionClass: NextLegalActionClass;
  reasonCode: string;
  eligibility: NextActionEligibility;
  epistemicState: NextActionEpistemicState;
  requiredNextAction: "ACT" | "WAIT" | "VERIFY" | "RECONCILE" | "ESCALATE" | "GATHER_EVIDENCE" | "REQUEST_INTENT_CONFIRMATION" | "VERIFY_DEPENDENCY" | "RECONFIRM_DEPENDENCY" | "REMOVE_STALE_DEPENDENCY" | "EXECUTE_BLOCKER" | "ESCALATE_DEPENDENCY" | "NONE";
  ownerAgentId: string | null;
  blockingEntity: { type: string; id: string } | null;
  dependencyRefs: string[];
  policyRefs: string[];
  intent: {
    status: IntentStatus;
    confirmedAt: string | null;
    validUntil: string | null;
    ownerAgentId: string | null;
    source: string;
    reason: string;
    hierarchy: Record<string, unknown>;
  };
  evidence: NextLegalActionEvidence[];
  priority: NextLegalActionPriority;
  confidence: NextActionConfidence;
  observedAt: string;
}

export interface NextLegalActionDistributionRow {
  actionClass: NextLegalActionClass;
  count: number;
  mainReasons: string[];
}

export interface BlockedReasonDistributionRow {
  reason: "dependency" | "missing_owner" | "missing_evidence" | "policy" | "external_system" | "review" | "invalid_state" | "conflicting_state" | "manual_hold" | "unknown";
  count: number;
}

export interface ShadowDispatchDecision {
  mode: "shadow";
  outcome: "candidate_proposed" | "healthy_no_op" | "insufficient_evidence";
  reasonCode: string;
  candidateIssueId: string | null;
  consideredIssueIds: string[];
  rejectedAlternatives: Array<{ issueId: string; reason: string }>;
  confidence: NextActionConfidence;
  expectedOutcome: string;
  observedAt: string;
}

export interface NextLegalActionProjection {
  companyId: string;
  generatedAt: string;
  contractVersion: 2;
  actions: NextLegalAction[];
  distribution: NextLegalActionDistributionRow[];
  blockedReasons: BlockedReasonDistributionRow[];
  currentConstraint: {
    kind: "dependency" | "review" | "ownership" | "policy" | "reconciliation" | "liveness" | "none";
    count: number;
    rationale: string;
  };
  liveness: {
    eligibleValuableWork: number;
    held: number;
    unexplainedIdle: number;
    noOpReason: "NO_ELIGIBLE_WORK" | "POLICY_BLOCK" | "NO_OWNER" | "DEPENDENCY" | "INSUFFICIENT_EVIDENCE" | "SHADOW_CANDIDATE_EXISTS";
  };
  shadowDispatch: ShadowDispatchDecision;
}

export type AutonomyDecisionMode = "SHADOW" | "RECOMMEND" | "LIMITED_AUTO" | "AUTO";
export type AutonomyDecisionDisposition = "AUTHORIZE" | "RECOMMEND" | "GATHER_EVIDENCE" | "NO_ACTION";
export type CostCoverageState = "KNOWN_ZERO" | "NONZERO" | "PARTIAL" | "UNKNOWN";
export type AutonomyExecutionAuthority = "ENVELOPE" | "AUTHORIZED_CANARY";
export type ExecutionLivenessStatus = "STARTING" | "RUNNING" | "WAITING_VALID" | "STALLED" | "UNCERTAIN" | "TERMINAL";
export type ConstraintImpactStatus = "SUPPORTED" | "AMBIGUOUS" | "CONTRADICTED" | "NOT_MEASURABLE";

export interface CostSemanticsV2 {
  linkageCoverage: { linkedRuns: number; totalRuns: number; ratio: number | null };
  sourceCoverage: { required: string[]; observed: string[]; missing: string[] };
  semanticCoverage: "VERIFIED" | "PARTIAL" | "UNKNOWN";
  monetaryConfidence: "HIGH" | "MEDIUM" | "LOW" | "UNKNOWN";
  zeroSemantics: "VERIFIED_ZERO" | "ZERO_REPORTED" | "NONZERO" | "UNKNOWN";
  observedCents: number | null;
}

export interface AutonomyDecisionVector {
  eligibility: { state: "eligible" | "ineligible" | "unknown"; reasons: string[] };
  constraintRelevance: { state: "helps" | "neutral" | "worsens" | "unknown"; rationale: string };
  organizationalValue: { state: "high" | "medium" | "low" | "unknown"; rationale: string };
  risk: { level: "low" | "medium" | "high"; factors: string[] };
  cost: { coverage: CostCoverageState; estimatedCents: number | null; rationale: string };
  opportunityCost: { state: "low" | "medium" | "high" | "unknown"; rationale: string };
  confidence: { value: number; rationale: string };
}

export interface ExpectedOutcomeContract {
  statement: string;
  indicators: Array<{ key: string; expected: unknown; evidenceRequired: string[] }>;
  verificationOwner: "independent_reviewer" | "native_supervision";
  verificationIndependence: VerificationIndependenceClass;
  verificationWindowMinutes: number;
  rollbackTrigger: string;
}

export interface ExecutionLivenessPolicy {
  taskClass: string;
  expectedFirstHeartbeatMinutes: number;
  expectedFirstProgressEvidenceMinutes: number;
  maxSilentIntervalMinutes: number;
  expectedDurationMinutes: number;
  escalationThresholdMinutes: number;
  boundedRetries: number;
}

export interface CanaryAuthorizationContract {
  actionClass: string;
  candidateCriteria: Record<string, unknown>;
  maxExecutions: number;
  maxConcurrency: number;
  allowedRisk: Array<"low" | "medium" | "high">;
  environments: string[];
  budget: { maxCostCents: number; allowedCostUncertainty: Array<"VERIFIED" | "PARTIAL" | "UNKNOWN_BOUNDED">; maxCalls: number };
  validUntil: string;
  rollbackRequirement: Record<string, unknown>;
  verificationRequirement: { minimumIndependence: VerificationIndependenceClass; evidence: string[] };
  stopConditions: string[];
}

export interface AutonomyEnvelopeContract {
  actionClass: string;
  stage: AutonomyDecisionMode;
  scope: {
    taskTypes: string[];
    riskLevels: string[];
    environments: string[];
    ownerAgentIds: string[];
  };
  budget: { maxCostCents: number | null; maxRuns: number };
  concurrency: { maxActive: number };
  allowedActions: string[];
  rollback: { required: boolean; method: string };
}
