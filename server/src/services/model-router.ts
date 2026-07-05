import fs from "node:fs";
import path from "node:path";
import {
  MODEL_PROFILE_KEYS,
  type AgentRole,
  type IssuePriority,
  type ModelProfileKey,
} from "@paperclipai/shared";

export interface ModelRouterKeywordRule {
  profile: ModelProfileKey;
  keywords: string[];
  priority?: IssuePriority[];
  reason?: string;
}

export interface ModelRouterConfig {
  enabled: boolean;
  defaultProfile: ModelProfileKey;
  roleDefaults: Partial<Record<AgentRole | string, ModelProfileKey>>;
  namePrefixDefaults: Record<string, ModelProfileKey>;
  titleKeywordRules: ModelRouterKeywordRule[];
  contextKeywordRules: ModelRouterKeywordRule[];
  quotaPressureFallbacks: Partial<Record<ModelRouterQuotaPressure, Partial<Record<ModelProfileKey, ModelProfileKey>>>>;
}

export type ModelRouterQuotaPressure = "normal" | "high" | "critical";

export interface ModelRouterInput {
  agent: {
    name: string;
    role: AgentRole | string | null;
    title?: string | null;
  };
  issue?: {
    title?: string | null;
    description?: string | null;
    priority?: IssuePriority | string | null;
    workMode?: string | null;
  } | null;
  contextSnapshot?: Record<string, unknown> | null;
  quotaPressure?: ModelRouterQuotaPressure | null;
  config?: ModelRouterConfig;
}

export interface ModelRouterDecision {
  profile: ModelProfileKey | null;
  source: "disabled" | "context_rule" | "title_rule" | "name_prefix" | "role_default" | "default";
  reason: string;
}

const MODEL_PROFILE_KEY_SET = new Set<string>(MODEL_PROFILE_KEYS);

export const DEFAULT_MODEL_ROUTER_CONFIG: ModelRouterConfig = {
  enabled: true,
  defaultProfile: "standard",
  roleDefaults: {
    ceo: "reasoning",
    cto: "reasoning",
    cfo: "light",
    security: "reasoning",
    engineer: "standard",
    designer: "light",
    pm: "light",
    qa: "standard",
    devops: "reasoning",
    researcher: "reasoning",
    general: "light",
  },
  namePrefixDefaults: {
    "00 AIA": "light",
    "01 CSO": "reasoning",
    "02 CPO": "light",
    "02 UID": "light",
    "02 UXW": "light",
    "02 WPM": "light",
    "04 COO": "light",
    "04 DPM": "light",
    "04 DSM": "light",
    "06 AIM": "light",
    "07 CFO": "light",
    "08 CAO": "light",
    "09 CTO": "reasoning",
    "09 TSA": "reasoning",
    "09 EDL": "standard",
    "09 CBE": "standard",
    "09 FEW": "standard",
    "09 DBE": "standard",
    "09 IDE": "standard",
    "09 RTE": "standard",
    "09 TAE": "standard",
    "09 QVE": "standard",
    "09 CRS": "standard",
    "09 DRE": "reasoning",
    "10 CLO": "reasoning",
    "10 SPA": "reasoning",
    "11 CINO": "reasoning",
    "11 IPM": "light",
    "11 SPM": "light",
    "11 RPM": "light",
  },
  titleKeywordRules: [
    {
      profile: "reasoning",
      keywords: [
        "architecture",
        "security",
        "secrets",
        "deployment",
        "vps",
        "coolify",
        "schema",
        "migration",
        "cross-system",
        "multi-system",
        "production",
      ],
      reason: "task touches architecture, security, deployment, data model, or production readiness",
    },
    {
      profile: "spark",
      keywords: [
        "typo",
        "format",
        "formatting",
        "comment",
        "docs",
        "documentation",
        "readme",
        "status",
        "summary",
        "triage",
        "log",
      ],
      priority: ["medium", "low"],
      reason: "task appears lightweight and safe for the Spark lane",
    },
  ],
  contextKeywordRules: [
    {
      profile: "cheap",
      keywords: ["status_only", "recovery", "liveness", "janitor"],
      reason: "wake context is status/recovery oriented",
    },
  ],
  quotaPressureFallbacks: {
    high: {
      strategic: "reasoning",
      reasoning: "standard",
      standard: "light",
      light: "spark",
    },
    critical: {
      strategic: "standard",
      reasoning: "light",
      standard: "spark",
      light: "cheap",
      spark: "cheap",
    },
  },
};

