import fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { afterEach, describe, expect, it, vi } from "vitest";
import { prepareManagedCodexHome } from "./codex-home.js";

describe("codex managed home", () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it.skipIf(process.platform === "win32")("treats a concurrently-created expected auth symlink as success", async () => {
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

      expect((await fs.lstat(managedAuth)).isSymbolicLink()).toBe(true);
      expect(await fs.realpath(managedAuth)).toBe(await fs.realpath(sharedAuth));
    } finally {
      await fs.rm(root, { recursive: true, force: true });
    }
  });

  it("copies shared auth when the host refuses auth symlinks", async () => {
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

      const managedAuthStat = await fs.lstat(managedAuth);
      expect(managedAuthStat.isFile()).toBe(true);
      expect(managedAuthStat.isSymbolicLink()).toBe(false);
      expect(await fs.readFile(managedAuth, "utf8")).toBe('{"token":"shared"}\n');
    } finally {
      await fs.rm(root, { recursive: true, force: true });
    }
  });

  it("removes placeholder OPENAI_API_KEY when copying shared auth.json", async () => {
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
    await fs.writeFile(
      sharedAuth,
      JSON.stringify({
        OPENAI_API_KEY: "REPLACE_*************_KEY",
        tokens: { access_token: "legacy-token" },
      }),
      "utf8",
    );

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

      const raw = await fs.readFile(managedAuth, "utf8");
      const parsed = JSON.parse(raw) as Record<string, unknown>;
      expect(parsed.OPENAI_API_KEY).toBeUndefined();
      expect(parsed.tokens).toMatchObject({ access_token: "legacy-token" });
      expect((await fs.lstat(managedAuth)).isSymbolicLink()).toBe(false);
    } finally {
      await fs.rm(root, { recursive: true, force: true });
    }
  });

  it("sanitizes shared config.toml before seeding the managed Codex home", async () => {
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
    const sharedConfig = path.join(sharedCodexHome, "config.toml");
    const managedConfig = path.join(managedCodexHome, "config.toml");

    await fs.mkdir(sharedCodexHome, { recursive: true });
    await fs.writeFile(
      sharedConfig,
      [
        'model = "codex-mini-latest"',
        'notify = ["turn-ended"]',
        "",
        '[plugins."browser@openai-bundled"]',
        "enabled = true",
        "",
        "[marketplaces.openai-bundled]",
        'source = "local"',
        "",
        "[projects.'c:\\\\repo']",
        'trust_level = "trusted"',
      ].join("\n"),
      "utf8",
    );

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

      const managed = await fs.readFile(managedConfig, "utf8");
      expect(managed).toContain('model = "codex-mini-latest"');
      expect(managed).toContain("[projects.'c:\\\\repo']");
      expect(managed).not.toContain("notify =");
      expect(managed).not.toContain("[plugins.");
      expect(managed).not.toContain("[marketplaces.");
    } finally {
      await fs.rm(root, { recursive: true, force: true });
    }
  });
});
