import { open, unlink } from "node:fs/promises";
import { randomUUID } from "node:crypto";
import path from "node:path";

export async function preflightSourceControlCapability(repoRoot) {
  const probePath = path.join(
    repoRoot,
    ".git",
    `paperclip-write-probe-${process.pid}-${randomUUID()}.tmp`,
  );
  let handle;
  let ownsProbe = false;
  try {
    handle = await open(probePath, "wx");
    ownsProbe = true;
    await handle.close();
    handle = null;
    await unlink(probePath);
    ownsProbe = false;
    return { capable: true, probePath, reason: "git_metadata_probe_create_and_remove_succeeded" };
  } catch (error) {
    if (handle) await handle.close().catch(() => {});
    if (ownsProbe) await unlink(probePath).catch(() => {});
    return {
      capable: false,
      probePath,
      reason: "git_metadata_probe_write_failed",
      error: error instanceof Error ? error.code ?? error.message : String(error),
    };
  }
}
