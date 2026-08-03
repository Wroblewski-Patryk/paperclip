const terminalStatuses = new Set(["done", "cancelled"]);
const deliveryTerms = /\b(implement|fix|repair|deploy|release|integrat|migrat|api|backend|frontend|database|runtime|security|test|ui|ux|bug|feature)\w*/i;
const artifactOnlyTerms = /\b(document|docs?|report|plan|map|inventory|index|summary|comment|analysis|audit)\w*/i;
const outcomeTerms = /\b(expected state|acceptance|verify|verification|proof|evidence|user can|owner can|observable|deployed|smoke|test|passes?|works?|result)\b/i;
const highImpactTerms = /\b(delete|destroy|purge|drop\s+(?:table|database)|force[- ]?push|production|deploy|migration|credential|secret|permission|billing|financial|live\s+(?:trade|order)|source\s+of\s+truth|cross[- ]project)\b/i;
const optimizationTerms = /\b(refactor|polish|cleanup|simplif|standardiz|document|coverage|architecture|optimiz)\w*/i;
const stopBoundaryTerms = /\b(done enough|stop condition|stop when|do not optimize|return only|revisit only|accept(?:ed)? debt|non-goal|out of scope)\b/i;

function list(value) {
  return Array.isArray(value) ? value : [];
}

export function normalizeOutcomeFingerprint(value) {
  return String(value ?? "")
    .toLowerCase()
    .replace(/\[[^\]]+\]/g, " ")
    .replace(/\b(?:luc-)?\d+\b/g, " ")
    .replace(/\b(?:retry|attempt|follow-up|follow up|review|recheck|refresh)\b/g, " ")
    .replace(/[^a-z0-9ąćęłńóśźż]+/gi, " ")
    .trim()
    .replace(/\s+/g, " ");
}

function evidenceRefs(bundle) {
  if (!bundle) return [];
  return [
    bundle.testEvidence,
    bundle.reviewEvidence,
    bundle.documentationEvidence,
    bundle.securityEvidence,
    bundle.deploymentEvidence,
    bundle.monitoringEvidence,
  ].flatMap((category) => list(category?.refs));
}

function evidenceText(bundle) {
  if (!bundle) return "";
  return [
    bundle.summary,
    bundle.testEvidence?.summary,
    bundle.reviewEvidence?.summary,
    bundle.documentationEvidence?.summary,
    bundle.securityEvidence?.summary,
    bundle.deploymentEvidence?.summary,
    bundle.monitoringEvidence?.summary,
  ].filter(Boolean).join("\n");
}

function issueRef(issue) {
  return {
    id: issue.id ?? null,
    identifier: issue.identifier ?? null,
    title: issue.title ?? null,
    status: issue.status ?? null,
    projectId: issue.projectId ?? null,
    assigneeAgentId: issue.assigneeAgentId ?? null,
  };
}

