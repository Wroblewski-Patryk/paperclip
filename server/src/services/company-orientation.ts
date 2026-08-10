import type {
  CompanySituation,
  CompanySituationObservation,
  CompanySituationOrganizationalRecord,
} from "@paperclipai/shared";

const MAX_ACTIVE_GOALS = 5;
const MAX_RECORDS = 6;
const MAX_LEARNING = 5;
const MAX_ATTENTION = 8;
const MAX_TEXT = 600;

function bounded(value: string | null | undefined) {
  const text = String(value ?? "").trim();
  return text.length <= MAX_TEXT ? text : `${text.slice(0, MAX_TEXT - 3)}...`;
}

function scopedRank(value: { projectId?: string | null; issueId?: string | null }, scope: { projectId?: string | null; issueId?: string | null }) {
  if (scope.issueId && value.issueId === scope.issueId) return 0;
  if (scope.projectId && value.projectId === scope.projectId) return 1;
  return 2;
}

function selectScoped<T extends { projectId?: string | null; issueId?: string | null }>(
  values: T[] | undefined,
  scope: { projectId?: string | null; issueId?: string | null },
  limit: number,
) {
  return [...(values ?? [])]
    .sort((left, right) => scopedRank(left, scope) - scopedRank(right, scope))
    .slice(0, limit);
}

function summarizeRecord(record: CompanySituationOrganizationalRecord) {
  return {
    id: record.id,
    kind: record.kind,
    status: record.status,
    title: record.title,
    statement: bounded(record.statement),
    ownerAgentId: record.ownerAgentId,
    confidence: record.confidence,
    dueAt: record.dueAt,
    reviewAt: record.reviewAt,
    expiresAt: record.expiresAt,
    updatedAt: record.updatedAt,
  };
}

function summarizeObservation(observation: CompanySituationObservation) {
  return {
    id: observation.id,
    kind: observation.kind,
    status: observation.status,
    title: observation.title,
    summary: bounded(observation.summary),
    observedAt: observation.observedAt,
    projectId: observation.projectId,
    issueId: observation.issueId,
  };
}

export function buildCompanyOrientation(
  situation: CompanySituation,
  scope: { projectId?: string | null; issueId?: string | null } = {},
) {
  const deliberation = situation.deliberation ?? { assumptions: [], commitments: [], decisions: [], dueReviews: 0, overdueCommitments: 0 };
  const learning = situation.learning ?? { outcomes: [], causalFindings: [], candidates: [], promoted: 0 };
  const grounding = situation.externalGrounding ?? { currentSignals: [], staleSignals: [], contradictedSignals: [], coveredCategories: [] };
  const capacity = situation.capacity ?? ({} as CompanySituation["capacity"]);
  return {
    schemaVersion: 1,
    generatedAt: situation.generatedAt,
    basis: "bounded_company_situation_v1",
    scope: { projectId: scope.projectId ?? null, issueId: scope.issueId ?? null },
    mission: { activeGoals: (situation.mission?.activeGoals ?? []).slice(0, MAX_ACTIVE_GOALS) },
    work: situation.work,
    capacity: {
      dispatchState: capacity.dispatchState ?? "degraded",
      availableAgents: capacity.availableAgents ?? 0,
      runningAgents: capacity.runningAgents ?? 0,
      schedulerActiveAgents: capacity.schedulerActiveAgents ?? 0,
      dispatchableRunnableIssues: capacity.dispatchableRunnableIssues ?? 0,
      heldRunnableIssues: capacity.heldRunnableIssues ?? 0,
      bottleneck: capacity.bottleneck ?? null,
    },
    governance: situation.governance,
    deliberation: {
      counts: {
        assumptions: deliberation.assumptions.length,
        commitments: deliberation.commitments.length,
        decisions: deliberation.decisions.length,
      },
      dueReviews: deliberation.dueReviews,
      overdueCommitments: deliberation.overdueCommitments,
      current: [...deliberation.assumptions, ...deliberation.commitments, ...deliberation.decisions]
        .slice(0, MAX_RECORDS)
        .map(summarizeRecord),
    },
    learning: {
      candidateCount: learning.candidates.length,
      promoted: learning.promoted,
      recentCandidates: selectScoped(learning.candidates, scope, MAX_LEARNING).map(summarizeObservation),
    },
    externalGrounding: {
      currentSignalCount: grounding.currentSignals.length,
      staleSignalCount: grounding.staleSignals.length,
      contradictedSignalCount: grounding.contradictedSignals.length,
      coveredCategories: grounding.coveredCategories,
    },
    attention: (situation.attention ?? []).slice(0, MAX_ATTENTION),
  };
}
