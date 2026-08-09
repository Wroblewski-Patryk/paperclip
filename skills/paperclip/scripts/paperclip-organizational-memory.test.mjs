import assert from "node:assert/strict";
import { spawn } from "node:child_process";
import { mkdtemp, rm, writeFile } from "node:fs/promises";
import { createServer } from "node:http";
import os from "node:os";
import path from "node:path";
import test from "node:test";
import { fileURLToPath } from "node:url";

const scriptPath = fileURLToPath(new URL("./paperclip-organizational-memory.mjs", import.meta.url));
const companyId = "11111111-1111-4111-8111-111111111111";
const issueId = "22222222-2222-4222-8222-222222222222";

function runScript(args, env) {
  return new Promise((resolve, reject) => {
    const child = spawn(process.execPath, [scriptPath, ...args], {
      env: { ...process.env, ...env },
      stdio: ["ignore", "pipe", "pipe"],
    });
    let stdout = "";
    let stderr = "";
    child.stdout.on("data", (chunk) => { stdout += chunk; });
    child.stderr.on("data", (chunk) => { stderr += chunk; });
    child.once("error", reject);
    child.once("close", (code) => resolve({ code, stdout, stderr }));
  });
}

test("creates an enriched observation once and returns it on a repeated dedupe key", async () => {
  const tempDir = await mkdtemp(path.join(os.tmpdir(), "paperclip-memory-helper-"));
  const inputFile = path.join(tempDir, "learning.json");
  await writeFile(inputFile, `\uFEFF${JSON.stringify({
    kind: "learning",
    title: "Bounded test learning",
    summary: "The helper keeps one durable entry.",
    sourceClass: "helper_test",
  })}`, "utf8");

  const observations = [];
  let postCount = 0;
  const server = createServer(async (request, response) => {
    const chunks = [];
    for await (const chunk of request) chunks.push(chunk);
    const body = chunks.length > 0 ? JSON.parse(Buffer.concat(chunks).toString("utf8")) : null;
    response.setHeader("content-type", "application/json");
    if (request.method === "GET" && request.url === "/api/issues/LUC-123") {
      response.end(JSON.stringify({
        id: issueId,
        identifier: "LUC-123",
        companyId,
        projectId: "33333333-3333-4333-8333-333333333333",
        goalId: "44444444-4444-4444-8444-444444444444",
        title: "Source issue",
      }));
      return;
    }
    if (request.method === "GET" && request.url?.startsWith(`/api/companies/${companyId}/organizational-observations?`)) {
      response.end(JSON.stringify(observations));
      return;
    }
    if (request.method === "POST" && request.url === `/api/companies/${companyId}/organizational-observations`) {
      postCount += 1;
      const created = { id: "55555555-5555-4555-8555-555555555555", ...body };
      observations.push(created);
      response.statusCode = 201;
      response.end(JSON.stringify(created));
      return;
    }
    response.statusCode = 404;
    response.end(JSON.stringify({ error: "not found" }));
  });
  await new Promise((resolve) => server.listen(0, "127.0.0.1", resolve));
  const address = server.address();
  assert.ok(address && typeof address === "object");

  const env = {
    PAPERCLIP_API_URL: `http://127.0.0.1:${address.port}`,
    PAPERCLIP_API_KEY: "test-key",
    PAPERCLIP_COMPANY_ID: companyId,
    PAPERCLIP_TASK_ID: "LUC-123",
    PAPERCLIP_AGENT_ID: "66666666-6666-4666-8666-666666666666",
    PAPERCLIP_RUN_ID: "77777777-7777-4777-8777-777777777777",
  };
  const args = ["observe", "--input-file", inputFile, "--dedupe-key", "issue:LUC-123:learning:v1"];

  try {
    const first = await runScript(args, env);
    const second = await runScript(args, env);
    assert.equal(first.code, 0, first.stderr);
    assert.equal(second.code, 0, second.stderr);
    assert.equal(JSON.parse(first.stdout).action, "created");
    assert.equal(JSON.parse(second.stdout).action, "existing");
    assert.equal(postCount, 1);
    assert.equal(observations[0].issueId, issueId);
    assert.equal(observations[0].projectId, "33333333-3333-4333-8333-333333333333");
    assert.equal(observations[0].agentId, env.PAPERCLIP_AGENT_ID);
    assert.equal(observations[0].runId, env.PAPERCLIP_RUN_ID);
    assert.ok(observations[0].provenance.some((entry) => entry.kind === "issue" && entry.ref === "LUC-123"));
  } finally {
    server.closeAllConnections?.();
    await new Promise((resolve) => server.close(resolve));
    await rm(tempDir, { recursive: true, force: true });
  }
});
