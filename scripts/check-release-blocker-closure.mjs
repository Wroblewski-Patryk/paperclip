#!/usr/bin/env node
import { readFile } from "node:fs/promises";
import process from "node:process";
import {
  evaluateReleaseBlockerClosureRecord,
  evaluateReleaseBlockerRetirement,
} from "./lib/release-blocker-closure-contract.mjs";

const inputPath = process.argv[2];

if (!inputPath) {
  console.error("Usage: pnpm softwarehouse:release-blocker-preflight -- <closure-packet.json>");
  process.exitCode = 2;
} else {
  try {
    const input = JSON.parse(await readFile(inputPath, "utf8"));
    const closurePacket = input.closurePacket ?? input;
    const report = {
      contractVersion: "release-blocker-closure:v1",
      sourceIssue: input.sourceIssue ?? null,
      observedReferences: Array.isArray(input.observedReferences) ? input.observedReferences : [],
      closure: evaluateReleaseBlockerClosureRecord(closurePacket),
      retirement: input.retirement
        ? evaluateReleaseBlockerRetirement({
            observedReferences: input.observedReferences,
            ...input.retirement,
          })
        : null,
    };
    console.log(JSON.stringify(report, null, 2));
    process.exitCode = report.closure.ready ? 0 : 1;
  } catch (error) {
    console.error(JSON.stringify({
      ready: false,
      decision: "blocked",
      reason: error instanceof Error ? error.message : String(error),
    }, null, 2));
    process.exitCode = 2;
  }
}
