import { describe, expect, it } from "vitest";
import { buildCodexExecArgs } from "./codex-args.js";

describe("buildCodexExecArgs", () => {
  it("enables Codex fast mode overrides for GPT-5.4", () => {
    const result = buildCodexExecArgs({
      model: "gpt-5.4",
      search: true,
      fastMode: true,
    });

    expect(result.fastModeRequested).toBe(true);
    expect(result.fastModeApplied).toBe(true);
    expect(result.fastModeIgnoredReason).toBeNull();
    expect(result.args).toEqual([
      "--search",
      "exec",
      "--json",
      "--model",
      "gpt-5.4",
      "-c",
      'service_tier="fast"',
      "-c",
      "features.fast_mode=true",
      "-",
    ]);
  });

  it("enables Codex fast mode overrides for GPT-5.5", () => {
    const result = buildCodexExecArgs({
      model: "gpt-5.5",
      fastMode: true,
    });

    expect(result.fastModeRequested).toBe(true);
    expect(result.fastModeApplied).toBe(true);
    expect(result.fastModeIgnoredReason).toBeNull();
    expect(result.args).toEqual([
      "exec",
      "--json",
      "--model",
      "gpt-5.5",
      "-c",
      'service_tier="fast"',
      "-c",
      "features.fast_mode=true",
      "-",
    ]);
  });

  it("remaps unsupported legacy Codex models before applying fast mode", () => {
    const result = buildCodexExecArgs({
      model: "gpt-5.3-codex",
      fastMode: true,
    });

    expect(result.model).toBe("gpt-5.5");
    expect(result.fastModeRequested).toBe(true);
    expect(result.fastModeApplied).toBe(true);
    expect(result.fastModeIgnoredReason).toBeNull();
    expect(result.args).toEqual([
      "exec",
      "--json",
      "--model",
      "gpt-5.5",
      "-c",
      'service_tier="fast"',
      "-c",
      "features.fast_mode=true",
      "-",
    ]);
  });

  it("remaps gpt-5-mini before invoking Codex", () => {
    const result = buildCodexExecArgs({
      model: "gpt-5-mini",
    });

    expect(result.model).toBe("gpt-5.5");
    expect(result.args).toEqual([
      "exec",
      "--json",
      "--model",
      "gpt-5.5",
      "-",
    ]);
  });

  it("enables Codex fast mode overrides for manual models", () => {
    const result = buildCodexExecArgs({
      model: "future-codex-model",
      fastMode: true,
    });

    expect(result.fastModeRequested).toBe(true);
    expect(result.fastModeApplied).toBe(true);
    expect(result.fastModeIgnoredReason).toBeNull();
    expect(result.args).toEqual([
      "exec",
      "--json",
      "--model",
      "future-codex-model",
      "-c",
      'service_tier="fast"',
      "-c",
      "features.fast_mode=true",
      "-",
    ]);
  });

  it("remaps unsupported legacy Codex models before applying unsupported-model checks", () => {
    const result = buildCodexExecArgs({
      model: "gpt-5.3-codex",
    });

    expect(result.model).toBe("gpt-5.5");
    expect(result.fastModeRequested).toBe(false);
    expect(result.fastModeApplied).toBe(false);
    expect(result.fastModeIgnoredReason).toBeNull();
    expect(result.args).toEqual([
      "exec",
      "--json",
      "--model",
      "gpt-5.5",
      "-",
    ]);
  });

  it("remaps unsupported Spark profile before adding --skip-git-repo-check", () => {
    const result = buildCodexExecArgs(
      {
        model: "gpt-5.3-codex-spark",
      },
      { skipGitRepoCheck: true },
    );

    expect(result.model).toBe("gpt-5.5");
    expect(result.args).toEqual([
      "exec",
      "--json",
      "--skip-git-repo-check",
      "--model",
      "gpt-5.5",
      "-",
    ]);
  });

  it("reports no unsafe args when no extra args are present", () => {
    const result = buildCodexExecArgs({
      model: "gpt-5.5",
    });

    expect(result.droppedUnsafeArgs).toEqual([]);
  });
});
