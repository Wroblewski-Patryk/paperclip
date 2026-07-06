export interface EffectiveModelProfileFields {
  effectiveModelProfile?: string | null;
  effectiveDefaultModel?: string | null;
  effectiveQuotaLane?: string | null;
  effectiveModelProfileRequested?: string | null;
  effectiveModelProfileApplied?: string | null;
  effectiveModelProfileSource?: string | null;
  effectiveModelProfileFallbackReason?: string | null;
  contextSnapshot?: Record<string, unknown> | null;
}

export interface ModelProfileDisplay {
  profile: string;
  requestedProfile: string | null;
  defaultModel: string | null;
  quotaLane: string | null;
  source: string | null;
  fallbackReason: string | null;
  label: string;
  title: string;
}

function asRecord(value: unknown): Record<string, unknown> | null {
  if (typeof value !== "object" || value === null || Array.isArray(value)) return null;
  return value as Record<string, unknown>;
}

function asNonEmptyString(value: unknown): string | null {
  if (typeof value !== "string") return null;
  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed : null;
}

function displayToken(value: string | null | undefined): string | null {
  if (!value) return null;
  return value.replace(/[_-]+/g, " ");
}

export function readModelProfileDisplay(run: EffectiveModelProfileFields): ModelProfileDisplay | null {
  const context = asRecord(run.contextSnapshot);
  const contextProfile = asRecord(context?.paperclipModelProfile);
  const contextRouter = asRecord(context?.paperclipModelRouter);

  const requestedProfile =
    asNonEmptyString(run.effectiveModelProfileRequested) ??
    asNonEmptyString(contextProfile?.requested) ??
    null;
  const profile =
    asNonEmptyString(run.effectiveModelProfileApplied) ??
    asNonEmptyString(run.effectiveModelProfile) ??
    asNonEmptyString(contextProfile?.applied) ??
    asNonEmptyString(context?.modelProfile) ??
    asNonEmptyString(contextRouter?.profile);

  if (!profile) return null;

  const defaultModel =
    asNonEmptyString(run.effectiveDefaultModel) ??
    asNonEmptyString(contextProfile?.defaultModel);
  const quotaLane =
    asNonEmptyString(run.effectiveQuotaLane) ??
    asNonEmptyString(contextProfile?.quotaLane);
  const source =
    asNonEmptyString(run.effectiveModelProfileSource) ??
    asNonEmptyString(contextProfile?.configSource) ??
    asNonEmptyString(contextRouter?.source);
  const fallbackReason =
    asNonEmptyString(run.effectiveModelProfileFallbackReason) ??
    asNonEmptyString(contextProfile?.fallbackReason) ??
    asNonEmptyString(contextRouter?.reason);

  const labelParts = [
    `Profile ${profile}`,
    defaultModel,
  ].filter((value): value is string => Boolean(value));
  const titleParts = [
    `Effective model profile: ${profile}`,
    requestedProfile && requestedProfile !== profile ? `requested: ${requestedProfile}` : null,
    defaultModel ? `model: ${defaultModel}` : null,
    quotaLane ? `quota lane: ${quotaLane}` : null,
    source ? `source: ${displayToken(source)}` : null,
    fallbackReason ? `reason: ${fallbackReason}` : null,
  ].filter((value): value is string => Boolean(value));

  return {
    profile,
    requestedProfile,
    defaultModel,
    quotaLane,
    source,
    fallbackReason,
    label: labelParts.join(" / "),
    title: titleParts.join("; "),
  };
}
