import assert from "node:assert/strict";
import test from "node:test";
import { findDockerCli, findPhpExecutable, inspectDockerDaemon } from "./ensure-project-runtime-capabilities.mjs";

test("prefers the managed PHP runtime independently of the inherited PATH", () => {
  const php = findPhpExecutable({ ...process.env, PATH: "" });
  assert.ok(php, "expected a managed or installed PHP runtime to be discovered");
  assert.match(php, /php\.exe$/i);
  assert.match(php, /\.paperclip[\\/]runtime[\\/]toolchains[\\/]php-/i);
});

test("reports Docker daemon state separately from Docker CLI availability", () => {
  const dockerCli = findDockerCli();
  assert.ok(dockerCli, "expected Docker CLI to be installed");
  const result = inspectDockerDaemon(dockerCli);
  assert.equal(result.dockerCli, dockerCli);
  assert.equal(typeof result.ok, "boolean");
  if (!result.ok) assert.equal(result.reason, "docker_daemon_unavailable");
});
