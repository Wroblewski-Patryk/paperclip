import { HttpError } from "../errors.js";

const MAX_RESPONSE_BYTES = 32_768;
const MAX_ALLOWLIST_ENTRIES = 32;
const DEFAULT_TIMEOUT_MS = 15_000;

const DEFAULT_ALLOWED_URLS = Object.freeze([
  "https://example.com/",
  "https://soar.luckysparrow.ch/",
  "https://soar.luckysparrow.ch/api/build-info",
  "https://api.soar.luckysparrow.ch/health",
  "https://api.soar.luckysparrow.ch/ready",
  "https://roost.luckysparrow.ch/",
  "https://roost.luckysparrow.ch/api/build-info",
  "https://api.roost.luckysparrow.ch/health",
  "https://api.roost.luckysparrow.ch/ready",
  "https://test.wroblewskipatryk.pl/",
]);

export interface SoftwarehouseProjectTruthProbeResult {
  outcome: "response" | "network_error";
  url: string;
  httpStatus: number | null;
  contentType: string | null;
  body: string | null;
  error: {
    name: string;
    message: string;
    code: string | null;
  } | null;
}

export interface SoftwarehouseProjectTruthProbeOptions {
  fetchImpl?: typeof globalThis.fetch;
  timeoutMs?: number;
  allowedUrls?: Iterable<string>;
  extraAllowedUrls?: string | null;
}

function normalizedProbeUrl(value: string): string | null {
  try {
    const url = new URL(value);
    if (
      url.protocol !== "https:"
      || url.username
      || url.password
      || url.search
      || url.hash
    ) {
      return null;
    }
    return url.toString();
  } catch {
    return null;
  }
}

function safeOrigin(value: string): string {
  try {
    return new URL("/", new URL(value).origin).toString();
  } catch {
    return "invalid-url";
  }
}

function safeErrorText(value: unknown, maxLength: number): string {
  return String(value ?? "")
    .replace(/https?:\/\/[^\s)\]}>'"]+/gi, (url) => safeOrigin(url))
    .replace(/\b(authorization|cookie|password|secret|token|api[-_]?key)\s*[:=]\s*[^\s,;]+/gi, "$1=[redacted]")
    .replace(/\bbearer\s+[^\s,;]+/gi, "Bearer [redacted]")
    .slice(0, maxLength);
}

function safeError(error: unknown): SoftwarehouseProjectTruthProbeResult["error"] {
  const candidate = error as { name?: unknown; message?: unknown; code?: unknown; cause?: unknown };
  const cause = candidate?.cause as { code?: unknown; message?: unknown } | undefined;
  return {
    name: safeErrorText(candidate?.name || "Error", 80),
    message: safeErrorText(candidate?.message || cause?.message || "HTTPS request failed", 240),
    code: candidate?.code || cause?.code
      ? safeErrorText(candidate?.code || cause?.code, 80)
      : null,
  };
}

async function readBoundedText(response: Response): Promise<string> {
  if (!response.body?.getReader) {
    return Buffer.from(await response.text(), "utf8").subarray(0, MAX_RESPONSE_BYTES).toString("utf8");
  }

  const reader = response.body.getReader();
  const decoder = new TextDecoder();
  let byteCount = 0;
  let text = "";
  try {
    while (byteCount < MAX_RESPONSE_BYTES) {
      const { done, value } = await reader.read();
      if (done) break;
      const remaining = MAX_RESPONSE_BYTES - byteCount;
      const bounded = value.byteLength > remaining ? value.subarray(0, remaining) : value;
      byteCount += bounded.byteLength;
      text += decoder.decode(bounded, { stream: byteCount < MAX_RESPONSE_BYTES });
      if (bounded.byteLength < value.byteLength) break;
    }
  } finally {
    await reader.cancel().catch(() => {});
  }
  return text + decoder.decode();
}

export function resolveSoftwarehouseProjectTruthProbeAllowlist(
  extraAllowedUrls = process.env.PAPERCLIP_PROJECT_TRUTH_HTTPS_ALLOWLIST,
): ReadonlySet<string> {
  const candidates = [
    ...DEFAULT_ALLOWED_URLS,
    ...String(extraAllowedUrls ?? "").split(/[\r\n,;]+/).filter(Boolean),
  ];
  const allowed = new Set<string>();
  for (const candidate of candidates.slice(0, MAX_ALLOWLIST_ENTRIES)) {
    const normalized = normalizedProbeUrl(candidate.trim());
    if (normalized) allowed.add(normalized);
  }
  return allowed;
}

export async function probeSoftwarehouseProjectTruthHttps(
  value: string,
  options: SoftwarehouseProjectTruthProbeOptions = {},
): Promise<SoftwarehouseProjectTruthProbeResult> {
  const normalizedUrl = normalizedProbeUrl(value);
  const allowedUrls = options.allowedUrls
    ? new Set([...options.allowedUrls].map((url) => normalizedProbeUrl(url)).filter((url): url is string => Boolean(url)))
    : resolveSoftwarehouseProjectTruthProbeAllowlist(options.extraAllowedUrls ?? undefined);

  if (!normalizedUrl || !allowedUrls.has(normalizedUrl)) {
    throw new HttpError(403, "HTTPS probe target is not allowlisted");
  }

  const fetchImpl = options.fetchImpl ?? globalThis.fetch;
  const timeoutMs = Math.min(Math.max(options.timeoutMs ?? DEFAULT_TIMEOUT_MS, 1_000), DEFAULT_TIMEOUT_MS);
  const origin = safeOrigin(normalizedUrl);

  try {
    const response = await fetchImpl(normalizedUrl, {
      method: "GET",
      redirect: "manual",
      headers: {
        Accept: normalizedUrl.endsWith("/api/build-info") ? "application/json" : "*/*",
        "Cache-Control": "no-cache",
      },
      signal: AbortSignal.timeout(timeoutMs),
    });
    const contentType = response.headers.get("content-type")?.slice(0, 120) ?? null;
    const mayReadBody = normalizedUrl.endsWith("/api/build-info")
      && response.ok
      && Boolean(contentType?.toLowerCase().includes("application/json"));
    return {
      outcome: "response",
      url: origin,
      httpStatus: response.status,
      contentType,
      body: mayReadBody ? await readBoundedText(response) : null,
      error: null,
    };
  } catch (error) {
    return {
      outcome: "network_error",
      url: origin,
      httpStatus: null,
      contentType: null,
      body: null,
      error: safeError(error),
    };
  }
}
