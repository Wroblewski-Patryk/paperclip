import { describe, expect, it } from "vitest";
import { usableOpenAiApiKey } from "./execute.js";

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
});
