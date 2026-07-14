import { asBoolean, asString, asStringArray } from "@paperclipai/adapter-utils/server-utils";
import {
  CODEX_LOCAL_FAST_MODE_SUPPORTED_MODELS,
  isCodexLocalFastModeSupported,
} from "../index.js";

export type BuildCodexExecArgsResult = {
  args: string[];
  model: string;
  fastModeRequested: boolean;
  fastModeApplied: boolean;
  fastModeIgnoredReason: string | null;
};

export function isStatusOnlyRecoveryContext(context: unknown): boolean {
  const record = asRecord(context);
  return record.recoveryIntent === "status_only"
    && record.allowDeliverableWork === false
    && record.allowDocumentUpdates === false;
}

function stripReadOnlyConflicts(args: string[]): string[] {
  const output: string[] = [];
  for (let index = 0; index < args.length; index += 1) {
    const arg = args[index];
    if (arg === "--dangerously-bypass-approvals-and-sandbox") continue;
    if (arg === "--sandbox" || arg === "-s" || arg === "--add-dir") {
      index += 1;
      continue;
    }
    if (arg.startsWith("--sandbox=") || arg.startsWith("-s=") || arg.startsWith("--add-dir=")) continue;
    output.push(arg);
  }
  return output;
}

function readExtraArgs(config: unknown): string[] {
  const fromExtraArgs = asStringArray(asRecord(config).extraArgs);
  if (fromExtraArgs.length > 0) return fromExtraArgs;
  return asStringArray(asRecord(config).args);
}

function asRecord(value: unknown): Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : {};
}

function formatFastModeSupportedModels(): string {
  return `${CODEX_LOCAL_FAST_MODE_SUPPORTED_MODELS.join(", ")} or manually configured model IDs`;
}

export function buildCodexExecArgs(
  config: unknown,
  options: {
    resumeSessionId?: string | null;
    skipGitRepoCheck?: boolean;
    readOnly?: boolean;
  } = {},
): BuildCodexExecArgsResult {
  const record = asRecord(config);
  const model = asString(record.model, "").trim();
  const modelReasoningEffort = asString(
    record.modelReasoningEffort,
    asString(record.reasoningEffort, ""),
  ).trim();
  const search = asBoolean(record.search, false);
  const fastModeRequested = asBoolean(record.fastMode, false);
  const fastModeApplied = fastModeRequested && isCodexLocalFastModeSupported(model);
  const bypass = !options.readOnly && asBoolean(
    record.dangerouslyBypassApprovalsAndSandbox,
    asBoolean(record.dangerouslyBypassSandbox, false),
  );
  const extraArgs = options.readOnly
    ? stripReadOnlyConflicts(readExtraArgs(record))
    : readExtraArgs(record);

  const args = ["exec", "--json"];
  if (options.skipGitRepoCheck) args.push("--skip-git-repo-check");
  if (search) args.unshift("--search");
  if (bypass) args.push("--dangerously-bypass-approvals-and-sandbox");
  if (model) args.push("--model", model);
  if (modelReasoningEffort) {
    args.push("-c", `model_reasoning_effort=${JSON.stringify(modelReasoningEffort)}`);
  }
  if (fastModeApplied) {
    args.push("-c", 'service_tier="fast"', "-c", "features.fast_mode=true");
  }
  if (extraArgs.length > 0) args.push(...extraArgs);
  if (options.readOnly) {
    args.push("--sandbox", "read-only", "--ephemeral", "--ignore-user-config");
  }
  if (options.resumeSessionId && !options.readOnly) args.push("resume", options.resumeSessionId, "-");
  else args.push("-");

  return {
    args,
    model,
    fastModeRequested,
    fastModeApplied,
    fastModeIgnoredReason:
      fastModeRequested && !fastModeApplied
        ? `Configured fast mode is currently only supported on ${formatFastModeSupportedModels()}; Paperclip will ignore it for model ${model || "(default)"}.`
        : null,
  };
}
