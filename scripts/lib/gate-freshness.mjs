import { uniqueSecretsForKeys } from "./secret-aliases.mjs";

export const positiveGateEvidenceTokens = [
  "approval granted",
  "operator approved",
  "board approved",
  "autonomous standing policy approved",
  "softwarehouse-autonomous-gate-approval",
  "gate freshness approved",
  "resume gate recheck",
  "resume protected smoke",
  "credential rotated",
  "secret updated after blocker",
  "token refreshed",
  "key rotated",
];

export const placeholderOnlyGateTokens = [
  "placeholder",
  "binding sync",
  "metadata-only",
  "metadata only",
  "technical binding",
  "no real credential",
];

export function latestTimestamp(values) {
  return values
    .filter(Boolean)
    .sort()
    .at(-1) ?? null;
}

export function isAfter(left, right) {
  return Boolean(left && right && new Date(left).getTime() > new Date(right).getTime());
}

export function normalizeText(value) {
  return String(value ?? "").toLowerCase();
}

export function hasAnyToken(text, tokens) {
  return tokens.some((token) => text.includes(token));
}

export function commentTimestamp(comment) {
  return comment.updatedAt ?? comment.createdAt ?? null;
}

export function secretFreshnessTimestamp(secret) {
  if (!secret) return null;
  return secret.lastRotatedAt
    ?? secret.createdAt
    ?? null;
}

export function stableSecretMetadata(secret) {
  if (!secret) return null;
  return {
    key: secret.key,
    status: secret.status ?? null,
    latestVersion: secret.latestVersion ?? null,
    lastRotatedAt: secret.lastRotatedAt ?? null,
    createdAt: secret.createdAt ?? null,
    freshnessAt: secretFreshnessTimestamp(secret),
  };
}

export function isFreshForIssue(comment, issue) {
  const timestamp = commentTimestamp(comment);
  if (!timestamp || !issue?.updatedAt) return false;
  const commentTime = new Date(timestamp).getTime();
  const issueTime = new Date(issue.updatedAt).getTime();
  return Number.isFinite(commentTime)
    && Number.isFinite(issueTime)
    && commentTime >= issueTime - 5000;
}

export function gateFreshnessObservation({
  issue,
  comments = [],
  secretByKey,
  secretKeys = [],
}) {
  const latestCommentText = normalizeText(comments[0]?.body ?? "");
  const latestCommentIsPlaceholderOnly = hasAnyToken(latestCommentText, placeholderOnlyGateTokens)
    && !hasAnyToken(latestCommentText, positiveGateEvidenceTokens);
  const hasExplicitApprovalOrEvidence = Boolean(issue) && comments.some((comment) =>
    isFreshForIssue(comment, issue)
    && hasAnyToken(normalizeText(comment.body ?? ""), positiveGateEvidenceTokens)
    && !hasAnyToken(normalizeText(comment.body ?? ""), placeholderOnlyGateTokens)
  );

  const trackedSecrets = uniqueSecretsForKeys(secretByKey, secretKeys)
    .map((secret) => stableSecretMetadata(secret));
  const latestSecretFreshnessAt = latestTimestamp(trackedSecrets.map((secret) => secretFreshnessTimestamp(secret)));
  const secretUpdatedAfterIssue = isAfter(latestSecretFreshnessAt, issue?.updatedAt);
  const hasSecretFreshnessSignal = secretUpdatedAfterIssue && !latestCommentIsPlaceholderOnly;

  return {
    trackedSecrets,
    trackedSecretCount: trackedSecrets.length,
    latestSecretFreshnessAt,
    secretUpdatedAfterIssue,
    hasSecretFreshnessSignal,
    actionableFreshGateFact: hasExplicitApprovalOrEvidence || hasSecretFreshnessSignal,
    hasExplicitApprovalOrEvidence,
    latestCommentIsPlaceholderOnly,
  };
}
