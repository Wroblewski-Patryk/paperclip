import * as p from "@clack/prompts";
import type { LoggingConfig } from "../config/schema.js";
import { resolveDefaultLogsDir, resolvePaperclipInstanceId } from "../config/home.js";

export async function promptLogging(): Promise<LoggingConfig> {
  const defaultLogDir = resolveDefaultLogsDir(resolvePaperclipInstanceId());
  const mode = await p.select({
    message: "Logging mode",
    options: [
      { value: "file" as const, label: "File-based logging", hint: "recommended" },
      { value: "cloud" as const, label: "Cloud logging", hint: "coming soon" },
    ],
  });

  if (p.isCancel(mode)) {
    p.cancel("Setup cancelled.");
    process.exit(0);
  }

  if (mode === "file") {
    const logDir = await p.text({
      message: "Log directory",
      defaultValue: defaultLogDir,
      placeholder: defaultLogDir,
    });

    if (p.isCancel(logDir)) {
      p.cancel("Setup cancelled.");
      process.exit(0);
    }

    return {
      mode: "file",
      logDir: logDir || defaultLogDir,
      runLogRetentionDays: 14,
      runLogMaxTotalBytes: 5 * 1024 * 1024 * 1024,
      runLogSweepIntervalMinutes: 60,
      serverLogMaxFileBytes: 256 * 1024 * 1024,
      serverLogMaxTotalBytes: 1024 * 1024 * 1024,
      serverLogRetentionDays: 14,
    };
  }

  p.note("Cloud logging is coming soon. Using file-based logging for now.");
  return {
    mode: "file",
    logDir: defaultLogDir,
    runLogRetentionDays: 14,
    runLogMaxTotalBytes: 5 * 1024 * 1024 * 1024,
    runLogSweepIntervalMinutes: 60,
    serverLogMaxFileBytes: 256 * 1024 * 1024,
    serverLogMaxTotalBytes: 1024 * 1024 * 1024,
    serverLogRetentionDays: 14,
  };
}