let cachedConfig: ModelRouterConfig | null = null;

function isModelProfileKey(value: unknown): value is ModelProfileKey {
  return typeof value === "string" && MODEL_PROFILE_KEY_SET.has(value);
}

function normalizeConfig(raw: unknown): ModelRouterConfig | null {
  if (!raw || typeof raw !== "object") return null;
  const input = raw as Record<string, unknown>;
  const defaultProfile = isModelProfileKey(input.defaultProfile)
    ? input.defaultProfile
    : DEFAULT_MODEL_ROUTER_CONFIG.defaultProfile;

  function normalizeProfileMap(value: unknown): Record<string, ModelProfileKey> {
    if (!value || typeof value !== "object") return {};
    return Object.fromEntries(
      Object.entries(value as Record<string, unknown>)
        .filter((entry): entry is [string, ModelProfileKey] => isModelProfileKey(entry[1])),
    );
  }

  function normalizeRules(value: unknown): ModelRouterKeywordRule[] {
    if (!Array.isArray(value)) return [];
    return value.flatMap((entry) => {
      if (!entry || typeof entry !== "object") return [];
      const rule = entry as Record<string, unknown>;
      if (!isModelProfileKey(rule.profile) || !Array.isArray(rule.keywords)) return [];
      const keywords = rule.keywords
        .filter((keyword): keyword is string => typeof keyword === "string" && keyword.trim().length > 0)
        .map((keyword) => keyword.trim().toLowerCase());
      if (keywords.length === 0) return [];
      const priority = Array.isArray(rule.priority)
        ? rule.priority.filter((item): item is IssuePriority =>
            item === "critical" || item === "high" || item === "medium" || item === "low")
        : undefined;
      return [{
        profile: rule.profile,
        keywords,
        priority,
        reason: typeof rule.reason === "string" ? rule.reason : undefined,
      }];
    });
  }

  return {
    enabled: input.enabled !== false,
    defaultProfile,
    roleDefaults: {
      ...DEFAULT_MODEL_ROUTER_CONFIG.roleDefaults,
      ...normalizeProfileMap(input.roleDefaults),
    },
    namePrefixDefaults: {
      ...DEFAULT_MODEL_ROUTER_CONFIG.namePrefixDefaults,
      ...normalizeProfileMap(input.namePrefixDefaults),
    },
    titleKeywordRules: normalizeRules(input.titleKeywordRules),
    contextKeywordRules: normalizeRules(input.contextKeywordRules),
    quotaPressureFallbacks: {
      ...DEFAULT_MODEL_ROUTER_CONFIG.quotaPressureFallbacks,
      ...(input.quotaPressureFallbacks && typeof input.quotaPressureFallbacks === "object"
        ? Object.fromEntries(
            Object.entries(input.quotaPressureFallbacks as Record<string, unknown>)
              .filter(([pressure]) => pressure === "normal" || pressure === "high" || pressure === "critical")
              .map(([pressure, fallbacks]) => [pressure, normalizeProfileMap(fallbacks)]),
          )
        : {}),
    },
  };
}

function candidateConfigPaths(): string[] {
  const configured = process.env.PAPERCLIP_MODEL_ROUTER_CONFIG;
  const candidates = configured ? [configured] : [];
  candidates.push(
    path.resolve(process.cwd(), "softwarehouse", "model-router.config.json"),
    path.resolve(process.cwd(), "..", "softwarehouse", "model-router.config.json"),
  );
  return candidates;
}

