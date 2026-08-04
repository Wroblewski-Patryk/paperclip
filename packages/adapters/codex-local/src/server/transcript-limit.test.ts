import { describe, expect, it } from "vitest";
import {
  createCodexTranscriptLimiter,
  limitCodexTranscriptText,
  normalizeCodexTranscriptCommandOutputMaxChars,
  redactCodexBrowserToolJsonlLine,
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

  it.each(["browser_run_code", "browser_run_code_unsafe"])(
    "withholds %s source, arguments, results, and error diagnostics",
    (tool) => {
      const syntheticMarker = "SYNTHETIC_BROWSER_SECRET_7f5f12";
      const event = JSON.stringify({
        type: "item.completed",
        diagnostic: `event diagnostic ${syntheticMarker}`,
        item: {
          id: "item-1",
          type: "mcp_tool_call",
          server: "playwright",
          tool,
          arguments: {
            code: `async (page) => { const password = "${syntheticMarker}"; return password; }`,
            headers: { authorization: `Bearer ${syntheticMarker}` },
            env: { PROTECTED_VALUE: syntheticMarker },
          },
          result: {
            content: [{ type: "text", text: `debug result ${syntheticMarker}` }],
          },
          error: `debug error ${syntheticMarker}`,
          source: `top-level source ${syntheticMarker}`,
          headers: { cookie: syntheticMarker },
          env: { PROTECTED_VALUE: syntheticMarker },
          diagnostics: [`item diagnostic ${syntheticMarker}`],
          status: "failed",
        },
      });

      const output = redactCodexBrowserToolJsonlLine(event);
      const parsed = JSON.parse(output);
      expect(output).not.toContain(syntheticMarker);
      expect(parsed.item).toMatchObject({
        id: "item-1",
        type: "mcp_tool_call",
        server: "playwright",
        tool,
        status: "failed",
        arguments: { redacted: true },
        result: { redacted: true },
      });
      expect(parsed.item.error).toBe("***REDACTED_BROWSER_TOOL_PAYLOAD***");
      expect(parsed).not.toHaveProperty("diagnostic");
      expect(parsed.item).not.toHaveProperty("source");
      expect(parsed.item).not.toHaveProperty("headers");
      expect(parsed.item).not.toHaveProperty("env");
      expect(parsed.item).not.toHaveProperty("diagnostics");
    },
  );

  it("withholds namespaced browser run-code tool payloads", () => {
    const syntheticMarker = "SYNTHETIC_NAMESPACED_SECRET_0c3bb2";
    const event = JSON.stringify({
      type: "item.completed",
      item: {
        type: "mcp_tool_call",
        server: "playwright",
        tool: "mcp__playwright__browser_run_code",
        arguments: { code: `return "${syntheticMarker}"` },
        status: "completed",
      },
    });

    const output = redactCodexBrowserToolJsonlLine(event);
    expect(output).not.toContain(syntheticMarker);
    expect(JSON.parse(output).item.arguments).toMatchObject({ redacted: true });
  });

  it("withholds a split browser run-code event before emitting any fragment", () => {
    const syntheticMarker = "SYNTHETIC_SPLIT_SECRET_32b06c";
    const limiter = createCodexTranscriptLimiter(4_000);
    const line = JSON.stringify({
      type: "item.started",
      item: {
        type: "mcp_tool_call",
        server: "playwright",
        tool: "browser_run_code_unsafe",
        arguments: { code: `async () => "${syntheticMarker}"` },
        result: null,
        error: null,
        status: "in_progress",
      },
    });
    const markerOffset = line.indexOf(syntheticMarker) + 8;

    expect(limiter.push(line.slice(0, markerOffset))).toBe("");
    const output = limiter.push(`${line.slice(markerOffset)}\n`);
    expect(output).not.toContain(syntheticMarker);
    expect(JSON.parse(output).item.arguments).toMatchObject({ redacted: true });
  });

  it("fails closed for malformed browser run-code diagnostics", () => {
    const syntheticMarker = "SYNTHETIC_MALFORMED_SECRET_d08217";
    const malformed = `{"type":"item.completed","tool":"browser_run_code_unsafe","code":"${syntheticMarker}"`;

    const output = redactCodexBrowserToolJsonlLine(malformed);
    expect(output).not.toContain(syntheticMarker);
    expect(JSON.parse(output)).toEqual({
      type: "paperclip.security_redaction",
      message: "***REDACTED_BROWSER_TOOL_PAYLOAD***",
    });
  });

  it("preserves safe non-run-code browser execution", () => {
    const event = JSON.stringify({
      type: "item.completed",
      item: {
        type: "mcp_tool_call",
        server: "playwright",
        tool: "browser_navigate",
        arguments: { url: "https://example.test/health" },
        result: { content: [{ type: "text", text: "healthy" }] },
        error: null,
        status: "completed",
      },
    });

    expect(redactCodexBrowserToolJsonlLine(event)).toBe(event);
  });

  it("bounds configured limits", () => {
    expect(normalizeCodexTranscriptCommandOutputMaxChars(undefined)).toBe(50_000);
    expect(normalizeCodexTranscriptCommandOutputMaxChars(1)).toBe(4_000);
    expect(normalizeCodexTranscriptCommandOutputMaxChars(999_999)).toBe(250_000);
  });
});
