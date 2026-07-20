import { Command } from "commander";
import type { Agent } from "@paperclipai/shared";
import {
  removeMaintainerOnlySkillSymlinks,
  resolvePaperclipSkillsDir,
} from "@paperclipai/adapter-utils/server-utils";
import fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";
import {
  addCommonClientOptions,
  formatInlineRecord,
  handleCommandError,
  printOutput,
  parseJsonOption,
  registerApiPassthroughCommand,
  resolveCommandContext,
  type BaseClientOptions,
} from "./common.js";

interface AgentListOptions extends BaseClientOptions {
  companyId?: string;
}

interface AgentLocalCliOptions extends BaseClientOptions {
  companyId?: string;
  keyName?: string;
  installSkills?: boolean;
}

interface CreatedAgentKey {
  id: string;
  name: string;
  token: string;
  createdAt: string;
}

interface SkillsInstallSummary {
  tool: "codex" | "claude";
  target: string;
  linked: string[];
  removed: string[];
  skipped: string[];
  failed: Array<{ name: string; error: string }>;
}

const __moduleDir = path.dirname(fileURLToPath(import.meta.url));

function codexSkillsHome(): string {
  const fromEnv = process.env.CODEX_HOME?.trim();
  const base = fromEnv && fromEnv.length > 0 ? fromEnv : path.join(os.homedir(), ".codex");
  return path.join(base, "skills");
}

function claudeSkillsHome(): string {
  const fromEnv = process.env.CLAUDE_HOME?.trim();
  const base = fromEnv && fromEnv.length > 0 ? fromEnv : path.join(os.homedir(), ".claude");
  return path.join(base, "skills");
}

async function installSkillsForTarget(
  sourceSkillsDir: string,
  targetSkillsDir: string,
  tool: "codex" | "claude",
): Promise<SkillsInstallSummary> {
  const summary: SkillsInstallSummary = {
    tool,
    target: targetSkillsDir,
    linked: [],
    removed: [],
    skipped: [],
    failed: [],
  };

  await fs.mkdir(targetSkillsDir, { recursive: true });
  const entries = await fs.readdir(sourceSkillsDir, { withFileTypes: true });
  summary.removed = await removeMaintainerOnlySkillSymlinks(
    targetSkillsDir,
    entries.filter((entry) => entry.isDirectory()).map((entry) => entry.name),
  );
  for (const entry of entries) {
    if (!entry.isDirectory()) continue;
    const source = path.join(sourceSkillsDir, entry.name);
    const target = path.join(targetSkillsDir, entry.name);
    const existing = await fs.lstat(target).catch(() => null);
    if (existing) {
      if (existing.isSymbolicLink()) {
        let linkedPath: string | null = null;
        try {
          linkedPath = await fs.readlink(target);
        } catch (err) {
          await fs.unlink(target);
          try {
            await fs.symlink(source, target);
            summary.linked.push(entry.name);
            continue;
          } catch (linkErr) {
            summary.failed.push({
              name: entry.name,
              error:
                err instanceof Error && linkErr instanceof Error
                  ? `${err.message}; then ${linkErr.message}`
                  : err instanceof Error
                    ? err.message
                    : `Failed to recover broken symlink: ${String(err)}`,
            });
            continue;
          }
        }

        const resolvedLinkedPath = path.isAbsolute(linkedPath)
          ? linkedPath
          : path.resolve(path.dirname(target), linkedPath);
        const linkedTargetExists = await fs
          .stat(resolvedLinkedPath)
          .then(() => true)
          .catch(() => false);

        if (!linkedTargetExists) {
          await fs.unlink(target);
        } else {
          summary.skipped.push(entry.name);
          continue;
        }
      } else {
        summary.skipped.push(entry.name);
        continue;
      }
    }

    try {
      await fs.symlink(source, target);
      summary.linked.push(entry.name);
    } catch (err) {
      summary.failed.push({
        name: entry.name,
        error: err instanceof Error ? err.message : String(err),
      });
    }
  }

  return summary;
}

