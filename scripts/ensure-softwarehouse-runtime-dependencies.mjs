import { existsSync } from "node:fs";
import { spawnSync } from "node:child_process";
import path from "node:path";
import { fileURLToPath } from "node:url";

const scriptDir = path.dirname(fileURLToPath(import.meta.url));
const defaultRoot = path.resolve(scriptDir, "..");

function dependencySentinels(root) {
  return [
    path.join(root, "node_modules", "typescript", "bin", "tsc"),
    path.join(root, "node_modules", "@openai", "codex", "bin", "codex.js"),
    path.join(root, "node_modules", ".bin", process.platform === "win32" ? "vitest.cmd" : "vitest"),
    path.join(root, "server", "node_modules", "tsx", "dist", "cli.mjs"),
    path.join(root, "server", "node_modules", ".bin", process.platform === "win32" ? "tsx.cmd" : "tsx"),
  ];
}

export function ensureSoftwarehouseRuntimeDependencies(root = defaultRoot) {
  const missingBefore = dependencySentinels(root).filter((candidate) => !existsSync(candidate));
  if (missingBefore.length === 0) {
    return { ok: true, action: "already_healthy", missingBefore: [], missingAfter: [] };
  }

  const command = process.platform === "win32"
    ? (process.env.ComSpec?.trim() || "cmd.exe")
    : "corepack";
  const args = process.platform === "win32"
    ? ["/d", "/s", "/c", "corepack pnpm install --offline --frozen-lockfile --reporter=append-only"]
    : ["pnpm", "install", "--offline", "--frozen-lockfile", "--reporter=append-only"];
  const result = spawnSync(command, args, {
    cwd: root,
    env: { ...process.env },
    encoding: "utf8",
    stdio: ["ignore", "pipe", "pipe"],
    timeout: 180_000,
    killSignal: "SIGTERM",
  });
  const missingAfter = dependencySentinels(root).filter((candidate) => !existsSync(candidate));
  return {
    ok: result.status === 0 && !result.error && missingAfter.length === 0,
    action: "relinked_offline",
    exitCode: result.status,
    error: result.error?.message ?? null,
    stdout: result.stdout?.trim() ?? "",
    stderr: result.stderr?.trim() ?? "",
    missingBefore,
    missingAfter,
  };
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  const result = ensureSoftwarehouseRuntimeDependencies();
  console.log(JSON.stringify(result, null, 2));
  if (!result.ok) process.exitCode = 1;
}
