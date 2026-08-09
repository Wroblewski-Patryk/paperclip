export function waitAgeHoursSince(timestamp, nowMs = Date.now()) {
  const timestampMs = timestamp ? new Date(timestamp).getTime() : Number.NaN;
  return Number.isFinite(timestampMs)
    ? Math.max(0, Math.round((nowMs - timestampMs) / 36_000) / 100)
    : null;
}

export function gateBriefFor(gate, nowMs = Date.now()) {
  const latestEvidenceAt = gate.latestEvidence?.updatedAt ?? null;
  const waitAgeHours = waitAgeHoursSince(latestEvidenceAt, nowMs);
  const stale = waitAgeHours === null || waitAgeHours >= 6;
  return {
    project: gate.project,
    rootBlocker: gate.rootBlocker,
    owner: gate.owner,
    latestEvidence: gate.latestEvidence?.summary ?? gate.latestEvidence?.status ?? "none",
    latestEvidenceAt,
    waitAgeHours,
    stale,
    ownerAction: stale
      ? `Escalate to ${gate.owner}: obtain a fresh accepted operator/credential fact or keep ${gate.rootBlocker} blocked with a next review condition.`
      : `Keep monitoring ${gate.rootBlocker}; latest evidence is recent enough to avoid repeated escalation.`,
    operatorPrompt: gate.operatorPrompt ?? null,
    approvalDryRunCommand: gate.approvalDryRunCommand ?? null,
    approvalApplyCommand: gate.approvalApplyCommand ?? null,
  };
}

export function staleGateOwnerActionLine(gateBrief) {
  return `Stale gate owner action: ${gateBrief.project} ${gateBrief.rootBlocker} (${gateBrief.owner}) has waited ${gateBrief.waitAgeHours ?? "unknown"}h; obtain a fresh accepted operator/credential fact or keep the blocker closed with a next review condition.`;
}

export function deliveryPermissionForMode(mode, blockedGateCount = 0) {
  const protectedDeliveryAllowed = mode === "ready_for_next_lane" && blockedGateCount === 0;
  const projectRepoMutationAllowed = protectedDeliveryAllowed
    || mode === "source_control_closure"
    || mode === "local_repair_lane";
  const canStartNewLane = ["ready_for_next_lane", "source_control_closure", "local_repair_lane", "assignment_required"].includes(mode);
  return {
    protectedDeliveryAllowed,
    projectRepoMutationAllowed,
    canStartNewLane,
    allowedLaneTypes: mode === "operating_system_closure"
      ? ["paperclip_os_closure", "project_truth_gap_dispatch"]
      : mode === "supervise_live_work"
        ? ["supervision_only"]
        : mode === "local_repair_lane"
          ? ["one_owner_evidence_lane", "local_validation", "local_commit_closure"]
        : mode === "assignment_required"
          ? ["ownership_assignment"]
        : mode === "wait_for_gate_fact"
          ? ["control_packet_refresh", "stale_gate_owner_escalation", "source_control_classification", "safe_architecture_planning", "infrastructure_gate_diagnosis", "paperclip_os_process_improvement"]
          : mode === "source_control_closure"
            ? ["source_control_classification", "local_validation", "local_commit_closure"]
            : ["one_owner_evidence_lane"],
    reason: mode === "local_repair_lane"
      ? "Protected gates still block push, deploy, restart, and protected smoke; local repair lanes may mutate project repos with validation and local commits."
      : mode === "wait_for_gate_fact"
      ? "Protected project delivery waits for an accepted fresh operator or credential fact."
      : mode === "assignment_required"
        ? "Board ownership may be assigned, but project repo mutation and protected delivery remain blocked until a legal lane exists."
      : mode === "operating_system_closure"
        ? "Paperclip OS must be committed or classified before broad delivery."
        : mode === "supervise_live_work"
          ? "Existing live work must be supervised before starting another lane."
          : mode === "source_control_closure"
            ? "Project repo closure may proceed locally, but protected gates still block push, deploy, restart, and protected smoke."
            : "No protected gate blocks this mode.",
  };
}

