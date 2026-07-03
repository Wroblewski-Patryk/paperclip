import test from "node:test";
import assert from "node:assert/strict";
import { resolveDevRunnerPort } from "./dev-service-profile.ts";

test("resolveDevRunnerPort prefers explicit environment port values", () => {
  assert.equal(resolveDevRunnerPort({
    envPort: "3200",
    processEnvPort: "3101",
    configuredPort: 3102,
  }), 3200);
});

test("resolveDevRunnerPort uses the configured instance port when PORT is unset", () => {
  assert.equal(resolveDevRunnerPort({
    configuredPort: 3200,
  }), 3200);
});

test("resolveDevRunnerPort falls back to the default port when no override exists", () => {
  assert.equal(resolveDevRunnerPort({}), 3100);
});
