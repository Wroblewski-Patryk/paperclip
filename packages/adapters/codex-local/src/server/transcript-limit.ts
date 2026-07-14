const DEFAULT_MAX_COMMAND_OUTPUT_CHARS = 50_000;
const MIN_MAX_COMMAND_OUTPUT_CHARS = 4_000;
const MAX_MAX_COMMAND_OUTPUT_CHARS = 250_000;

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
  try {
    const event = JSON.parse(line) as Record<string, unknown>;
    const item = event.item;
    if (!item || typeof item !== "object" || Array.isArray(item)) return line;
    const itemRecord = item as Record<string, unknown>;
    if (itemRecord.type !== "command_execution") return line;

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
    return changed ? JSON.stringify({ ...event, item: nextItem }) : line;
  } catch {
    return line;
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
