import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    environment: "node",
    // Embedded PostgreSQL cleanup owns and drains an exact process tree. Under
    // sustained sequential load on Windows, late io_worker reparenting can keep
    // a healthy teardown above one minute, so the project-level value must
    // match the stable runner's bounded Windows allowance.
    hookTimeout: process.platform === "win32" ? 180_000 : 10_000,
    testTimeout: process.platform === "win32" ? 15_000 : 5_000,
    isolate: true,
    maxConcurrency: 1,
    maxWorkers: 1,
    minWorkers: 1,
    pool: "forks",
    poolOptions: {
      forks: {
        isolate: true,
        maxForks: 1,
        minForks: 1,
      },
    },
    sequence: {
      concurrent: false,
      hooks: "list",
    },
    setupFiles: ["./src/__tests__/setup-supertest.ts"],
  },
});
