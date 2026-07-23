import { readFile, mkdir, writeFile } from "node:fs/promises";
import {
  buildSnapshot,
  DEFAULT_MAX_SOURCE_AGE_MS,
  renderMarkdown,
} from "./lib/softwarehouse-readiness-snapshot.mjs";

const controlTickPath = "report/softwarehouse-control-tick.latest.json";
const jsonOutputPath = "report/softwarehouse-readiness-snapshot.latest.json";
const markdownOutputPath = "report/softwarehouse-readiness-snapshot.latest.md";

const raw = await readFile(controlTickPath, "utf8");
const packet = JSON.parse(raw);
const configuredMaxAgeMs = Number(
  process.env.SOFTWAREHOUSE_READINESS_SNAPSHOT_MAX_AGE_MS ?? DEFAULT_MAX_SOURCE_AGE_MS,
);
if (!Number.isFinite(configuredMaxAgeMs) || configuredMaxAgeMs <= 0) {
  throw new Error("SOFTWAREHOUSE_READINESS_SNAPSHOT_MAX_AGE_MS must be a positive number");
}
const snapshot = buildSnapshot(packet, { maxSourceAgeMs: configuredMaxAgeMs });

await mkdir("report", { recursive: true });
await writeFile(jsonOutputPath, `${JSON.stringify(snapshot, null, 2)}\n`);
await writeFile(markdownOutputPath, renderMarkdown(snapshot));

console.log(JSON.stringify({
  ok: !snapshot.stale,
  outputs: [jsonOutputPath, markdownOutputPath],
  snapshot,
}, null, 2));
if (snapshot.stale) process.exitCode = 1;