export function auditOutcomeIntegrity({
  issues,
  projects = [],
  agents = [],
  routines = [],
  organizationalRecords = [],
  now = new Date(),
  recentHours = 168,
  maxDirectChildren = 3,
}) {
  const cutoff = now.getTime() - recentHours * 60 * 60 * 1000;
  const issueById = new Map(issues.map((issue) => [issue.id, issue]));
  const projectById = new Map(projects.map((project) => [project.id, project]));
  const openIssues = issues.filter((issue) => !terminalStatuses.has(issue.status));
  const recentDone = issues.filter((issue) => issue.status === "done" && Date.parse(issue.updatedAt ?? 0) >= cutoff);
  const findings = [];

  const childrenByParent = new Map();
  for (const issue of openIssues) {
    if (!issue.parentId) continue;
    const bucket = childrenByParent.get(issue.parentId) ?? [];
    bucket.push(issue);
    childrenByParent.set(issue.parentId, bucket);
  }
  for (const [parentId, children] of childrenByParent) {
    if (children.length <= maxDirectChildren) continue;
    findings.push({
      severity: "warn",
      law: "Cobra effect / Brooks / local optimization",
      code: "excessive_open_fanout",
      message: `Parent has ${children.length} non-terminal direct children; require explicit independence and an integration owner.`,
      parent: issueRef(issueById.get(parentId) ?? { id: parentId }),
      items: children.map(issueRef),
    });
  }

  const fingerprintGroups = new Map();
  for (const issue of openIssues) {
    const fingerprint = normalizeOutcomeFingerprint(issue.title);
    if (fingerprint.length < 12) continue;
    const fingerprintKey = `${issue.projectId ?? "unscoped"}:${fingerprint}`;
    const bucket = fingerprintGroups.get(fingerprintKey) ?? [];
    bucket.push(issue);
    fingerprintGroups.set(fingerprintKey, bucket);
  }
  for (const [fingerprintKey, group] of fingerprintGroups) {
    if (group.length < 3) continue;
    const fingerprint = fingerprintKey.slice(fingerprintKey.indexOf(":") + 1);
    findings.push({
      severity: "warn",
      law: "Goodhart / reward hacking / recurrence",
      code: "repeated_open_fingerprint",
      message: `The same normalized work pattern is open ${group.length} times; consolidate or prove distinct outcomes.`,
      fingerprint,
      items: group.map(issueRef),
    });
  }

  const deepIssues = openIssues.filter((issue) => Number(issue.requestDepth ?? 0) > 4);
  if (deepIssues.length > 0) findings.push({
    severity: "warn",
    law: "Gall / KISS / YAGNI",
    code: "deep_request_tree",
    message: "Request depth above four suggests process growth; collapse the tree unless each layer owns a distinct decision.",
    items: deepIssues.map(issueRef),
  });

  const weakContracts = openIssues.filter((issue) => {
    if (!issue.assigneeAgentId || issue.originKind === "routine_execution") return false;
    const contract = `${issue.description ?? ""}\n${list(issue.acceptanceCriteria).join("\n")}`;
    const hasAcceptance = list(issue.acceptanceCriteria).length > 0
      || /\b(acceptance|definition of done|required outcome|required output)\b/i.test(contract);
    return !hasAcceptance || !outcomeTerms.test(contract);
  });
  if (weakContracts.length > 0) findings.push({
    severity: "warn",
    law: "specification gaming / Conway",
    code: "weak_outcome_contract",
    message: "Assigned work lacks an explicit observable outcome or verification contract.",
    items: weakContracts.slice(0, 50).map((issue) => ({ ...issueRef(issue), project: projectById.get(issue.projectId)?.name ?? null })),
    total: weakContracts.length,
  });

  const highImpactWithoutDecisionContract = openIssues.filter((issue) => {
    if (!issue.assigneeAgentId || issue.originKind === "routine_execution") return false;
    if (!["todo", "in_progress"].includes(issue.status)) return false;
    const highImpact = issue.priority === "critical"
      || highImpactTerms.test(`${issue.title ?? ""}\n${issue.description ?? ""}`);
    return highImpact && !issue.executionPolicy?.decisionContract;
  });
  if (highImpactWithoutDecisionContract.length > 0) findings.push({
    severity: "warn",
    law: "economics / uncertainty / reversibility / least privilege",
    code: "high_impact_without_decision_contract",
    message: "Runnable high-impact work lacks the structured value, cost, confidence, reversibility, resource-limit, stop, and done-enough decision contract.",
    total: highImpactWithoutDecisionContract.length,
    items: highImpactWithoutDecisionContract.slice(0, 50).map(issueRef),
  });

  const decisionDispositionMismatches = openIssues.filter((issue) => {
    const contract = issue.executionPolicy?.decisionContract;
    return contract
      && ["todo", "in_progress"].includes(issue.status)
      && contract.disposition !== "do_now";
  });
  if (decisionDispositionMismatches.length > 0) findings.push({
    severity: "error",
    law: "right not to act / authorization proportional to risk",
    code: "decision_disposition_status_mismatch",
    message: "Work is runnable although its decision contract says later, monitor, accept debt, reject, conditional, proposal, or escalate.",
    items: decisionDispositionMismatches.map(issueRef),
  });

  const uncertainHighRiskExecution = openIssues.filter((issue) => {
    const contract = issue.executionPolicy?.decisionContract;
    return contract
      && ["todo", "in_progress"].includes(issue.status)
      && ["unknown", "low"].includes(contract.confidence)
      && contract.reversibility !== "easy";
  });
  if (uncertainHighRiskExecution.length > 0) findings.push({
    severity: "error",
    law: "uncertainty-constrained autonomy",
    code: "uncertain_high_risk_execution",
    message: "Low-confidence work with meaningful reversal cost is runnable instead of isolated, proposed, monitored, or escalated.",
    items: uncertainHighRiskExecution.map(issueRef),
  });

  const optimizationWithoutStopBoundary = openIssues.filter((issue) => {
    if (!issue.assigneeAgentId || issue.originKind === "routine_execution") return false;
    if (!["todo", "in_progress"].includes(issue.status)) return false;
    const text = `${issue.title ?? ""}\n${issue.description ?? ""}`;
    return optimizationTerms.test(text)
      && !issue.executionPolicy?.decisionContract?.doneEnough
      && !stopBoundaryTerms.test(text);
  });
  if (optimizationWithoutStopBoundary.length > 0) findings.push({
    severity: "warn",
    law: "Parkinson / KISS / YAGNI / good-enough stopping",
    code: "optimization_without_stop_boundary",
    message: "Optimization, refactor, cleanup, architecture, coverage, or documentation work has no explicit done-enough/non-goal boundary.",
    total: optimizationWithoutStopBoundary.length,
    items: optimizationWithoutStopBoundary.slice(0, 50).map(issueRef),
  });

  const orphanOutcomeParents = [...childrenByParent.entries()]
    .map(([parentId, children]) => ({ parent: issueById.get(parentId), children }))
    .filter(({ parent }) => parent && !parent.assigneeAgentId && !parent.assigneeUserId);
  if (orphanOutcomeParents.length > 0) findings.push({
    severity: "warn",
    law: "single accountable outcome owner",
    code: "orphan_outcome_parent",
    message: "An open parent has active delegated work but no accountable owner for the final outcome.",
    items: orphanOutcomeParents.slice(0, 50).map(({ parent, children }) => ({
      ...issueRef(parent),
      activeChildCount: children.length,
    })),
    total: orphanOutcomeParents.length,
  });

  const assumptionHygieneFailures = organizationalRecords.filter((record) => {
    if (record.kind !== "assumption" || record.status !== "active") return false;
    const expired = record.expiresAt && Date.parse(record.expiresAt) <= now.getTime();
    const missingProvenance = !Array.isArray(record.evidence) || record.evidence.length === 0;
    const missingConfidence = record.confidence == null;
    const missingReviewBoundary = !record.reviewAt && !record.expiresAt;
    return expired || missingProvenance || missingConfidence || missingReviewBoundary;
  });
  if (assumptionHygieneFailures.length > 0) findings.push({
    severity: "warn",
    law: "belief provenance / controlled forgetting",
    code: "active_assumption_hygiene_failure",
    message: "Active assumptions are expired or lack evidence, confidence, and a review/expiry boundary; they must not propagate as organizational fact.",
    total: assumptionHygieneFailures.length,
    items: assumptionHygieneFailures.slice(0, 50).map((record) => ({
      id: record.id,
      title: record.title,
      projectId: record.projectId ?? null,
      confidence: record.confidence ?? null,
      reviewAt: record.reviewAt ?? null,
      expiresAt: record.expiresAt ?? null,
    })),
  });

  const missingEvidence = recentDone.filter((issue) => !issue.completionEvidence);
  if (missingEvidence.length > 0) findings.push({
    severity: "error",
    law: "Campbell / specification gaming",
    code: "done_without_typed_evidence",
    message: "Recently completed work has no typed completion evidence.",
    total: missingEvidence.length,
    items: missingEvidence.slice(0, 50).map(issueRef),
  });

  const commentOnlyEvidence = recentDone.filter((issue) => {
    const refs = evidenceRefs(issue.completionEvidence);
    return refs.length > 0 && refs.every((ref) => ref.kind === "request_comment");
  });
  if (commentOnlyEvidence.length > 0) findings.push({
    severity: "warn",
    law: "reward hacking / independent verification",
    code: "comment_only_completion_evidence",
    message: "Completion evidence points only to the mutation request comment; require an inspectable artifact or independently authored review for technical work.",
    total: commentOnlyEvidence.length,
    items: commentOnlyEvidence.slice(0, 50).map(issueRef),
  });

  const documentationOnlyDelivery = recentDone.filter((issue) => {
    if (!deliveryTerms.test(`${issue.title ?? ""}\n${issue.description ?? ""}`)) return false;
    const text = evidenceText(issue.completionEvidence);
    return text && artifactOnlyTerms.test(text) && !outcomeTerms.test(text);
  });
  if (documentationOnlyDelivery.length > 0) findings.push({
    severity: "warn",
    law: "Goodhart / Parkinson / Shirky",
    code: "documentation_only_technical_closure",
    message: "Technical work appears closed with artifact/activity language but no observable behavior proof.",
    total: documentationOnlyDelivery.length,
    items: documentationOnlyDelivery.slice(0, 50).map(issueRef),
  });

  const summary = {
    totalIssues: issues.length,
    openIssues: openIssues.length,
    recentDone: recentDone.length,
    evidenceBackedRecentDone: recentDone.length - missingEvidence.length,
    openChildCount: [...childrenByParent.values()].reduce((sum, children) => sum + children.length, 0),
    findingCount: findings.length,
    errorCount: findings.filter((finding) => finding.severity === "error").length,
    warningCount: findings.filter((finding) => finding.severity === "warn").length,
    complexitySnapshot: {
      agentCount: agents.length,
      activeAgentCount: agents.filter((agent) => agent.status === "active").length,
      routineCount: routines.length,
      activeRoutineCount: routines.filter((routine) => routine.status === "active").length,
      projectCount: projects.length,
      organizationalRecordCount: organizationalRecords.length,
    },
  };

  return {
    status: summary.errorCount > 0 ? "fail" : summary.warningCount > 0 ? "warning" : "pass",
    generatedAt: now.toISOString(),
    windowHours: recentHours,
    principle: "Optimize observable owner/product state change with independent evidence; use activity metrics only to trigger investigation.",
    summary,
    findings,
  };
}
