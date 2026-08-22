import express from "express";
import request from "supertest";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { errorHandler } from "../middleware/index.js";
import { executionWorkspaceRoutes } from "../routes/execution-workspaces.js";

const mockExecutionWorkspaceService = vi.hoisted(() => ({
  list: vi.fn(),
  listSummaries: vi.fn(),
  getById: vi.fn(),
  getCloseReadiness: vi.fn(),
  update: vi.fn(),
}));

const mockWorkspaceOperationService = vi.hoisted(() => ({
  listForExecutionWorkspace: vi.fn(),
  createRecorder: vi.fn(),
}));

const mockAccessService = vi.hoisted(() => ({
  decide: vi.fn(async () => ({ allowed: true })),
}));

const mockLogActivity = vi.hoisted(() => vi.fn(async () => undefined));
const mockWorkspaceMaintenance = vi.hoisted(() => vi.fn());

vi.mock("../services/index.js", () => ({
  accessService: () => mockAccessService,
  executionWorkspaceService: () => mockExecutionWorkspaceService,
  logActivity: mockLogActivity,
  workspaceOperationService: () => mockWorkspaceOperationService,
}));

vi.mock("../services/shared-workspace-deduplication.js", () => ({
  archiveDuplicateSharedExecutionWorkspaces: mockWorkspaceMaintenance,
}));

function createApp(companyIds = ["company-1"]) {
  const app = express();
  app.use(express.json());
  app.use((req, _res, next) => {
    (req as any).actor = {
      type: "board",
      userId: "local-board",
      companyIds,
      source: "session",
      isInstanceAdmin: false,
    };
    next();
  });
  app.use("/api", executionWorkspaceRoutes({} as any));
  app.use(errorHandler);
  return app;
}

describe.sequential("execution workspace routes", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockExecutionWorkspaceService.list.mockResolvedValue([]);
    mockExecutionWorkspaceService.listSummaries.mockResolvedValue([
      {
        id: "workspace-1",
        name: "Alpha",
        mode: "isolated_workspace",
        projectWorkspaceId: null,
      },
    ]);
    mockExecutionWorkspaceService.getById.mockResolvedValue(null);
    mockWorkspaceMaintenance.mockResolvedValue({
      dryRun: true,
      scanned: 4,
      duplicateCount: 0,
      archived: 0,
      expiredCount: 0,
      expiredArchived: 0,
      referenced: 4,
      retained: 4,
    });
  });

  it("uses summary mode for lightweight workspace lookups", async () => {
    const res = await request(createApp())
      .get("/api/companies/company-1/execution-workspaces?summary=true&reuseEligible=true&mode=isolated_workspace,operator_branch");

    expect(res.status).toBe(200);
    expect(res.body).toEqual([
      {
        id: "workspace-1",
        name: "Alpha",
        mode: "isolated_workspace",
        projectWorkspaceId: null,
      },
    ]);
    expect(mockExecutionWorkspaceService.listSummaries).toHaveBeenCalledWith("company-1", {
      projectId: undefined,
      projectWorkspaceId: undefined,
      issueId: undefined,
      status: undefined,
      mode: "isolated_workspace,operator_branch",
      reuseEligible: true,
    });
    expect(mockExecutionWorkspaceService.list).not.toHaveBeenCalled();
  });

  it("exposes a read-only workspace identity health check", async () => {
    const res = await request(createApp())
      .get("/api/companies/company-1/execution-workspaces/diagnostics");

    expect(res.status).toBe(200);
    expect(res.body).toMatchObject({
      healthy: true,
      duplicateCount: 0,
      invariant: "one reusable shared execution workspace per issue and project workspace",
    });
    expect(mockWorkspaceMaintenance).toHaveBeenCalledWith(expect.anything(), {
      companyId: "company-1",
      dryRun: true,
    });
  });

  it("previews maintenance by default and applies it only when explicitly requested", async () => {
    await request(createApp())
      .post("/api/companies/company-1/execution-workspaces/maintenance")
      .send({})
      .expect(200);
    await request(createApp())
      .post("/api/companies/company-1/execution-workspaces/maintenance")
      .send({ dryRun: false })
      .expect(200);

    expect(mockWorkspaceMaintenance).toHaveBeenNthCalledWith(1, expect.anything(), {
      companyId: "company-1",
      dryRun: true,
    });
    expect(mockWorkspaceMaintenance).toHaveBeenNthCalledWith(2, expect.anything(), {
      companyId: "company-1",
      dryRun: false,
    });
  });

});
