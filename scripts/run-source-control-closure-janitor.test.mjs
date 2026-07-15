import assert from "node:assert/strict";
import { spawn } from "node:child_process";
import { createServer } from "node:http";
import { mkdtempSync, mkdirSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
import test from "node:test";

function run(command, args, cwd) {
  const result = spawn(command, args, {
    cwd,
    stdio: ["ignore", "pipe", "pipe"],
    shell: false,
  });
  return new Promise((resolve, reject) => {
    let stdout = "";
    let stderr = "";
    result.stdout.setEncoding("utf8");
    result.stderr.setEncoding("utf8");
    result.stdout.on("data", (chunk) => {
      stdout += chunk;
    });
    result.stderr.on("data", (chunk) => {
      stderr += chunk;
    });
    result.on("error", reject);
    result.on("close", (code) => {
      if (code !== 0) {
        const error = new Error(`Command failed: ${command} ${args.join(" ")}`);
        error.code = code;
        error.stdout = stdout;
        error.stderr = stderr;
        reject(error);
        return;
      }
      resolve(stdout);
    });
  });
}

async function createCleanGitRepo(root) {
  const repoDir = path.join(root, "Roost");
  mkdirSync(repoDir, { recursive: true });
  await run("git", ["init", "-q"], repoDir);
  await run("git", ["config", "user.email", "test@example.com"], repoDir);
  await run("git", ["config", "user.name", "Test User"], repoDir);
  writeFileSync(path.join(repoDir, "README.md"), "# Roost\n");
  await run("git", ["add", "README.md"], repoDir);
  await run("git", ["commit", "-m", "seed"], repoDir);
  writeFileSync(path.join(repoDir, "README.md"), "# Roost\n\nDirty local change.\n");
  return repoDir;
}

function responseJson(response, statusCode, payload) {
  const body = JSON.stringify(payload);
  response.writeHead(statusCode, { "content-type": "application/json" });
  response.end(body);
}

test("source-control closure janitor skips cross-assignee mutations instead of hard-failing", async () => {
  const fixtureRoot = mkdtempSync(path.join(tmpdir(), "paperclip-janitor-"));
  const repoDir = await createCleanGitRepo(fixtureRoot);
  const issue = {
    id: "issue-1",
    identifier: "LUC-1290",
    title: "[Roost][Source Control Closure] Classify and close local dirty state for LUC-1285",
    status: "done",
    projectId: "project-1",
    assigneeAgentId: "other-agent",
    updatedAt: "2099-01-01T00:00:00.000Z",
    createdAt: "2026-07-14T00:00:00.000Z",
    completedAt: "2099-01-01T00:00:00.000Z",
  };

  const requestLog = [];
  const server = createServer((req, response) => {
    const url = new URL(req.url, "http://127.0.0.1");
    requestLog.push(`${req.method} ${url.pathname}${url.search}`);

    if (req.method === "GET" && url.pathname === "/api/companies/company-1/issues" && url.searchParams.get("limit") === "2000") {
      return responseJson(response, 200, [issue]);
    }

    if (req.method === "GET" && url.pathname === "/api/companies/company-1/projects") {
      return responseJson(response, 200, [
        {
          id: "project-1",
          name: "Roost",
          executionWorkspacePolicy: { defaultProjectWorkspaceId: "workspace-roost" },
        },
      ]);
    }

    if (req.method === "GET" && url.pathname === "/api/companies/company-1/issues" && url.searchParams.get("q")) {
      return responseJson(response, 200, [issue]);
    }

    if (req.method === "GET" && url.pathname === "/api/issues/issue-1/comments") {
      return responseJson(response, 200, [
        {
          id: "comment-1",
          body: "The source-control closure is complete. Current repo state: clean working tree. closed the full local dirty-state packet.",
        },
      ]);
    }

    if (req.method === "POST" || req.method === "PATCH") {
      response.writeHead(500, { "content-type": "application/json" });
      response.end(JSON.stringify({ error: "unexpected mutation" }));
      return;
    }

    responseJson(response, 404, { error: "not found", method: req.method, path: url.pathname });
  });

  await new Promise((resolve) => server.listen(0, "127.0.0.1", resolve));
  const { port } = server.address();

  const scriptPath = path.resolve("scripts/run-source-control-closure-janitor.mjs");
  const env = {
    ...process.env,
    PAPERCLIP_API_URL: `http://127.0.0.1:${port}`,
    PAPERCLIP_API_KEY: "test-token",
    PAPERCLIP_COMPANY_ID: "company-1",
    PAPERCLIP_AGENT_ID: "current-agent",
    PAPERCLIP_RUN_ID: "run-1",
    LUCKYSPARROW_APPS_ROOT: fixtureRoot,
  };

  const output = await new Promise((resolve, reject) => {
    const child = spawn(process.execPath, [scriptPath, "--apply"], {
      cwd: process.cwd(),
      env,
      stdio: ["ignore", "pipe", "pipe"],
    });
    let stdout = "";
    let stderr = "";
    child.stdout.setEncoding("utf8");
    child.stderr.setEncoding("utf8");
    child.stdout.on("data", (chunk) => {
      stdout += chunk;
    });
    child.stderr.on("data", (chunk) => {
      stderr += chunk;
    });
    child.on("error", reject);
    child.on("close", (code) => {
      if (code !== 0) {
        const error = new Error(`janitor exited with ${code}`);
        error.stdout = stdout;
        error.stderr = stderr;
        reject(error);
        return;
      }
      resolve(stdout);
    });
  });

  try {
    const parsed = JSON.parse(output);
    assert.equal(parsed.mode, "apply");
    assert.equal(parsed.actionCount, 1);
    assert.equal(parsed.applied.length, 0);
    assert.equal(parsed.skipped.length, 1);
    assert.equal(parsed.skipped[0].reason, "cross_assignee_mutation_forbidden");
    assert.equal(parsed.skipped[0].issueAssigneeAgentId, "other-agent");
    assert.match(parsed.skipped[0].ownerAction, /assignee/i);
    assert.doesNotMatch(requestLog.join("\n"), /POST \/api\/issues\/issue-1\/comments/);
    assert.doesNotMatch(requestLog.join("\n"), /PATCH \/api\/issues\/issue-1/);
  } finally {
    await new Promise((resolve) => server.close(resolve));
    rmSync(fixtureRoot, { recursive: true, force: true });
  }
});
