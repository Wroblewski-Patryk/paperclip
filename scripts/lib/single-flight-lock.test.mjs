import test from "node:test";
import assert from "node:assert/strict";
import os from "node:os";
import path from "node:path";
import { mkdtemp, mkdir, rm, writeFile } from "node:fs/promises";

import { acquireSingleFlightExecution } from "./single-flight-lock.mjs";

test("acquires and releases a fresh single-flight lock", async () => {
  const tempDir = await mkdtemp(path.join(os.tmpdir(), "paperclip-single-flight-"));
  try {
    const lockDir = path.join(tempDir, "lock");
    const execution = await acquireSingleFlightExecution({
      lockDir,
      reportPath: path.join(tempDir, "latest.json"),
      waitMs: 100,
      pollMs: 10,
      metadata: { label: "test" },
    });
    assert.equal(execution.mode, "leader");
    await execution.release();
  } finally {
    await rm(tempDir, { recursive: true, force: true });
  }
});

test("replaces a stale lock whose pid is no longer alive", async () => {
  const tempDir = await mkdtemp(path.join(os.tmpdir(), "paperclip-single-flight-"));
  try {
    const lockDir = path.join(tempDir, "lock");
    await mkdir(lockDir, { recursive: true });
    await writeFile(
      path.join(lockDir, "meta.json"),
      `${JSON.stringify({ pid: 999999, acquiredAt: "2026-01-01T00:00:00.000Z" })}\n`,
      "utf8",
    );

    const execution = await acquireSingleFlightExecution({
      lockDir,
      reportPath: path.join(tempDir, "latest.json"),
      waitMs: 100,
      pollMs: 10,
    });
    assert.equal(execution.mode, "leader");
    assert.equal(execution.metadata.pid, process.pid);
    await execution.release();
  } finally {
    await rm(tempDir, { recursive: true, force: true });
  }
});

test("follower waits for leader completion and reuses the latest report", async () => {
  const tempDir = await mkdtemp(path.join(os.tmpdir(), "paperclip-single-flight-"));
  try {
    const lockDir = path.join(tempDir, "lock");
    const reportPath = path.join(tempDir, "latest.json");
    const leader = await acquireSingleFlightExecution({
      lockDir,
      reportPath,
      waitMs: 500,
      pollMs: 10,
    });
    assert.equal(leader.mode, "leader");

    const followerPromise = acquireSingleFlightExecution({
      lockDir,
      reportPath,
      waitMs: 1_000,
      pollMs: 10,
    });

    setTimeout(async () => {
      await writeFile(
        reportPath,
        `${JSON.stringify({ generatedAt: "2026-06-02T03:45:00.000Z", controlDecision: "supervise_active_runs" })}\n`,
        "utf8",
      );
      await leader.release();
    }, 50);

    const follower = await followerPromise;
    assert.equal(follower.mode, "follower");
    assert.equal(follower.reusedReport?.generatedAt, "2026-06-02T03:45:00.000Z");
    assert.equal(follower.reusedReport?.controlDecision, "supervise_active_runs");
    assert.ok((follower.waitedMs ?? 0) >= 0);
  } finally {
    await rm(tempDir, { recursive: true, force: true });
  }
});

test("follower timeout remains strict by default", async () => {
  const tempDir = await mkdtemp(path.join(os.tmpdir(), "paperclip-single-flight-"));
  try {
    const lockDir = path.join(tempDir, "lock");
    const reportPath = path.join(tempDir, "latest.json");
    const leader = await acquireSingleFlightExecution({
      lockDir,
      reportPath,
      waitMs: 500,
      pollMs: 10,
    });
    assert.equal(leader.mode, "leader");

    await writeFile(
      reportPath,
      `${JSON.stringify({ generatedAt: "2026-06-02T03:45:00.000Z", controlDecision: "old" })}\n`,
      "utf8",
    );

    await assert.rejects(
      acquireSingleFlightExecution({
        lockDir,
        reportPath,
        waitMs: 20,
        pollMs: 10,
      }),
      /Timed out waiting 20ms for active single-flight run to finish/,
    );

    await leader.release();
  } finally {
    await rm(tempDir, { recursive: true, force: true });
  }
});

test("follower can reuse a stale report on timeout when explicitly allowed", async () => {
  const tempDir = await mkdtemp(path.join(os.tmpdir(), "paperclip-single-flight-"));
  try {
    const lockDir = path.join(tempDir, "lock");
    const reportPath = path.join(tempDir, "latest.json");
    const leader = await acquireSingleFlightExecution({
      lockDir,
      reportPath,
      waitMs: 500,
      pollMs: 10,
    });
    assert.equal(leader.mode, "leader");

    await writeFile(
      reportPath,
      `${JSON.stringify({ generatedAt: "2026-06-02T03:45:00.000Z", controlDecision: "old" })}\n`,
      "utf8",
    );

    const follower = await acquireSingleFlightExecution({
      lockDir,
      reportPath,
      waitMs: 20,
      pollMs: 10,
      reuseReportOnTimeout: true,
    });

    assert.equal(follower.mode, "follower");
    assert.equal(follower.waitTimedOut, true);
    assert.equal(follower.reusedReport?.controlDecision, "old");
    assert.ok((follower.waitedMs ?? 0) >= 20);

    await leader.release();
  } finally {
    await rm(tempDir, { recursive: true, force: true });
  }
});
