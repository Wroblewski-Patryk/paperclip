import { definePlugin, runWorker, type ToolRunContext } from "@paperclipai/plugin-sdk";
import { deriveBankId } from "./bank.js";
import { formatMemories, HindsightClient } from "./client.js";

interface PluginConfig {
  hindsightApiUrl: string;
  hindsightApiKeyRef?: string;
  bankGranularity?: Array<"company" | "agent">;
  recallBudget?: "low" | "mid" | "high";
  autoRetain?: boolean;
}

interface RunStartedPayload {
  agentId: string;
  runId: string;
  issueId?: string | null;
}

interface RunFinishedPayload {
  runId: string;
}

interface CommentCreatedPayload {
  commentId?: string;
  bodySnippet?: string;
  agentId?: string | null;
  runId?: string | null;
}

async function getConfig(ctx: { config: { get(): Promise<Record<string, unknown>> } }): Promise<PluginConfig> {
  return (await ctx.config.get()) as unknown as PluginConfig;
}

async function resolveApiKey(
  ctx: { secrets: { resolve(ref: string): Promise<string | null> } },
  config: PluginConfig,
): Promise<string | undefined> {
  if (!config.hindsightApiKeyRef) return undefined;
  return (await ctx.secrets.resolve(config.hindsightApiKeyRef)) ?? undefined;
}

function getParamString(params: unknown, key: string): string {
  if (typeof params !== "object" || params === null) return "";
  const value = (params as Record<string, unknown>)[key];
  return typeof value === "string" ? value : "";
}

