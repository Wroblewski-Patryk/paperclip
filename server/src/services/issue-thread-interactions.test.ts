import { beforeEach, describe, expect, it, vi } from "vitest";

const mockCreateChild = vi.fn();

vi.mock("./issues.js", () => ({
  issueService: () => ({
    createChild: mockCreateChild,
  }),
}));

type SelectRow = Record<string, unknown>;

function createSelectChain(rows: SelectRow[]) {
  return {
    from() {
      return {
        where() {
          return {
            then(callback: (rows: SelectRow[]) => unknown) {
              return Promise.resolve(callback(rows));
            },
          };
        },
      };
    },
  };
}

function createFakeDb(args: {
  interactionRow: Record<string, unknown>;
  parentRows?: SelectRow[];
}) {
  let interactionRow = { ...args.interactionRow };
  const issueTouches: Array<Record<string, unknown>> = [];
  const interactionUpdates: Array<Record<string, unknown>> = [];
  let selectCallCount = 0;

  const db: any = {
    select: vi.fn(() => {
      selectCallCount += 1;
      return createSelectChain(selectCallCount === 1 ? [interactionRow] : (args.parentRows ?? []));
    }),
    update: vi.fn((table: unknown) => ({
      set(values: Record<string, unknown>) {
        return {
          where() {
            if ("status" in values || "result" in values || "resolvedAt" in values) {
              interactionUpdates.push(values);
              interactionRow = { ...interactionRow, ...values };
              return {
                returning: async () => [interactionRow],
              };
            }
            if ("updatedAt" in values) {
              issueTouches.push(values);
              return Promise.resolve(undefined);
            }
            throw new Error(`Unexpected update target: ${String(table)}`);
          },
        };
      },
    })),
    insert: vi.fn(),
    transaction: async (callback: (tx: typeof db) => Promise<void>) => callback(db),
  };

  return {
    db,
    getInteractionRow: () => interactionRow,
    issueTouches,
    interactionUpdates,
  };
}

