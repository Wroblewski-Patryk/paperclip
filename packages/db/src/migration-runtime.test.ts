import { mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { createServer } from "node:net";
import { tmpdir } from "node:os";
import path from "node:path";
import { afterEach, describe, expect, it } from "vitest";
import { resolveReusablePostmasterPid } from "./migration-runtime.js";

describe("resolveReusablePostmasterPid", () => {
  const tempDirs: string[] = [];

  afterEach(() => {
    for (const tempDir of tempDirs.splice(0)) {
      rmSync(tempDir, { recursive: true, force: true });
    }
  });

  it("rejects a recycled live PID when the recorded PostgreSQL port has no listener", async () => {
    const tempDir = mkdtempSync(path.join(tmpdir(), "paperclip-postmaster-pid-"));
    tempDirs.push(tempDir);
    const pidFile = path.join(tempDir, "postmaster.pid");
    const probe = createServer();
    await new Promise<void>((resolve) => probe.listen(0, "127.0.0.1", resolve));
    const address = probe.address();
    if (!address || typeof address === "string") throw new Error("Expected a TCP probe address");
    const unusedPort = address.port;
    await new Promise<void>((resolve, reject) => probe.close((error) => error ? reject(error) : resolve()));
    writeFileSync(pidFile, `${process.pid}\n${tempDir}\n0\n${unusedPort}\n`);

    await expect(resolveReusablePostmasterPid(pidFile, unusedPort)).resolves.toBeNull();
    expect(() => readFileSync(pidFile)).toThrow();
  });
});
