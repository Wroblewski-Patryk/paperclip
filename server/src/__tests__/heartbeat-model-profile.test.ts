import { describe, expect, it } from "vitest";
import {
  listAdapterModelProfiles,
  type AdapterModelProfileDefinition,
} from "../adapters/index.js";
import {
  buildProviderQuotaStartBlock,
  mergeModelProfileAdapterConfig,
  modelProfileEnvConfigPathByKey,
  normalizeModelProfileWakeContext,
  resolveModelRouterQuotaPressure,
  resolveModelProfileApplication,
} from "../services/heartbeat.ts";
import { loadModelEconomicsConfig, resetModelEconomicsConfigCacheForTests } from "../services/model-economics.js";
import {
  resetModelRouterConfigCacheForTests,
  resolveModelRouterProfile,
} from "../services/model-router.js";

const cheapProfile: AdapterModelProfileDefinition = {
  key: "cheap",
  label: "Cheap",
  adapterConfig: {
    model: "adapter-cheap",
    modelReasoningEffort: "low",
  },
  source: "adapter_default",
};

describe("heartbeat model profile application", () => {
  it("uses the Codex local adapter cheap default when the agent has no runtime override", async () => {
    const modelProfile = resolveModelProfileApplication({
      adapterModelProfiles: await listAdapterModelProfiles("codex_local"),
      agentRuntimeConfig: {},
      issueModelProfile: "cheap",
      contextSnapshot: {},
    });

    expect(modelProfile).toMatchObject({
      requested: "cheap",
      requestedBy: "issue_override",
      applied: "cheap",
      configSource: "adapter_default",
      fallbackReason: null,
      adapterConfig: {
        model: "gpt-5.6-luna",
        modelReasoningEffort: "low",
      },
    });
  });

  it("uses the model router when no issue or wake context profile is explicit", () => {
    const modelProfile = resolveModelProfileApplication({
      adapterModelProfiles: [
        cheapProfile,
        {
          key: "reasoning",
          label: "Reasoning",
          adapterConfig: { model: "reasoning-model" },
          source: "adapter_default",
        },
      ],
      agentRuntimeConfig: {},
      issueModelProfile: null,
      routerModelProfile: "reasoning",
      contextSnapshot: {},
    });

    expect(modelProfile).toMatchObject({
      requested: "reasoning",
      requestedBy: "model_router",
      applied: "reasoning",
      adapterConfig: {
        model: "reasoning-model",
      },
    });
  });

  it("keeps explicit issue model profile overrides ahead of router decisions", () => {
    const modelProfile = resolveModelProfileApplication({
      adapterModelProfiles: [
        cheapProfile,
        {
          key: "reasoning",
          label: "Reasoning",
          adapterConfig: { model: "reasoning-model" },
          source: "adapter_default",
        },
      ],
      agentRuntimeConfig: {},
      issueModelProfile: "cheap",
      routerModelProfile: "reasoning",
      contextSnapshot: {},
    });

    expect(modelProfile).toMatchObject({
      requested: "cheap",
      requestedBy: "issue_override",
      applied: "cheap",
      adapterConfig: {
        model: "adapter-cheap",
      },
    });
  });

  it("lets a real quota fallback override a stale wake-context profile", () => {
    const modelProfile = resolveModelProfileApplication({
      adapterModelProfiles: [
        cheapProfile,
        {
          key: "spark",
          label: "Spark",
          adapterConfig: { model: "gpt-5.3-codex-spark" },
          source: "adapter_default",
        },
      ],
      agentRuntimeConfig: {
        modelProfiles: {
          cheap: { adapterConfig: { model: "gpt-5.4-mini" } },
        },
      },
      issueModelProfile: null,
      routerModelProfile: "spark",
      preferRouterModelProfile: true,
      contextSnapshot: { modelProfile: "cheap" },
    });

    expect(modelProfile).toMatchObject({
      requested: "spark",
      requestedBy: "model_router",
      applied: "spark",
      configSource: "adapter_default",
      adapterConfig: { model: "gpt-5.3-codex-spark" },
    });
  });

  it("applies cheap profile patches before explicit issue adapter config overrides", () => {
    const modelProfile = resolveModelProfileApplication({
      adapterModelProfiles: [cheapProfile],
      agentRuntimeConfig: {},
      issueModelProfile: "cheap",
      contextSnapshot: {},
    });

    const merged = mergeModelProfileAdapterConfig({
      baseConfig: {
        model: "primary",
        modelReasoningEffort: "high",
        approvalPolicy: "strict",
      },
      modelProfile,
      issueAdapterConfig: {
        model: "issue-explicit",
      },
    });

    expect(modelProfile).toMatchObject({
      requested: "cheap",
      requestedBy: "issue_override",
      applied: "cheap",
      configSource: "adapter_default",
      fallbackReason: null,
    });
    expect(merged).toEqual({
      model: "issue-explicit",
      modelReasoningEffort: "low",
      approvalPolicy: "strict",
    });
  });

  it("merges base, profile, and explicit env overrides while retaining profile binding paths", () => {
    const modelProfile = resolveModelProfileApplication({
      adapterModelProfiles: [{
        ...cheapProfile,
        adapterConfig: {
          ...cheapProfile.adapterConfig,
          env: {
            PROFILE_DEFAULT: "profile-default",
            SHARED: "profile-default-shared",
          },
        },
      }],
      agentRuntimeConfig: {
        modelProfiles: {
          cheap: {
            adapterConfig: {
              env: {
                PROFILE_SECRET: { type: "secret_ref", secretId: "profile-secret", version: "latest" },
                SHARED: "profile-runtime-shared",
              },
            },
          },
        },
      },
      issueModelProfile: "cheap",
      contextSnapshot: {},
    });
    const issueAdapterConfig = {
      env: {
        SHARED: "issue-explicit-shared",
        ISSUE_ONLY: "issue-only",
      },
    };

    const merged = mergeModelProfileAdapterConfig({
      baseConfig: {
        env: {
          BASE_ONLY: "base-only",
          SHARED: "base-shared",
        },
      },
      modelProfile,
      issueAdapterConfig,
    });

    expect(merged.env).toEqual({
      BASE_ONLY: "base-only",
      PROFILE_DEFAULT: "profile-default",
      PROFILE_SECRET: { type: "secret_ref", secretId: "profile-secret", version: "latest" },
      SHARED: "issue-explicit-shared",
      ISSUE_ONLY: "issue-only",
    });
    expect(modelProfileEnvConfigPathByKey({ modelProfile, issueAdapterConfig })).toEqual({
      PROFILE_DEFAULT: "runtimeConfig.modelProfiles.cheap.adapterConfig.env.PROFILE_DEFAULT",
      PROFILE_SECRET: "runtimeConfig.modelProfiles.cheap.adapterConfig.env.PROFILE_SECRET",
    });
  });

  it("lets agent runtime profile config customize adapter defaults", () => {
    const modelProfile = resolveModelProfileApplication({
      adapterModelProfiles: [cheapProfile],
      agentRuntimeConfig: {
        modelProfiles: {
          cheap: {
            adapterConfig: {
              model: "agent-cheap",
            },
          },
        },
      },
      issueModelProfile: null,
      contextSnapshot: { modelProfile: "cheap" },
    });

    expect(modelProfile).toMatchObject({
      requested: "cheap",
      requestedBy: "wake_context",
      applied: "cheap",
      configSource: "agent_runtime",
      adapterConfig: {
        model: "agent-cheap",
        modelReasoningEffort: "low",
      },
    });
  });

  it("falls back to the primary config when the adapter does not support the requested profile", () => {
    const modelProfile = resolveModelProfileApplication({
      adapterModelProfiles: [],
      agentRuntimeConfig: {
        modelProfiles: {
          cheap: {
            adapterConfig: {
              model: "agent-cheap",
            },
          },
        },
      },
      issueModelProfile: null,
      contextSnapshot: { modelProfile: "cheap" },
    });

    const merged = mergeModelProfileAdapterConfig({
      baseConfig: {
        model: "primary",
      },
      modelProfile,
      issueAdapterConfig: null,
    });

    expect(modelProfile).toMatchObject({
      requested: "cheap",
      applied: null,
      fallbackReason: "adapter_profile_not_supported",
      adapterConfig: null,
    });
    expect(merged).toEqual({ model: "primary" });
  });

  it("normalizes a wake payload model profile into run context", () => {
    const contextSnapshot = normalizeModelProfileWakeContext({
      contextSnapshot: {},
      payload: { modelProfile: "cheap" },
    });

    expect(contextSnapshot).toMatchObject({ modelProfile: "cheap" });
  });
});

