import { describe, expect, it } from "vitest";
import { selectOpenAiApiKey, usableOpenAiApiKey } from "./execute.js";

describe("codex local OpenAI API key selection", () => {
  it("rejects placeholder OpenAI API key values", () => {
    expect(usableOpenAiApiKey("REPLACE_ME_OPENAI_API_KEY")).toBeNull();
    expect(usableOpenAiApiKey("REPLACE_*************_KEY")).toBeNull();
    expect(usableOpenAiApiKey("your_openai_api_key")).toBeNull();
    expect(usableOpenAiApiKey("paste_openai_api_key")).toBeNull();
  });

  it("accepts non-empty non-placeholder values without logging or normalizing the secret", () => {
    expect(usableOpenAiApiKey("  sk-test-local-only  ")).toBe("sk-test-local-only");
  });

  it("prefers an explicitly configured key over local Codex auth", () => {
    expect(selectOpenAiApiKey("sk-configured", "sk-inherited", true)).toBe("sk-configured");
  });

  it("prefers local Codex auth over an inherited shell key", () => {
    expect(selectOpenAiApiKey(undefined, "sk-inherited", true)).toBeNull();
  });

  it("uses an inherited shell key when no local Codex auth exists", () => {
    expect(selectOpenAiApiKey(undefined, "sk-inherited", false)).toBe("sk-inherited");
  });
});
