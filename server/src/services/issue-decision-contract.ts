import type { IssueExecutionPolicy } from "@paperclipai/shared";

const irreversibleOrProtectedPattern = /\b(delete|destroy|purge|drop\s+(?:table|database)|force[- ]?push|rewrite\s+history|production\s+(?:mutation|configuration|restart)|credential\s+(?:change|rotation)|permission\s+change|financial\s+action|live\s+(?:trade|order)|change\s+(?:the\s+)?source\s+of\s+truth)\b/i;

export interface AgentDecisionContractInput {
  actorType: "agent" | "user" | "system";
  title?: string | null;
  description?: string | null;
  priority?: string | null;
  status?: string | null;
  assigneeAgentId?: string | null;
  executionPolicy?: Pick<IssueExecutionPolicy, "decisionContract"> | null;
}

export interface AgentDecisionContractError {
  code: "decision_contract_required" | "decision_disposition_mismatch" | "decision_resource_limit_required" | "uneconomic_execution";
  message: string;
}

export function validateAgentDecisionContract(input: AgentDecisionContractInput): AgentDecisionContractError | null {
  if (input.actorType !== "agent" || !input.assigneeAgentId) return null;
  if (!new Set(["todo", "in_progress"]).has(input.status ?? "todo")) return null;

  const text = `${input.title ?? ""}\n${input.description ?? ""}`;
  const requiresContract = input.priority === "critical" || irreversibleOrProtectedPattern.test(text);
  if (!requiresContract) return null;

  const contract = input.executionPolicy?.decisionContract;
  if (!contract) {
    return {
      code: "decision_contract_required",
      message: "Agent-assigned critical, protected, or hard-to-reverse work requires an executionPolicy.decisionContract before it becomes runnable",
    };
  }
  if (contract.disposition !== "do_now") {
    return {
      code: "decision_disposition_mismatch",
      message: `Decision disposition '${contract.disposition}' cannot create runnable autonomous work; use backlog/blocked or obtain the named decision first`,
    };
  }
  if ([contract.maxMinutes, contract.maxTokens, contract.maxIterations, contract.maxAgents].every((value) => value == null)) {
    return {
      code: "decision_resource_limit_required",
      message: "Runnable high-impact work requires at least one explicit time, token, iteration, or agent limit",
    };
  }
  if (["negligible", "low"].includes(contract.value) && contract.estimatedEffort === "large") {
    return {
      code: "uneconomic_execution",
      message: "Low-value large work must be rejected, deferred, reduced, or explicitly escalated instead of started",
    };
  }
  return null;
}
