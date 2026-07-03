import fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { afterEach, describe, expect, it, vi } from "vitest";
import { ensureSymlink, prepareManagedCodexHome } from "./codex-home.js";

function setPlatform(value: NodeJS.Platform): PropertyDescriptor | undefined {
  const originalPlatform = Object.getOwnPropertyDescriptor(process, "platform");
  Object.defineProperty(process, "platform", { value });
  return originalPlatform;
}

function restorePlatform(originalPlatform: PropertyDescriptor | undefined): void {
  if (originalPlatform) Object.defineProperty(process, "platform", originalPlatform);
}

describe("codex managed home", () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("treats concurrently-created auth materialization as success", async () => {
    const root = await fs.mkdtemp(path.join(os.tmpdir(), "paperclip-codex-home-"));
    const sharedCodexHome = path.join(root, "shared-codex-home");
    const paperclipHome = path.join(root, "paperclip-home");
    const managedCodexHome = path.join(
      paperclipHome,
      "instances",
      "default",
      "companies",
      "company-1",
      "codex-home",
    );
    const sharedAuth = path.join(sharedCodexHome, "auth.json");
    const managedAuth = path.join(managedCodexHome, "auth.json");

    await fs.mkdir(sharedCodexHome, { recursive: true });
    await fs.writeFile(sharedAuth, '{"token":"shared"}\n', "utf8");

    const originalSymlink = fs.symlink.bind(fs);
    vi.spyOn(fs, "symlink").mockImplementationOnce(async (source, target, type) => {
      await originalSymlink(source, target, type);
      const error = new Error("file already exists") as NodeJS.ErrnoException;
      error.code = "EEXIST";
      throw error;
    });

    try {
      await expect(
        prepareManagedCodexHome(
          {
            CODEX_HOME: sharedCodexHome,
            PAPERCLIP_HOME: paperclipHome,
            PAPERCLIP_INSTANCE_ID: "default",
          },
          async () => {},
          "company-1",
        ),
      ).resolves.toBe(managedCodexHome);

      const managedAuthStat = await fs.lstat(managedAuth);
      if (managedAuthStat.isSymbolicLink()) {
        expect(await fs.realpath(managedAuth)).toBe(await fs.realpath(sharedAuth));
      } else {
        await expect(fs.readFile(managedAuth, "utf8")).resolves.toBe('{"token":"shared"}\n');
      }
    } finally {
      await fs.rm(root, { recursive: true, force: true });
    }
  });

  it("copies auth.json when Windows blocks symlink creation", async () => {
    const root = await fs.mkdtemp(path.join(os.tmpdir(), "paperclip-codex-home-"));
    const sharedCodexHome = path.join(root, "shared-codex-home");
    const paperclipHome = path.join(root, "paperclip-home");
    const managedCodexHome = path.join(
      paperclipHome,
      "instances",
      "default",
      "companies",
      "company-1",
      "codex-home",
    );
    const sharedAuth = path.join(sharedCodexHome, "auth.json");
    const managedAuth = path.join(managedCodexHome, "auth.json");

    await fs.mkdir(sharedCodexHome, { recursive: true });
    await fs.writeFile(sharedAuth, '{"token":"shared"}\n', "utf8");

    const originalPlatform = setPlatform("win32");
    vi.spyOn(fs, "symlink").mockImplementationOnce(async () => {
      const error = new Error("operation not permitted") as NodeJS.ErrnoException;
      error.code = "EPERM";
      throw error;
    });

    try {
      await expect(
        prepareManagedCodexHome(
          {
            CODEX_HOME: sharedCodexHome,
            PAPERCLIP_HOME: paperclipHome,
            PAPERCLIP_INSTANCE_ID: "default",
          },
          async () => {},
          "company-1",
        ),
      ).resolves.toBe(managedCodexHome);

      expect((await fs.lstat(managedAuth)).isSymbolicLink()).toBe(false);
      await expect(fs.readFile(managedAuth, "utf8")).resolves.toBe('{"token":"shared"}\n');
    } finally {
      restorePlatform(originalPlatform);
      await fs.rm(root, { recursive: true, force: true });
    }
  });

  it("refreshes a raced-in auth symlink when it points elsewhere", async () => {
    const root = await fs.mkdtemp(path.join(os.tmpdir(), "paperclip-codex-home-"));
    const sharedCodexHome = path.join(root, "shared-codex-home");
    const paperclipHome = path.join(root, "paperclip-home");
    const managedCodexHome = path.join(
      paperclipHome,
      "instances",
      "default",
      "companies",
      "company-1",
      "codex-home",
    );
    const sharedAuth = path.join(sharedCodexHome, "auth.json");
    const wrongAuth = path.join(sharedCodexHome, "other-auth.json");
    const managedAuth = path.join(managedCodexHome, "auth.json");

    await fs.mkdir(sharedCodexHome, { recursive: true });
    await fs.writeFile(sharedAuth, '{"token":"shared"}\n', "utf8");
    await fs.writeFile(wrongAuth, '{"token":"other"}\n', "utf8");

    const originalSymlink = fs.symlink.bind(fs);
    vi.spyOn(fs, "symlink").mockImplementationOnce(async (_source, target, type) => {
      await originalSymlink(wrongAuth, target, type);
      const error = new Error("file already exists") as NodeJS.ErrnoException;
      error.code = "EEXIST";
      throw error;
    });

    try {
      await prepareManagedCodexHome(
        {
          CODEX_HOME: sharedCodexHome,
          PAPERCLIP_HOME: paperclipHome,
          PAPERCLIP_INSTANCE_ID: "default",
        },
        async () => {},
        "company-1",
      );

      expect(await fs.readFile(managedAuth, "utf8")).toBe('{"token":"shared"}\n');
    } finally {
      await fs.rm(root, { recursive: true, force: true });
    }
  });

  it("refreshes an existing regular auth.json from the shared Codex home", async () => {
    const root = await fs.mkdtemp(path.join(os.tmpdir(), "paperclip-codex-home-"));
    const sharedCodexHome = path.join(root, "shared-codex-home");
    const paperclipHome = path.join(root, "paperclip-home");
    const managedCodexHome = path.join(
      paperclipHome,
      "instances",
      "default",
      "companies",
      "company-1",
      "codex-home",
    );
    const sharedAuth = path.join(sharedCodexHome, "auth.json");
    const managedAuth = path.join(managedCodexHome, "auth.json");

    await fs.mkdir(sharedCodexHome, { recursive: true });
    await fs.mkdir(managedCodexHome, { recursive: true });
    await fs.writeFile(sharedAuth, '{"token":"shared"}\n', "utf8");
    await fs.writeFile(managedAuth, '{"OPENAI_API_KEY":"stale"}\n', "utf8");

    const originalPlatform = setPlatform("win32");
    vi.spyOn(fs, "symlink").mockImplementationOnce(async () => {
      await fs.writeFile(managedAuth, '{"OPENAI_API_KEY":"concurrent"}\n', "utf8");
      const error = new Error("file already exists") as NodeJS.ErrnoException;
      error.code = "EEXIST";
      throw error;
    });

    try {
      await expect(
        prepareManagedCodexHome(
          {
            CODEX_HOME: sharedCodexHome,
            PAPERCLIP_HOME: paperclipHome,
            PAPERCLIP_INSTANCE_ID: "default",
          },
          async () => {},
          "company-1",
        ),
      ).resolves.toBe(managedCodexHome);

      expect((await fs.lstat(managedAuth)).isSymbolicLink()).toBe(false);
      await expect(fs.readFile(managedAuth, "utf8")).resolves.toBe('{"token":"shared"}\n');
    } finally {
      restorePlatform(originalPlatform);
      await fs.rm(root, { recursive: true, force: true });
    }
  });

  it("leaves an equivalent regular auth.json in place without rewriting credentials", async () => {
    const root = await fs.mkdtemp(path.join(os.tmpdir(), "paperclip-codex-home-"));
    const sharedCodexHome = path.join(root, "shared-codex-home");
    const paperclipHome = path.join(root, "paperclip-home");
    const managedCodexHome = path.join(
      paperclipHome,
      "instances",
      "default",
      "companies",
      "company-1",
      "codex-home",
    );
    const sharedAuth = path.join(sharedCodexHome, "auth.json");
    const managedAuth = path.join(managedCodexHome, "auth.json");

    await fs.mkdir(sharedCodexHome, { recursive: true });
    await fs.mkdir(managedCodexHome, { recursive: true });
    await fs.writeFile(sharedAuth, '{"token":"shared"}\n', "utf8");
    await fs.writeFile(managedAuth, '{"token":"shared"}\n', "utf8");

    const symlinkSpy = vi.spyOn(fs, "symlink");
    const copySpy = vi.spyOn(fs, "copyFile");

    try {
      await expect(
        prepareManagedCodexHome(
          {
            CODEX_HOME: sharedCodexHome,
            PAPERCLIP_HOME: paperclipHome,
            PAPERCLIP_INSTANCE_ID: "default",
          },
          async () => {},
          "company-1",
        ),
      ).resolves.toBe(managedCodexHome);

      expect((await fs.lstat(managedAuth)).isSymbolicLink()).toBe(false);
      expect(symlinkSpy).not.toHaveBeenCalled();
      expect(copySpy).not.toHaveBeenCalled();
      await expect(fs.readFile(managedAuth, "utf8")).resolves.toBe('{"token":"shared"}\n');
    } finally {
      await fs.rm(root, { recursive: true, force: true });
    }
  });

  it("retries api-key auth.json replacement on transient Windows lock errors", async () => {
    const root = await fs.mkdtemp(path.join(os.tmpdir(), "paperclip-codex-home-"));
    const sharedCodexHome = path.join(root, "shared-codex-home");
    const paperclipHome = path.join(root, "paperclip-home");
    const managedCodexHome = path.join(
      paperclipHome,
      "instances",
      "default",
      "companies",
      "company-1",
      "codex-home",
    );
    const managedAuth = path.join(managedCodexHome, "auth.json");

    await fs.mkdir(sharedCodexHome, { recursive: true });

    const originalPlatform = setPlatform("win32");
    const rmSpy = vi.spyOn(fs, "rm");
    rmSpy.mockImplementationOnce(async () => {
      const error = new Error("resource busy") as NodeJS.ErrnoException;
      error.code = "EBUSY";
      throw error;
    });

    try {
      await expect(
        prepareManagedCodexHome(
          {
            CODEX_HOME: sharedCodexHome,
            PAPERCLIP_HOME: paperclipHome,
            PAPERCLIP_INSTANCE_ID: "default",
          },
          async () => {},
          "company-1",
          { apiKey: "key-123" },
        ),
      ).resolves.toBe(managedCodexHome);

      await expect(fs.readFile(managedAuth, "utf8")).resolves.toBe('{"OPENAI_API_KEY":"key-123"}');
      expect(rmSpy).toHaveBeenCalledTimes(2);
    } finally {
      restorePlatform(originalPlatform);
      await fs.rm(root, { recursive: true, force: true });
    }
  });

  it("fails closed for non-transient auth replacement errors", async () => {
    const root = await fs.mkdtemp(path.join(os.tmpdir(), "paperclip-codex-home-"));
    const sharedCodexHome = path.join(root, "shared-codex-home");
    const paperclipHome = path.join(root, "paperclip-home");

    await fs.mkdir(sharedCodexHome, { recursive: true });

    const originalPlatform = setPlatform("win32");
    vi.spyOn(fs, "rm").mockImplementationOnce(async () => {
      const error = new Error("permission denied") as NodeJS.ErrnoException;
      error.code = "EACCES";
      throw error;
    });

    try {
      await expect(
        prepareManagedCodexHome(
          {
            CODEX_HOME: sharedCodexHome,
            PAPERCLIP_HOME: paperclipHome,
            PAPERCLIP_INSTANCE_ID: "default",
          },
          async () => {},
          "company-1",
          { apiKey: "key-123" },
        ),
      ).rejects.toMatchObject({ code: "EACCES" });
    } finally {
      restorePlatform(originalPlatform);
      await fs.rm(root, { recursive: true, force: true });
    }
  });

  it("ensureSymlink: refreshes a stale regular file from the live source", async () => {
    const root = await fs.mkdtemp(path.join(os.tmpdir(), "paperclip-ensure-symlink-"));
    try {
      const source = path.join(root, "live-source.json");
      const target = path.join(root, "stale-target.json");
      await fs.writeFile(source, '{"token":"fresh"}', "utf8");
      await fs.writeFile(target, '{"token":"stale-from-copy"}', "utf8");

      await ensureSymlink(target, source);

      expect(await fs.readFile(target, "utf8")).toBe('{"token":"fresh"}');
    } finally {
      await fs.rm(root, { recursive: true, force: true });
    }
  });

  it("ensureSymlink: leaves an unexpected directory in place instead of throwing", async () => {
    const root = await fs.mkdtemp(path.join(os.tmpdir(), "paperclip-ensure-symlink-dir-"));
    try {
      const source = path.join(root, "live-source.json");
      const target = path.join(root, "unexpected-dir");
      await fs.writeFile(source, '{"token":"fresh"}', "utf8");
      await fs.mkdir(target);
      await fs.writeFile(path.join(target, "sentinel"), "keep-me", "utf8");

      await expect(ensureSymlink(target, source)).resolves.toBeUndefined();

      expect((await fs.lstat(target)).isDirectory()).toBe(true);
      expect(await fs.readFile(path.join(target, "sentinel"), "utf8")).toBe("keep-me");
    } finally {
      await fs.rm(root, { recursive: true, force: true });
    }
  });
});
