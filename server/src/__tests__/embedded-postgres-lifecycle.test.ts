import { describe, expect, it, vi } from "vitest";
import {
  reclaimOrphanedEmbeddedPostgresListener,
  stopOwnedEmbeddedPostgres,
} from "../embedded-postgres-lifecycle.js";

describe("stopOwnedEmbeddedPostgres", () => {
  it("uses the regular stop path outside Windows", async () => {
    const stop = vi.fn(async () => {});
    const inspect = vi.fn();

    await stopOwnedEmbeddedPostgres(
      { process: { pid: 101 }, stop },
      54329,
      {
        platform: "linux",
        inspect,
        killTree: vi.fn(),
        killPids: vi.fn(),
        delay: vi.fn(),
      },
    );

    expect(stop).toHaveBeenCalledOnce();
    expect(inspect).not.toHaveBeenCalled();
  });

  it("captures and drains the exact Windows PID tree before declaring the port released", async () => {
    const events: string[] = [];
    const snapshots = [
      { treePids: [101, 202], listenerPids: [101] },
      { treePids: [101, 303], listenerPids: [101] },
      { treePids: [101], listenerPids: [] },
      { treePids: [101], listenerPids: [] },
      { treePids: [101], listenerPids: [] },
    ];
    const inspect = vi.fn(async () => snapshots.shift() ?? { treePids: [101], listenerPids: [] });
    const killTree = vi.fn(async (pid: number) => {
      events.push(`tree:${pid}`);
    });
    const killPids = vi.fn(async (pids: number[]) => {
      events.push(`pids:${pids.join(",")}`);
    });
    const stop = vi.fn(async () => {
      events.push("stop");
    });

    await stopOwnedEmbeddedPostgres(
      { process: { pid: 101 }, stop },
      54329,
      {
        platform: "win32",
        inspect,
        killTree,
        killPids,
        delay: vi.fn(async () => {}),
      },
    );

    expect(events).toEqual([
      "stop",
      "tree:101",
      "pids:101,202",
      "pids:303",
    ]);
    expect(inspect).toHaveBeenCalledTimes(5);
  });

  it("does not terminate a process that newly binds the strict port", async () => {
    const stop = vi.fn(async () => {});
    const killPids = vi.fn(async () => {});
    const snapshots = [
      { treePids: [101], listenerPids: [101] },
      { treePids: [101], listenerPids: [999] },
    ];

    await expect(
      stopOwnedEmbeddedPostgres(
        { process: { pid: 101 }, stop },
        54329,
        {
          platform: "win32",
          inspect: vi.fn(async () => snapshots.shift() ?? { treePids: [101], listenerPids: [999] }),
          killTree: vi.fn(async () => {}),
          killPids,
          delay: vi.fn(async () => {}),
        },
      ),
    ).rejects.toThrow("rebound by an unowned process");

    expect(killPids).toHaveBeenCalledTimes(1);
    expect(killPids).toHaveBeenCalledWith([101]);
  });
});

describe("reclaimOrphanedEmbeddedPostgresListener", () => {
  it("kills only verified fork children of a missing Windows listener owner", async () => {
    const snapshots = [
      { eligible: true, listenerPids: [101], childPids: [202, 303] },
      { eligible: false, listenerPids: [], childPids: [] },
      { eligible: false, listenerPids: [], childPids: [] },
      { eligible: false, listenerPids: [], childPids: [] },
    ];
    const killPids = vi.fn(async () => {});

    await expect(reclaimOrphanedEmbeddedPostgresListener(54329, {
      platform: "win32",
      inspect: vi.fn(async () => snapshots.shift() ?? { eligible: false, listenerPids: [], childPids: [] }),
      killPids,
      delay: vi.fn(async () => {}),
    })).resolves.toBe(true);

    expect(killPids).toHaveBeenCalledOnce();
    expect(killPids).toHaveBeenCalledWith([202, 303]);
  });

  it("does not touch a live or unverified listener owner", async () => {
    const killPids = vi.fn(async () => {});

    await expect(reclaimOrphanedEmbeddedPostgresListener(54329, {
      platform: "win32",
      inspect: vi.fn(async () => ({ eligible: false, listenerPids: [999], childPids: [202] })),
      killPids,
      delay: vi.fn(async () => {}),
    })).resolves.toBe(false);

    expect(killPids).not.toHaveBeenCalled();
  });
});
