const janitorBulkRefusalPattern = /Refusing to apply \d+ janitor actions at once; inspect first/i;
const janitorBoardCancelDeniedPattern =
  /POST \/api\/heartbeat-runs\/[^/]+\/cancel failed with 403:.*Board access required/i;
const projectMutationGuardBoardCancelDeniedPattern =
  /POST \/api\/heartbeat-runs\/[^/]+\/cancel failed with 403:.*Board access required/i;

export function isNonFatalJanitorBulkRefusal(stepName, failure) {
  if (stepName !== "liveRunJanitor") return false;
  const stderr = `${failure?.stderr ?? ""}`;
  const stdout = `${failure?.stdout ?? ""}`;
  return janitorBulkRefusalPattern.test(stderr) || janitorBulkRefusalPattern.test(stdout);
}

export function isNonFatalJanitorBoardCancelDenied(stepName, failure) {
  if (stepName !== "liveRunJanitor") return false;
  const stderr = `${failure?.stderr ?? ""}`;
  const stdout = `${failure?.stdout ?? ""}`;
  return janitorBoardCancelDeniedPattern.test(stderr) || janitorBoardCancelDeniedPattern.test(stdout);
}

export function isNonFatalProjectMutationGuardBoardCancelDenied(stepName, failure) {
  if (stepName !== "projectMutationGuard") return false;
  const stderr = `${failure?.stderr ?? ""}`;
  const stdout = `${failure?.stdout ?? ""}`;
  return projectMutationGuardBoardCancelDeniedPattern.test(stderr) || projectMutationGuardBoardCancelDeniedPattern.test(stdout);
}

export function dryRunCommandFor(command) {
  return command.filter((part) => part !== "--apply");
}

export function isNonFatalBlockedRootGuardrailTimeout(stepName, failure) {
  if (stepName !== "blockedRootGuardrail") return false;
  if (failure?.timedOut === true) return true;
  const stderr = `${failure?.stderr ?? ""}`;
  const stdout = `${failure?.stdout ?? ""}`;
  return /TypeError:\s*fetch failed/i.test(stderr)
    || /UND_ERR_HEADERS_TIMEOUT/i.test(stderr)
    || /Headers Timeout Error/i.test(stderr)
    || /TypeError:\s*fetch failed/i.test(stdout)
    || /UND_ERR_HEADERS_TIMEOUT/i.test(stdout)
    || /Headers Timeout Error/i.test(stdout);
}

export function isNonFatalSoftwarehouseAuditTimeout(stepName, failure) {
  return stepName === "softwarehouseAudit" && failure?.timedOut === true;
}

export function isNonFatalLearningLoopTimeout(stepName, failure) {
  return stepName === "learningLoop" && failure?.timedOut === true;
}
