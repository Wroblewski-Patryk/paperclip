import { Command } from "commander";
import { readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import {
  addIssueCommentSchema,
  checkoutIssueSchema,
  createIssueSchema,
  type FeedbackTrace,
  updateIssueSchema,
  type Issue,
  type IssueComment,
} from "@paperclipai/shared";
import {
  addCommonClientOptions,
  formatInlineRecord,
  handleCommandError,
  printOutput,
  inferContentTypeFromPath,
  parseJsonOption,
  registerApiPassthroughCommand,
  resolveCommandContext,
  type BaseClientOptions,
} from "./common.js";
import {
  buildFeedbackTraceQuery,
  normalizeFeedbackTraceExportFormat,
  serializeFeedbackTraces,
} from "./feedback.js";

interface IssueBaseOptions extends BaseClientOptions {
  status?: string;
  assigneeAgentId?: string;
  projectId?: string;
  match?: string;
}

interface IssueCreateOptions extends BaseClientOptions {
  title: string;
  description?: string;
  status?: string;
  priority?: string;
  assigneeAgentId?: string;
  projectId?: string;
  goalId?: string;
  parentId?: string;
  requestDepth?: string;
  billingCode?: string;
}

interface IssueUpdateOptions extends BaseClientOptions {
  title?: string;
  description?: string;
  status?: string;
  priority?: string;
  assigneeAgentId?: string;
  projectId?: string;
  goalId?: string;
  parentId?: string;
  requestDepth?: string;
  billingCode?: string;
  comment?: string;
  hiddenAt?: string;
}

interface IssueCommentOptions extends BaseClientOptions {
  body: string;
  reopen?: boolean;
  resume?: boolean;
}

interface IssueCheckoutOptions extends BaseClientOptions {
  agentId: string;
  expectedStatuses?: string;
}

interface IssueFeedbackOptions extends BaseClientOptions {
  targetType?: string;
  vote?: string;
  status?: string;
  from?: string;
  to?: string;
  sharedOnly?: boolean;
  includePayload?: boolean;
  out?: string;
  format?: string;
}

export function registerIssueCommands(program: Command): void {
  const issue = program.command("issue").description("Issue operations");

  addCommonClientOptions(
    issue
      .command("list")
      .description("List issues for a company")
      .option("-C, --company-id <id>", "Company ID")
      .option("--status <csv>", "Comma-separated statuses")
      .option("--assignee-agent-id <id>", "Filter by assignee agent ID")
      .option("--project-id <id>", "Filter by project ID")
      .option("--match <text>", "Local text match on identifier/title/description")
      .action(async (opts: IssueBaseOptions) => {
        try {
          const ctx = resolveCommandContext(opts, { requireCompany: true });
          const params = new URLSearchParams();
          if (opts.status) params.set("status", opts.status);
          if (opts.assigneeAgentId) params.set("assigneeAgentId", opts.assigneeAgentId);
          if (opts.projectId) params.set("projectId", opts.projectId);

          const query = params.toString();
          const path = `/api/companies/${ctx.companyId}/issues${query ? `?${query}` : ""}`;
          const rows = (await ctx.api.get<Issue[]>(path)) ?? [];

          const filtered = filterIssueRows(rows, opts.match);
          if (ctx.json) {
            printOutput(filtered, { json: true });
            return;
          }

          if (filtered.length === 0) {
            printOutput([], { json: false });
            return;
          }

          for (const item of filtered) {
            console.log(
              formatInlineRecord({
                identifier: item.identifier,
                id: item.id,
                status: item.status,
                priority: item.priority,
                assigneeAgentId: item.assigneeAgentId,
                title: item.title,
                projectId: item.projectId,
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
    issue
      .command("get")
      .description("Get an issue by UUID or identifier (e.g. PC-12)")
      .argument("<idOrIdentifier>", "Issue ID or identifier")
      .action(async (idOrIdentifier: string, opts: BaseClientOptions) => {
        try {
          const ctx = resolveCommandContext(opts);
          const row = await ctx.api.get<Issue>(`/api/issues/${idOrIdentifier}`);
          printOutput(row, { json: ctx.json });
        } catch (err) {
          handleCommandError(err);
        }
      }),
  );

  addCommonClientOptions(
    issue
      .command("create")
      .description("Create an issue")
      .requiredOption("-C, --company-id <id>", "Company ID")
      .requiredOption("--title <title>", "Issue title")
      .option("--description <text>", "Issue description")
      .option("--status <status>", "Issue status")
      .option("--priority <priority>", "Issue priority")
      .option("--assignee-agent-id <id>", "Assignee agent ID")
      .option("--project-id <id>", "Project ID")
      .option("--goal-id <id>", "Goal ID")
      .option("--parent-id <id>", "Parent issue ID")
      .option("--request-depth <n>", "Request depth integer")
      .option("--billing-code <code>", "Billing code")
      .action(async (opts: IssueCreateOptions) => {
        try {
          const ctx = resolveCommandContext(opts, { requireCompany: true });
          const payload = createIssueSchema.parse({
            title: opts.title,
            description: opts.description,
            status: opts.status,
            priority: opts.priority,
            assigneeAgentId: opts.assigneeAgentId,
            projectId: opts.projectId,
            goalId: opts.goalId,
            parentId: opts.parentId,
            requestDepth: parseOptionalInt(opts.requestDepth),
            billingCode: opts.billingCode,
          });

          const created = await ctx.api.post<Issue>(`/api/companies/${ctx.companyId}/issues`, payload);
          printOutput(created, { json: ctx.json });
        } catch (err) {
          handleCommandError(err);
        }
      }),
    { includeCompany: false },
  );

  addCommonClientOptions(
    issue
      .command("update")
      .description("Update an issue")
      .argument("<issueId>", "Issue ID")
      .option("--title <title>", "Issue title")
      .option("--description <text>", "Issue description")
      .option("--status <status>", "Issue status")
      .option("--priority <priority>", "Issue priority")
      .option("--assignee-agent-id <id>", "Assignee agent ID")
      .option("--project-id <id>", "Project ID")
      .option("--goal-id <id>", "Goal ID")
      .option("--parent-id <id>", "Parent issue ID")
      .option("--request-depth <n>", "Request depth integer")
      .option("--billing-code <code>", "Billing code")
      .option("--comment <text>", "Optional comment to add with update")
      .option("--hidden-at <iso8601|null>", "Set hiddenAt timestamp or literal 'null'")
      .action(async (issueId: string, opts: IssueUpdateOptions) => {
        try {
          const ctx = resolveCommandContext(opts);
          const payload = updateIssueSchema.parse({
            title: opts.title,
            description: opts.description,
            status: opts.status,
            priority: opts.priority,
            assigneeAgentId: opts.assigneeAgentId,
            projectId: opts.projectId,
            goalId: opts.goalId,
            parentId: opts.parentId,
            requestDepth: parseOptionalInt(opts.requestDepth),
            billingCode: opts.billingCode,
            comment: opts.comment,
            hiddenAt: parseHiddenAt(opts.hiddenAt),
          });

          const updated = await ctx.api.patch<Issue & { comment?: IssueComment | null }>(`/api/issues/${issueId}`, payload);
          printOutput(updated, { json: ctx.json });
        } catch (err) {
          handleCommandError(err);
        }
      }),
  );

  addCommonClientOptions(
    issue
      .command("comment")
      .description("Add comment to issue")
      .argument("<issueId>", "Issue ID")
      .requiredOption("--body <text>", "Comment body")
      .option("--reopen", "Reopen if issue is done/cancelled")
      .option("--resume", "Request explicit follow-up and wake the assignee when resumable")
      .action(async (issueId: string, opts: IssueCommentOptions) => {
        try {
          const ctx = resolveCommandContext(opts);
          const payload = addIssueCommentSchema.parse({
            body: opts.body,
            reopen: opts.reopen,
            resume: opts.resume,
          });
          const comment = await ctx.api.post<IssueComment>(`/api/issues/${issueId}/comments`, payload);
          printOutput(comment, { json: ctx.json });
        } catch (err) {
          handleCommandError(err);
        }
      }),
  );

  addCommonClientOptions(
    issue
      .command("feedback:list")
      .description("List feedback traces for an issue")
      .argument("<issueId>", "Issue ID")
      .option("--target-type <type>", "Filter by target type")
      .option("--vote <vote>", "Filter by vote value")
      .option("--status <status>", "Filter by trace status")
      .option("--from <iso8601>", "Only include traces created at or after this timestamp")
      .option("--to <iso8601>", "Only include traces created at or before this timestamp")
      .option("--shared-only", "Only include traces eligible for sharing/export")
      .option("--include-payload", "Include stored payload snapshots in the response")
      .action(async (issueId: string, opts: IssueFeedbackOptions) => {
        try {
          const ctx = resolveCommandContext(opts);
          const traces = (await ctx.api.get<FeedbackTrace[]>(
            `/api/issues/${issueId}/feedback-traces${buildFeedbackTraceQuery(opts)}`,
          )) ?? [];
          if (ctx.json) {
            printOutput(traces, { json: true });
            return;
          }
          printOutput(
            traces.map((trace) => ({
              id: trace.id,
              issue: trace.issueIdentifier ?? trace.issueId,
              vote: trace.vote,
              status: trace.status,
              targetType: trace.targetType,
              target: trace.targetSummary.label,
            })),
            { json: false },
          );
        } catch (err) {
          handleCommandError(err);
        }
      }),
  );

  addCommonClientOptions(
    issue
      .command("feedback:export")
      .description("Export feedback traces for an issue")
      .argument("<issueId>", "Issue ID")
      .option("--target-type <type>", "Filter by target type")
      .option("--vote <vote>", "Filter by vote value")
      .option("--status <status>", "Filter by trace status")
      .option("--from <iso8601>", "Only include traces created at or after this timestamp")
      .option("--to <iso8601>", "Only include traces created at or before this timestamp")
      .option("--shared-only", "Only include traces eligible for sharing/export")
      .option("--include-payload", "Include stored payload snapshots in the export")
      .option("--out <path>", "Write export to a file path instead of stdout")
      .option("--format <format>", "Export format: json or ndjson", "ndjson")
      .action(async (issueId: string, opts: IssueFeedbackOptions) => {
        try {
          const ctx = resolveCommandContext(opts);
          const traces = (await ctx.api.get<FeedbackTrace[]>(
            `/api/issues/${issueId}/feedback-traces${buildFeedbackTraceQuery(opts, opts.includePayload ?? true)}`,
          )) ?? [];
            const serialized = serializeFeedbackTraces(traces, opts.format);
            if (opts.out?.trim()) {
              await writeFile(opts.out, serialized, "utf8");
              if (ctx.json) {
                printOutput(
                  { out: opts.out, count: traces.length, format: normalizeFeedbackTraceExportFormat(opts.format) },
                  { json: true },
                );
                return;
              }
              console.log(`Wrote ${traces.length} feedback trace(s) to ${opts.out}`);
            return;
          }
          process.stdout.write(`${serialized}${serialized.endsWith("\n") ? "" : "\n"}`);
        } catch (err) {
          handleCommandError(err);
        }
      }),
  );

  addCommonClientOptions(
    issue
      .command("checkout")
      .description("Checkout issue for an agent")
      .argument("<issueId>", "Issue ID")
      .requiredOption("--agent-id <id>", "Agent ID")
      .option(
        "--expected-statuses <csv>",
        "Expected current statuses",
        "todo,backlog,blocked",
      )
      .action(async (issueId: string, opts: IssueCheckoutOptions) => {
        try {
          const ctx = resolveCommandContext(opts);
          const payload = checkoutIssueSchema.parse({
            agentId: opts.agentId,
            expectedStatuses: parseCsv(opts.expectedStatuses),
          });
          const updated = await ctx.api.post<Issue>(`/api/issues/${issueId}/checkout`, payload);
          printOutput(updated, { json: ctx.json });
        } catch (err) {
          handleCommandError(err);
        }
      }),
  );

  addCommonClientOptions(
    issue
      .command("release")
      .description("Release issue back to todo and clear assignee")
      .argument("<issueId>", "Issue ID")
      .action(async (issueId: string, opts: BaseClientOptions) => {
        try {
          const ctx = resolveCommandContext(opts);
          const updated = await ctx.api.post<Issue>(`/api/issues/${issueId}/release`, {});
          printOutput(updated, { json: ctx.json });
        } catch (err) {
          handleCommandError(err);
        }
      }),
  );

  registerIssueParityCommands(issue);
}

function registerIssueParityCommands(issue: Command): void {
  const payloadOption = (command: Command) => command.requiredOption("--payload-json <json>", "JSON payload");
  const issuePath = (suffix = "") => ([issueId]: string[]) => `/api/issues/${issueId}${suffix}`;
  const registerGet = (name: string, suffix: string) => registerApiPassthroughCommand(issue, {
    usage: `${name} <issueId>`, description: `${name} for an issue`, method: "get", path: issuePath(suffix),
  });

  registerApiPassthroughCommand(issue, {
    usage: "delete <issueId>", description: "Delete an issue", method: "delete",
    configure: (command) => command.option("--yes", "Confirm deletion"), path: issuePath(),
  });
  for (const [name, suffix] of [
    ["runs", "/runs"], ["live-runs", "/live-runs"], ["active-run", "/active-run"],
    ["approvals", "/approvals"], ["recovery-actions", "/recovery-actions"],
    ["work-products", "/work-products"], ["interactions", "/interactions"],
    ["tree-state", "/tree-control/state"], ["attachments", "/attachments"],
    ["feedback:votes", "/feedback-votes"],
  ] as const) registerGet(name, suffix);
  registerApiPassthroughCommand(issue, {
    usage: "comments <issueId>", description: "List issue comments", method: "get",
    configure: (command) => command.option("--limit <n>", "Result limit"),
    path: ([issueId], options) => `/api/issues/${issueId}/comments${options.limit ? `?limit=${encodeURIComponent(String(options.limit))}` : ""}`,
  });
  for (const [name, method, suffix] of [
    ["read", "post", "/read"], ["unread", "delete", "/read"],
    ["archive", "post", "/inbox-archive"], ["unarchive", "delete", "/inbox-archive"],
  ] as const) registerApiPassthroughCommand(issue, {
    usage: `${name} <issueId>`, description: `${name} issue`, method, path: issuePath(suffix),
  });
  for (const [name, method] of [["comment:get", "get"], ["comment:delete", "delete"]] as const) {
    registerApiPassthroughCommand(issue, {
      usage: `${name} <issueId> <commentId>`, description: `${name} issue comment`, method,
      path: ([issueId, commentId]) => `/api/issues/${issueId}/comments/${commentId}`,
    });
  }
  registerApiPassthroughCommand(issue, {
    usage: "approval:link <issueId> <approvalId>", description: "Link an approval", method: "post",
    path: ([issueId]) => `/api/issues/${issueId}/approvals`, body: ([, approvalId]) => ({ approvalId }),
  });
  registerApiPassthroughCommand(issue, {
    usage: "approval:unlink <issueId> <approvalId>", description: "Unlink an approval", method: "delete",
    path: ([issueId, approvalId]) => `/api/issues/${issueId}/approvals/${approvalId}`,
  });
  registerApiPassthroughCommand(issue, {
    usage: "recovery:resolve <issueId>", description: "Resolve an issue recovery action", method: "post",
    configure: (command) => command.requiredOption("--outcome <outcome>").option("--source-issue-status <status>").option("--action-id <id>"),
    path: issuePath("/recovery-actions/resolve"),
    body: (_args, options) => ({ outcome: options.outcome, sourceIssueStatus: options.sourceIssueStatus, actionId: options.actionId }),
  });

  registerApiPassthroughCommand(issue, {
    usage: "documents <issueId>", description: "List issue documents", method: "get",
    configure: (command) => command.option("--include-system", "Include system documents"),
    path: ([issueId], options) => `/api/issues/${issueId}/documents${options.includeSystem ? "?includeSystem=true" : ""}`,
  });
  for (const [name, method, suffix] of [
    ["document:get", "get", ""], ["document:delete", "delete", ""],
    ["document:lock", "post", "/lock"], ["document:unlock", "post", "/unlock"],
    ["document:revisions", "get", "/revisions"],
  ] as const) registerApiPassthroughCommand(issue, {
    usage: `${name} <issueId> <key>`, description: `${name} issue document`, method,
    path: ([issueId, key]) => `/api/issues/${issueId}/documents/${encodeURIComponent(key)}${suffix}`,
  });
  registerApiPassthroughCommand(issue, {
    usage: "document:put <issueId> <key>", description: "Create or update an issue document", method: "put",
    configure: (command) => command.requiredOption("--body <text>").option("--title <title>"),
    path: ([issueId, key]) => `/api/issues/${issueId}/documents/${encodeURIComponent(key)}`,
    body: (_args, options) => ({ body: options.body, title: options.title }),
  });
  registerApiPassthroughCommand(issue, {
    usage: "document:restore <issueId> <key> <revisionId>", description: "Restore an issue document revision", method: "post",
    path: ([issueId, key, revisionId]) => `/api/issues/${issueId}/documents/${encodeURIComponent(key)}/revisions/${revisionId}/restore`,
  });
  registerApiPassthroughCommand(issue, {
    usage: "work-product:create <issueId>", description: "Create a work product", method: "post", configure: payloadOption,
    path: issuePath("/work-products"), body: (_args, options) => parseJsonOption(options.payloadJson),
  });
  for (const [name, method] of [["work-product:update", "patch"], ["work-product:delete", "delete"]] as const) {
    registerApiPassthroughCommand(issue, {
      usage: `${name} <productId>`, description: `${name} work product`, method,
      configure: method === "patch" ? payloadOption : undefined,
      path: ([productId]) => `/api/work-products/${productId}`,
      body: (_args, options) => parseJsonOption(options.payloadJson),
    });
  }

  registerIssueInteractionCommands(issue, payloadOption, issuePath);
}

function registerIssueInteractionCommands(
  issue: Command,
  payloadOption: (command: Command) => Command,
  issuePath: (suffix?: string) => (args: string[]) => string,
): void {
  registerApiPassthroughCommand(issue, {
    usage: "interaction:create <issueId>", description: "Create an interaction", method: "post", configure: payloadOption,
    path: issuePath("/interactions"), body: (_args, options) => parseJsonOption(options.payloadJson),
  });
  for (const action of ["accept", "reject", "cancel", "respond"] as const) {
    registerApiPassthroughCommand(issue, {
      usage: `interaction:${action} <issueId> <interactionId>`, description: `${action} interaction`, method: "post",
      configure: (command) => {
        command.option("--selected-client-keys <csv>").option("--selected-option-ids <csv>").option("--reason <text>").option("--answers-json <json>");
      },
      path: ([issueId, interactionId]) => `/api/issues/${issueId}/interactions/${interactionId}/${action}`,
      body: (_args, options) => options.selectedOptionIds
        ? { selectedOptionIds: parseCsv(String(options.selectedOptionIds)) }
        : options.selectedClientKeys
          ? { selectedClientKeys: parseCsv(String(options.selectedClientKeys)) }
          : options.answersJson
            ? { answers: parseJsonOption(options.answersJson, "--answers-json") }
            : options.reason ? { reason: options.reason } : {},
    });
  }
  registerApiPassthroughCommand(issue, {
    usage: "tree-preview <issueId>", description: "Preview tree control", method: "post", configure: payloadOption,
    path: issuePath("/tree-control/preview"), body: (_args, options) => parseJsonOption(options.payloadJson),
  });
  registerApiPassthroughCommand(issue, {
    usage: "tree-holds <issueId>", description: "List tree holds", method: "get",
    configure: (command) => command.option("--status <status>").option("--include-members"),
    path: ([issueId], options) => {
      const query = new URLSearchParams();
      if (options.status) query.set("status", String(options.status));
      if (options.includeMembers) query.set("includeMembers", "true");
      return `/api/issues/${issueId}/tree-holds${query.size ? `?${query}` : ""}`;
    },
  });
  registerApiPassthroughCommand(issue, {
    usage: "tree-hold:create <issueId>", description: "Create a tree hold", method: "post", configure: payloadOption,
    path: issuePath("/tree-holds"), body: (_args, options) => parseJsonOption(options.payloadJson),
  });
  registerApiPassthroughCommand(issue, {
    usage: "tree-hold:get <issueId> <holdId>", description: "Get a tree hold", method: "get",
    path: ([issueId, holdId]) => `/api/issues/${issueId}/tree-holds/${holdId}`,
  });
  registerApiPassthroughCommand(issue, {
    usage: "tree-hold:release <issueId> <holdId>", description: "Release a tree hold", method: "post",
    path: ([issueId, holdId]) => `/api/issues/${issueId}/tree-holds/${holdId}/release`,
  });
  for (const [name, method, suffix] of [
    ["attachment:download", "get", "/content"], ["attachment:delete", "delete", ""],
  ] as const) registerApiPassthroughCommand(issue, {
    usage: `${name} <attachmentId>`, description: `${name} attachment`, method,
    path: ([attachmentId]) => `/api/attachments/${attachmentId}${suffix}`,
  });
  registerApiPassthroughCommand(issue, {
    usage: "label:list", description: "List labels", method: "get", requireCompany: true,
    configure: (command) => command.requiredOption("-C, --company-id <id>"),
    path: (_args, _options, context) => `/api/companies/${context.companyId}/labels`,
  });
  registerApiPassthroughCommand(issue, {
    usage: "label:create", description: "Create a label", method: "post", requireCompany: true,
    configure: (command) => command.requiredOption("-C, --company-id <id>").requiredOption("--name <name>").option("--color <color>"),
    path: (_args, _options, context) => `/api/companies/${context.companyId}/labels`,
    body: (_args, options) => ({ name: options.name, color: options.color }),
  });
  registerApiPassthroughCommand(issue, {
    usage: "label:delete <labelId>", description: "Delete a label", method: "delete", path: ([labelId]) => `/api/labels/${labelId}`,
  });
  registerApiPassthroughCommand(issue, {
    usage: "feedback:vote <issueId>", description: "Create a feedback vote", method: "post", configure: payloadOption,
    path: issuePath("/feedback-votes"), body: (_args, options) => parseJsonOption(options.payloadJson),
  });

  addCommonClientOptions(
    issue.command("attachment:upload <issueId>")
      .description("Upload an issue attachment")
      .requiredOption("-C, --company-id <id>", "Company ID")
      .requiredOption("--file <path>", "File path")
      .action(async (issueId: string, opts: BaseClientOptions & { file: string }) => {
        try {
          const context = resolveCommandContext(opts, { requireCompany: true });
          const bytes = await readFile(opts.file);
          const form = new FormData();
          form.append("file", new File([bytes], path.basename(opts.file), { type: inferContentTypeFromPath(opts.file) }));
          const headers: Record<string, string> = {};
          if (context.api.apiKey) headers.authorization = `Bearer ${context.api.apiKey}`;
          if (context.api.runId) headers["x-paperclip-run-id"] = context.api.runId;
          const response = await fetch(`${context.api.apiBase}/api/companies/${context.companyId}/issues/${issueId}/attachments`, {
            method: "POST", headers, body: form,
          });
          if (!response.ok) throw new Error(`Attachment upload failed (${response.status})`);
          printOutput(await response.json(), { json: context.json });
        } catch (error) {
          handleCommandError(error);
        }
      }),
    { includeCompany: false },
  );
}

function parseCsv(value: string | undefined): string[] {
  if (!value) return [];
  return value.split(",").map((v) => v.trim()).filter(Boolean);
}

function parseOptionalInt(value: string | undefined): number | undefined {
  if (value === undefined) return undefined;
  const parsed = Number.parseInt(value, 10);
  if (!Number.isFinite(parsed)) {
    throw new Error(`Invalid integer value: ${value}`);
  }
  return parsed;
}

function parseHiddenAt(value: string | undefined): string | null | undefined {
  if (value === undefined) return undefined;
  if (value.trim().toLowerCase() === "null") return null;
  return value;
}

function filterIssueRows(rows: Issue[], match: string | undefined): Issue[] {
  if (!match?.trim()) return rows;
  const needle = match.trim().toLowerCase();
  return rows.filter((row) => {
    const text = [row.identifier, row.title, row.description]
      .filter((part): part is string => Boolean(part))
      .join("\n")
      .toLowerCase();
    return text.includes(needle);
  });
}
