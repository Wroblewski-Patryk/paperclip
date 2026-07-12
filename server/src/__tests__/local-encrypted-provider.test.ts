import { randomBytes } from "node:crypto";
import { mkdirSync, rmSync, writeFileSync } from "node:fs";
import os from "node:os";
import path from "node:path";
import { afterEach, describe, expect, it, vi } from "vitest";

const { execFileSyncMock } = vi.hoisted(() => ({
  execFileSyncMock: vi.fn(),
}));

vi.mock("node:child_process", () => ({
  execFileSync: execFileSyncMock,
}));

import { localEncryptedProvider } from "../secrets/local-encrypted-provider.js";

describe("local encrypted provider Windows ACL health probe", () => {
  const previousPlatform = process.platform;
  const previousKeyFile = process.env.PAPERCLIP_SECRETS_MASTER_KEY_FILE;
  const previousMasterKey = process.env.PAPERCLIP_SECRETS_MASTER_KEY;
  const tmpDirs: string[] = [];

  afterEach(() => {
    Object.defineProperty(process, "platform", {
      value: previousPlatform,
      configurable: true,
    });
    if (previousKeyFile === undefined) {
      delete process.env.PAPERCLIP_SECRETS_MASTER_KEY_FILE;
    } else {
      process.env.PAPERCLIP_SECRETS_MASTER_KEY_FILE = previousKeyFile;
    }
    if (previousMasterKey === undefined) {
      delete process.env.PAPERCLIP_SECRETS_MASTER_KEY;
    } else {
      process.env.PAPERCLIP_SECRETS_MASTER_KEY = previousMasterKey;
    }
    execFileSyncMock.mockReset();
    for (const dir of tmpDirs.splice(0)) {
      rmSync(dir, { recursive: true, force: true });
    }
  });

  it("passes the key path to PowerShell through a named parameter", async () => {
    Object.defineProperty(process, "platform", {
      value: "win32",
      configurable: true,
    });

    const dir = path.join(os.tmpdir(), `paperclip-local-encrypted-${randomBytes(6).toString("hex")}`);
    tmpDirs.push(dir);
    mkdirSync(dir, { recursive: true });
    const keyFile = path.join(dir, "master.key");
    writeFileSync(keyFile, randomBytes(32).toString("base64"), "utf8");
    process.env.PAPERCLIP_SECRETS_MASTER_KEY_FILE = keyFile;
    delete process.env.PAPERCLIP_SECRETS_MASTER_KEY;

    execFileSyncMock.mockReturnValue(
      JSON.stringify({
        currentUserSid: "S-1-5-21-test-user",
        entries: [
          {
            sid: "S-1-5-21-test-user",
            identity: "EXAMPLE\\agent",
            type: "Allow",
            rights: "FullControl",
            inherited: false,
          },
          {
            sid: "S-1-5-18",
            identity: "NT AUTHORITY\\SYSTEM",
            type: "Allow",
            rights: "FullControl",
            inherited: false,
          },
          {
            sid: "S-1-5-32-544",
            identity: "BUILTIN\\Administrators",
            type: "Allow",
            rights: "FullControl",
            inherited: false,
          },
        ],
      }),
    );

    const health = await localEncryptedProvider.healthCheck();

    expect(health.status).toBe("ok");
    expect(health.warnings ?? []).toEqual([]);
    expect(execFileSyncMock).toHaveBeenCalledTimes(1);
    expect(execFileSyncMock).toHaveBeenCalledWith(
      "powershell",
      expect.arrayContaining([
        "-NoProfile",
        "-Command",
        expect.stringContaining("& {"),
        expect.stringContaining("param([string]$KeyPath)"),
        expect.stringContaining(`} '${keyFile.replace(/'/g, "''")}'`),
      ]),
      expect.objectContaining({
        encoding: "utf8",
        stdio: ["ignore", "pipe", "ignore"],
      }),
    );
  });
});
