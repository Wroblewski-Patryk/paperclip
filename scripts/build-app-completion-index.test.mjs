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

test("requires an explicit tests relation from a test entity for production proof", async () => {
  const root = await mkdtemp(path.join(os.tmpdir(), "app-completion-index-"));
  const docsDir = path.join(root, "docs");
  await mkdir(path.join(docsDir, "graphs"), { recursive: true });

  const graph = {
    entities: [
      {
        id: "api_endpoint:get-test-preview",
        type: "api_endpoint",
        name: "GET /test-preview",
        path: "routes/api.php#/test-preview",
        status: "implemented",
      },
      {
        id: "test:preview-feature",
        type: "test",
        name: "PreviewFeatureTest.php",
        path: "tests/Feature/PreviewFeatureTest.php",
        status: "tested",
      },
      {
        id: "api_endpoint:test-helper",
        type: "api_endpoint",
        name: "GET /test-helper",
        path: "tests/Support/routes.php#/test-helper",
        status: "tested",
      },
    ],
    relations: [
      { from: "test:preview-feature", to: "api_endpoint:get-test-preview", type: "implements" },
      { from: "test:preview-feature", to: "api_endpoint:test-helper", type: "tests" },
    ],
  };

  await writeFile(path.join(docsDir, "graphs", "architecture-awareness.json"), `${JSON.stringify(graph)}\n`);
  const result = spawnSync(
    process.execPath,
    [scriptPath, "--project", "Fixture", "--root", root, "--out", docsDir],
    { encoding: "utf8" },
  );
  assert.equal(result.status, 0, result.stderr || result.stdout);

  const summary = JSON.parse(await readFile(path.join(docsDir, "status", "app-completion-index.json"), "utf8"));
  const item = summary.priorityReviewItems.find((candidate) => candidate.id === "api_endpoint:get-test-preview");
  assert.equal(item.evidence.hasTest, false);
  assert.equal(item.risk, "missing_test_link");
  const testOnlyItem = summary.priorityReviewItems.find((candidate) => candidate.id === "api_endpoint:test-helper");
  assert.equal(testOnlyItem.evidence.hasTest, false);
  assert.equal(testOnlyItem.risk, "missing_test_link");
});

test("treats inbound document links as documentation proof for verified API endpoints", async () => {
  const root = await mkdtemp(path.join(os.tmpdir(), "app-completion-index-"));
  const docsDir = path.join(root, "docs");
  await mkdir(path.join(docsDir, "graphs"), { recursive: true });

  const graph = {
    entities: [
      {
        id: "api_endpoint:use-profile-security",
        type: "api_endpoint",
        name: "USE /profile/security",
        path: "apps/api/src/router/dashboard.routes.ts#/profile/security",
        owner: "Test Automation Engineer",
        status: "verified",
        description: "Focused profile security API coverage proves the mounted dashboard security routes.",
      },
      {
        id: "test:security-e2e",
        type: "test",
        name: "security.e2e.test.ts",
        path: "apps/api/src/modules/profile/security/security.e2e.test.ts",
        status: "tested",
      },
      {
        id: "document:api-profile-module",
        type: "document",
        name: "API Profile Module",
        path: "docs/modules/api-profile.md",
        status: "verified",
      },
      {
        id: "task:repair-lane",
        type: "task",
        name: "Task",
        path: "history/tasks/luc-1396-account-access-use-profile-security-missing-doc-link-task.md",
        status: "verified",
      },
    ],
    relations: [
      { from: "document:api-profile-module", to: "api_endpoint:use-profile-security", type: "documents" },
      { from: "api_endpoint:use-profile-security", to: "test:security-e2e", type: "tests" },
      { from: "task:repair-lane", to: "api_endpoint:use-profile-security", type: "documents" },
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
  assert.equal(summary.counts.missingDocLink, 0);
  assert.equal(summary.counts.missingTestLink, 0);

  const item = summary.priorityReviewItems.find((candidate) => candidate.id === "api_endpoint:use-profile-security");
  assert.equal(item, undefined);
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
  assert.equal(summary.candidatePolicy, "product_boundaries_v2");
  assert.deepEqual(summary.priorityReviewItems.map((item) => item.id), ["api_endpoint:get-positions"]);
});

test("routes only visible UI boundaries and explicit capabilities", async () => {
  const root = await mkdtemp(path.join(os.tmpdir(), "app-completion-index-"));
  const docsDir = path.join(root, "docs");
  await mkdir(path.join(docsDir, "graphs"), { recursive: true });

  const graph = {
    entities: [
      {
        id: "route:exchange-service",
        type: "route",
        name: "exchangeAdapter.service.ts",
        path: "apps/api/src/modules/exchange/exchangeAdapter.service.ts",
        status: "implemented",
      },
      {
        id: "feature:auth-translations",
        type: "feature",
        name: "auth.en.ts",
        path: "apps/web/src/i18n/auth.en.ts",
        status: "implemented",
      },
      {
        id: "route:dashboard-page",
        type: "route",
        name: "page.tsx",
        path: "apps/web/src/app/dashboard/page.tsx",
        status: "implemented",
      },
      {
        id: "component:audit-view",
        type: "component",
        name: "AuditTrailView.tsx",
        path: "apps/web/src/features/logs/components/AuditTrailView.tsx",
        status: "implemented",
      },
      {
        id: "feature:portfolio-monitoring",
        type: "feature",
        name: "Portfolio monitoring",
        path: "docs/architecture/features/portfolio-monitoring.md",
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
  assert.equal(summary.candidatePolicy, "product_boundaries_v2");
  assert.equal(summary.counts.items, 3);
  assert.deepEqual(
    summary.priorityReviewItems.map((item) => item.id).sort(),
    ["component:audit-view", "feature:portfolio-monitoring", "route:dashboard-page"],
  );
});
