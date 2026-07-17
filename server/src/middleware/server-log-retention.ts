import fs from "node:fs";
import path from "node:path";

export function rotateAndPruneServerLogs(input: {
  logDir: string;
  maxFileBytes: number;
  maxTotalBytes: number;
  retentionDays: number;
  now?: Date;
}) {
  const now = input.now ?? new Date();
  const activePath = path.join(input.logDir, "server.log");
  let rotatedPath: string | null = null;
  if (fs.existsSync(activePath) && fs.statSync(activePath).size >= input.maxFileBytes) {
    const stamp = now.toISOString().replace(/[:.]/g, "-");
    rotatedPath = path.join(input.logDir, `server.${stamp}.log`);
    fs.renameSync(activePath, rotatedPath);
  }

  const cutoffMs = now.getTime() - input.retentionDays * 24 * 60 * 60 * 1_000;
  const rotated = fs.readdirSync(input.logDir, { withFileTypes: true })
    .filter((entry) => entry.isFile() && /^server\..+\.log$/.test(entry.name))
    .map((entry) => {
      const filePath = path.join(input.logDir, entry.name);
      const stat = fs.statSync(filePath);
      return { filePath, bytes: stat.size, modifiedAtMs: stat.mtimeMs };
    })
    .sort((a, b) => a.modifiedAtMs - b.modifiedAtMs || a.filePath.localeCompare(b.filePath));
  let totalBytes = rotated.reduce((sum, file) => sum + file.bytes, 0)
    + (fs.existsSync(activePath) ? fs.statSync(activePath).size : 0);
  const deleted: string[] = [];
  for (const file of rotated) {
    if (file.modifiedAtMs >= cutoffMs && totalBytes <= input.maxTotalBytes) continue;
    fs.rmSync(file.filePath, { force: true });
    totalBytes -= file.bytes;
    deleted.push(file.filePath);
  }
  return { rotatedPath, deleted, retainedBytes: totalBytes };
}
