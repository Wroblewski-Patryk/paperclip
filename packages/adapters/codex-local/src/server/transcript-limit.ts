const DEFAULT_MAX_COMMAND_OUTPUT_CHARS = 50_000;
const MIN_MAX_COMMAND_OUTPUT_CHARS = 4_000;
const MAX_MAX_COMMAND_OUTPUT_CHARS = 250_000;
const REDACTED_BROWSER_TOOL_VALUE = "***REDACTED_BROWSER_TOOL_PAYLOAD***";
const SENSITIVE_BROWSER_TOOL_NAMES = new Set([
  "browser_run_code",
  "browser_run_code_unsafe",
]);
const SAFE_BROWSER_TOOL_ITEM_FIELDS = [
  "id",
  "type",
  "server",
  "tool",
  "status",
] as const;

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function isSensitiveBrowserToolItem(item: Record<string, unknown>): boolean {
  const tool = item.tool;
  if (item.type !== "mcp_tool_call" || typeof tool !== "string") return false;
  return [...SENSITIVE_BROWSER_TOOL_NAMES].some(
    (sensitiveTool) => tool === sensitiveTool || tool.endsWith(`__${sensitiveTool}`),
  );
}

function redactSensitiveBrowserToolEvent(
  event: Record<string, unknown>,
  item: Record<string, unknown>,
): string {
  const nextItem: Record<string, unknown> = {};
  for (const key of SAFE_BROWSER_TOOL_ITEM_FIELDS) {
    if (item[key] !== undefined) nextItem[key] = item[key];
  }
  nextItem.arguments = {
    redacted: true,
    reason: REDACTED_BROWSER_TOOL_VALUE,
  };
  if (item.result !== null && item.result !== undefined) {
    nextItem.result = {
      redacted: true,
      reason: REDACTED_BROWSER_TOOL_VALUE,
    };
  }
  if (item.error !== null && item.error !== undefined) {
    nextItem.error = REDACTED_BROWSER_TOOL_VALUE;
  }

  return JSON.stringify({
    type: typeof event.type === "string" ? event.type : "paperclip.security_redaction",
    item: nextItem,
  });
}

/**
 * Codex JSONL repeats MCP tool arguments in both item.started and
 * item.completed events. Playwright's run-code tools accept arbitrary source,
 * so their arguments, result, and diagnostics must be treated as potentially
 * secret-bearing and withheld before Paperclip persists the transcript.
 */
export function redactCodexBrowserToolJsonlLine(line: string): string {
  if (!line.trim()) return line;
  try {
    const event = JSON.parse(line) as Record<string, unknown>;
    if (!isRecord(event.item) || !isSensitiveBrowserToolItem(event.item)) return line;

    return redactSensitiveBrowserToolEvent(event, event.item);
  } catch {
    // A malformed or truncated event that names an unsafe browser tool cannot
    // be safely classified. Fail closed instead of persisting its raw source.
    if ([...SENSITIVE_BROWSER_TOOL_NAMES].some((tool) => line.includes(tool))) {
      return JSON.stringify({
        type: "paperclip.security_redaction",
        message: REDACTED_BROWSER_TOOL_VALUE,
      });
    }
    return line;
  }
}

function clippedText(value: string, maxChars: number): string {
  if (value.length <= maxChars) return value;
  const tailChars = Math.min(5_000, Math.floor(maxChars / 5));
  const headChars = maxChars - tailChars;
  const removed = value.length - headChars - tailChars;
  return `${value.slice(0, headChars)}\n[paperclip clipped ${removed} command-output chars]\n${value.slice(-tailChars)}`;
}

export function normalizeCodexTranscriptCommandOutputMaxChars(value: unknown): number {
  const parsed = typeof value === "number" ? value : Number(value);
  if (!Number.isFinite(parsed)) return DEFAULT_MAX_COMMAND_OUTPUT_CHARS;
  return Math.min(MAX_MAX_COMMAND_OUTPUT_CHARS, Math.max(MIN_MAX_COMMAND_OUTPUT_CHARS, Math.floor(parsed)));
}

export function limitCodexTranscriptJsonlLine(line: string, maxCommandOutputChars: number): string {
  if (!line.trim()) return line;
  const redactedLine = redactCodexBrowserToolJsonlLine(line);
  try {
    const event = JSON.parse(redactedLine) as Record<string, unknown>;
    const item = event.item;
    if (!item || typeof item !== "object" || Array.isArray(item)) return redactedLine;
    const itemRecord = item as Record<string, unknown>;
    if (itemRecord.type !== "command_execution") return redactedLine;

    const nextItem = { ...itemRecord };
    let changed = false;
    for (const key of ["aggregated_output", "output"] as const) {
      const value = nextItem[key];
      if (typeof value !== "string" || value.length <= maxCommandOutputChars) continue;
      nextItem[key] = clippedText(value, maxCommandOutputChars);
      changed = true;
    }
    if (typeof nextItem.command === "string" && nextItem.command.length > 16_000) {
      nextItem.command = clippedText(nextItem.command, 16_000);
      changed = true;
    }
    return changed ? JSON.stringify({ ...event, item: nextItem }) : redactedLine;
  } catch {
    return redactedLine;
  }
}

export function createCodexTranscriptLimiter(maxCommandOutputChars: number) {
  const normalizedMax = normalizeCodexTranscriptCommandOutputMaxChars(maxCommandOutputChars);
  let buffered = "";

  return {
    push(chunk: string): string {
      buffered += chunk;
      const lines = buffered.split("\n");
      buffered = lines.pop() ?? "";
      return lines.map((line) => `${limitCodexTranscriptJsonlLine(line, normalizedMax)}\n`).join("");
    },
    flush(): string {
      const tail = buffered;
      buffered = "";
      return tail ? limitCodexTranscriptJsonlLine(tail, normalizedMax) : "";
    },
  };
}

export function limitCodexTranscriptText(text: string, maxCommandOutputChars: number): string {
  const limiter = createCodexTranscriptLimiter(maxCommandOutputChars);
  return `${limiter.push(text)}${limiter.flush()}`;
}
