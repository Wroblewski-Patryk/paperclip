import { randomUUID } from "node:crypto";
import express from "express";
import request from "supertest";
import { afterAll, afterEach, beforeAll, beforeEach, describe, expect, it, vi } from "vitest";
import {
  activityLog,
  agentRuntimeState,
  agents,
  agentTaskSessions,
  companies,
  createDb,
} from "@paperclipai/db";
import {
  getEmbeddedPostgresTestSupport,
  startEmbeddedPostgresTestDatabase,
} from "./helpers/embedded-postgres.js";
import { REDACTED_EVENT_VALUE } from "../redaction.js";

const { runClaudeLogin } = vi.hoisted(() => ({
  runClaudeLogin: vi.fn(),
}));

vi.mock("@paperclipai/adapter-claude-local/server", async (importOriginal) => ({
  ...(await importOriginal<typeof import("@paperclipai/adapter-claude-local/server")>()),
  runClaudeLogin,
}));

let agentRoutes: typeof import("../routes/agents.js").agentRoutes;
let errorHandler: typeof import("../middleware/index.js").errorHandler;

const embeddedPostgresSupport = await getEmbeddedPostgresTestSupport();
const describeEmbeddedPostgres = embeddedPostgresSupport.supported ? describe : describe.skip;

if (!embeddedPostgresSupport.supported) {
  console.warn(
    `Skipping embedded Postgres agent runtime route tests on this host: ${embeddedPostgresSupport.reason ?? "unsupported environment"}`,
  );
}

