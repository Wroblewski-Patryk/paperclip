import type { AdapterModelProfileDefinition } from "@paperclipai/adapter-utils";

export const type = "codex_local";
export const label = "Codex (local)";

export const SANDBOX_INSTALL_COMMAND = "npm install -g @openai/codex";

export const CODEX_LOCAL_SOL_MODEL = "gpt-5.6-sol";
export const CODEX_LOCAL_TERRA_MODEL = "gpt-5.6-terra";
export const CODEX_LOCAL_LUNA_MODEL = "gpt-5.6-luna";
export const DEFAULT_CODEX_LOCAL_MODEL = CODEX_LOCAL_TERRA_MODEL;
export const DEFAULT_CODEX_LOCAL_BYPASS_APPROVALS_AND_SANDBOX = false;
export const CODEX_LOCAL_FAST_MODE_SUPPORTED_MODELS = ["gpt-5.4", "gpt-5.4-mini"] as const;

function normalizeModelId(model: string | null | undefined): string {
  return typeof model === "string" ? model.trim() : "";
}

export function isCodexLocalKnownModel(model: string | null | undefined): boolean {
  const normalizedModel = normalizeModelId(model);
  if (!normalizedModel) return false;
  return models.some((entry) => entry.id === normalizedModel);
}

export function isCodexLocalManualModel(model: string | null | undefined): boolean {
  const normalizedModel = normalizeModelId(model);
  return Boolean(normalizedModel) && !isCodexLocalKnownModel(normalizedModel);
}

export function isCodexLocalFastModeSupported(model: string | null | undefined): boolean {
  if (isCodexLocalManualModel(model)) return true;
  const normalizedModel = typeof model === "string" ? model.trim() : "";
  return CODEX_LOCAL_FAST_MODE_SUPPORTED_MODELS.includes(
    normalizedModel as (typeof CODEX_LOCAL_FAST_MODE_SUPPORTED_MODELS)[number],
  );
}

export const models = [
  { id: CODEX_LOCAL_SOL_MODEL, label: CODEX_LOCAL_SOL_MODEL },
  { id: CODEX_LOCAL_TERRA_MODEL, label: CODEX_LOCAL_TERRA_MODEL },
  { id: CODEX_LOCAL_LUNA_MODEL, label: CODEX_LOCAL_LUNA_MODEL },
  { id: "gpt-5.6", label: "gpt-5.6 (alias: gpt-5.6-sol)" },
  { id: "gpt-5.5", label: "gpt-5.5" },
  { id: "gpt-5.4", label: "gpt-5.4" },
  { id: "gpt-5.4-mini", label: "gpt-5.4-mini" },
  { id: "gpt-5.3-codex-spark", label: "gpt-5.3-codex-spark" },
];

export const modelProfiles: AdapterModelProfileDefinition[] = [
  {
    key: "cheap",
    label: "Luna / Cheap",
    description: "Lowest-cost lane for recovery, status, and tiny bounded follow-up runs.",
    adapterConfig: {
      model: CODEX_LOCAL_LUNA_MODEL,
      modelReasoningEffort: "low",
    },
    source: "adapter_default",
  },
  {
    key: "spark",
    label: "Spark / Batch",
    description: "Optional Pro preview lane for bounded formatting, summaries, and rapid coding iteration.",
    adapterConfig: {
      model: "gpt-5.3-codex-spark",
      modelReasoningEffort: "medium",
    },
    source: "adapter_default",
  },
  {
    key: "light",
    label: "Terra / Light",
    description: "General lightweight lane for triage, coordination, and routine analysis.",
    adapterConfig: {
      model: CODEX_LOCAL_TERRA_MODEL,
      modelReasoningEffort: "medium",
    },
    source: "adapter_default",
  },
  {
    key: "standard",
    label: "Terra / Standard",
    description: "Default high-quality lane for normal implementation, debugging, review, and verification.",
    adapterConfig: {
      model: DEFAULT_CODEX_LOCAL_MODEL,
      modelReasoningEffort: "medium",
    },
    source: "adapter_default",
  },
  {
    key: "reasoning",
    label: "Sol / Reasoning",
    description: "Stronger lane for architecture, security, deployment, and cross-module reasoning.",
    adapterConfig: {
      model: CODEX_LOCAL_SOL_MODEL,
      modelReasoningEffort: "high",
    },
    source: "adapter_default",
  },
  {
    key: "strategic",
    label: "Sol / Strategic",
    description: "Highest-reasoning lane for explicit strategic or multi-system decisions.",
    adapterConfig: {
      model: CODEX_LOCAL_SOL_MODEL,
      modelReasoningEffort: "xhigh",
    },
    source: "adapter_default",
  },
];

