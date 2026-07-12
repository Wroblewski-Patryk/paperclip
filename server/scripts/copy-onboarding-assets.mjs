import { cp, mkdir } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

const serverRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const source = path.join(serverRoot, "src", "onboarding-assets");
const destination = path.join(serverRoot, "dist", "onboarding-assets");

await mkdir(destination, { recursive: true });
await cp(source, destination, { recursive: true, force: true });
