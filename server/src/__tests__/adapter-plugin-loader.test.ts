import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { afterEach, describe, expect, it, vi } from "vitest";
import { loadExternalAdapterPackage } from "../adapters/plugin-loader.js";

vi.mock("../middleware/logger.js", () => ({
  logger: {
    info: vi.fn(),
    warn: vi.fn(),
  },
}));

describe("adapter plugin loader", () => {
  const tempRoots: string[] = [];

  afterEach(() => {
    for (const tempRoot of tempRoots.splice(0)) {
      fs.rmSync(tempRoot, { recursive: true, force: true });
    }
  });

  it("loads adapter packages through file URLs from absolute local paths", async () => {
    const tempRoot = fs.mkdtempSync(path.join(os.tmpdir(), "paperclip-adapter-plugin-"));
    tempRoots.push(tempRoot);

    fs.writeFileSync(
      path.join(tempRoot, "package.json"),
      JSON.stringify({
        name: "@example/paperclip-test-adapter",
        type: "module",
        exports: {
          ".": "./index.mjs",
        },
      }),
    );
    fs.writeFileSync(
      path.join(tempRoot, "index.mjs"),
      [
        "export function createServerAdapter() {",
        "  return {",
        "    type: 'example_local',",
        "    displayName: 'Example',",
        "    invoke: async () => ({ status: 'succeeded' }),",
        "  };",
        "}",
      ].join("\n"),
    );

    const adapter = await loadExternalAdapterPackage("@example/paperclip-test-adapter", tempRoot);

    expect(adapter.type).toBe("example_local");
  });
});
