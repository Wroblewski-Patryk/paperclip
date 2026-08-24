import { describe, expect, it, vi } from "vitest";
import { stopEmbeddedPostgresTestInstance } from "./test-embedded-postgres.js";

describe("embedded Postgres test cleanup", () => {
  it("waits for three stable port snapshots after killing the exact owned tree", async () => {
    const killTree = vi.fn(async () => {});
    const killPids = vi.fn(async () => {});
    const inspectTree = vi
      .fn<() => Promise<number[]>>()
      .mockResolvedValueOnce([101, 102, 103])
      .mockResolvedValue([]);
    const inspectListeners = vi
      .fn<() => Promise<number[]>>()
      .mockResolvedValueOnce([102])
      .mockResolvedValue([]);

    await stopEmbeddedPostgresTestInstance(
      {
        process: { pid: 101 },
        initialise: vi.fn(),
        start: vi.fn(),
        stop: vi.fn(),
      } as never,
      55432,
      {
        platform: "win32",
        inspectTree,
        inspectListeners,
        killTree,
        killPids,
        delay: vi.fn(async () => {}),
      },
    );

    expect(killTree).toHaveBeenCalledWith(101);
    expect(killPids).toHaveBeenCalledWith(expect.arrayContaining([101, 102, 103]));
    expect(killPids).toHaveBeenCalledWith([102]);
    expect(inspectListeners).toHaveBeenCalledTimes(4);
  });

  it("refuses to kill a listener that was not captured in the owned PID tree", async () => {
    await expect(
      stopEmbeddedPostgresTestInstance(
        {
          process: { pid: 201 },
          initialise: vi.fn(),
          start: vi.fn(),
          stop: vi.fn(),
        } as never,
        55433,
        {
          platform: "win32",
          inspectTree: vi
            .fn<() => Promise<number[]>>()
            .mockResolvedValueOnce([201, 202])
            .mockResolvedValue([]),
          inspectListeners: vi.fn(async () => [999]),
          killTree: vi.fn(async () => {}),
          killPids: vi.fn(async () => {}),
          delay: vi.fn(async () => {}),
        },
      ),
    ).rejects.toThrow("rebound by an unowned process");
  });
});