describe("model router profile selection", () => {
  it("routes architecture and deployment work to the reasoning profile", () => {
    expect(
      resolveModelRouterProfile({
        agent: { name: "04 COO Chief Operating Officer", role: "general" },
        issue: {
          title: "Verify VPS deployment readiness",
          priority: "high",
        },
        contextSnapshot: {},
      }),
    ).toMatchObject({
      profile: "reasoning",
      source: "title_rule",
    });
  });

  it("routes lightweight medium-priority documentation tasks to the light lane", () => {
    expect(
      resolveModelRouterProfile({
        agent: { name: "09 CTO Chief Technology Officer", role: "cto" },
        issue: {
          title: "Update README status summary",
          priority: "medium",
        },
        contextSnapshot: {},
      }),
    ).toMatchObject({
      profile: "light",
      source: "title_rule",
    });
  });

  it("uses Softwarehouse role/name defaults when there is no stronger task signal", () => {
    expect(
      resolveModelRouterProfile({
        agent: { name: "09 FEW Frontend Engineer", role: "engineer" },
        issue: {
          title: "Implement button state",
          priority: "medium",
        },
        contextSnapshot: {},
      }),
    ).toMatchObject({
      profile: "standard",
      source: "name_prefix",
    });
  });

  it("lowers selected profiles when Codex quota pressure is high", () => {
    expect(
      resolveModelRouterProfile({
        agent: { name: "09 DRE DevOps Reliability Engineer", role: "devops" },
        issue: {
          title: "Verify production deployment readiness",
          priority: "high",
        },
        contextSnapshot: {},
        quotaPressure: "high",
      }),
    ).toMatchObject({
      profile: "standard",
      source: "title_rule",
    });
  });

  it("lowers selected profiles more aggressively when Codex quota pressure is critical", () => {
    expect(
      resolveModelRouterProfile({
        agent: { name: "09 FEW Frontend Engineer", role: "engineer" },
        issue: {
          title: "Implement button state",
          priority: "medium",
        },
        contextSnapshot: {},
        quotaPressure: "critical",
      }),
    ).toMatchObject({
      profile: "light",
      source: "name_prefix",
      quotaFallback: {
        pressure: "critical",
        fromProfile: "standard",
        toProfile: "light",
      },
    });
  });

  it("keeps CRS reviews moving on the light lane during critical standard-lane pressure", () => {
    resetModelRouterConfigCacheForTests();

    expect(
      resolveModelRouterProfile({
        agent: { name: "09 CRS Code Review Specialist", role: "engineer" },
        issue: {
          title: "Review product-boundary proof bundle",
          priority: "medium",
        },
        contextSnapshot: {},
        quotaPressure: "critical",
      }),
    ).toMatchObject({
      profile: "light",
      source: "name_prefix",
    });
  });

  it("keeps cheap recovery work on the cheap lane when standard-light lanes are critically constrained", () => {
    resetModelRouterConfigCacheForTests();

    expect(
      resolveModelRouterProfile({
        agent: { name: "04 COO Chief Operating Officer", role: "general" },
        issue: {
          title: "Resume completed child work and close the parent",
          priority: "high",
        },
        contextSnapshot: { source: "recovery" },
        quotaPressure: "critical",
      }),
    ).toMatchObject({
      profile: "cheap",
      source: "context_rule",
    });
  });
});

