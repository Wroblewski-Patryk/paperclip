import { describe, expect, it } from "vitest";
import { buildCodexExecArgs, isStatusOnlyRecoveryContext } from "./codex-args.js";

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

  it("enables Codex fast mode overrides for GPT-5.4 mini", () => {
    const result = buildCodexExecArgs({
      model: "gpt-5.4-mini",
      fastMode: true,
    });

    expect(result.fastModeRequested).toBe(true);
    expect(result.fastModeApplied).toBe(true);
    expect(result.fastModeIgnoredReason).toBeNull();
    expect(result.args).toEqual([
      "exec",
      "--json",
      "--model",
      "gpt-5.4-mini",
      "-c",
      'service_tier="fast"',
      "-c",
      "features.fast_mode=true",
      "-",
    ]);
  });

  it("ignores fast mode for unsupported models", () => {
    const result = buildCodexExecArgs({
      model: "gpt-5.5",
      fastMode: true,
    });

    expect(result.fastModeRequested).toBe(true);
    expect(result.fastModeApplied).toBe(false);
    expect(result.fastModeIgnoredReason).toContain(
      "currently only supported on gpt-5.4, gpt-5.4-mini or manually configured model IDs",
    );
    expect(result.args).toEqual([
      "exec",
      "--json",
      "--model",
      "gpt-5.5",
      "-",
    ]);
  });

  it("adds --skip-git-repo-check when requested", () => {
    const result = buildCodexExecArgs(
      {
        model: "gpt-5.3-codex",
      },
      { skipGitRepoCheck: true },
    );

    expect(result.args).toEqual([
      "exec",
      "--json",
      "--skip-git-repo-check",
      "--model",
      "gpt-5.3-codex",
      "-",
    ]);
  });

  it("forces status-only recovery into a fresh read-only sandbox", () => {
    expect(isStatusOnlyRecoveryContext({
      recoveryIntent: "status_only",
      allowDeliverableWork: false,
      allowDocumentUpdates: false,
    })).toBe(true);
    expect(isStatusOnlyRecoveryContext({ recoveryIntent: "status_only" })).toBe(false);

    const result = buildCodexExecArgs({
      model: "gpt-5.4-mini",
      dangerouslyBypassApprovalsAndSandbox: true,
      extraArgs: [
        "--sandbox",
        "danger-full-access",
        "--add-dir",
        "C:/tmp/writeable",
        "--dangerously-bypass-approvals-and-sandbox",
        "-s=danger-full-access",
        "--color",
        "never",
      ],
    }, {
      resumeSessionId: "session-that-must-not-resume",
      readOnly: true,
    });

    expect(result.args).toEqual([
      "exec",
      "--json",
      "--model",
      "gpt-5.4-mini",
      "--color",
      "never",
      "--sandbox",
      "read-only",
      "--ephemeral",
      "--ignore-user-config",
      "-",
    ]);
  });
});
