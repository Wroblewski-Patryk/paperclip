import assert from "node:assert/strict";
import test from "node:test";
import path from "node:path";
import { resolveChildTreeTermination, resolvePnpmInvocation } from "./dev-runner-command.mjs";

test("uses the current pnpm JavaScript entrypoint without a Windows command shell", () => {
  const npmExecPath = path.resolve("managed", "pnpm.cjs");
  const result = resolvePnpmInvocation(["--filter", "server", "dev"], { npm_execpath: npmExecPath }, "win32");

  assert.equal(result.command, process.execPath);
  assert.deepEqual(result.args, [npmExecPath, "--filter", "server", "dev"]);
  assert.equal(result.shell, false);
  assert.equal(result.source, "npm_execpath");
});

test("keeps the deliberately scoped Windows launcher fallback", () => {
  const result = resolvePnpmInvocation(["db:migrate"], {}, "win32");

  assert.equal(result.command, "pnpm.cmd");
  assert.deepEqual(result.args, ["db:migrate"]);
  assert.equal(result.shell, true);
  assert.equal(result.source, "launcher_fallback");
});

test("terminates the exact Windows server-child tree during restart", () => {
  assert.deepEqual(resolveChildTreeTermination(4242, "win32"), {
    command: "taskkill.exe",
    args: ["/PID", "4242", "/T", "/F"],
  });
  assert.equal(resolveChildTreeTermination(4242, "linux"), null);
  assert.throws(() => resolveChildTreeTermination(0, "win32"), /Invalid child PID/);
});
