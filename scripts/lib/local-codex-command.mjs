import { existsSync, realpathSync } from "node:fs";
import { createRequire } from "node:module";
import path from "node:path";
import { pathToFileURL } from "node:url";

const targetByPlatform = {
  "darwin-arm64": ["@openai/codex-darwin-arm64", "aarch64-apple-darwin", "codex"],
  "darwin-x64": ["@openai/codex-darwin-x64", "x86_64-apple-darwin", "codex"],
  "linux-arm64": ["@openai/codex-linux-arm64", "aarch64-unknown-linux-musl", "codex"],
  "linux-x64": ["@openai/codex-linux-x64", "x86_64-unknown-linux-musl", "codex"],
  "win32-arm64": ["@openai/codex-win32-arm64", "aarch64-pc-windows-msvc", "codex.exe"],
  "win32-x64": ["@openai/codex-win32-x64", "x86_64-pc-windows-msvc", "codex.exe"],
};

export function resolveLocalCodexCommand(root) {
  const target = targetByPlatform[`${process.platform}-${process.arch}`];
  if (!target) {
    throw new Error(`Unsupported Codex platform: ${process.platform} (${process.arch})`);
  }

  const [packageName, targetTriple, binaryName] = target;
  const codexEntry = path.join(root, "node_modules", "@openai", "codex", "bin", "codex.js");
  const requireFromCodex = createRequire(pathToFileURL(realpathSync(codexEntry)));
  const packageJson = requireFromCodex.resolve(`${packageName}/package.json`);
  const vendorRoot = path.join(path.dirname(packageJson), "vendor", targetTriple);
  const candidates = [
    path.join(vendorRoot, "bin", binaryName),
    path.join(vendorRoot, "codex", binaryName),
  ];
  const command = candidates.find((candidate) => existsSync(candidate));
  if (!command) {
    throw new Error(`Native Codex executable not found for ${packageName}. Reinstall dependencies.`);
  }
  return command;
}
