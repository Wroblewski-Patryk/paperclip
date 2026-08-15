import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const originalOpenAiApiKey = process.env.OPENAI_API_KEY;

const {
  ensureAbsoluteDirectory,
  ensureAdapterExecutionTargetCommandResolvable,
  ensureAdapterExecutionTargetRuntimeCommandInstalled,
  prepareManagedCodexHome,
  readCodexAuthInfo,
  readPaperclipRuntimeSkillEntries,
  resolvePaperclipDesiredSkillNames,
  refreshPaperclipWorkspaceEnvForExecution,
  runAdapterExecutionTargetProcess,
} = vi.hoisted(() => ({
  ensureAbsoluteDirectory: vi.fn(async () => {}),
  ensureAdapterExecutionTargetCommandResolvable: vi.fn(async () => {}),
  ensureAdapterExecutionTargetRuntimeCommandInstalled: vi.fn(async () => {}),
  prepareManagedCodexHome: vi.fn(async () => "/tmp/paperclip-managed-codex-home"),
  readCodexAuthInfo: vi.fn(async () => null),
  readPaperclipRuntimeSkillEntries: vi.fn(async () => []),
  resolvePaperclipDesiredSkillNames: vi.fn(() => []),
  refreshPaperclipWorkspaceEnvForExecution: vi.fn(),
  runAdapterExecutionTargetProcess: vi.fn(async () => {
    throw new Error("runAdapterExecutionTargetProcess should not be called when auth is missing");
  }),
}));

vi.mock("@paperclipai/adapter-utils/server-utils", async () => {
  const actual = await vi.importActual<typeof import("@paperclipai/adapter-utils/server-utils")>(
    "@paperclipai/adapter-utils/server-utils",
  );
  return {
    ...actual,
    ensureAbsoluteDirectory,
    readPaperclipRuntimeSkillEntries,
    resolvePaperclipDesiredSkillNames,
    refreshPaperclipWorkspaceEnvForExecution,
  };
});

vi.mock("@paperclipai/adapter-utils/execution-target", async () => {
  const actual = await vi.importActual<typeof import("@paperclipai/adapter-utils/execution-target")>(
    "@paperclipai/adapter-utils/execution-target",
  );
  return {
    ...actual,
    ensureAdapterExecutionTargetCommandResolvable,
    ensureAdapterExecutionTargetRuntimeCommandInstalled,
    runAdapterExecutionTargetProcess,
  };
});

vi.mock("./codex-home.js", async () => {
  const actual = await vi.importActual<typeof import("./codex-home.js")>("./codex-home.js");
  return {
    ...actual,
    prepareManagedCodexHome,
  };
});

vi.mock("./quota.js", async () => {
  const actual = await vi.importActual<typeof import("./quota.js")>("./quota.js");
  return {
    ...actual,
    readCodexAuthInfo,
  };
});

import { execute } from "./execute.js";

describe("codex local execution auth guard", () => {
  beforeEach(() => {
    delete process.env.OPENAI_API_KEY;
  });

  afterEach(() => {
    vi.clearAllMocks();
    if (originalOpenAiApiKey === undefined) {
      delete process.env.OPENAI_API_KEY;
    } else {
      process.env.OPENAI_API_KEY = originalOpenAiApiKey;
    }
  });

  it("fails fast before spawning Codex when neither API key nor auth.json is available", async () => {
    const result = await execute({
      runId: "run-auth-missing",
      agent: {
        id: "agent-1",
        companyId: "company-1",
        name: "CodexCoder",
        adapterType: "codex_local",
        adapterConfig: {},
      },
      runtime: {
        sessionId: null,
        sessionParams: null,
        sessionDisplayId: null,
        taskKey: null,
      },
      config: {
        command: "codex",
        env: {},
      },
      context: {
        paperclipWorkspace: {
          cwd: "C:/workspace",
          source: "project_primary",
        },
      },
      onLog: async () => {},
    });

    expect(result).toMatchObject({
      exitCode: 1,
      errorCode: "codex_auth_not_configured",
      errorMessage:
        "Codex authentication is not configured. Set OPENAI_API_KEY in adapter config or run `codex auth` to create a usable auth.json session.",
      resultJson: {
        errorCode: "codex_auth_not_configured",
        details: "missing auth (OPENAI_API_KEY and usable auth.json token)",
      },
    });
    expect(prepareManagedCodexHome).toHaveBeenCalledTimes(1);
    expect(readCodexAuthInfo).toHaveBeenCalledTimes(2);
    expect(runAdapterExecutionTargetProcess).not.toHaveBeenCalled();
    expect(ensureAdapterExecutionTargetRuntimeCommandInstalled).not.toHaveBeenCalled();
    expect(ensureAdapterExecutionTargetCommandResolvable).not.toHaveBeenCalled();
  });
});
