#!/usr/bin/env node

import { readFile } from "node:fs/promises";
import { pathToFileURL } from "node:url";
import {
  findByOrganizationalDedupeKey,
  normalizeApiCollection,
  prepareOrganizationalPayload,
} from "../../../scripts/lib/organizational-memory.mjs";

function usage() {
  console.log(`Usage:
  node paperclip-organizational-memory.mjs <record|observe> --input-file PATH --dedupe-key KEY [options]

Creates a deduplicated organizational record or observation. The JSON input uses
the normal Paperclip API payload. Current issue, project, goal, agent, run, and
provenance context are added when available.

Options:
  --company-id ID       Default: PAPERCLIP_COMPANY_ID
  --issue-id ID         Default: PAPERCLIP_TASK_ID
  --input-file PATH     Required JSON payload
  --dedupe-key KEY      Required stable, non-secret idempotency key
  --dry-run             Print the enriched payload without writing
  --help, -h
`);
}

function parseArgs(args) {
  const mode = args[0];
  const result = {
    mode,
    companyId: process.env.PAPERCLIP_COMPANY_ID ?? "",
    issueId: process.env.PAPERCLIP_TASK_ID ?? "",
    inputFile: "",
    dedupeKey: "",
    dryRun: false,
  };
  for (let index = 1; index < args.length; index += 1) {
    const arg = args[index];
    if (arg === "--help" || arg === "-h") return { help: true };
    if (arg === "--company-id") result.companyId = args[++index] ?? "";
    else if (arg === "--issue-id") result.issueId = args[++index] ?? "";
    else if (arg === "--input-file") result.inputFile = args[++index] ?? "";
    else if (arg === "--dedupe-key") result.dedupeKey = args[++index] ?? "";
    else if (arg === "--dry-run") result.dryRun = true;
    else throw new Error(`Unknown argument: ${arg}`);
  }
  return result;
}

async function requestJson(method, route, { body, apiBase, apiKey, runId, timeoutMs }) {
  const response = await fetch(`${apiBase.replace(/\/$/, "")}${route}`, {
    method,
    signal: AbortSignal.timeout(timeoutMs),
    headers: {
      "content-type": "application/json",
      ...(apiKey ? { authorization: `Bearer ${apiKey}` } : {}),
      ...(runId ? { "x-paperclip-run-id": runId } : {}),
    },
    body: body === undefined ? undefined : JSON.stringify(body),
  });
  const text = await response.text();
  let data = null;
  try {
    data = text ? JSON.parse(text) : null;
  } catch {
    throw new Error(`${method} ${route} returned non-JSON content (${response.status}).`);
  }
  if (!response.ok) throw new Error(`${method} ${route} failed with ${response.status}: ${text}`);
  return data;
}

export async function runOrganizationalMemoryCli(args = process.argv.slice(2)) {
  const options = parseArgs(args);
  if (options.help) {
    usage();
    return { action: "help" };
  }
  if (options.mode !== "record" && options.mode !== "observe") {
    throw new Error("First argument must be record or observe.");
  }
  if (!options.inputFile) throw new Error("Missing --input-file.");
  if (!options.dedupeKey) throw new Error("Missing --dedupe-key.");

  const apiBase = process.env.PAPERCLIP_API_URL ?? "http://127.0.0.1:3200";
  const apiKey = process.env.PAPERCLIP_API_KEY ?? "";
  const runId = process.env.PAPERCLIP_RUN_ID ?? "";
  const agentId = process.env.PAPERCLIP_AGENT_ID ?? "";
  const timeoutMs = Number(process.env.PAPERCLIP_MEMORY_REQUEST_TIMEOUT_MS ?? 30_000);
  const inputText = await readFile(options.inputFile, "utf8");
  const input = JSON.parse(inputText.replace(/^\uFEFF/, ""));
  const requestOptions = { apiBase, apiKey, runId, timeoutMs };

  let issue = null;
  if (options.issueId && !options.dryRun) {
    issue = await requestJson("GET", `/api/issues/${encodeURIComponent(options.issueId)}`, requestOptions);
  }
  const companyId = options.companyId || issue?.companyId || input.companyId;
  if (!companyId) throw new Error("Missing company id. Set PAPERCLIP_COMPANY_ID, pass --company-id, or provide issue context.");

  const payload = prepareOrganizationalPayload({
    mode: options.mode,
    payload: input,
    dedupeKey: options.dedupeKey,
    context: { issue, agentId, runId },
  });
  if (options.dryRun) {
    const result = { action: "dry_run", mode: options.mode, companyId, payload };
    console.log(JSON.stringify(result, null, 2));
    return result;
  }
  if (!apiKey || !runId) {
    throw new Error("Missing PAPERCLIP_API_KEY or PAPERCLIP_RUN_ID for a live write.");
  }

  const resource = options.mode === "record" ? "organizational-records" : "organizational-observations";
  const evidenceField = options.mode === "record" ? "evidence" : "provenance";
  const query = new URLSearchParams({ kind: payload.kind, limit: "500" });
  const existingItems = normalizeApiCollection(await requestJson(
    "GET",
    `/api/companies/${companyId}/${resource}?${query}`,
    requestOptions,
  ));
  const existing = findByOrganizationalDedupeKey(existingItems, options.dedupeKey, evidenceField);
  if (existing) {
    const result = { action: "existing", mode: options.mode, id: existing.id, kind: existing.kind };
    console.log(JSON.stringify(result, null, 2));
    return result;
  }

  const created = await requestJson(
    "POST",
    `/api/companies/${companyId}/${resource}`,
    { ...requestOptions, body: payload },
  );
  const result = { action: "created", mode: options.mode, id: created.id, kind: created.kind };
  console.log(JSON.stringify(result, null, 2));
  return result;
}

const isDirectRun = process.argv[1] && pathToFileURL(process.argv[1]).href === import.meta.url;
if (isDirectRun) {
  runOrganizationalMemoryCli().catch((error) => {
    console.error(error instanceof Error ? error.message : String(error));
    process.exitCode = 1;
  });
}
