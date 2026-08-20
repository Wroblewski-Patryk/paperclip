import assert from "node:assert/strict";
import { access, mkdtemp, mkdir, readFile, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import test from "node:test";
import { preflightSourceControlCapability } from "./lib/source-control-capability-preflight.mjs";

test("preflight records capable sandbox branch when git metadata is writable", async () => {
  const root = await mkdtemp(path.join(tmpdir(), "paperclip-source-control-preflight-"));
  try {
    await mkdir(path.join(root, ".git"));
    const result = await preflightSourceControlCapability(root);
    assert.equal(result.capable, true);
    await assert.rejects(access(result.probePath));
  } finally {
    await rm(root, { recursive: true, force: true });
  }
});

test("preflight records native-routing branch when git metadata is unavailable", async () => {
  const root = await mkdtemp(path.join(tmpdir(), "paperclip-source-control-preflight-"));
  try {
    const result = await preflightSourceControlCapability(root);
    assert.equal(result.capable, false);
    assert.equal(result.reason, "git_metadata_probe_write_failed");
  } finally {
    await rm(root, { recursive: true, force: true });
  }
});

test("preflight never removes another git process' index lock", async () => {
  const root = await mkdtemp(path.join(tmpdir(), "paperclip-source-control-preflight-"));
  const gitDir = path.join(root, ".git");
  const lockPath = path.join(gitDir, "index.lock");
  try {
    await mkdir(gitDir);
    await writeFile(lockPath, "owned-by-another-process", "utf8");
    const result = await preflightSourceControlCapability(root);
    assert.equal(result.capable, true);
    assert.equal(await readFile(lockPath, "utf8"), "owned-by-another-process");
  } finally {
    await rm(root, { recursive: true, force: true });
  }
});
