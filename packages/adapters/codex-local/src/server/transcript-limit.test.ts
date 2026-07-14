import { describe, expect, it } from "vitest";
import {
  createCodexTranscriptLimiter,
  limitCodexTranscriptText,
  normalizeCodexTranscriptCommandOutputMaxChars,
} from "./transcript-limit.js";

describe("Codex transcript command-output limits", () => {
  it("clips command output while preserving agent messages and valid JSONL", () => {
    const command = JSON.stringify({
      type: "item.completed",
      item: {
        type: "command_execution",
        command: "Get-Content generated.json",
        aggregated_output: `HEAD-${"x".repeat(12_000)}-TAIL`,
      },
    });
    const message = JSON.stringify({
      type: "item.completed",
      item: { type: "agent_message", text: "final answer stays intact" },
    });

    const output = limitCodexTranscriptText(`${command}\n${message}\n`, 4_000);
    const lines = output.trim().split("\n").map((line) => JSON.parse(line));
    expect(lines[0].item.aggregated_output).toContain("[paperclip clipped");
    expect(lines[0].item.aggregated_output).toContain("HEAD-");
    expect(lines[0].item.aggregated_output).toContain("-TAIL");
    expect(lines[0].item.aggregated_output.length).toBeLessThan(4_100);
    expect(lines[1].item.text).toBe("final answer stays intact");
  });

  it("buffers split JSONL events until a full line is available", () => {
    const limiter = createCodexTranscriptLimiter(4_000);
    const line = JSON.stringify({
      type: "item.completed",
      item: { type: "command_execution", aggregated_output: "x".repeat(8_000) },
    });
    expect(limiter.push(line.slice(0, 200))).toBe("");
    const output = limiter.push(`${line.slice(200)}\n`);
    expect(JSON.parse(output).item.aggregated_output).toContain("[paperclip clipped");
    expect(limiter.flush()).toBe("");
  });

  it("bounds configured limits", () => {
    expect(normalizeCodexTranscriptCommandOutputMaxChars(undefined)).toBe(50_000);
    expect(normalizeCodexTranscriptCommandOutputMaxChars(1)).toBe(4_000);
    expect(normalizeCodexTranscriptCommandOutputMaxChars(999_999)).toBe(250_000);
  });
});
