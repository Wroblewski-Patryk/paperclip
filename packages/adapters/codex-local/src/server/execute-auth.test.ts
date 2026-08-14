import { describe, expect, it } from "vitest";
import { selectOpenAiApiKey, shouldUseNativeSourceControlExecution, usableOpenAiApiKey } from "./execute.js";

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

describe("native source-control execution routing", () => {
  it("uses the native host only for an approved local no-push source-control closure", () => {
    expect(shouldUseNativeSourceControlExecution({
      nativeContext: {
        task: {
          problem: "[Featherly][Source Control] Commit reviewed logout coverage test",
          expectedOutcome: "Create one local commit. Do not push or deploy.",
        },
      },
    }, "C:\\Personal\\Projekty\\Aplikacje\\Featherly")).toBe(process.platform === "win32");
  });

  it("keeps ordinary implementation and protected delivery in the sandbox", () => {
    expect(shouldUseNativeSourceControlExecution({
      nativeContext: { task: { problem: "Implement the login flow", expectedOutcome: "Tests pass." } },
    }, "C:\\Personal\\Projekty\\Aplikacje\\Featherly")).toBe(false);
    expect(shouldUseNativeSourceControlExecution({
      nativeContext: { task: { problem: "Source-control release", expectedOutcome: "Commit, push, and deploy." } },
    }, "C:\\Personal\\Projekty\\Aplikacje\\Featherly")).toBe(false);
  });
});