describe("model economics catalog", () => {
  it("loads the configured profile catalog used by the cost dashboard", () => {
    resetModelEconomicsConfigCacheForTests();
    const config = loadModelEconomicsConfig();

    expect(config.profiles.spark).toMatchObject({
      profile: "spark",
      defaultModel: "gpt-5.3-codex-spark",
      quotaLane: "codex_spark_preview",
    });
    expect(config.profiles.reasoning).toMatchObject({
      profile: "reasoning",
      defaultModel: "gpt-5.6-sol",
    });
    expect(config.sources.some((source) => source.url.includes("developers.openai.com/codex/models"))).toBe(true);
  });
});

describe("model-aware provider quota gates", () => {
  it("blocks only the matching quota lane when Codex exposes lane-scoped windows", () => {
    resetModelEconomicsConfigCacheForTests();
    const profiles = loadModelEconomicsConfig().profiles;
    const quota = {
      provider: "openai",
      source: "test",
      ok: true,
      windows: [
        {
          label: "Weekly limit",
          scope: "lane" as const,
          quotaLane: "codex_5_6_terra",
          model: null,
          usedPercent: 95,
          resetsAt: "2026-07-09T19:22:48.000Z",
          valueLabel: null,
          detail: null,
        },
      ],
    };

    expect(
      buildProviderQuotaStartBlock(quota, new Date("2026-07-06T12:00:00.000Z"), undefined, profiles.standard),
    ).toMatchObject({
      quotaLane: "codex_5_6_terra",
      modelProfile: "standard",
    });
    expect(
      buildProviderQuotaStartBlock(quota, new Date("2026-07-06T12:00:00.000Z"), undefined, profiles.spark),
    ).toBeNull();
  });

  it("keeps account-scoped quota windows as a hard stop for every model profile", () => {
    resetModelEconomicsConfigCacheForTests();
    const profiles = loadModelEconomicsConfig().profiles;
    const quota = {
      provider: "openai",
      source: "test",
      ok: true,
      windows: [
        {
          label: "Agentic account weekly limit",
          scope: "account" as const,
          quotaLane: null,
          model: null,
          usedPercent: 95,
          resetsAt: "2026-07-09T19:22:48.000Z",
          valueLabel: null,
          detail: null,
        },
      ],
    };

    expect(
      buildProviderQuotaStartBlock(quota, new Date("2026-07-06T12:00:00.000Z"), undefined, profiles.standard),
    ).not.toBeNull();
    expect(
      buildProviderQuotaStartBlock(quota, new Date("2026-07-06T12:00:00.000Z"), undefined, profiles.spark),
    ).not.toBeNull();
  });

  it("uses the default Codex pool as a fail-closed fallback when a profile has no reported independent lane", () => {
    resetModelEconomicsConfigCacheForTests();
    const profiles = loadModelEconomicsConfig().profiles;
    const quota = {
      provider: "openai",
      source: "codex-wham",
      ok: true,
      windows: [
        {
          label: "Weekly limit",
          scope: "lane" as const,
          quotaLane: "codex_standard",
          model: null,
          usedPercent: 92,
          resetsAt: "2026-08-20T19:22:48.000Z",
          valueLabel: null,
          detail: null,
        },
        {
          label: "Credits",
          scope: null,
          quotaLane: null,
          model: null,
          usedPercent: null,
          resetsAt: null,
          valueLabel: "$0.00 remaining",
          detail: null,
        },
      ],
    };
    const settings = {
      codexLocalQuotaHoldEnabled: true,
      codexLocalQuotaShortWindowHoldUsedPercent: 75,
      codexLocalQuotaLongWindowHoldUsedPercent: 75,
      codexLocalQuotaRetrySpacingMinutes: 5,
      codexLocalQuotaFallbackDelayMinutes: 60,
    };

    expect(buildProviderQuotaStartBlock(quota, new Date("2026-08-16T00:00:00.000Z"), settings, profiles.cheap))
      .toMatchObject({
        modelProfile: "cheap",
        quotaLane: "codex_5_6_luna",
        thresholdPercent: 75,
        windows: [{ quotaLane: "codex_standard", usedPercent: 92 }],
      });
    expect(buildProviderQuotaStartBlock(quota, new Date("2026-08-16T00:00:00.000Z"), settings, profiles.light))
      .not.toBeNull();
    expect(buildProviderQuotaStartBlock(quota, new Date("2026-08-16T00:00:00.000Z"), settings, profiles.reasoning))
      .not.toBeNull();
    expect(buildProviderQuotaStartBlock(quota, new Date("2026-08-16T00:00:00.000Z"), settings, profiles.spark))
      .not.toBeNull();
  });

  it("honors a freshly reported independent lane instead of the default Codex pool fallback", () => {
    resetModelEconomicsConfigCacheForTests();
    const profiles = loadModelEconomicsConfig().profiles;
    const quota = {
      provider: "openai",
      source: "test",
      ok: true,
      windows: [
        {
          label: "Weekly limit",
          scope: "lane" as const,
          quotaLane: "codex_standard",
          model: null,
          usedPercent: 92,
          resetsAt: "2026-08-20T19:22:48.000Z",
          valueLabel: null,
          detail: null,
        },
        {
          label: "GPT-5.3-Codex-Spark · Weekly limit",
          scope: "lane" as const,
          quotaLane: "codex_spark_preview",
          model: "gpt-5.3-codex-spark",
          usedPercent: 20,
          resetsAt: "2026-08-20T19:22:48.000Z",
          valueLabel: null,
          detail: null,
        },
      ],
    };

    expect(buildProviderQuotaStartBlock(quota, new Date("2026-08-16T00:00:00.000Z"), undefined, profiles.spark))
      .toBeNull();
  });

  it("does not treat unknown percent as a hard-stop trigger", () => {
    const now = new Date("2026-07-06T12:00:00.000Z");
    resetModelEconomicsConfigCacheForTests();
    const profiles = loadModelEconomicsConfig().profiles;
    const quota = {
      provider: "openai",
      source: "test",
      ok: true,
      windows: [
        {
          label: "Model lane limit",
          scope: "lane" as const,
          quotaLane: "codex_standard",
          model: null,
          usedPercent: null,
          resetsAt: "2026-07-09T19:22:48.000Z",
          valueLabel: null,
          detail: null,
        },
        {
          label: "Unused credits",
          scope: null,
          quotaLane: null,
          model: null,
          usedPercent: 0,
          resetsAt: "2026-07-09T19:22:48.000Z",
          valueLabel: null,
          detail: null,
        },
      ],
    };

    expect(buildProviderQuotaStartBlock(quota, now, undefined, profiles.standard)).toBeNull();
    expect(resolveModelRouterQuotaPressure(quota, now, undefined)).toBe("normal");
  });
});