export function loadModelRouterConfig(): ModelRouterConfig {
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
  cachedConfig = DEFAULT_MODEL_ROUTER_CONFIG;
  return cachedConfig;
}

export function resetModelRouterConfigCacheForTests(): void {
  cachedConfig = null;
}

function searchText(parts: Array<unknown>): string {
  return parts
    .filter((part): part is string => typeof part === "string" && part.trim().length > 0)
    .join("\n")
    .toLowerCase();
}

function contextText(contextSnapshot: Record<string, unknown> | null | undefined): string {
  if (!contextSnapshot) return "";
  const selected = [
    contextSnapshot.reason,
    contextSnapshot.source,
    contextSnapshot.recoveryReason,
    contextSnapshot.workspaceRefreshReason,
    contextSnapshot.monitorNotes,
    contextSnapshot.modelRouterHint,
  ];
  return searchText(selected);
}

function matchRule(
  rules: ModelRouterKeywordRule[],
  text: string,
  priority: string | null | undefined,
): ModelRouterKeywordRule | null {
  for (const rule of rules) {
    if (rule.priority && !rule.priority.includes(priority as IssuePriority)) continue;
    if (rule.keywords.some((keyword) => text.includes(keyword.toLowerCase()))) {
      return rule;
    }
  }
  return null;
}

function withQuotaPressureFallback(
  decision: ModelRouterDecision,
  pressure: ModelRouterQuotaPressure | null | undefined,
  config: ModelRouterConfig,
): ModelRouterDecision {
  if (!decision.profile || !pressure || pressure === "normal") return decision;
  const fallback = config.quotaPressureFallbacks[pressure]?.[decision.profile];
  if (!fallback || fallback === decision.profile) return decision;
  return {
    ...decision,
    profile: fallback,
    reason: `${decision.reason}; quota pressure ${pressure} lowered ${decision.profile} to ${fallback}`,
  };
}

export function resolveModelRouterProfile(input: ModelRouterInput): ModelRouterDecision {
  const config = input.config ?? loadModelRouterConfig();
  if (!config.enabled) {
    return { profile: null, source: "disabled", reason: "model router disabled by configuration" };
  }

  const issueText = searchText([input.issue?.title, input.issue?.description, input.issue?.workMode]);
  const contextRule = matchRule(
    config.contextKeywordRules,
    contextText(input.contextSnapshot),
    input.issue?.priority ?? null,
  );
  if (contextRule) {
    return withQuotaPressureFallback({
      profile: contextRule.profile,
      source: "context_rule",
      reason: contextRule.reason ?? "matched model router context keyword rule",
    }, input.quotaPressure, config);
  }

  const titleRule = matchRule(config.titleKeywordRules, issueText, input.issue?.priority ?? null);
  if (titleRule) {
    return withQuotaPressureFallback({
      profile: titleRule.profile,
      source: "title_rule",
      reason: titleRule.reason ?? "matched model router issue keyword rule",
    }, input.quotaPressure, config);
  }

  for (const [prefix, profile] of Object.entries(config.namePrefixDefaults)) {
    if (input.agent.name.startsWith(prefix)) {
      return withQuotaPressureFallback({
        profile,
        source: "name_prefix",
        reason: `matched agent name prefix ${prefix}`,
      }, input.quotaPressure, config);
    }
  }

  const role = input.agent.role ?? "general";
  const roleProfile = config.roleDefaults[role];
  if (roleProfile) {
    return withQuotaPressureFallback({
      profile: roleProfile,
      source: "role_default",
      reason: `matched agent role ${role}`,
    }, input.quotaPressure, config);
  }

  return withQuotaPressureFallback({
    profile: config.defaultProfile,
    source: "default",
    reason: "using model router default profile",
  }, input.quotaPressure, config);
}
