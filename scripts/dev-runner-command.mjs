import path from "node:path";

export function resolvePnpmInvocation(args, env = process.env, platform = process.platform) {
  const npmExecPath = typeof env.npm_execpath === "string" && env.npm_execpath.trim()
    ? path.resolve(env.npm_execpath)
    : null;

  if (npmExecPath) {
    return {
      command: process.execPath,
      args: [npmExecPath, ...args],
      shell: false,
      source: "npm_execpath",
    };
  }

  return {
    command: platform === "win32" ? "pnpm.cmd" : "pnpm",
    args,
    shell: platform === "win32",
    source: "launcher_fallback",
  };
}

export function resolveChildTreeTermination(pid, platform = process.platform) {
  if (platform !== "win32") return null;
  if (!Number.isInteger(pid) || pid <= 0) {
    throw new Error(`Invalid child PID for Windows tree termination: ${pid}`);
  }
  return {
    command: "taskkill.exe",
    args: ["/PID", String(pid), "/T", "/F"],
  };
}
