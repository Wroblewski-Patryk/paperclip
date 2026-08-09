#!/usr/bin/env node
import { readFile } from "node:fs/promises";
import process from "node:process";
import { evaluateProtectedCredentialProofRecord } from "./lib/protected-access-lane-entry-contract.mjs";

const inputPath = process.argv[2];

if (!inputPath) {
  console.error("Usage: pnpm softwarehouse:credential-proof-preflight -- <proof-record.json>");
  process.exitCode = 2;
} else {
  try {
    const record = JSON.parse(await readFile(inputPath, "utf8"));
    const report = evaluateProtectedCredentialProofRecord(record);
    console.log(JSON.stringify(report, null, 2));
    process.exitCode = report.ready ? 0 : 1;
  } catch (error) {
    console.error(JSON.stringify({
      ready: false,
      decision: "blocked",
      reason: error instanceof Error ? error.message : String(error),
    }, null, 2));
    process.exitCode = 2;
  }
}
