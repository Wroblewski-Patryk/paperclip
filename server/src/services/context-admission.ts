import { createHash } from "node:crypto";

export type ContextRequirement = "required" | "optional" | "forbidden_default";

export type ContextManifestSource = {
  source: string;
  sourceType: string;
  bytes: number;
  estimatedTokens: number;
  inclusionReason: string;
  requirement: ContextRequirement;
  freshness: string;
  owner: string;
  version: string;
  onDemand: boolean;
  included: boolean;
  reduction?: "none" | "omitted" | "reference" | "synthesis";
};

export type ContextWorkType = "execution" | "review" | "owner" | "doctor" | "weekly_meta";

const WORK_TYPE_BUDGETS: Record<ContextWorkType, { tokenLimit: number; fileLimit: number }> = {
  execution: { tokenLimit: 16_000, fileLimit: 16 },
  review: { tokenLimit: 12_000, fileLimit: 12 },
  owner: { tokenLimit: 14_000, fileLimit: 8 },
  // Doctor runs always receive the repository contract in addition to their role,
  // task, wake and runtime prompts. Keep enough bounded headroom for those
  // mandatory sources so a healthy run cannot fail before adapter invocation.
  doctor: { tokenLimit: 10_000, fileLimit: 8 },
  weekly_meta: { tokenLimit: 6_000, fileLimit: 4 },
};

const MAX_ROLE_BUDGETS: Array<{ pattern: RegExp; tokenLimit: number; fileLimit: number }> = [
  { pattern: /owner|chief executive|ceo|aia|product manager|\bpm\b/i, tokenLimit: 14_000, fileLimit: 8 },
  { pattern: /doctor|watchdog|integrity|audit/i, tokenLimit: 10_000, fileLimit: 8 },
  { pattern: /review|quality|qa/i, tokenLimit: 12_000, fileLimit: 12 },
];

function positiveInt(value: unknown): number | null {
  return typeof value === "number" && Number.isInteger(value) && value > 0 ? value : null;
}

export function estimateContextTokens(value: unknown) {
  const serialized = typeof value === "string" ? value : JSON.stringify(value);
  return Math.ceil(Buffer.byteLength(serialized, "utf8") / 4);
}

export function hashContextSource(value: unknown) {
  const serialized = typeof value === "string" ? value : JSON.stringify(value);
  return `sha256:${createHash("sha256").update(serialized).digest("hex")}`;
}

export function deriveContextWorkType(input: Record<string, unknown>, role: string): ContextWorkType {
  const explicit = typeof input.contextWorkType === "string" ? input.contextWorkType.trim().toLowerCase() : "";
  if (["execution", "review", "owner", "doctor", "weekly_meta"].includes(explicit)) {
    return explicit as ContextWorkType;
  }
  const signal = [role, input.wakeReason, input.reason, input.triggerDetail, input.source]
    .filter((value): value is string => typeof value === "string")
    .join(" ");
  if (/weekly.*meta|meta.*review/i.test(signal)) return "weekly_meta";
  if (/doctor|watchdog|integrity|audit/i.test(signal)) return "doctor";
  if (/review|verdict|changes_required/i.test(signal)) return "review";
  if (/owner|chief executive|ceo|aia|product manager|\bpm\b/i.test(signal)) return "owner";
  return "execution";
}

