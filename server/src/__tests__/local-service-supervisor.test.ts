import { spawn, type ChildProcess } from "node:child_process";
import { afterEach, describe, expect, it } from "vitest";
import {
  retainLiveLocalServiceRegistryRecords,
  terminateLocalService,
  type LocalServiceRegistryRecord,
} from "../services/local-service-supervisor.js";

function isPidAlive(pid: number) {
  try {
    process.kill(pid, 0);
    return true;
  } catch {
    return false;
  }
}

async function waitForPidExit(pid: number, timeoutMs = 5_000) {
  const deadline = Date.now() + timeoutMs;
  while (Date.now() < deadline) {
    if (!isPidAlive(pid)) return true;
    await new Promise((resolve) => setTimeout(resolve, 50));
  }
  return !isPidAlive(pid);
}

function serviceRecord(serviceKey: string, pid: number): LocalServiceRegistryRecord {
  return {
    version: 1,
    serviceKey,
    profileKind: "paperclip-dev",
    serviceName: serviceKey,
    command: "dev-runner.ts",
    cwd: process.cwd(),
    envFingerprint: "test",
    port: 3200,
    url: "http://127.0.0.1:3200",
    pid,
    processGroupId: null,
    provider: "local_process",
    runtimeServiceId: null,
    reuseKey: null,
    startedAt: "2026-01-01T00:00:00.000Z",
    lastSeenAt: "2026-01-01T00:00:00.000Z",
    metadata: null,
  };
}

describe("retainLiveLocalServiceRegistryRecords", () => {
  it("removes stale registry entries and returns only live services", async () => {
    const removed: string[] = [];
    const records = [serviceRecord("live", 101), serviceRecord("stale", 202)];

    const live = await retainLiveLocalServiceRegistryRecords(records, {
      isAlive: (pid) => pid === 101,
      remove: async (serviceKey) => { removed.push(serviceKey); },
    });

    expect(live.map((record) => record.serviceKey)).toEqual(["live"]);
    expect(removed).toEqual(["stale"]);
  });
});

describe.skipIf(process.platform !== "win32")("terminateLocalService on Windows", () => {
  const spawned: ChildProcess[] = [];

  afterEach(() => {
    for (const child of spawned) {
      if (child.pid && isPidAlive(child.pid)) {
        child.kill("SIGKILL");
      }
    }
    spawned.length = 0;
  });

  it("terminates the recorded process and its descendants", async () => {
    const parent = spawn(
      process.execPath,
      [
        "-e",
        [
          "const { spawn } = require('node:child_process');",
          "const child = spawn(process.execPath, ['-e', 'setInterval(() => {}, 1000)'], { stdio: 'ignore' });",
          "process.stdout.write(String(child.pid));",
          "setInterval(() => {}, 1000);",
        ].join(" "),
      ],
      { stdio: ["ignore", "pipe", "ignore"] },
    );
    spawned.push(parent);

    const descendantPid = await new Promise<number>((resolve, reject) => {
      const timer = setTimeout(() => reject(new Error("Timed out waiting for descendant PID")), 5_000);
      parent.stdout?.once("data", (chunk) => {
        clearTimeout(timer);
        resolve(Number.parseInt(String(chunk).trim(), 10));
      });
      parent.once("error", reject);
    });

    expect(parent.pid).toBeTypeOf("number");
    expect(descendantPid).toBeGreaterThan(0);

    await terminateLocalService({ pid: parent.pid!, processGroupId: null });

    expect(await waitForPidExit(parent.pid!)).toBe(true);
    expect(await waitForPidExit(descendantPid)).toBe(true);
  });
});