export function operatorActionStatusFor({ blockedGateCount = 0, dirtyProjectCount = 0 } = {}) {
  if (blockedGateCount > 0) return "operator_input_or_gate_evidence_needed";
  if (dirtyProjectCount > 0) return "source_control_closure_needed";
  return "no_operator_action_needed";
}

export function guardrailsForOperatingPosture(posture, currentAllowed = [], currentForbidden = []) {
  if (posture !== "project_source_control_closure_allowed") {
    return {
      allowed: currentAllowed ?? [],
      forbidden: currentForbidden ?? [],
    };
  }

  return {
    allowed: [
      "refresh control tick, source-control packet, and unblock packet",
      "classify dirty project source-control lanes before mutation",
      "run local validation for the classified changed files",
      "commit local project source-control closure when evidence supports it",
      "record an explicit no-commit decision when evidence does not support a commit",
      "supervise independent live work without duplicating its lane",
    ],
    forbidden: [
      "mutate project files before source-control classification",
      "create duplicate source-control cleanup or commit issues",
      "push",
      "deploy or restart production",
      "protected smoke without a fresh accepted gate fact",
      "secret disclosure",
    ],
  };
}

export function autonomyDispositionForMode(mode) {
  if (mode === "wait_for_gate_fact") return "intentional_gate_hold";
  if (mode === "operating_system_closure") return "operating_system_closure_required";
  if (mode === "supervise_live_work") return "live_work_supervision";
  if (mode === "local_repair_lane") return "local_repair_allowed";
  if (mode === "assignment_required") return "ownership_assignment_required";
  if (mode === "source_control_closure") return "source_control_closure_allowed";
  if (mode === "ready_for_next_lane") return "delivery_lane_allowed";
  return "monitoring_only";
}

export function controlActionTypeFor(action) {
  const text = String(action ?? "").trim();
  if (/^Refresh control tick/i.test(text)) return "control_packet_refresh";
  if (/^Stale gate owner action:/i.test(text)) return "stale_gate_owner_escalation";
  if (/^Verify and commit\/classify Paperclip OS/i.test(text)) return "paperclip_os_closure";
  if (/^Route .* through .*source-control/i.test(text)) return "source_control_classification";
  if (/^Classify .*source-control/i.test(text)) return "source_control_classification";
  if (/^Classify and close .*source-control/i.test(text)) return "source_control_classification";
  if (/^Route one source-control closure lane/i.test(text)) return "source_control_classification";
  if (/^Seed safe architecture planning lane/i.test(text)) return "safe_architecture_planning";
  if (/^Seed infrastructure gate diagnosis lane/i.test(text)) return "infrastructure_gate_diagnosis";
  if (/^Dispatch project truth gap/i.test(text)) return "project_truth_gap_dispatch";
  if (/^Project truth gap/i.test(text)) return "project_truth_gap_dispatch";
  if (/^Start or assign/i.test(text)) return "one_owner_evidence_lane";
  if (/^Assign exactly one controlled-project/i.test(text)) return "ownership_assignment";
  if (/^Supervise /i.test(text)) return "supervision_only";
  if (/^Run .*--apply/i.test(text)) return "apply_lane";
  return "context_or_guardrail";
}

export function controlActionSummaryFor(actions, allowedLaneTypes = []) {
  const allowed = new Set(allowedLaneTypes ?? []);
  const classified = (actions ?? []).map((action) => {
    const type = controlActionTypeFor(action);
    return {
      action,
      type,
      allowedByDeliveryPermission: type === "supervision_only" || allowed.has(type),
    };
  });
  return {
    count: classified.length,
    allowedActionCount: classified.filter((item) => item.allowedByDeliveryPermission).length,
    contextOrGuardrailCount: classified.filter((item) => item.type === "context_or_guardrail").length,
    actions: classified,
  };
}