export function resolveContextBudget(input: {
  workType: ContextWorkType;
  role: string;
  requested?: Record<string, unknown>;
  override?: Record<string, unknown>;
  now?: Date;
}) {
  const workBudget = WORK_TYPE_BUDGETS[input.workType];
  const roleBudget = MAX_ROLE_BUDGETS.find((entry) => entry.pattern.test(input.role));
  const hardTokenLimit = Math.min(workBudget.tokenLimit, roleBudget?.tokenLimit ?? workBudget.tokenLimit);
  const hardFileLimit = Math.min(workBudget.fileLimit, roleBudget?.fileLimit ?? workBudget.fileLimit);
  const overrideExpiresAt = typeof input.override?.expiresAt === "string"
    ? new Date(input.override.expiresAt)
    : null;
  const overrideTokenLimit = positiveInt(input.override?.tokenLimit);
  const overrideFileLimit = positiveInt(input.override?.fileLimit);
  const overrideApplied = input.override?.authority === "native_supervision"
    && input.override?.approvedBy === "system"
    && typeof input.override?.overrideId === "string"
    && typeof input.override?.reason === "string"
    && Boolean(overrideExpiresAt && Number.isFinite(overrideExpiresAt.getTime()) && overrideExpiresAt > (input.now ?? new Date()))
    && Boolean(overrideTokenLimit || overrideFileLimit);
  const effectiveHardTokenLimit = overrideApplied ? Math.max(hardTokenLimit, overrideTokenLimit ?? hardTokenLimit) : hardTokenLimit;
  const effectiveHardFileLimit = overrideApplied ? Math.max(hardFileLimit, overrideFileLimit ?? hardFileLimit) : hardFileLimit;
  // A caller may voluntarily lower its budget, but never raise the native ceiling. Only a
  // time-bounded, system-owned native-supervision override can raise that ceiling.
  return {
    tokenLimit: overrideApplied
      ? (overrideTokenLimit ?? Math.min(positiveInt(input.requested?.tokenLimit) ?? effectiveHardTokenLimit, effectiveHardTokenLimit))
      : Math.min(positiveInt(input.requested?.tokenLimit) ?? effectiveHardTokenLimit, effectiveHardTokenLimit),
    fileLimit: overrideApplied
      ? (overrideFileLimit ?? Math.min(positiveInt(input.requested?.fileLimit) ?? effectiveHardFileLimit, effectiveHardFileLimit))
      : Math.min(positiveInt(input.requested?.fileLimit) ?? effectiveHardFileLimit, effectiveHardFileLimit),
    hardTokenLimit: effectiveHardTokenLimit,
    hardFileLimit: effectiveHardFileLimit,
    contextOverride: overrideApplied ? {
      overrideId: input.override!.overrideId as string,
      authority: "native_supervision" as const,
      approvedBy: "system" as const,
      reason: input.override!.reason as string,
      expiresAt: overrideExpiresAt!.toISOString(),
      tokenLimit: overrideTokenLimit,
      fileLimit: overrideFileLimit,
    } : null,
  };
}

function metric(metrics: Record<string, unknown>, key: string) {
  const value = metrics[key];
  return typeof value === "number" && Number.isFinite(value) && value > 0 ? Math.floor(value) : 0;
}

export function buildAdapterContextSources(meta: Record<string, unknown>): ContextManifestSource[] {
  const metrics = meta.promptMetrics && typeof meta.promptMetrics === "object" && !Array.isArray(meta.promptMetrics)
    ? meta.promptMetrics as Record<string, unknown>
    : {};
  const definitions = [
    ["agent_instructions", "role_bootstrap", "instructionsChars", "Minimum role contract and prohibitions"],
    ["bootstrap_prompt", "bootstrap", "bootstrapPromptChars", "Fresh-session bootstrap"],
    ["wake_prompt", "task", "wakePromptChars", "Current wake/task delta"],
    ["session_handoff", "continuation", "sessionHandoffChars", "Bounded continuation synthesis"],
    ["heartbeat_prompt", "runtime", "heartbeatPromptChars", "Adapter execution contract"],
    ["repo_agents", "repo_instructions", "repoAgentsChars", "Repo-scoped AGENTS.md automatically discovered by the adapter runtime"],
  ] as const;
  return definitions.map(([source, sourceType, key, inclusionReason]) => {
    const bytes = Buffer.byteLength("x".repeat(metric(metrics, key)), "utf8");
    return {
      source,
      sourceType,
      bytes,
      estimatedTokens: Math.ceil(bytes / 4),
      inclusionReason,
      requirement: source === "session_handoff" ? "optional" : "required",
      freshness: "run_scoped",
      owner: "paperclip_runtime",
      version: `chars:${bytes}`,
      onDemand: source === "session_handoff",
      included: bytes > 0,
      reduction: bytes > 0 ? "none" : "omitted",
    } satisfies ContextManifestSource;
  });
}

export function evaluateFinalContextAdmission(input: {
  sources: ContextManifestSource[];
  tokenLimit: number;
  fileLimit: number;
  referencedFiles: number;
}) {
  const included = input.sources.filter((source) => source.included);
  const estimatedTokens = included.reduce((total, source) => total + source.estimatedTokens, 0);
  const forbidden = included.filter((source) => source.requirement === "forbidden_default");
  const admitted = estimatedTokens <= input.tokenLimit && input.referencedFiles <= input.fileLimit && forbidden.length === 0;
  return {
    admitted,
    disposition: admitted ? "admitted" as const : "fail_closed" as const,
    estimatedTokens,
    tokenLimit: input.tokenLimit,
    referencedFiles: input.referencedFiles,
    fileLimit: input.fileLimit,
    forbiddenSources: forbidden.map((source) => source.source),
    reason: estimatedTokens > input.tokenLimit
      ? "token_budget_exceeded"
      : input.referencedFiles > input.fileLimit
        ? "file_budget_exceeded"
        : forbidden.length > 0
          ? "forbidden_source_included"
          : "within_budget",
  };
}
