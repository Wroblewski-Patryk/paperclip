import { describe, expect, it } from "vitest";
import {
  listAdapterModelProfiles,
  type AdapterModelProfileDefinition,
} from "../adapters/index.js";
import {
  mergeModelProfileAdapterConfig,
  normalizeModelProfileWakeContext,
  resolveModelProfileApplication,
} from "../services/heartbeat.ts";
import { resolveModelRouterProfile } from "../services/model-router.js";

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
        model: "gpt-5.3-codex-spark",
        modelReasoningEffort: "medium",
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

  it("routes lightweight medium-priority documentation tasks to Spark", () => {
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
      profile: "spark",
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
      profile: "spark",
      source: "name_prefix",
    });
  });
});
