export type NativeControlStatus = "passed" | "warning" | "failed" | "not_configured";

const checks = [
  "runtime_health", "database_health", "dead_locks", "expired_cycles", "wip", "fan_out", "retry", "quota",
  "admission_coverage", "parent_child_compliance", "lateral_assignment", "self_review", "evidence_completeness",
  "orphan_task", "orphan_delivery", "stale_review", "correction_backlog", "deployment_backlog",
  "documentation_growth", "context_budget", "permission_drift", "sandbox_bypass", "stale_roost",
  "outbox_dead_letters", "manual_intervention", "accepted_outcomes", "cost_per_outcome",
] as const;

export type NativeControlCheckId = (typeof checks)[number];

export function buildNativeControlMatrix(input: {
  companyId: string;
  now: Date;
  observations?: Partial<Record<NativeControlCheckId, { status: NativeControlStatus; measuredValue: number | string | boolean | null; evidenceRefs?: string[] }>>;
}) {
  return checks.map((checkId) => {
    const observation = input.observations?.[checkId];
    const decisionOwned = checkId === "manual_intervention";
    return {
      check_id: checkId,
      check_version: 1,
      status: observation?.status ?? "not_configured",
      severity: ["runtime_health", "database_health", "dead_locks", "retry", "quota", "permission_drift", "sandbox_bypass"].includes(checkId) ? "critical" : "high",
      scope: { type: "company", id: input.companyId },
      evidence_refs: observation?.evidenceRefs ?? [],
      measured_value: observation?.measuredValue ?? null,
      threshold: checkId === "wip" ? 3 : checkId === "retry" ? 2 : 0,
      finding_fingerprint: `native_control:${checkId}:${input.companyId}`,
      native_action: decisionOwned ? "escalate_to_owner" : "contain_then_create_finding",
      owner: decisionOwned ? "Patryk" : "native_supervision",
      next_check_at: new Date(input.now.getTime() + (decisionOwned ? 24 * 60 * 60_000 : 10 * 60_000)).toISOString(),
    };
  });
}

export const nativeControlCheckIds = [...checks];