describe("issueThreadInteractionService", () => {
  beforeEach(() => {
    vi.resetModules();
    vi.clearAllMocks();
  });

  it("create reuses an existing interaction for the same idempotency key", async () => {
    const { issueThreadInteractionService } = await import("./issue-thread-interactions.js");

    const existingRow = {
      id: "interaction-1",
      companyId: "company-1",
      issueId: "11111111-1111-4111-8111-111111111111",
      kind: "suggest_tasks",
      status: "pending",
      continuationPolicy: "wake_assignee",
      idempotencyKey: "run-1:suggest",
      sourceCommentId: null,
      sourceRunId: "22222222-2222-4222-8222-222222222222",
      title: "Break the work down",
      summary: "Created from the current agent run.",
      createdByAgentId: "agent-1",
      createdByUserId: null,
      resolvedByAgentId: null,
      resolvedByUserId: null,
      payload: {
        version: 1,
        tasks: [{ clientKey: "task-1", title: "One" }],
      },
      result: null,
      resolvedAt: null,
      createdAt: new Date("2026-04-20T10:00:00.000Z"),
      updatedAt: new Date("2026-04-20T10:00:00.000Z"),
    };

    const db: any = {
      select: vi.fn(() => createSelectChain([existingRow])),
      insert: vi.fn(),
      update: vi.fn(),
    };

    const svc = issueThreadInteractionService(db as never);
    const created = await svc.create({
      id: "11111111-1111-4111-8111-111111111111",
      companyId: "company-1",
    }, {
      kind: "suggest_tasks",
      idempotencyKey: "run-1:suggest",
      sourceRunId: "22222222-2222-4222-8222-222222222222",
      title: "Break the work down",
      summary: "Created from the current agent run.",
      continuationPolicy: "wake_assignee",
      payload: {
        version: 1,
        tasks: [{ clientKey: "task-1", title: "One" }],
      },
    }, {
      agentId: "agent-1",
    });

    expect(created.id).toBe("interaction-1");
    expect(created.idempotencyKey).toBe("run-1:suggest");
    expect(db.insert).not.toHaveBeenCalled();
  });

  it("rejects agent-generated board approval for ordinary agent routing", async () => {
    const { issueThreadInteractionService } = await import("./issue-thread-interactions.js");
    const db: any = {
      select: vi.fn(() => createSelectChain([])),
      insert: vi.fn(),
      update: vi.fn(),
    };

    const svc = issueThreadInteractionService(db as never);
    await expect(svc.create({
      id: "11111111-1111-4111-8111-111111111111",
      companyId: "company-1",
    }, {
      kind: "suggest_tasks",
      idempotencyKey: "internal-route-rte",
      continuationPolicy: "wake_assignee",
      payload: {
        version: 1,
        decisionContext: {
          version: 1,
          audience: "board",
          decisionClass: "operational",
          decisionReady: true,
          authorityReason: "AIA cannot assign RTE outside its reporting line.",
        },
        tasks: [{
          clientKey: "route-rte",
          title: "Enable governed HTTPS lane",
          assigneeAgentId: "66666666-6666-4666-8666-666666666666",
        }],
      },
    }, { agentId: "agent-1" })).rejects.toMatchObject({ status: 422 });
    expect(db.insert).not.toHaveBeenCalled();
  });

  it("rejects a new owner questionnaire when all question ids were already answered", async () => {
    const { issueThreadInteractionService } = await import("./issue-thread-interactions.js");
    const answeredRow = {
      id: "answered-1",
      payload: {
        version: 1,
        questions: [
          {
            id: "provider_review",
            prompt: "Provider review?",
            selectionMode: "single",
            required: true,
            options: [{ id: "not_completed", label: "Not completed" }],
          },
          {
            id: "alert_state",
            prompt: "Alert state?",
            selectionMode: "single",
            required: true,
            options: [{ id: "not_verified", label: "Not verified" }],
          },
          {
            id: "ref_disposition",
            prompt: "Ref disposition?",
            selectionMode: "single",
            required: true,
            options: [{ id: "zero_updates", label: "Zero updates" }],
          },
        ],
      },
    };
    let selectCallCount = 0;
    const db: any = {
      select: vi.fn(() => {
        selectCallCount += 1;
        if (selectCallCount === 1) return createSelectChain([]);
        return {
          from: () => ({
            where: () => ({
              orderBy: async () => [answeredRow],
            }),
          }),
        };
      }),
      insert: vi.fn(),
      update: vi.fn(),
    };

    const svc = issueThreadInteractionService(db as never);
    await expect(svc.create({
      id: "11111111-1111-4111-8111-111111111111",
      companyId: "company-1",
    }, {
      kind: "ask_user_questions",
      idempotencyKey: "owner-evidence-v2",
      continuationPolicy: "wake_assignee",
      payload: {
        version: 1,
        questions: [
          {
            id: "provider_review",
            prompt: "Provider review now?",
            selectionMode: "single",
            required: true,
            options: [{ id: "still_not_completed", label: "Still not completed" }],
          },
          {
            id: "alert_state",
            prompt: "Alert state now?",
            selectionMode: "single",
            required: true,
            options: [{ id: "still_not_verified", label: "Still not verified" }],
          },
        ],
      },
    }, { agentId: "agent-1" })).rejects.toMatchObject({ status: 409 });
    expect(db.insert).not.toHaveBeenCalled();
  });

  it("answerQuestions normalizes duplicate option ids and persists answered results", async () => {
    const { issueThreadInteractionService } = await import("./issue-thread-interactions.js");

    const interactionRow = {
      id: "interaction-2",
      companyId: "company-1",
      issueId: "11111111-1111-4111-8111-111111111111",
      kind: "ask_user_questions",
      status: "pending",
      continuationPolicy: "wake_assignee",
      sourceCommentId: null,
      sourceRunId: null,
      title: null,
      summary: null,
      createdByAgentId: null,
      createdByUserId: "local-board",
      resolvedByAgentId: null,
      resolvedByUserId: null,
      payload: {
        version: 1,
        questions: [
          {
            id: "scope",
            prompt: "Pick one scope",
            selectionMode: "single",
            required: true,
            options: [
              { id: "phase-1", label: "Phase 1" },
              { id: "phase-2", label: "Phase 2" },
            ],
          },
          {
            id: "extras",
            prompt: "Pick extras",
            selectionMode: "multi",
            options: [
              { id: "tests", label: "Tests" },
              { id: "docs", label: "Docs" },
            ],
          },
        ],
      },
      result: null,
      resolvedAt: null,
      createdAt: new Date("2026-04-20T10:00:00.000Z"),
      updatedAt: new Date("2026-04-20T10:00:00.000Z"),
    };
    const state = createFakeDb({ interactionRow });
    const svc = issueThreadInteractionService(state.db as never);

    const result = await svc.answerQuestions({
      id: "11111111-1111-4111-8111-111111111111",
      companyId: "company-1",
    }, "interaction-2", {
      answers: [
        { questionId: "scope", optionIds: ["phase-1"] },
        { questionId: "extras", optionIds: ["docs", "tests", "docs"] },
      ],
      summaryMarkdown: "Phase 1 with tests and docs.",
    }, {
      userId: "local-board",
    });

    expect(result.status).toBe("answered");
    expect(result.result).toEqual({
      version: 1,
      answers: [
        { questionId: "scope", optionIds: ["phase-1"] },
        { questionId: "extras", optionIds: ["docs", "tests"] },
      ],
      summaryMarkdown: "Phase 1 with tests and docs.",
    });
    expect(state.interactionUpdates).toHaveLength(1);
    expect(state.issueTouches).toHaveLength(1);
  });

  it("lists pending questions alongside legacy cancelled results without answers", async () => {
    const { issueThreadInteractionService } = await import("./issue-thread-interactions.js");
    const pendingRow = {
      id: "pending",
      companyId: "company-1",
      issueId: "issue-1",
      kind: "ask_user_questions",
      status: "pending",
      continuationPolicy: "wake_assignee",
      sourceCommentId: null,
      sourceRunId: null,
      title: null,
      summary: null,
      createdByAgentId: "agent-1",
      createdByUserId: null,
      resolvedByAgentId: null,
      resolvedByUserId: null,
      resolvedAt: null,
      payload: {
        version: 1,
        questions: [{
          id: "q",
          prompt: "Choose",
          selectionMode: "single",
          options: [{ id: "a", label: "A" }],
        }],
      },
      result: null,
      createdAt: new Date("2026-04-20T10:00:00.000Z"),
      updatedAt: new Date("2026-04-20T10:00:00.000Z"),
    };
    const legacyCancelledRow = {
      ...pendingRow,
      id: "legacy-cancelled",
      status: "cancelled",
      result: { version: 1, cancelled: true },
      resolvedByAgentId: null,
      resolvedByUserId: "board",
      resolvedAt: new Date("2026-04-20T10:05:00.000Z"),
      updatedAt: new Date("2026-04-20T10:05:00.000Z"),
    };
    const db: any = {
      select: () => ({
        from: () => ({
          where: () => ({
            orderBy: async () => [pendingRow, legacyCancelledRow],
          }),
        }),
      }),
    };

    const interactions = await issueThreadInteractionService(db).listForIssue("issue-1");

    expect(interactions).toHaveLength(2);
    expect(interactions[0]?.result).toBeNull();
    expect(interactions[1]?.result).toMatchObject({
      version: 1,
      cancelled: true,
      answers: [],
    });
  });
});
