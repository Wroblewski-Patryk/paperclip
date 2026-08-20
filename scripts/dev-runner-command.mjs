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

export function isChildTreeTerminationComplete(exitCode, targetAlive) {
  return exitCode === 0 || targetAlive === false;
}

export function resolveHostControlTickPolicy({ mode, port, env = process.env }) {
  const explicit = `${env.SOFTWAREHOUSE_HOST_CONTROL_TICK_ENABLED ?? ""}`.trim().toLowerCase();
  const enabled = explicit
    ? !["0", "false", "off", "no"].includes(explicit)
    : ["dev", "watch"].includes(mode) && Number(port) === 3200;
  const requestedIntervalMs = Number(env.SOFTWAREHOUSE_HOST_CONTROL_TICK_INTERVAL_MS ?? 300_000);
  const requestedInitialDelayMs = Number(env.SOFTWAREHOUSE_HOST_CONTROL_TICK_INITIAL_DELAY_MS ?? 15_000);

  return {
    enabled,
    intervalMs: Math.max(60_000, Number.isFinite(requestedIntervalMs) ? requestedIntervalMs : 300_000),
    initialDelayMs: Math.max(5_000, Number.isFinite(requestedInitialDelayMs) ? requestedInitialDelayMs : 15_000),
  };
}

export function resolveHostControlTickMode({ quotaResults, settings, now = new Date(), quotaReadFailed = false }) {
  if (quotaReadFailed) {
    return { mode: "quota_hold", reason: "provider_quota_state_unavailable" };
  }
  if (settings?.codexLocalQuotaHoldEnabled === false) {
    return { mode: "normal", reason: "provider_quota_hold_disabled" };
  }

  const shortThreshold = Number(settings?.codexLocalQuotaShortWindowHoldUsedPercent ?? 75);
  const longThreshold = Number(settings?.codexLocalQuotaLongWindowHoldUsedPercent ?? 75);
  const shortWindowMaxMs = 24 * 60 * 60 * 1000;
  for (const result of Array.isArray(quotaResults) ? quotaResults : []) {
    if (result?.provider !== "openai" || result?.ok !== true) continue;
    for (const window of Array.isArray(result.windows) ? result.windows : []) {
      if (window?.quotaLane && window.quotaLane !== "codex_standard") continue;
      if (!Number.isFinite(window?.usedPercent)) continue;
      const resetMs = Date.parse(window.resetsAt ?? "");
      const resetInMs = Number.isFinite(resetMs) ? resetMs - now.getTime() : null;
      const threshold = resetInMs !== null && resetInMs > 0 && resetInMs <= shortWindowMaxMs
        ? shortThreshold
        : longThreshold;
      if (window.usedPercent >= threshold) {
        return {
          mode: "quota_hold",
          reason: `provider_quota_threshold_reached:${window.label ?? "quota"}:${window.usedPercent}/${threshold}`,
        };
      }
    }
  }
  return { mode: "normal", reason: "provider_quota_below_threshold" };
}
