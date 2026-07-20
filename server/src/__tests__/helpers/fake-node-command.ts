import fs from "node:fs/promises";

/**
 * Writes a Node-backed fake CLI that can be resolved both by absolute path and
 * through PATH on every supported platform.
 */
export async function writeFakeNodeCommand(commandPath: string, script: string): Promise<void> {
  if (process.platform === "win32") {
    const scriptPath = `${commandPath}.cjs`;
    await fs.writeFile(scriptPath, script, "utf8");
    await fs.writeFile(
      commandPath,
      `@echo off\r\nset "PAPERCLIP_FAKE_COMMAND=%~f0"\r\n"${process.execPath}" "${scriptPath}" %*\r\n`,
      "utf8",
    );
    return;
  }

  await fs.writeFile(commandPath, `#!/usr/bin/env node\n${script}`, "utf8");
  await fs.chmod(commandPath, 0o755);
}

export function fakeNodeCommandPath(commandPath: string): string {
  return process.platform === "win32" ? `${commandPath}.cmd` : commandPath;
}