export const agentConfigurationDoc = `# codex_local agent configuration

Adapter: codex_local

Core fields:
- cwd (string, optional): default absolute working directory fallback for the agent process (created if missing when possible)
- instructionsFilePath (string, optional): absolute path to a markdown instructions file prepended to stdin prompt at runtime
- model (string, optional): Codex model id
- modelReasoningEffort (string, optional): reasoning effort override (none|low|medium|high|xhigh|max) passed via -c model_reasoning_effort=...
- modelProfiles (runtime config): Paperclip can apply cheap, spark, light, standard, reasoning, or strategic profiles before each run via the central model router.
- promptTemplate (string, optional): run prompt template
- search (boolean, optional): run codex with --search
- fastMode (boolean, optional): enable Codex Fast mode; supported on GPT-5.4 and passed through for manual model IDs
- dangerouslyBypassApprovalsAndSandbox (boolean, optional): run with bypass flag
- command (string, optional): defaults to "codex"
- extraArgs (string[], optional): additional CLI args
- transcriptCommandOutputMaxChars (number, optional): stored transcript/resultJson cap per command output event (default 50000; bounded to 4000..250000)
- env (object, optional): KEY=VALUE environment variables
- workspaceStrategy (object, optional): execution workspace strategy; currently supports { type: "git_worktree", baseRef?, branchTemplate?, worktreeParentDir? }
- workspaceRuntime (object, optional): reserved for workspace runtime metadata; workspace runtime services are manually controlled from the workspace UI and are not auto-started by heartbeats

Operational fields:
- timeoutSec (number, optional): run timeout in seconds
- graceSec (number, optional): SIGTERM grace period in seconds

Notes:
- Prompts are piped via stdin (Codex receives "-" prompt argument).
- Status-only recovery runs ignore configured bypass/write-directory flags and always use a fresh ephemeral Codex session with "--sandbox read-only".
- Oversized command output is clipped in the stored transcript and resultJson while final agent messages and the full in-process stdout used for parsing remain intact.
- If instructionsFilePath is configured, Paperclip prepends that file's contents to the stdin prompt on every run.
- Codex exec automatically applies repo-scoped AGENTS.md instructions from the active workspace. Paperclip cannot suppress that discovery in exec mode, so repo AGENTS.md files may still apply even when you only configured an explicit instructionsFilePath.
- Paperclip injects desired local skills into the effective CODEX_HOME/skills/ directory at execution time so Codex can discover "$paperclip" and related skills without polluting the project working directory. In managed-home mode (the default) this is ~/.paperclip/instances/<id>/companies/<companyId>/codex-home/skills/; when CODEX_HOME is explicitly overridden in adapter config, that override is used instead.
- Unless explicitly overridden in adapter config, Paperclip runs Codex with a per-company managed CODEX_HOME under the active Paperclip instance and seeds auth/config from the shared Codex home (the CODEX_HOME env var, when set, or ~/.codex).
- Some model/tool combinations reject certain effort levels (for example minimal with web search enabled).
- GPT-5.6 Sol, Terra, and Luna are the active defaults and require the repository-pinned Codex CLI 0.145.0 or newer. GPT-5.4, GPT-5.4 mini, GPT-5.5, and Spark remain selectable for legacy/manual configurations. The unsuffixed gpt-5.6 alias points to Sol.
- Fast mode is supported on GPT-5.4, GPT-5.4 mini, and manual model IDs. When enabled for those models, Paperclip applies \`service_tier="fast"\` and \`features.fast_mode=true\`.
- When Paperclip realizes a workspace/runtime for a run, it injects PAPERCLIP_WORKSPACE_* and PAPERCLIP_RUNTIME_* env vars for agent-side tooling.
`;
