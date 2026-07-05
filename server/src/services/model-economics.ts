import fs from "node:fs";
import path from "node:path";
import type { ModelProfileCatalogEntry } from "@paperclipai/shared";

export interface ModelEconomicsSource {
  label: string;
  url: string;
}

export interface ModelEconomicsConfig {
  version: number;
  lastReviewed: string;
  sources: ModelEconomicsSource[];
  profiles: Record<string, ModelProfileCatalogEntry>;
}

export const DEFAULT_MODEL_ECONOMICS_CONFIG: ModelEconomicsConfig = {
  version: 1,
  lastReviewed: "2026-07-06",
  sources: [
    {
      label: "OpenAI API model guide",
      url: "https://developers.openai.com/api/docs/models",
    },
    {
      label: "OpenAI Codex model guide",
      url: "https://developers.openai.com/codex/models",
    },
    {
      label: "OpenAI API pricing",
      url: "https://developers.openai.com/api/docs/pricing",
    },
    {
      label: "OpenAI Codex Spark announcement",
      url: "https://openai.com/index/introducing-gpt-5-3-codex-spark/",
    },
  ],
  profiles: {
    cheap: {
      profile: "cheap",
      defaultModel: "gpt-5.3-codex-spark",
      relativeCostWeight: 0.15,
      quotaLane: "codex_spark_preview",
      intent: "Status-only recovery, liveness, tiny follow-ups, and very low-risk housekeeping.",
      successTargetPercent: 85,
      escalateBelowPercent: 70,
      notes: "Keep mutation authority narrow. Do not let cheap recovery runs create downstream implementation work.",
    },
    spark: {
      profile: "spark",
      defaultModel: "gpt-5.3-codex-spark",
      relativeCostWeight: 0.2,
      quotaLane: "codex_spark_preview",
      intent: "Small code edits, formatting, simple docs, tiny tests, and quick triage.",
      successTargetPercent: 85,
      escalateBelowPercent: 72,
      notes: "Spark has its own preview limits; queueing can happen when demand is high.",
    },
    light: {
      profile: "light",
      defaultModel: "gpt-5.4-mini",
      relativeCostWeight: 0.3,
      quotaLane: "codex_standard_light",
      intent: "Routine coordination, PM/design/doc summaries, basic analysis, and narrow subagent work.",
      successTargetPercent: 88,
      escalateBelowPercent: 75,
      notes: "Lower-cost/faster lane for lighter Codex and subagent work.",
    },
    standard: {
      profile: "standard",
      defaultModel: "gpt-5.5",
      relativeCostWeight: 1,
      quotaLane: "codex_standard",
      intent: "Normal implementation, debugging, review, verification, and most engineering work.",
      successTargetPercent: 90,
      escalateBelowPercent: 78,
      notes: "Default high-quality lane; use this until evidence says a lighter lane is sufficient.",
    },
    reasoning: {
      profile: "reasoning",
      defaultModel: "gpt-5.5",
      relativeCostWeight: 1.35,
      quotaLane: "codex_standard",
      intent: "Architecture, deployment, security, schema, production, and cross-module decisions.",
      successTargetPercent: 92,
      escalateBelowPercent: 82,
      notes: "Uses higher reasoning effort; protect this lane from routine paperwork.",
    },
    strategic: {
      profile: "strategic",
      defaultModel: "gpt-5.5-pro",
      relativeCostWeight: 3,
      quotaLane: "codex_pro",
      intent: "Explicit owner-approved strategic decisions, multi-system design, and high-risk platform direction.",
      successTargetPercent: 95,
      escalateBelowPercent: 88,
      notes: "Rare/manual by default until live account limits prove this lane is consistently available.",
    },
  },
};

let cachedConfig: ModelEconomicsConfig | null = null;

function candidateConfigPaths(): string[] {
  const configured = process.env.PAPERCLIP_MODEL_ECONOMICS_CONFIG;
  const candidates = configured ? [configured] : [];
  candidates.push(
    path.resolve(process.cwd(), "softwarehouse", "model-economics.config.json"),
    path.resolve(process.cwd(), "..", "softwarehouse", "model-economics.config.json"),
  );
  return candidates;
}

function normalizeProfile(profile: string, raw: unknown): ModelProfileCatalogEntry | null {
  if (!raw || typeof raw !== "object") return null;
  const input = raw as Record<string, unknown>;
  const defaultProfile = DEFAULT_MODEL_ECONOMICS_CONFIG.profiles[profile];
  const defaultModel = typeof input.defaultModel === "string" ? input.defaultModel : defaultProfile?.defaultModel;
  const quotaLane = typeof input.quotaLane === "string" ? input.quotaLane : defaultProfile?.quotaLane;
  const intent = typeof input.intent === "string" ? input.intent : defaultProfile?.intent;
  if (!defaultModel || !quotaLane || !intent) return null;
  return {
    profile,
    defaultModel,
    relativeCostWeight: typeof input.relativeCostWeight === "number" ? input.relativeCostWeight : defaultProfile?.relativeCostWeight ?? 1,
    quotaLane,
    intent,
    successTargetPercent: typeof input.successTargetPercent === "number" ? input.successTargetPercent : defaultProfile?.successTargetPercent ?? 90,
    escalateBelowPercent: typeof input.escalateBelowPercent === "number" ? input.escalateBelowPercent : defaultProfile?.escalateBelowPercent ?? 75,
    notes: typeof input.notes === "string" ? input.notes : defaultProfile?.notes ?? "",
  };
}

function normalizeConfig(raw: unknown): ModelEconomicsConfig | null {
  if (!raw || typeof raw !== "object") return null;
  const input = raw as Record<string, unknown>;
  const rawProfiles = input.profiles && typeof input.profiles === "object"
    ? input.profiles as Record<string, unknown>
    : {};
  const profiles = {
    ...DEFAULT_MODEL_ECONOMICS_CONFIG.profiles,
    ...Object.fromEntries(
      Object.entries(rawProfiles)
        .map(([profile, value]) => [profile, normalizeProfile(profile, value)] as const)
        .filter((entry): entry is [string, ModelProfileCatalogEntry] => entry[1] !== null),
    ),
  };
  const sources = Array.isArray(input.sources)
    ? input.sources.flatMap((entry) => {
        if (!entry || typeof entry !== "object") return [];
        const source = entry as Record<string, unknown>;
        if (typeof source.label !== "string" || typeof source.url !== "string") return [];
        return [{ label: source.label, url: source.url }];
      })
    : DEFAULT_MODEL_ECONOMICS_CONFIG.sources;
  return {
    version: typeof input.version === "number" ? input.version : DEFAULT_MODEL_ECONOMICS_CONFIG.version,
    lastReviewed: typeof input.lastReviewed === "string" ? input.lastReviewed : DEFAULT_MODEL_ECONOMICS_CONFIG.lastReviewed,
    sources,
    profiles,
  };
}

export function loadModelEconomicsConfig(): ModelEconomicsConfig {
  if (cachedConfig) return cachedConfig;
  for (const candidate of candidateConfigPaths()) {
    try {
      const parsed = JSON.parse(fs.readFileSync(candidate, "utf8")) as unknown;
      const normalized = normalizeConfig(parsed);
      if (normalized) {
        cachedConfig = normalized;
        return normalized;
      }
    } catch {
      // Try the next candidate and fall back to defaults when none exists.
    }
  }
  cachedConfig = DEFAULT_MODEL_ECONOMICS_CONFIG;
  return cachedConfig;
}

export function resetModelEconomicsConfigCacheForTests(): void {
  cachedConfig = null;
}