const plugin = definePlugin({
  async setup(ctx) {
    ctx.logger.info("Hindsight memory plugin starting");

    ctx.events.on("agent.run.started", async (event) => {
      const payload = event.payload as RunStartedPayload;
      const config = await getConfig(ctx);
      const { agentId, runId, issueId } = payload;
      const companyId = event.companyId;
      if (!issueId || !companyId) return;

      let issue: Awaited<ReturnType<typeof ctx.issues.get>> | null = null;
      try {
        issue = await ctx.issues.get(issueId, companyId);
      } catch (err) {
        ctx.logger.warn("Failed to fetch issue for Hindsight recall", {
          runId,
          issueId,
          error: String(err),
        });
        return;
      }
      if (!issue) return;

      const query = [issue.title, issue.description].filter(Boolean).join("\n");
      if (!query.trim()) return;

      try {
        const apiKey = await resolveApiKey(ctx, config);
        const client = new HindsightClient(config.hindsightApiUrl, apiKey);
        const bankId = deriveBankId({ companyId, agentId }, config);
        const response = await client.recall(bankId, query, config.recallBudget ?? "low");
        const memories = formatMemories(response.results);
        if (memories) {
          await ctx.state.set(
            { scopeKind: "run", scopeId: runId, stateKey: "recalled-memories" },
            memories,
          );
          ctx.logger.info("Recalled memories for run", {
            runId,
            bankId,
            count: response.results.length,
          });
        }
      } catch (err) {
        ctx.logger.warn("Failed to recall memories on run start", {
          runId,
          error: String(err),
        });
      }
    });

    ctx.events.on("issue.comment.created", async (event) => {
      const config = await getConfig(ctx);
      if (config.autoRetain !== true) return;

      const companyId = event.companyId;
      const issueId = event.entityId;
      const payload = (event.payload ?? {}) as CommentCreatedPayload;
      const commentId = payload.commentId;
      if (!issueId || !companyId || !commentId) return;

      let body = "";
      try {
        const comments = await ctx.issues.listComments(issueId, companyId);
        const comment = comments.find((candidate) => candidate.id === commentId);
        if (comment && typeof comment.body === "string") body = comment.body;
      } catch (err) {
        if (typeof payload.bodySnippet === "string") {
          body = payload.bodySnippet;
        } else {
          ctx.logger.warn("Failed to fetch comment body for Hindsight retain", {
            commentId,
            error: String(err),
          });
          return;
        }
      }
      if (!body.trim()) return;

      let bankAgentId = payload.agentId ?? null;
      if (!bankAgentId) {
        try {
          const issue = await ctx.issues.get(issueId, companyId);
          bankAgentId = issue?.assigneeAgentId ?? null;
        } catch {
          // Leave bankAgentId unset. The retain path below will skip safely.
        }
      }
      if (!bankAgentId) {
        ctx.logger.info("Skipping Hindsight retain because no agent attribution is available", {
          commentId,
          issueId,
        });
        return;
      }

      try {
        const apiKey = await resolveApiKey(ctx, config);
        const client = new HindsightClient(config.hindsightApiUrl, apiKey);
        const bankId = deriveBankId({ companyId, agentId: bankAgentId }, config);
        await client.retain(bankId, body, commentId, {
          agentId: bankAgentId,
          companyId,
          issueId,
          commentId,
          runId: payload.runId ?? null,
        });
        ctx.logger.info("Retained comment to Hindsight memory", { commentId, bankId });
      } catch (err) {
        ctx.logger.warn("Failed to retain comment to Hindsight", {
          commentId,
          error: String(err),
        });
      }
    });

    ctx.events.on("agent.run.finished", async (event) => {
      const payload = event.payload as RunFinishedPayload;
      ctx.logger.debug("agent.run.finished received; retention is handled by issue.comment.created", {
        runId: payload?.runId,
      });
    });

    ctx.tools.register(
      "hindsight_recall",
      {
        displayName: "Recall from Memory",
        description: "Search Hindsight long-term memory for context relevant to a query.",
        parametersSchema: {
          type: "object",
          required: ["query"],
          properties: {
            query: { type: "string", description: "What to search for" },
          },
        },
      },
      async (params: unknown, runCtx: ToolRunContext) => {
        const query = getParamString(params, "query");
        const config = await getConfig(ctx);
        const bankId = deriveBankId(
          { companyId: runCtx.companyId, agentId: runCtx.agentId },
          config,
        );

        const cached = await ctx.state.get({
          scopeKind: "run",
          scopeId: runCtx.runId,
          stateKey: "recalled-memories",
        });
        if (cached && typeof cached === "string") {
          return { content: cached };
        }

        try {
          const apiKey = await resolveApiKey(ctx, config);
          const client = new HindsightClient(config.hindsightApiUrl, apiKey);
          const response = await client.recall(bankId, query, config.recallBudget ?? "low");
          const memories = formatMemories(response.results);
          return { content: memories || "No relevant memories found." };
        } catch (err) {
          return { content: `Memory recall failed: ${String(err)}` };
        }
      },
    );

    ctx.tools.register(
      "hindsight_retain",
      {
        displayName: "Save to Memory",
        description: "Store important facts, decisions, or outcomes in Hindsight long-term memory for future runs.",
        parametersSchema: {
          type: "object",
          required: ["content"],
          properties: {
            content: {
              type: "string",
              description: "The content to store in memory",
            },
          },
        },
      },
      async (params: unknown, runCtx: ToolRunContext) => {
        const content = getParamString(params, "content");
        const config = await getConfig(ctx);
        const bankId = deriveBankId(
          { companyId: runCtx.companyId, agentId: runCtx.agentId },
          config,
        );
        try {
          const apiKey = await resolveApiKey(ctx, config);
          const client = new HindsightClient(config.hindsightApiUrl, apiKey);
          await client.retain(bankId, content, undefined, {
            agentId: runCtx.agentId,
            companyId: runCtx.companyId,
            runId: runCtx.runId,
          });
          return { content: "Memory saved." };
        } catch (err) {
          return { content: `Failed to save memory: ${String(err)}` };
        }
      },
    );

    ctx.logger.info("Hindsight memory plugin ready");
  },

  async onHealth() {
    return { status: "ok" };
  },

  async onValidateConfig(config) {
    const candidate = config as Partial<PluginConfig>;
    if (!candidate.hindsightApiUrl?.trim()) {
      return { ok: false, errors: ["hindsightApiUrl is required"] };
    }
    try {
      const client = new HindsightClient(candidate.hindsightApiUrl);
      const healthy = await client.health();
      if (!healthy) {
        return { ok: false, errors: [`Cannot reach Hindsight at ${candidate.hindsightApiUrl}`] };
      }
    } catch (err) {
      return { ok: false, errors: [`Connection failed: ${String(err)}`] };
    }
    return { ok: true };
  },
});

export default plugin;
runWorker(plugin, import.meta.url);
