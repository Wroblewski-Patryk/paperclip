import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { afterEach, describe, expect, it } from "vitest";
import { rotateAndPruneServerLogs } from "../middleware/server-log-retention.js";

const roots: string[] = [];
afterEach(() => {
  for (const root of roots.splice(0)) fs.rmSync(root, { recursive: true, force: true });
});

describe("rotateAndPruneServerLogs", () => {
  it("rotates an oversized active log and prunes expired rotated segments", () => {
    const root = fs.mkdtempSync(path.join(os.tmpdir(), "paperclip-server-log-"));
    roots.push(root);
    const now = new Date("2026-07-17T12:00:00.000Z");
    fs.writeFileSync(path.join(root, "server.log"), "1234567890");
    const expired = path.join(root, "server.old.log");
    fs.writeFileSync(expired, "old");
    fs.utimesSync(expired, new Date("2026-06-01T00:00:00.000Z"), new Date("2026-06-01T00:00:00.000Z"));

    const result = rotateAndPruneServerLogs({
      logDir: root,
      maxFileBytes: 5,
      maxTotalBytes: 100,
      retentionDays: 14,
      now,
    });

    expect(result.rotatedPath).toBeTruthy();
    expect(fs.existsSync(path.join(root, "server.log"))).toBe(false);
    expect(fs.existsSync(expired)).toBe(false);
    expect(fs.existsSync(result.rotatedPath!)).toBe(true);
  });

  it("prunes the oldest rotated segments until the total ceiling is met", () => {
    const root = fs.mkdtempSync(path.join(os.tmpdir(), "paperclip-server-log-"));
    roots.push(root);
    const old = path.join(root, "server.1.log");
    const recent = path.join(root, "server.2.log");
    fs.writeFileSync(old, "123456");
    fs.writeFileSync(recent, "123456");
    fs.utimesSync(old, new Date("2026-07-15T00:00:00.000Z"), new Date("2026-07-15T00:00:00.000Z"));
    fs.utimesSync(recent, new Date("2026-07-16T00:00:00.000Z"), new Date("2026-07-16T00:00:00.000Z"));

    rotateAndPruneServerLogs({
      logDir: root,
      maxFileBytes: 100,
      maxTotalBytes: 6,
      retentionDays: 14,
      now: new Date("2026-07-17T12:00:00.000Z"),
    });

    expect(fs.existsSync(old)).toBe(false);
    expect(fs.existsSync(recent)).toBe(true);
  });
});
