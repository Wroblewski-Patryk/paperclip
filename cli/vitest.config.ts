import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    environment: "node",
    hookTimeout: process.platform === "win32" ? 60_000 : 10_000,
  },
});
