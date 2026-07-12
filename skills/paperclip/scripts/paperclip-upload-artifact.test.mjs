import assert from "node:assert/strict";
import { spawn } from "node:child_process";
import { mkdtemp, rm, writeFile } from "node:fs/promises";
import { createServer } from "node:http";
import os from "node:os";
import path from "node:path";
import test from "node:test";
import { fileURLToPath } from "node:url";

const scriptPath = fileURLToPath(new URL("./paperclip-upload-artifact.mjs", import.meta.url));

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

test("fails a stalled artifact upload after the configured timeout", async () => {
  const tempDir = await mkdtemp(path.join(os.tmpdir(), "paperclip-artifact-timeout-"));
  const filePath = path.join(tempDir, "evidence.md");
  await writeFile(filePath, "# Evidence\n", "utf8");

  const server = createServer((request) => {
    request.resume();
    // Intentionally never respond. The helper must abort instead of hanging.
  });
  await new Promise((resolve) => server.listen(0, "127.0.0.1", resolve));
  const address = server.address();
  assert.ok(address && typeof address === "object");

  try {
    const result = await runScript([filePath, "--no-work-product"], {
      PAPERCLIP_API_URL: `http://127.0.0.1:${address.port}`,
      PAPERCLIP_API_KEY: "test-key",
      PAPERCLIP_COMPANY_ID: "company-id",
      PAPERCLIP_TASK_ID: "issue-id",
      PAPERCLIP_RUN_ID: "run-id",
      PAPERCLIP_ARTIFACT_UPLOAD_TIMEOUT_MS: "200",
    });

    assert.notEqual(result.code, 0);
    assert.match(result.stderr, /Request timed out after 200ms/);
  } finally {
    server.closeAllConnections?.();
    await new Promise((resolve) => server.close(resolve));
    await rm(tempDir, { recursive: true, force: true });
  }
});
