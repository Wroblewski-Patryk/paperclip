import { randomUUID } from "node:crypto";
import express from "express";
import request from "supertest";
import { afterAll, afterEach, beforeAll, beforeEach, describe, expect, it } from "vitest";
import { authUsers, createDb } from "@paperclipai/db";
import {
  getEmbeddedPostgresTestSupport,
  startEmbeddedPostgresTestDatabase,
} from "./helpers/embedded-postgres.js";

let authRoutes: typeof import("../routes/auth.js").authRoutes;
let errorHandler: typeof import("../middleware/index.js").errorHandler;

const embeddedPostgresSupport = await getEmbeddedPostgresTestSupport();
const describeEmbeddedPostgres = embeddedPostgresSupport.supported ? describe : describe.skip;

if (!embeddedPostgresSupport.supported) {
  console.warn(
    `Skipping embedded Postgres auth profile route tests on this host: ${embeddedPostgresSupport.reason ?? "unsupported environment"}`,
  );
}

describeEmbeddedPostgres("auth profile routes", () => {
  let db!: ReturnType<typeof createDb>;
  let tempDb: Awaited<ReturnType<typeof startEmbeddedPostgresTestDatabase>> | null = null;
  let userId!: string;

  beforeAll(async () => {
    tempDb = await startEmbeddedPostgresTestDatabase("paperclip-auth-profile-routes-");
    db = createDb(tempDb.connectionString);
    const [routes, middleware] = await Promise.all([
      import("../routes/auth.js"),
      import("../middleware/index.js"),
    ]);
    authRoutes = routes.authRoutes;
    errorHandler = middleware.errorHandler;
  }, 180_000);

  beforeEach(async () => {
    userId = randomUUID();
    const now = new Date();

    await db.insert(authUsers).values({
      id: userId,
      name: "Board Operator",
      email: "operator@example.com",
      emailVerified: true,
      image: null,
      createdAt: now,
      updatedAt: now,
    });
  });

  afterEach(async () => {
    await db.delete(authUsers);
  });

  afterAll(async () => {
    await tempDb?.cleanup();
  });

  function createApp(actor: Express.Request["actor"] = { type: "board", source: "session", userId }) {
    if (!authRoutes || !errorHandler) {
      throw new Error("auth route test dependencies were not loaded");
    }
    const app = express();
    app.use(express.json());
    app.use((req, _res, next) => {
      req.actor = actor;
      next();
    });
    app.use("/api/auth", authRoutes(db));
    app.use(errorHandler);
    return app;
  }

  it("returns the signed-in account profile and session payload", async () => {
    const app = createApp();

    const profileRes = await request(app).get("/api/auth/profile");
    const sessionRes = await request(app).get("/api/auth/get-session");

    expect(profileRes.status).toBe(200);
    expect(profileRes.body).toEqual({
      id: userId,
      email: "operator@example.com",
      name: "Board Operator",
      image: null,
    });
    expect(sessionRes.status).toBe(200);
    expect(sessionRes.body).toEqual({
      session: {
        id: `paperclip:session:${userId}`,
        userId,
      },
      user: profileRes.body,
    });
  });

  it("updates the signed-in account profile without changing the email", async () => {
    const res = await request(createApp())
      .patch("/api/auth/profile")
      .send({
        name: "Renamed Operator",
        image: "https://example.com/avatar.png",
      });

    expect(res.status).toBe(200);
    expect(res.body).toEqual({
      id: userId,
      email: "operator@example.com",
      name: "Renamed Operator",
      image: "https://example.com/avatar.png",
    });

    const [stored] = await db.select().from(authUsers);
    expect(stored).toMatchObject({
      id: userId,
      email: "operator@example.com",
      name: "Renamed Operator",
      image: "https://example.com/avatar.png",
    });
  });

  it("rejects agent API actors on account routes", async () => {
    const res = await request(createApp({ type: "agent", agentId: randomUUID(), companyId: randomUUID() }))
      .get("/api/auth/profile");

    expect(res.status).toBe(401);
    expect(res.body.error).toBe("Board authentication required");
  });
});
