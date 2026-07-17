import { describe, expect, it } from "vitest";
import { selectRunLogsForPrune } from "../services/run-log-retention.js";

const day = 24 * 60 * 60 * 1_000;

describe("selectRunLogsForPrune", () => {
  it("removes expired terminal logs and preserves protected active logs", () => {
    const nowMs = Date.UTC(2026, 6, 17);
    const result = selectRunLogsForPrune([
      { key: "expired.ndjson", bytes: 10, modifiedAtMs: nowMs - 15 * day, protected: false },
      { key: "active.ndjson", bytes: 100, modifiedAtMs: nowMs - 30 * day, protected: true },
      { key: "recent.ndjson", bytes: 20, modifiedAtMs: nowMs - day, protected: false },
    ], { nowMs, retentionDays: 14, maxTotalBytes: 1_000 });

    expect([...result.keys]).toEqual(["expired.ndjson"]);
    expect(result.retainedBytes).toBe(120);
  });

  it("removes oldest eligible logs until the byte ceiling is met", () => {
    const nowMs = Date.UTC(2026, 6, 17);
    const result = selectRunLogsForPrune([
      { key: "old.ndjson", bytes: 60, modifiedAtMs: nowMs - 3 * day, protected: false },
      { key: "new.ndjson", bytes: 60, modifiedAtMs: nowMs - day, protected: false },
    ], { nowMs, retentionDays: 14, maxTotalBytes: 60 });

    expect([...result.keys]).toEqual(["old.ndjson"]);
    expect(result.retainedBytes).toBe(60);
  });
});
