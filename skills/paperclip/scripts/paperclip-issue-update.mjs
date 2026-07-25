#!/usr/bin/env node

import { readFile } from "node:fs/promises";

function usage() {
  console.log(`Usage:
  node scripts/paperclip-issue-update.mjs [options]

Updates the current Paperclip issue with a status and/or markdown comment.
This helper is intended for Windows-safe and cross-platform use without
ad-hoc PowerShell/curl command chains.

Required environment for live updates:
  PAPERCLIP_API_URL, PAPERCLIP_API_KEY, PAPERCLIP_RUN_ID

Options:
  --issue-id ID
  --status STATUS
  --comment TEXT
  --comment-file PATH
  --completion-evidence-file PATH
  --output FORMAT       json or body (default: body)
  --dry-run
  --help, -h

Reads stdin when piped and --comment/--comment-file are not provided.
`);
}

async function requestJson(method, url, { body, headers = {} } = {}) {
  const response = await fetch(url, {
    method,
    headers,
    body,
  });
  const text = await response.text();
  const data = text ? JSON.parse(text) : null;
  if (!response.ok) {
    throw new Error(`Request failed (${response.status}) ${method} ${url}\n${text}`);
  }
  return data;
}

async function readCommentFromStdin() {
  if (process.stdin.isTTY) return "";
  const chunks = [];
  for await (const chunk of process.stdin) chunks.push(chunk);
  return Buffer.concat(chunks.map((chunk) => Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk))).toString("utf8");
}

const args = process.argv.slice(2);
let issueId = process.env.PAPERCLIP_TASK_ID ?? "";
let status = "";
let comment = "";
let commentFile = "";
let completionEvidenceFile = "";
let completionEvidence = null;
let outputFormat = "body";
let dryRun = false;

for (let index = 0; index < args.length; index += 1) {
  const arg = args[index];
  if (arg === "--help" || arg === "-h") {
    usage();
    process.exit(0);
  }
  if (arg === "--issue-id") {
    issueId = args[++index] ?? "";
    continue;
  }
  if (arg === "--status") {
    status = args[++index] ?? "";
    continue;
  }
  if (arg === "--comment") {
    comment = args[++index] ?? "";
    continue;
  }
  if (arg === "--comment-file") {
    commentFile = args[++index] ?? "";
    continue;
  }
  if (arg === "--completion-evidence-file") {
    completionEvidenceFile = args[++index] ?? "";
    continue;
  }
  if (arg === "--output") {
    outputFormat = args[++index] ?? "";
    continue;
  }
  if (arg === "--dry-run") {
    dryRun = true;
    continue;
  }
  throw new Error(`Unknown argument: ${arg}`);
}

if (!issueId) throw new Error("Missing issue id. Pass --issue-id or set PAPERCLIP_TASK_ID.");

if (!comment && commentFile) {
  comment = await readFile(commentFile, "utf8");
}
if (!comment) {
  comment = await readCommentFromStdin();
}
if (completionEvidenceFile) {
  const parsed = JSON.parse(await readFile(completionEvidenceFile, "utf8"));
  if (!parsed || typeof parsed !== "object" || Array.isArray(parsed)) {
    throw new Error("--completion-evidence-file must contain a JSON object.");
  }
  completionEvidence = parsed;
}
if (status === "done" && !completionEvidence) {
  throw new Error("Agent done updates require --completion-evidence-file.");
}

const payload = {
  ...(status ? { status } : {}),
  ...(comment ? { comment } : {}),
  ...(completionEvidence ? { completionEvidence } : {}),
};

if (Object.keys(payload).length === 0) {
  throw new Error("Nothing to update. Pass --status, --comment, --comment-file, or pipe stdin.");
}

if (dryRun) {
  console.log(JSON.stringify({ issueId, payload }, null, 2));
  process.exit(0);
}

const apiBase = process.env.PAPERCLIP_API_URL;
const apiKey = process.env.PAPERCLIP_API_KEY;
const runId = process.env.PAPERCLIP_RUN_ID;
if (!apiBase || !apiKey || !runId) {
  throw new Error("Missing PAPERCLIP_API_URL, PAPERCLIP_API_KEY, or PAPERCLIP_RUN_ID.");
}

const result = await requestJson("PATCH", `${apiBase}/api/issues/${issueId}`, {
  headers: {
    Authorization: `Bearer ${apiKey}`,
    "X-Paperclip-Run-Id": runId,
    "Content-Type": "application/json",
  },
  body: JSON.stringify(payload),
});

if (outputFormat === "json") {
  console.log(JSON.stringify(result, null, 2));
  process.exit(0);
}

if (typeof result?.comment === "string" && result.comment.trim().length > 0) {
  console.log(result.comment);
} else {
  console.log(JSON.stringify(result, null, 2));
}