function buildAgentEnvExports(input: {
  apiBase: string;
  companyId: string;
  agentId: string;
  apiKey: string;
}): string {
  const escaped = (value: string) => value.replace(/'/g, "'\"'\"'");
  return [
    `export PAPERCLIP_API_URL='${escaped(input.apiBase)}'`,
    `export PAPERCLIP_COMPANY_ID='${escaped(input.companyId)}'`,
    `export PAPERCLIP_AGENT_ID='${escaped(input.agentId)}'`,
    `export PAPERCLIP_API_KEY='${escaped(input.apiKey)}'`,
  ].join("\n");
}

export function registerAgentCommands(program: Command): void {
  const agent = program.command("agent").description("Agent operations");

  addCommonClientOptions(
    agent
      .command("list")
      .description("List agents for a company")
      .requiredOption("-C, --company-id <id>", "Company ID")
      .action(async (opts: AgentListOptions) => {
        try {
          const ctx = resolveCommandContext(opts, { requireCompany: true });
          const rows = (await ctx.api.get<Agent[]>(`/api/companies/${ctx.companyId}/agents`)) ?? [];

          if (ctx.json) {
            printOutput(rows, { json: true });
            return;
          }

          if (rows.length === 0) {
            printOutput([], { json: false });
            return;
          }

          for (const row of rows) {
            console.log(
              formatInlineRecord({
                id: row.id,
                name: row.name,
                role: row.role,
                status: row.status,
                reportsTo: row.reportsTo,
                budgetMonthlyCents: row.budgetMonthlyCents,
                spentMonthlyCents: row.spentMonthlyCents,
              }),
            );
          }
        } catch (err) {
          handleCommandError(err);
        }
      }),
    { includeCompany: false },
  );

  addCommonClientOptions(
    agent
      .command("get")
      .description("Get one agent")
      .argument("<agentId>", "Agent ID")
      .action(async (agentId: string, opts: BaseClientOptions) => {
        try {
          const ctx = resolveCommandContext(opts);
          const row = await ctx.api.get<Agent>(`/api/agents/${agentId}`);
          printOutput(row, { json: ctx.json });
        } catch (err) {
          handleCommandError(err);
        }
      }),
  );

  addCommonClientOptions(
    agent
      .command("local-cli")
      .description(
        "Create an agent API key, install local Paperclip skills for Codex/Claude, and print shell exports",
      )
      .argument("<agentRef>", "Agent ID or shortname/url-key")
      .requiredOption("-C, --company-id <id>", "Company ID")
      .option("--key-name <name>", "API key label", "local-cli")
      .option(
        "--no-install-skills",
        "Skip installing Paperclip skills into ~/.codex/skills and ~/.claude/skills",
      )
      .action(async (agentRef: string, opts: AgentLocalCliOptions) => {
        try {
          const ctx = resolveCommandContext(opts, { requireCompany: true });
          const query = new URLSearchParams({ companyId: ctx.companyId ?? "" });
          const agentRow = await ctx.api.get<Agent>(
            `/api/agents/${encodeURIComponent(agentRef)}?${query.toString()}`,
          );
          if (!agentRow) {
            throw new Error(`Agent not found: ${agentRef}`);
          }

          const now = new Date().toISOString().replaceAll(":", "-");
          const keyName = opts.keyName?.trim() ? opts.keyName.trim() : `local-cli-${now}`;
          const key = await ctx.api.post<CreatedAgentKey>(`/api/agents/${agentRow.id}/keys`, { name: keyName });
          if (!key) {
            throw new Error("Failed to create API key");
          }

          const installSummaries: SkillsInstallSummary[] = [];
          if (opts.installSkills !== false) {
            const skillsDir = await resolvePaperclipSkillsDir(__moduleDir, [path.resolve(process.cwd(), "skills")]);
            if (!skillsDir) {
              throw new Error(
                "Could not locate local Paperclip skills directory. Expected ./skills in the repo checkout.",
              );
            }

            installSummaries.push(
              await installSkillsForTarget(skillsDir, codexSkillsHome(), "codex"),
              await installSkillsForTarget(skillsDir, claudeSkillsHome(), "claude"),
            );
          }

          const exportsText = buildAgentEnvExports({
            apiBase: ctx.api.apiBase,
            companyId: agentRow.companyId,
            agentId: agentRow.id,
            apiKey: key.token,
          });

          if (ctx.json) {
            printOutput(
              {
                agent: {
                  id: agentRow.id,
                  name: agentRow.name,
                  urlKey: agentRow.urlKey,
                  companyId: agentRow.companyId,
                },
                key: {
                  id: key.id,
                  name: key.name,
                  createdAt: key.createdAt,
                  token: key.token,
                },
                skills: installSummaries,
                exports: exportsText,
              },
              { json: true },
            );
            return;
          }

          console.log(`Agent: ${agentRow.name} (${agentRow.id})`);
          console.log(`API key created: ${key.name} (${key.id})`);
          if (installSummaries.length > 0) {
            for (const summary of installSummaries) {
              console.log(
                `${summary.tool}: linked=${summary.linked.length} removed=${summary.removed.length} skipped=${summary.skipped.length} failed=${summary.failed.length} target=${summary.target}`,
              );
              for (const failed of summary.failed) {
                console.log(`  failed ${failed.name}: ${failed.error}`);
              }
            }
          }
          console.log("");
          console.log("# Run this in your shell before launching codex/claude:");
          console.log(exportsText);
        } catch (err) {
          handleCommandError(err);
        }
      }),
    { includeCompany: false },
  );

  const payloadOption = (command: Command) => command.requiredOption("--payload-json <json>", "JSON payload");
  const agentIdPath = (suffix = "") => ([agentId]: string[]) => `/api/agents/${agentId}${suffix}`;

  registerApiPassthroughCommand(agent, {
    usage: "create", description: "Create an agent", method: "post", requireCompany: true,
    configure: (command) => payloadOption(command.requiredOption("-C, --company-id <id>", "Company ID")),
    path: (_args, _options, context) => `/api/companies/${context.companyId}/agents`,
    body: (_args, options) => parseJsonOption(options.payloadJson),
  });
  registerApiPassthroughCommand(agent, {
    usage: "hire", description: "Create an agent hire request", method: "post", requireCompany: true,
    configure: (command) => payloadOption(command.requiredOption("-C, --company-id <id>", "Company ID")),
    path: (_args, _options, context) => `/api/companies/${context.companyId}/agent-hires`,
    body: (_args, options) => parseJsonOption(options.payloadJson),
  });
  registerApiPassthroughCommand(agent, {
    usage: "update <agentId>", description: "Update an agent", method: "patch", configure: payloadOption,
    path: agentIdPath(), body: (_args, options) => parseJsonOption(options.payloadJson),
  });
  for (const [name, suffix] of [
    ["pause", "/pause"], ["resume", "/resume"], ["approve", "/approve"],
    ["terminate", "/terminate"], ["heartbeat:invoke", "/heartbeat/invoke"], ["claude-login", "/claude-login"],
  ] as const) {
    registerApiPassthroughCommand(agent, {
      usage: `${name} <agentId>`, description: `${name} agent`, method: "post", path: agentIdPath(suffix),
    });
  }
  registerApiPassthroughCommand(agent, {
    usage: "delete <agentId>", description: "Delete an agent", method: "delete",
    configure: (command) => command.option("--yes", "Confirm deletion"), path: agentIdPath(),
  });
  registerApiPassthroughCommand(agent, {
    usage: "permissions:update <agentId>", description: "Update agent permissions", method: "patch", configure: payloadOption,
    path: agentIdPath("/permissions"), body: (_args, options) => parseJsonOption(options.payloadJson),
  });
  for (const [name, suffix] of [
    ["configuration", "/configuration"], ["config-revisions", "/config-revisions"],
    ["runtime-state", "/runtime-state"], ["task-sessions", "/task-sessions"],
    ["skills", "/skills"], ["instructions-bundle", "/instructions-bundle"],
  ] as const) {
    registerApiPassthroughCommand(agent, {
      usage: `${name} <agentId>`, description: `Get agent ${name}`, method: "get", path: agentIdPath(suffix),
    });
  }
  registerApiPassthroughCommand(agent, {
    usage: "config-revision:get <agentId> <revisionId>", description: "Get an agent config revision", method: "get",
    path: ([agentId, revisionId]) => `/api/agents/${agentId}/config-revisions/${revisionId}`,
  });
  registerApiPassthroughCommand(agent, {
    usage: "config-revision:rollback <agentId> <revisionId>", description: "Rollback an agent config revision", method: "post",
    path: ([agentId, revisionId]) => `/api/agents/${agentId}/config-revisions/${revisionId}/rollback`,
  });
  registerApiPassthroughCommand(agent, {
    usage: "runtime-state:reset-session <agentId>", description: "Reset an agent runtime session", method: "post",
    configure: (command) => command.requiredOption("--task-key <key>", "Task key"),
    path: agentIdPath("/runtime-state/reset-session"), body: (_args, options) => ({ taskKey: options.taskKey }),
  });
  registerApiPassthroughCommand(agent, {
    usage: "skills:sync <agentId>", description: "Synchronize agent skills", method: "post",
    configure: (command) => command.requiredOption("--desired-skills <csv>", "Desired skills"),
    path: agentIdPath("/skills/sync"),
    body: (_args, options) => ({ desiredSkills: String(options.desiredSkills).split(",").map((value) => value.trim()).filter(Boolean) }),
  });
  for (const [name, suffix] of [
    ["instructions-path:update", "/instructions-path"], ["instructions-bundle:update", "/instructions-bundle"],
  ] as const) {
    registerApiPassthroughCommand(agent, {
      usage: `${name} <agentId>`, description: `Update agent ${name}`, method: "patch", configure: payloadOption,
      path: agentIdPath(suffix), body: (_args, options) => parseJsonOption(options.payloadJson),
    });
  }
  registerApiPassthroughCommand(agent, {
    usage: "instructions-file:get <agentId>", description: "Read an instructions file", method: "get",
    configure: (command) => command.requiredOption("--path <path>", "File path"),
    path: ([agentId], options) => `/api/agents/${agentId}/instructions-bundle/file?path=${encodeURIComponent(String(options.path))}`,
  });
  registerApiPassthroughCommand(agent, {
    usage: "instructions-file:put <agentId>", description: "Write an instructions file", method: "put",
    configure: (command) => command.requiredOption("--path <path>", "File path").requiredOption("--content <text>", "File content"),
    path: agentIdPath("/instructions-bundle/file"), body: (_args, options) => ({ path: options.path, content: options.content }),
  });
  registerApiPassthroughCommand(agent, {
    usage: "instructions-file:delete <agentId>", description: "Delete an instructions file", method: "delete",
    configure: (command) => command.requiredOption("--path <path>", "File path"),
    path: ([agentId], options) => `/api/agents/${agentId}/instructions-bundle/file?path=${encodeURIComponent(String(options.path))}`,
  });

  addCommonClientOptions(
    agent.command("wake <agentRef>")
      .description("Wake an agent")
      .requiredOption("-C, --company-id <id>", "Company ID")
      .option("--reason <text>", "Wake reason")
      .option("--payload <json>", "Wake payload")
      .action(async (agentRef: string, opts: BaseClientOptions & { reason?: string; payload?: string }) => {
        try {
          const context = resolveCommandContext(opts, { requireCompany: true });
          const query = new URLSearchParams({ companyId: context.companyId! });
          const resolved = await context.api.get<Agent>(`/api/agents/${encodeURIComponent(agentRef)}?${query}`);
          if (!resolved) throw new Error(`Agent not found: ${agentRef}`);
          const result = await context.api.post(`/api/agents/${resolved.id}/wakeup`, {
            source: "on_demand",
            triggerDetail: "manual",
            reason: opts.reason,
            payload: parseJsonOption(opts.payload, "--payload"),
          });
          printOutput(result, { json: context.json });
        } catch (error) {
          handleCommandError(error);
        }
      }),
    { includeCompany: false },
  );
}
