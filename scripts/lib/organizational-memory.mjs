const DEDUPE_PREFIX = "paperclip:dedupe:";
const UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

export function isUuid(value) {
  return typeof value === "string" && UUID_PATTERN.test(value);
}

export function normalizeApiCollection(value) {
  if (Array.isArray(value)) return value;
  if (Array.isArray(value?.value)) return value.value;
  return [];
}

export function organizationalDedupeRef(key) {
  const normalized = String(key ?? "").trim();
  if (!normalized) throw new Error("A non-empty organizational memory dedupe key is required.");
  const ref = `${DEDUPE_PREFIX}${normalized}`;
  if (ref.length > 1000) throw new Error("Organizational memory dedupe key is too long.");
  return ref;
}

export function findByOrganizationalDedupeKey(items, key, evidenceField) {
  const ref = organizationalDedupeRef(key);
  return normalizeApiCollection(items).find((item) =>
    Array.isArray(item?.[evidenceField])
    && item[evidenceField].some((evidence) => evidence?.kind === "other" && evidence?.ref === ref)
  ) ?? null;
}

function mergeEvidence(...collections) {
  const merged = [];
  const seen = new Set();
  for (const item of collections.flat().filter(Boolean)) {
    if (!item?.kind || !item?.ref) continue;
    const key = `${item.kind}\u0000${item.ref}`;
    if (seen.has(key)) continue;
    seen.add(key);
    merged.push(item);
  }
  return merged;
}

function contextualFields(context) {
  const issue = context.issue ?? null;
  return {
    ...(isUuid(issue?.goalId) ? { goalId: issue.goalId } : {}),
    ...(isUuid(issue?.projectId) ? { projectId: issue.projectId } : {}),
    ...(isUuid(issue?.id) ? { issueId: issue.id } : {}),
  };
}

function issueEvidence(issue, observedAt) {
  if (!issue?.id && !issue?.identifier) return [];
  return [{
    kind: "issue",
    ref: issue.identifier ?? issue.id,
    label: issue.title ?? null,
    observedAt,
  }];
}

export function prepareOrganizationalPayload({
  mode,
  payload,
  dedupeKey,
  context = {},
  now = new Date().toISOString(),
}) {
  if (mode !== "record" && mode !== "observe") {
    throw new Error(`Unsupported organizational memory mode: ${mode}`);
  }
  if (!payload || typeof payload !== "object" || Array.isArray(payload)) {
    throw new Error("Organizational memory input must be a JSON object.");
  }
  const { companyId: _companyId, ...input } = payload;
  const dedupeEvidence = { kind: "other", ref: organizationalDedupeRef(dedupeKey) };
  const fields = contextualFields(context);
  const evidence = issueEvidence(context.issue, now);

  if (mode === "observe") {
    return {
      ...fields,
      ...input,
      observedAt: input.observedAt ?? now,
      ...(isUuid(context.agentId) && !input.agentId ? { agentId: context.agentId } : {}),
      ...(isUuid(context.runId) && !input.runId ? { runId: context.runId } : {}),
      provenance: mergeEvidence(input.provenance ?? [], evidence, dedupeEvidence),
    };
  }

  return {
    ...fields,
    ...input,
    ...(isUuid(context.agentId) && !input.ownerAgentId ? { ownerAgentId: context.agentId } : {}),
    evidence: mergeEvidence(input.evidence ?? [], evidence, dedupeEvidence),
  };
}

