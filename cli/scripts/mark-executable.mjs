import { chmod } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

const cliRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");

await chmod(path.join(cliRoot, "dist", "index.js"), 0o755);