describeEmbeddedPostgres("agent runtime routes", () => {
  let db!: ReturnType<typeof createDb>;
  let tempDb: Awaited<ReturnType<typeof startEmbeddedPostgresTestDatabase>> | null = null;
  let companyId!: string;
  let processAgentId!: string;
  let claudeAgentId!: string;

  beforeAll(async () => {
    tempDb = await startEmbeddedPostgresTestDatabase("paperclip-agent-runtime-routes-");
    db = createDb(tempDb.connectionString);
    const [routes, middleware] = await Promise.all([
      import("../routes/agents.js"),
      import("../middleware/index.js"),
    ]);
    agentRoutes = routes.agentRoutes;
    errorHandler = middleware.errorHandler;
  }, 360_000);

  beforeEach(async () => {
    runClaudeLogin.mockReset();

    companyId = randomUUID();
    processAgentId = randomUUID();
    claudeAgentId = randomUUID();

    await db.insert(companies).values({
      id: companyId,
      name: "Paperclip",
      issuePrefix: `R${companyId.replace(/-/g, "").slice(0, 6).toUpperCase()}`,
      requireBoardApprovalForNewAgents: false,
    });
    await db.insert(agents).values([
      {
        id: processAgentId,
        companyId,
        name: "Process Coder",
        role: "engineer",
        status: "idle",
        adapterType: "process",
        adapterConfig: {},
        runtimeConfig: {},
        permissions: {},
      },
      {
        id: claudeAgentId,
        companyId,
        name: "Claude Coder",
        role: "engineer",
        status: "idle",
        adapterType: "claude_local",
        adapterConfig: {},
        runtimeConfig: {},
        permissions: {},
      },
    ]);
  });

  afterEach(async () => {
    await db.delete(activityLog);
    await db.delete(agentTaskSessions);
    await db.delete(agentRuntimeState);
    await db.delete(agents);
    await db.delete(companies);
  });

  afterAll(async () => {
    await tempDb?.cleanup();
  });

  function createApp(actor: Express.Request["actor"] = { type: "board", source: "local_implicit", userId: "board-user" }) {
    if (!agentRoutes || !errorHandler) {
      throw new Error("agent route test dependencies were not loaded");
    }
    const app = express();
    app.use(express.json());
    app.use((req, _res, next) => {
      req.actor = actor;
      next();
    });
    app.use("/api", agentRoutes(db));
    app.use(errorHandler);
    return app;
  }

  it("returns runtime state with the latest task-session display id and redacted params", async () => {
    await db.insert(agentRuntimeState).values({
      agentId: processAgentId,
      companyId,
      adapterType: "process",
      sessionId: "runtime-session",
      stateJson: { healthy: true },
    });
    await db.insert(agentTaskSessions).values({
      companyId,
      agentId: processAgentId,
      adapterType: "process",
      taskKey: "issue:LUC-1",
      sessionDisplayId: "display-session",
      sessionParamsJson: {
        safe: "visible",
        apiKey: "secret-value",
      },
      updatedAt: new Date(),
    });

    const res = await request(createApp()).get(`/api/agents/${processAgentId}/runtime-state`);

    expect(res.status).toBe(200);
    expect(res.body).toMatchObject({
      agentId: processAgentId,
      companyId,
      adapterType: "process",
      sessionId: "runtime-session",
      sessionDisplayId: "display-session",
      stateJson: { healthy: true },
      sessionParamsJson: {
        safe: "visible",
        apiKey: REDACTED_EVENT_VALUE,
      },
    });
  });

  it("lists task sessions with session params redacted", async () => {
    await db.insert(agentTaskSessions).values({
      companyId,
      agentId: processAgentId,
      adapterType: "process",
      taskKey: "issue:LUC-2",
      sessionDisplayId: "session-2",
      sessionParamsJson: {
        token: "sensitive-token",
        workingDirectory: "C:/work",
      },
      updatedAt: new Date(),
    });

    const res = await request(createApp()).get(`/api/agents/${processAgentId}/task-sessions`);

    expect(res.status).toBe(200);
    expect(res.body).toHaveLength(1);
    expect(res.body[0]).toMatchObject({
      agentId: processAgentId,
      taskKey: "issue:LUC-2",
      sessionDisplayId: "session-2",
      sessionParamsJson: {
        token: REDACTED_EVENT_VALUE,
        workingDirectory: "C:/work",
      },
    });
  });

  it("resets a scoped runtime session and writes activity", async () => {
    await db.insert(agentRuntimeState).values({
      agentId: processAgentId,
      companyId,
      adapterType: "process",
      sessionId: "runtime-session",
      stateJson: { healthy: true },
      lastError: "previous error",
    });
    await db.insert(agentTaskSessions).values([
      {
        companyId,
        agentId: processAgentId,
        adapterType: "process",
        taskKey: "issue:LUC-3",
        sessionDisplayId: "reset-me",
        sessionParamsJson: { safe: "one" },
      },
      {
        companyId,
        agentId: processAgentId,
        adapterType: "process",
        taskKey: "issue:LUC-4",
        sessionDisplayId: "keep-me",
        sessionParamsJson: { safe: "two" },
      },
    ]);

    const res = await request(createApp())
      .post(`/api/agents/${processAgentId}/runtime-state/reset-session`)
      .send({ taskKey: "issue:LUC-3" });

    expect(res.status).toBe(200);
    expect(res.body.sessionId).toBeNull();
    expect(res.body.lastError).toBeNull();

    const sessions = await db.select().from(agentTaskSessions);
    expect(sessions.map((session) => session.taskKey).sort()).toEqual(["issue:LUC-4"]);

    const activity = await db.select().from(activityLog);
    expect(activity).toHaveLength(1);
    expect(activity[0]).toMatchObject({
      companyId,
      actorType: "user",
      actorId: "board-user",
      action: "agent.runtime_session_reset",
      entityType: "agent",
      entityId: processAgentId,
      details: { taskKey: "issue:LUC-3" },
    });
  });

  it("rejects task-session route access for agent API actors", async () => {
    const res = await request(createApp({ type: "agent", agentId: processAgentId, companyId }))
      .get(`/api/agents/${processAgentId}/task-sessions`);

    expect(res.status).toBe(403);
    expect(res.body.error).toBe("Board access required");
  });

  it("rejects claude-login for non-Claude agents before invoking the adapter login flow", async () => {
    const res = await request(createApp()).post(`/api/agents/${processAgentId}/claude-login`);

    expect(res.status).toBe(400);
    expect(res.body.error).toBe("Login is only supported for claude_local agents");
    expect(runClaudeLogin).not.toHaveBeenCalled();
  });

  it("invokes the Claude login adapter only for claude_local agents", async () => {
    runClaudeLogin.mockResolvedValueOnce({ status: "ok" });

    const res = await request(createApp()).post(`/api/agents/${claudeAgentId}/claude-login`);

    expect(res.status).toBe(200);
    expect(res.body).toEqual({ status: "ok" });
    expect(runClaudeLogin).toHaveBeenCalledWith(
      expect.objectContaining({
        agent: expect.objectContaining({
          id: claudeAgentId,
          companyId,
          adapterType: "claude_local",
        }),
        config: {},
      }),
    );
  });
});
