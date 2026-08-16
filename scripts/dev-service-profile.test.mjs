import test from "node:test";
import assert from "node:assert/strict";
import { mkdir, mkdtemp, rm } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import {
  bootstrapRepoManagedDevServiceEnv,
  resolveDevRunnerPort,
} from "./dev-service-profile.ts";

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

test("resolveDevRunnerPort rejects invalid and out-of-range candidates", () => {
  assert.equal(resolveDevRunnerPort({ envPort: "invalid", configuredPort: 3200 }), 3200);
  assert.equal(resolveDevRunnerPort({ envPort: "70000", configuredPort: 0 }), 3100);
});

test("bootstrapRepoManagedDevServiceEnv preserves an explicit home", async () => {
  const root = await mkdtemp(path.join(os.tmpdir(), "paperclip-dev-service-explicit-"));
  const env = { PAPERCLIP_HOME: path.join(root, "explicit-home") };

  assert.equal(bootstrapRepoManagedDevServiceEnv(root, env), path.resolve(env.PAPERCLIP_HOME));
  assert.equal(env.PAPERCLIP_HOME, path.join(root, "explicit-home"));

  await rm(root, { recursive: true, force: true });
});

test("bootstrapRepoManagedDevServiceEnv selects the repository-managed runtime home", async () => {
  const root = await mkdtemp(path.join(os.tmpdir(), "paperclip-dev-service-managed-"));
  const managedHome = path.join(root, ".paperclip", "runtime", "home");
  await mkdir(managedHome, { recursive: true });
  const env = {};

  assert.equal(bootstrapRepoManagedDevServiceEnv(root, env), managedHome);
  assert.equal(env.PAPERCLIP_HOME, managedHome);

  await rm(root, { recursive: true, force: true });
});

test("bootstrapRepoManagedDevServiceEnv leaves generic checkouts unchanged", async () => {
  const root = await mkdtemp(path.join(os.tmpdir(), "paperclip-dev-service-generic-"));
  const env = {};

  assert.equal(bootstrapRepoManagedDevServiceEnv(root, env), null);
  assert.equal(env.PAPERCLIP_HOME, undefined);

  await rm(root, { recursive: true, force: true });
});
