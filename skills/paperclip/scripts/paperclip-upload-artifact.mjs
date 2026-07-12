#!/usr/bin/env node

import { basename } from "node:path";
import { openAsBlob } from "node:fs";
import { access } from "node:fs/promises";

function usage() {
  console.log(`Usage:
  node scripts/paperclip-upload-artifact.mjs FILE [options]

Uploads a generated file to the current Paperclip issue and creates an
attachment-backed artifact work product by default. This helper is intended
for Windows-safe and cross-platform use without ad-hoc PowerShell/curl chains.

Required environment for live uploads:
  PAPERCLIP_API_URL, PAPERCLIP_API_KEY, PAPERCLIP_COMPANY_ID, PAPERCLIP_TASK_ID, PAPERCLIP_RUN_ID

Optional environment:
  PAPERCLIP_ARTIFACT_UPLOAD_TIMEOUT_MS (default: 120000)

Options:
  --issue-id ID
  --company-id ID
  --title TEXT
  --summary TEXT
  --content-type TYPE
  --status STATUS
  --no-work-product
  --no-primary
  --output FORMAT       markdown or json (default: markdown)
  --dry-run
  --help, -h
`);
}

function detectContentType(filePath) {
  const lower = filePath.toLowerCase();
  if (lower.endsWith(".mp4") || lower.endsWith(".m4v")) return "video/mp4";
  if (lower.endsWith(".webm")) return "video/webm";
  if (lower.endsWith(".mov") || lower.endsWith(".qt")) return "video/quicktime";
  if (lower.endsWith(".png")) return "image/png";
  if (lower.endsWith(".jpg") || lower.endsWith(".jpeg")) return "image/jpeg";
  if (lower.endsWith(".gif")) return "image/gif";
  if (lower.endsWith(".webp")) return "image/webp";
  if (lower.endsWith(".svg")) return "image/svg+xml";
  if (lower.endsWith(".pdf")) return "application/pdf";
  if (lower.endsWith(".txt") || lower.endsWith(".log")) return "text/plain";
  if (lower.endsWith(".md") || lower.endsWith(".markdown")) return "text/markdown";
  if (lower.endsWith(".json")) return "application/json";
  if (lower.endsWith(".csv")) return "text/csv";
  if (lower.endsWith(".html") || lower.endsWith(".htm")) return "text/html";
  if (lower.endsWith(".zip")) return "application/zip";
  return "application/octet-stream";
}

function resolveRequestTimeoutMs(raw) {
  const parsed = Number.parseInt(raw ?? "", 10);
  return Number.isInteger(parsed) && parsed > 0 ? parsed : 120_000;
}

const requestTimeoutMs = resolveRequestTimeoutMs(process.env.PAPERCLIP_ARTIFACT_UPLOAD_TIMEOUT_MS);

async function requestJson(method, url, { body, headers = {} } = {}) {
  let response;
  try {
    response = await fetch(url, {
      method,
      headers,
      body,
      signal: AbortSignal.timeout(requestTimeoutMs),
    });
  } catch (error) {
    if (error?.name === "TimeoutError" || error?.name === "AbortError") {
      throw new Error(`Request timed out after ${requestTimeoutMs}ms: ${method} ${url}`);
    }
    throw error;
  }

  const text = await response.text();
  const data = text ? JSON.parse(text) : null;
  if (!response.ok) {
    throw new Error(`Request failed (${response.status}) ${method} ${url}\n${text}`);
  }
  return data;
}

const args = process.argv.slice(2);
let filePath = "";
let issueId = process.env.PAPERCLIP_TASK_ID ?? "";
let companyId = process.env.PAPERCLIP_COMPANY_ID ?? "";
let title = "";
let summary = "";
let contentType = "";
let status = "ready_for_review";
let createWorkProduct = true;
let isPrimary = true;
let outputFormat = "markdown";
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
  if (arg === "--company-id") {
    companyId = args[++index] ?? "";
    continue;
  }
  if (arg === "--title") {
    title = args[++index] ?? "";
    continue;
  }
  if (arg === "--summary") {
    summary = args[++index] ?? "";
    continue;
  }
  if (arg === "--content-type") {
    contentType = args[++index] ?? "";
    continue;
  }
  if (arg === "--status") {
    status = args[++index] ?? "";
    continue;
  }
  if (arg === "--no-work-product") {
    createWorkProduct = false;
    continue;
  }
  if (arg === "--no-primary") {
    isPrimary = false;
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
  if (arg.startsWith("--")) {
    throw new Error(`Unknown argument: ${arg}`);
  }
  if (filePath) {
    throw new Error(`Unexpected positional argument: ${arg}`);
  }
  filePath = arg;
}

if (!filePath) throw new Error("Missing FILE argument.");
await access(filePath);

if (!title) title = basename(filePath);
if (!contentType) contentType = detectContentType(filePath);

const apiBase = process.env.PAPERCLIP_API_URL;
const apiKey = process.env.PAPERCLIP_API_KEY;
const runId = process.env.PAPERCLIP_RUN_ID;

const resolved = {
  filePath,
  issueId,
  companyId,
  title,
  summary,
  contentType,
  status,
  createWorkProduct,
  isPrimary,
  outputFormat,
};

if (dryRun) {
  console.log(JSON.stringify(resolved, null, 2));
  process.exit(0);
}

if (!apiBase || !apiKey || !runId) {
  throw new Error("Missing PAPERCLIP_API_URL, PAPERCLIP_API_KEY, or PAPERCLIP_RUN_ID.");
}
if (!companyId || !issueId) {
  throw new Error("Missing company or issue id. Set PAPERCLIP_COMPANY_ID / PAPERCLIP_TASK_ID or pass flags.");
}

const authHeaders = {
  Authorization: `Bearer ${apiKey}`,
  "X-Paperclip-Run-Id": runId,
};

const form = new FormData();
const blob = await openAsBlob(filePath, { type: contentType });
form.set("file", blob, basename(filePath));

const attachment = await requestJson(
  "POST",
  `${apiBase}/api/companies/${companyId}/issues/${issueId}/attachments`,
  { body: form, headers: authHeaders },
);

let workProduct = null;
if (createWorkProduct) {
  workProduct = await requestJson(
    "POST",
    `${apiBase}/api/issues/${issueId}/work-products`,
    {
      headers: {
        ...authHeaders,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        type: "artifact",
        provider: "paperclip",
        title,
        status,
        reviewState: "needs_board_review",
        isPrimary,
        summary: summary || undefined,
        metadata: { attachmentId: attachment.id },
      }),
    },
  );
}

const result = {
  attachmentId: attachment.id,
  attachmentOpenPath: attachment.openPath ?? null,
  attachmentDownloadPath: attachment.downloadPath ?? null,
  workProductId: workProduct?.id ?? null,
  title,
  summary,
};

if (outputFormat === "json") {
  console.log(JSON.stringify(result, null, 2));
  process.exit(0);
}

const lines = [
  `Attachment: ${title}`,
  attachment.openPath ? `[Open attachment](${attachment.openPath})` : null,
  attachment.downloadPath ? `[Download attachment](${attachment.downloadPath})` : null,
  workProduct?.id ? `Work product id: ${workProduct.id}` : null,
];
console.log(lines.filter(Boolean).join("\n"));
