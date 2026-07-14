import assert from "node:assert/strict";
import { mkdir, mkdtemp, readFile, writeFile } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { spawnSync } from "node:child_process";
import test from "node:test";

const scriptPath = path.join(path.dirname(fileURLToPath(import.meta.url)), "build-app-completion-index.mjs");

test("classifies proof-linked implemented API endpoints as ok", async () => {
  const root = await mkdtemp(path.join(os.tmpdir(), "app-completion-index-"));
  const docsDir = path.join(root, "docs");
  await mkdir(path.join(docsDir, "graphs"), { recursive: true });

  const graph = {
    entities: [
      {
        id: "api_endpoint:post-login",
        type: "api_endpoint",
        name: "POST /login",
        path: "apps/api/src/modules/auth/auth.routes.ts#/login",
        owner: "Engineering Delivery Lead",
        status: "implemented",
      },
      {
        id: "test:auth-e2e",
        type: "test",
        name: "auth.e2e.test.ts",
        path: "apps/api/src/modules/auth/auth.e2e.test.ts",
        status: "tested",
      },
      {
        id: "document:auth-login",
        type: "document",
        name: "SOAR-API-AUTH-LOGIN.md",
        path: "docs/architecture/nodes/SOAR-API-AUTH-LOGIN.md",
        status: "verified",
      },
    ],
    relations: [
      { from: "api_endpoint:post-login", to: "test:auth-e2e", type: "tested_by" },
      { from: "api_endpoint:post-login", to: "document:auth-login", type: "documents" },
    ],
  };

  await writeFile(path.join(docsDir, "graphs", "architecture-awareness.json"), `${JSON.stringify(graph)}\n`);

  const result = spawnSync(
    process.execPath,
    [scriptPath, "--project", "Soar", "--root", root, "--out", docsDir],
    { encoding: "utf8" },
  );

  assert.equal(result.status, 0, result.stderr || result.stdout);

  const summary = JSON.parse(await readFile(path.join(docsDir, "status", "app-completion-index.json"), "utf8"));
  assert.equal(summary.counts.implementedNeedsProof, 0);

  const item = summary.priorityReviewItems.find((candidate) => candidate.id === "api_endpoint:post-login");
  assert.equal(item, undefined);
});

test("keeps implemented API endpoints without proof links in missing evidence buckets", async () => {
  const root = await mkdtemp(path.join(os.tmpdir(), "app-completion-index-"));
  const docsDir = path.join(root, "docs");
  await mkdir(path.join(docsDir, "graphs"), { recursive: true });

  const graph = {
    entities: [
      {
        id: "api_endpoint:post-logout",
        type: "api_endpoint",
        name: "POST /logout",
        path: "apps/api/src/modules/auth/auth.routes.ts#/logout",
        owner: "Engineering Delivery Lead",
        status: "implemented",
      },
    ],
    relations: [],
  };

  await writeFile(path.join(docsDir, "graphs", "architecture-awareness.json"), `${JSON.stringify(graph)}\n`);

  const result = spawnSync(
    process.execPath,
    [scriptPath, "--project", "Soar", "--root", root, "--out", docsDir],
    { encoding: "utf8" },
  );

  assert.equal(result.status, 0, result.stderr || result.stdout);

  const summary = JSON.parse(await readFile(path.join(docsDir, "status", "app-completion-index.json"), "utf8"));
  assert.equal(summary.counts.missingTestLink, 1);
  assert.equal(summary.priorityReviewItems[0].risk, "missing_test_link");
});

test("does not route agent state documents as app completion work", async () => {
  const root = await mkdtemp(path.join(os.tmpdir(), "app-completion-index-"));
  const docsDir = path.join(root, "docs");
  await mkdir(path.join(docsDir, "graphs"), { recursive: true });

  const graph = {
    entities: [
      {
        id: "agent:active-mission",
        type: "agent",
        name: "Active mission mentions login and subscription",
        path: ".agents/state/active-mission.md",
        description: "Agent instruction or state document for auth, billing, and subscription work.",
        status: "implemented",
      },
      {
        id: "task:auth-plan",
        type: "task",
        name: "Auth plan",
        path: "history/tasks/auth-plan.md",
        description: "Task narrative mentioning login.",
        status: "implemented",
      },
    ],
    relations: [],
  };

  await writeFile(path.join(docsDir, "graphs", "architecture-awareness.json"), `${JSON.stringify(graph)}\n`);

  const result = spawnSync(
    process.execPath,
    [scriptPath, "--project", "Soar", "--root", root, "--out", docsDir],
    { encoding: "utf8" },
  );

  assert.equal(result.status, 0, result.stderr || result.stdout);

  const summary = JSON.parse(await readFile(path.join(docsDir, "status", "app-completion-index.json"), "utf8"));
  assert.equal(summary.counts.items, 0);
  assert.deepEqual(summary.priorityReviewItems, []);
});

test("does not dispatch internal functions and modules as independent product completion lanes", async () => {
  const root = await mkdtemp(path.join(os.tmpdir(), "app-completion-index-"));
  const docsDir = path.join(root, "docs");
  await mkdir(path.join(docsDir, "graphs"), { recursive: true });

  const graph = {
    entities: [
      {
        id: "api_endpoint:get-positions",
        type: "api_endpoint",
        name: "GET /positions",
        path: "apps/api/src/positions.routes.ts#/positions",
        owner: "Engineering Delivery Lead",
        status: "implemented",
      },
      {
        id: "function:sum-position-pnl",
        type: "function",
        name: "sumPositionPnl",
        path: "apps/api/src/positions.repository.ts#sumPositionPnl",
        owner: "Engineering Delivery Lead",
        status: "implemented",
      },
      {
        id: "module:positions-repository",
        type: "module",
        name: "positions repository",
        path: "apps/api/src/positions.repository.ts",
        owner: "Engineering Delivery Lead",
        status: "implemented",
      },
    ],
    relations: [
      { from: "api_endpoint:get-positions", to: "function:sum-position-pnl", type: "implemented_by" },
      { from: "function:sum-position-pnl", to: "module:positions-repository", type: "member_of" },
    ],
  };

  await writeFile(path.join(docsDir, "graphs", "architecture-awareness.json"), `${JSON.stringify(graph)}\n`);

  const result = spawnSync(
    process.execPath,
    [scriptPath, "--project", "Soar", "--root", root, "--out", docsDir],
    { encoding: "utf8" },
  );

  assert.equal(result.status, 0, result.stderr || result.stdout);

  const summary = JSON.parse(await readFile(path.join(docsDir, "status", "app-completion-index.json"), "utf8"));
  assert.equal(summary.counts.items, 1);
  assert.deepEqual(summary.priorityReviewItems.map((item) => item.id), ["api_endpoint:get-positions"]);
});
