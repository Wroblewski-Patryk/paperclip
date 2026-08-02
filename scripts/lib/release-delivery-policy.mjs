export const coolifyBoundProjects = new Set(["Soar", "Roost", "Featherly"]);

export function changedPathKind(filePath) {
  const normalized = String(filePath ?? "").replaceAll("\\", "/");
  if (normalized.startsWith(".codex/") || normalized.startsWith(".agents/")) return "context";
  if (normalized.startsWith("docs/") || normalized.startsWith("history/") || normalized.endsWith(".md")) return "docs";
  if (normalized.includes("package.json") || normalized.includes("pnpm-lock.yaml") || normalized.includes("migrations/")) return "release-risk";
  if (/\.(test|spec)\.[tj]sx?$/.test(normalized) || normalized.includes("/tests/")) return "tests";
  if (/\.(ts|tsx|js|jsx|mjs|cjs|css|scss|json|yaml|yml)$/.test(normalized)) return "code";
  return "other";
}

export function projectDeploymentReadiness(coolifyReport, projectName) {
  const project = coolifyReport?.projects?.[projectName] ?? null;
  if (project) return project;
  if (projectName === "Soar" && coolifyReport?.overall) {
    return {
      overall: coolifyReport.overall,
      source: "legacy_soar_reconciler",
      resourceCount: coolifyReport.resourceCount ?? null,
    };
  }
  return null;
}

export function releaseDecision(repo, sourceControlRepo, deploymentReadiness) {
  const kinds = new Set(repo.batchKinds ?? []);
  const dirty = repo.dirtyLines.length > 0;
  const hasCode = ["code", "tests", "release-risk"].some((kind) => kinds.has(kind));
  const docsOnly = dirty && [...kinds].every((kind) => ["docs", "context"].includes(kind));
  const sourceControlBlocked = dirty && (sourceControlRepo?.dirtyGroups ?? []).some((group) =>
    ["product-code", "dependencies", "scripts", "other"].includes(group.group)
  );
  const deployAutoExpected = coolifyBoundProjects.has(repo.name);
  const deploymentOverall = deploymentReadiness?.overall ?? "unknown";

  if (!repo.exists) {
    return {
      decision: "repo_unavailable",
      pushAllowed: false,
      reason: "Repository status could not be read.",
      deployImpact: "unknown",
    };
  }
  if (!repo.upstream) {
    return {
      decision: "push_blocked_until_upstream_known",
      pushAllowed: false,
      reason: "The current branch has no verified upstream deployment branch.",
      deployImpact: deployAutoExpected ? "blocked" : "unknown",
    };
  }
  if (repo.behind > 0) {
    return {
      decision: "pull_or_reconcile_before_push",
      pushAllowed: false,
      reason: "Local branch is behind upstream; do not push until it is reconciled without force.",
      deployImpact: "blocked",
    };
  }
  if (dirty) {
    return {
      decision: "commit_or_classify_before_push",
      pushAllowed: false,
      reason: docsOnly
        ? "Docs/context changes should be committed or batched locally before push."
        : "Dirty worktree must be classified, validated, and committed before push.",
      deployImpact: hasCode ? "auto-redeploy unknown until committed" : "none_or_batch",
    };
  }
  if (repo.ahead === 0) {
    return {
      decision: "no_push_needed",
      pushAllowed: false,
      reason: "Local branch has no commits ahead of upstream.",
      deployImpact: "none",
    };
  }
  if (deployAutoExpected && deploymentOverall !== "ready") {
    return {
      decision: "push_blocked_until_project_coolify_ready",
      pushAllowed: false,
      reason: `The ${repo.name} batch would trigger production delivery, but project-specific Coolify readiness is ${deploymentOverall}.`,
      deployImpact: "auto-redeploy expected but not yet safe to trust",
    };
  }
  if (sourceControlBlocked) {
    return {
      decision: "push_blocked_by_unclosed_source_control_lane",
      pushAllowed: false,
      reason: "Source-control report still contains behavior/risk lanes requiring specialist review.",
      deployImpact: "blocked",
    };
  }
  if (!hasCode && repo.ahead < 3) {
    return {
      decision: "hold_for_batch",
      pushAllowed: false,
      reason: "Ahead commits look low-risk; hold until a meaningful release batch or blocker exists.",
      deployImpact: deployAutoExpected ? "auto-redeploy expected" : "none_or_batch",
    };
  }
  return {
    decision: "push_candidate_requires_ops_verification",
    pushAllowed: true,
    reason: "Local branch is clean, non-divergent, ahead of upstream, project deployment readiness is current, and the committed delta is a meaningful batch.",
    deployImpact: deployAutoExpected ? "auto-redeploy expected" : "none_or_batch",
  };
}
