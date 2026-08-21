import { describe, expect, it } from "vitest";
import {
  findProjectConcurrencyConflict,
  parseProjectConcurrencyScope,
  scopesCanRunConcurrently,
} from "./project-concurrency.js";

describe("project concurrency scopes", () => {
  it("fails closed when either issue has no explicit scope", () => {
    expect(findProjectConcurrencyConflict(null, {
      mode: "scoped", writePaths: ["ui/src"], readPaths: [], resources: [],
    })?.kind).toBe("unknown_scope");
  });

  it("allows disjoint frontend and backend writes", () => {
    const result = scopesCanRunConcurrently(
      { mode: "scoped", writePaths: ["ui/src"], readPaths: [], resources: ["feature:button-color"] },
      [{ mode: "scoped", writePaths: ["server/src"], readPaths: [], resources: ["feature:api-read"] }],
    );
    expect(result.compatible).toBe(true);
  });

  it("serializes write/write and write/read path overlap", () => {
    expect(findProjectConcurrencyConflict(
      { mode: "scoped", writePaths: ["server/src/routes"], readPaths: [], resources: [] },
      { mode: "scoped", writePaths: ["server/src"], readPaths: [], resources: [] },
    )?.kind).toBe("path_overlap");
    expect(findProjectConcurrencyConflict(
      { mode: "scoped", writePaths: ["packages/shared/src"], readPaths: [], resources: [] },
      { mode: "scoped", writePaths: [], readPaths: ["packages/shared/src/types"], resources: [] },
    )?.kind).toBe("path_overlap");
  });

  it("serializes shared functional resources even when files are disjoint", () => {
    expect(findProjectConcurrencyConflict(
      { mode: "scoped", writePaths: ["ui/src/login"], readPaths: [], resources: ["feature:login"] },
      { mode: "scoped", writePaths: ["server/src/auth"], readPaths: [], resources: ["feature:login"] },
    )?.kind).toBe("resource_overlap");
  });

  it("normalizes workspace-relative declarations from an execution policy", () => {
    expect(parseProjectConcurrencyScope({
      concurrency: {
        mode: "scoped",
        writePaths: ["./UI\\src/"],
        readPaths: [],
        resources: ["Feature Login"],
      },
    })).toEqual({
      mode: "scoped",
      writePaths: ["ui/src"],
      readPaths: [],
      resources: ["feature:login"],
    });
  });
});
