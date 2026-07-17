import { mkdtemp, mkdir, rm, writeFile } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { afterEach, describe, expect, it } from "vitest";

import { createLocalFileRunLogStore } from "../services/run-log-store.js";

const tempRoots: string[] = [];

async function tempRoot(name: string) {
  const root = await mkdtemp(path.join(os.tmpdir(), `paperclip-${name}-`));
  tempRoots.push(root);
  return root;
}

afterEach(async () => {
  await Promise.all(tempRoots.splice(0).map((root) => rm(root, { recursive: true, force: true })));
});

describe("local run log store", () => {
  it("reads a historical log from a bounded fallback root", async () => {
    const primary = await tempRoot("run-log-primary");
    const fallback = await tempRoot("run-log-fallback");
    const logRef = path.join("company", "agent", "historical.ndjson");
    const fallbackFile = path.join(fallback, logRef);
    await mkdir(path.dirname(fallbackFile), { recursive: true });
    await writeFile(fallbackFile, "historical-log", "utf8");

    const store = createLocalFileRunLogStore(primary, [fallback]);
    const result = await store.read({ store: "local_file", logRef });

    expect(result.content).toBe("historical-log");
    expect(result.nextOffset).toBeUndefined();
  });

  it("prefers the active run-log root when both roots contain the same ref", async () => {
    const primary = await tempRoot("run-log-primary");
    const fallback = await tempRoot("run-log-fallback");
    const logRef = path.join("company", "agent", "current.ndjson");
    for (const [root, content] of [[primary, "current"], [fallback, "historical"]] as const) {
      const file = path.join(root, logRef);
      await mkdir(path.dirname(file), { recursive: true });
      await writeFile(file, content, "utf8");
    }

    const store = createLocalFileRunLogStore(primary, [fallback]);
    const result = await store.read({ store: "local_file", logRef });

    expect(result.content).toBe("current");
  });
});
