export const softwarehouseRoutineExecutionPolicy = [
  "",
  "",
  "Parallel execution policy: Paperclip may run independent lanes in parallel according to agent/runtime limits.",
  "Keep one active execution lane per agent and serialize conflicting work in the same project workspace.",
  "Pending interactions and protected operator gates stay fail-closed; they never authorize push, deploy, restart, secret access, or destructive changes.",
  "Use the current control brief and next legal actions as the execution contract; detailed policy remains in agent instructions, not duplicated in every routine.",
  "Status synchronization is not work. Finish each cycle with one explicit disposition and inspectable evidence.",
  "Done issues stay done unless explicit reopen/resume intent moves them through todo before live checkout.",
].join("\n");

export function withSoftwarehouseRoutineExecutionPolicy(description) {
  const text = description ?? "";
  const withoutOldPolicy = text
    .replace(/\n\nCapacity governor:[\s\S]*?Done issues stay done unless explicit reopen\/resume intent moves them through todo before live checkout\./g, "")
    .replace(/\n\nParallel execution policy:[\s\S]*?Done issues stay done unless explicit reopen\/resume intent moves them through todo before live checkout\./g, "");
  return `${withoutOldPolicy}${softwarehouseRoutineExecutionPolicy}`.trim();
}
