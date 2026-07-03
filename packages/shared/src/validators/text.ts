import { z } from "zod";

export function normalizeEscapedLineBreaks(value: string): string {
  return value
    .replace(/\u0000/g, "")
    .replace(/\\r\\n/g, "\n")
    .replace(/\\n/g, "\n")
    .replace(/\\r/g, "\n");
}

export const multilineTextSchema = z.string().transform(normalizeEscapedLineBreaks);
