import assert from "node:assert/strict";
import test from "node:test";
import path from "node:path";

import { buildVitestInvocation, chunkItems } from "./vitest-invocation.mjs";

test("Vitest is invoked directly through Node without a Windows command shell", () => {
  const repoRoot = path.resolve("C:/workspace/paperclip");
  const excludes = Array.from(
    { length: 98 },
    (_, index) => `src/__tests__/route-${index}.test.ts`,
  ).flatMap((file) => ["--exclude", file]);
  const invocation = buildVitestInvocation(
    repoRoot,
    ["--project", "@paperclipai/server", ...excludes],
    {
      nodeExecutable: "C:/Program Files/nodejs/node.exe",
      vitestEntrypoint: "C:/workspace/paperclip/node_modules/vitest/vitest.mjs",
    },
  );

  assert.equal(invocation.command, "C:/Program Files/nodejs/node.exe");
  assert.equal(invocation.shell, false);
  assert.deepEqual(invocation.args.slice(0, 3), [
    "C:/workspace/paperclip/node_modules/vitest/vitest.mjs",
    "run",
    "--project",
  ]);
  assert.equal(invocation.args.length, 2 + 2 + excludes.length);
  assert.equal(invocation.args.at(-1), "src/__tests__/route-97.test.ts");
});

test("server suites are partitioned deterministically without loss or overlap", () => {
  const suites = Array.from({ length: 45 }, (_, index) => `suite-${index}`);
  const batches = chunkItems(suites, 20);

  assert.deepEqual(batches.map((batch) => batch.length), [20, 20, 5]);
  assert.deepEqual(batches.flat(), suites);
});

test("batch size must be a positive integer", () => {
  assert.throws(() => chunkItems(["suite"], 0), /positive integer/);
  assert.throws(() => chunkItems(["suite"], 1.5), /positive integer/);
});
