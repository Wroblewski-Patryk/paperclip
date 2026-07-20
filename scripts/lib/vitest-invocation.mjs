import path from "node:path";

export function buildVitestInvocation(repoRoot, args, options = {}) {
  const nodeExecutable = options.nodeExecutable ?? process.execPath;
  const vitestEntrypoint = options.vitestEntrypoint
    ?? path.join(repoRoot, "node_modules", "vitest", "vitest.mjs");

  return {
    command: nodeExecutable,
    args: [vitestEntrypoint, "run", ...args],
    shell: false,
  };
}

export function chunkItems(items, batchSize) {
  if (!Number.isInteger(batchSize) || batchSize < 1) {
    throw new TypeError(`batchSize must be a positive integer. Received ${batchSize}.`);
  }

  const chunks = [];
  for (let index = 0; index < items.length; index += batchSize) {
    chunks.push(items.slice(index, index + batchSize));
  }
  return chunks;
}
