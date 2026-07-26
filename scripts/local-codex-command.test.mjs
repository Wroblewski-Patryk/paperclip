import assert from "node:assert/strict";
import { execFileSync } from "node:child_process";
import path from "node:path";
import test from "node:test";
import { fileURLToPath } from "node:url";
import { resolveLocalCodexCommand } from "./lib/local-codex-command.mjs";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");

test("Softwarehouse resolves Codex to the native executable", () => {
  const command = resolveLocalCodexCommand(root);
  assert.match(command, process.platform === "win32" ? /codex\.exe$/i : /codex$/);
  assert.doesNotMatch(command, /\.cmd$/i);
  assert.match(execFileSync(command, ["--version"], { encoding: "utf8" }), /^codex-cli /);
});

test("native Codex preserves TOML arguments containing quoted Windows paths", { skip: process.platform !== "win32" }, () => {
  const command = resolveLocalCodexCommand(root);
  const output = execFileSync(command, [
    "exec",
    "--help",
    "-c",
    'mcp_servers.companycore.command="C:\\\\Program Files\\\\nodejs\\\\node.exe"',
  ], { encoding: "utf8" });
  assert.match(output, /Run Codex non-interactively/);
});
