import express from "express";
import request from "supertest";
import { beforeEach, describe, expect, it, vi } from "vitest";

const observationService = vi.hoisted(() => ({
  getById: vi.fn(),
  update: vi.fn(),
  evaluateLearningPromotion: vi.fn(),
}));
const logActivity = vi.hoisted(() => vi.fn());

vi.mock("../services/index.js", () => ({
  organizationalObservationService: () => observationService,
  logActivity,
}));

async function createApp(agentId: string) {
  vi.resetModules();
  const [{ errorHandler }, { organizationalObservationRoutes }] = await Promise.all([
    import("../middleware/index.js") as Promise<typeof import("../middleware/index.js")>,
    import("../routes/organizational-observations.js") as Promise<typeof import("../routes/organizational-observations.js")>,
  ]);
  const app = express();
  app.use(express.json());
  app.use((req, _res, next) => {
    (req as any).actor = {
      type: "agent",
      agentId,
      companyId: "11111111-1111-4111-8111-111111111111",
      runId: "22222222-2222-4222-8222-222222222222",
      source: "agent_jwt",
    };
    next();
  });
  app.use("/api", organizationalObservationRoutes({} as any));
  app.use(errorHandler);
  return app;
}

function observation(overrides: Record<string, unknown> = {}) {
  return {
    id: "33333333-3333-4333-8333-333333333333",
    companyId: "11111111-1111-4111-8111-111111111111",
    agentId: "44444444-4444-4444-8444-444444444444",
    createdByAgentId: null,
    kind: "learning",
    status: "proposed",
    title: "Learning signal",
    ...overrides,
  };
}

describe.sequential("organizational observation route ownership", () => {
  beforeEach(() => {
    observationService.getById.mockReset();
    observationService.update.mockReset();
    observationService.evaluateLearningPromotion.mockReset();
    logActivity.mockReset();
  });

  it("allows the attributed agent to validate a centrally created observation", async () => {
    const agentId = "44444444-4444-4444-8444-444444444444";
    const existing = observation({ agentId });
    observationService.getById.mockResolvedValue(existing);
    observationService.update.mockResolvedValue({ ...existing, status: "validated" });

    const response = await request(await createApp(agentId))
      .patch(`/api/organizational-observations/${existing.id}`)
      .send({ status: "validated" });

    expect(response.status).toBe(200);
    expect(observationService.update).toHaveBeenCalledWith(existing.id, { status: "validated" });
  });

  it("rejects an agent that neither created nor owns the observation", async () => {
    const existing = observation();
    observationService.getById.mockResolvedValue(existing);

    const response = await request(await createApp("55555555-5555-4555-8555-555555555555"))
      .patch(`/api/organizational-observations/${existing.id}`)
      .send({ status: "validated" });

    expect(response.status).toBe(403);
    expect(observationService.update).not.toHaveBeenCalled();
  });

  it("prevents an owning agent from transferring attribution to another agent", async () => {
    const agentId = "44444444-4444-4444-8444-444444444444";
    const existing = observation({ agentId });
    observationService.getById.mockResolvedValue(existing);

    const response = await request(await createApp(agentId))
      .patch(`/api/organizational-observations/${existing.id}`)
      .send({ agentId: "55555555-5555-4555-8555-555555555555" });

    expect(response.status).toBe(403);
    expect(observationService.update).not.toHaveBeenCalled();
  });

  it("allows the owning agent to request evidence-gated promotion evaluation", async () => {
    const agentId = "44444444-4444-4444-8444-444444444444";
    const existing = observation({ agentId });
    observationService.getById.mockResolvedValue(existing);
    observationService.evaluateLearningPromotion.mockResolvedValue({
      disposition: "held",
      observation: existing,
      reasons: ["insufficient_independent_evidence"],
      transitions: [],
    });

    const response = await request(await createApp(agentId))
      .post(`/api/organizational-observations/${existing.id}/evaluate-promotion`);

    expect(response.status).toBe(200);
    expect(response.body).toMatchObject({ disposition: "held" });
    expect(observationService.evaluateLearningPromotion).toHaveBeenCalledWith(existing.id);
  });
});
