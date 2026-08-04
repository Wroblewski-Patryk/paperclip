import { mkdir, readFile, stat, writeFile } from "node:fs/promises";
import { spawnSync } from "node:child_process";
import path from "node:path";

function argValue(name, fallback = null) {
  const index = process.argv.indexOf(name);
  return index >= 0 ? process.argv[index + 1] ?? fallback : fallback;
}

function hasFlag(name) {
  return process.argv.includes(name);
}

const projectName = argValue("--project", "Soar");
const rootArg = argValue("--root", path.resolve(process.cwd(), "..", projectName));
const repoRoot = path.resolve(rootArg);
const statusDir = path.join(repoRoot, "docs", "status");
const graphPath = path.join(repoRoot, "docs", "graphs", "architecture-awareness.json");
const appCompletionPath = path.join(statusDir, "app-completion-index.json");
const apply = hasFlag("--apply");
const observedAt = process.env.PROJECT_TRUTH_OBSERVED_AT ?? new Date().toISOString();
let generatedAt = "1970-01-01T00:00:00.000Z";

const outputPaths = {
  eventChainJson: path.join(statusDir, "event-chain-index.json"),
  eventChainMd: path.join(statusDir, "event-chain-index.md"),
  runtimeErrorJson: path.join(statusDir, "runtime-error-index.json"),
  runtimeErrorMd: path.join(statusDir, "runtime-error-index.md"),
  operationalJson: path.join(statusDir, "operational-readiness-index.json"),
  operationalMd: path.join(statusDir, "operational-readiness-index.md"),
  truthJson: path.join(statusDir, "project-truth-index.json"),
  truthMd: path.join(statusDir, "project-truth-index.md"),
};
const maxLayerSample = Number(process.env.PROJECT_TRUTH_MAX_LAYER_SAMPLE ?? 80);

function toPosix(value) {
  return value.split(path.sep).join("/");
}

async function readJsonIfExists(filePath, fallback) {
  try {
    return JSON.parse(await readFile(filePath, "utf8"));
  } catch {
    return fallback;
  }
}

async function fileExists(filePath) {
  try {
    await stat(filePath);
    return true;
  } catch {
    return false;
  }
}

function lower(value) {
  return String(value ?? "").toLowerCase();
}

function git(args) {
  const result = spawnSync("git", ["-C", repoRoot, ...args], { encoding: "utf8" });
  return result.status === 0 ? result.stdout.trim() : null;
}

function repositorySnapshot() {
  const headSha = git(["rev-parse", "HEAD"]);
  const upstreamSha = git(["rev-parse", "@{upstream}"]);
  const divergence = upstreamSha ? git(["rev-list", "--left-right", "--count", "@{upstream}...HEAD"]) : null;
  const [behind, ahead] = divergence?.split(/\s+/).map(Number) ?? [null, null];
  const aheadPaths = upstreamSha && Number(ahead) > 0
    ? (git(["diff", "--name-only", "@{upstream}..HEAD"]) ?? "").split(/\r?\n/).filter(Boolean)
    : [];
  const controlPlaneOnlyAhead = aheadPaths.length > 0 && aheadPaths.every((file) =>
    /^(?:docs?|history|\.agents|\.codex)(?:\/|$)|^(?:README|AGENTS)\.md$/i.test(file)
  );
  return { headSha, upstreamSha, behind, ahead, aheadPaths, controlPlaneOnlyAhead, releaseSha: controlPlaneOnlyAhead ? upstreamSha : headSha };
}

function deploymentShaFrom(value) {
  if (!value || typeof value !== "object") return null;
  for (const key of ["sha", "commit", "commitSha", "gitSha", "buildSha", "revision"]) {
    if (typeof value[key] === "string" && /^[0-9a-f]{7,40}$/i.test(value[key])) return value[key];
  }
  for (const nested of Object.values(value)) {
    const found = deploymentShaFrom(nested);
    if (found) return found;
  }
  return null;
}

function entityText(entity) {
  return [
    entity.id,
    entity.name,
    entity.type,
    entity.path,
    entity.owner,
    entity.description,
    ...(entity.evidence ?? []),
  ].join("\n");
}

function flowForText(value) {
  const text = lower(value);
  if (/(login|logout|register|session|auth|user)/.test(text)) return "Account access";
  if (/(subscription|billing|stripe|checkout|payment|entitlement|plan)/.test(text)) return "Subscription and entitlement";
  if (/(binance|gateio|gate\.io|exchange|api key|credential|secret)/.test(text)) return "Exchange connection and configuration";
  if (/(dashboard|home|overview|widget)/.test(text)) return "Dashboard overview";
  if (/(dca|bot|strategy|trade|order|position|wallet|market|worker|runtime)/.test(text)) return "Trading operation";
  if (/(settings|profile|config)/.test(text)) return "User configuration";
  if (/(admin)/.test(text)) return "Admin operation";
  return "Unclassified user workflow";
}

function layerForEntity(entity) {
  const text = lower(entityText(entity));
  if (entity.type === "api_endpoint" || /apps\/api|server|controller|route|router|api\//.test(text)) return "backend";
  if (entity.type === "route" || entity.type === "component" || /apps\/web|web\/src|frontend|component|page|screen/.test(text)) return "frontend";
  if (/worker|queue|job|runtime|scheduler|stream|engine/.test(text)) return "worker";
  if (entity.type === "test" || /\.test\.|\.spec\.|playwright|vitest/.test(text)) return "test";
  if (entity.type === "document" || /docs\//.test(text)) return "docs";
  if (entity.type === "model" || entity.type === "migration" || /prisma|drizzle|migration|schema|database/.test(text)) return "data";
  return "support";
}

function relationKey(relation) {
  return `${relation.from}->${relation.to}`;
}

function buildRelations(entities, relations) {
  const entitiesById = new Map(entities.map((entity) => [entity.id, entity]));
  const out = new Map();
  const inbound = new Map();
  for (const relation of relations) {
    if (!entitiesById.has(relation.from) || !entitiesById.has(relation.to)) continue;
    const outList = out.get(relation.from) ?? [];
    outList.push(relation.to);
    out.set(relation.from, outList);
    const inList = inbound.get(relation.to) ?? [];
    inList.push(relation.from);
    inbound.set(relation.to, inList);
  }
  return { entitiesById, out, inbound };
}

function buildEventChainIndex({ graph, appCompletion }) {
  const entities = graph.entities ?? [];
  const relations = graph.relations ?? [];
  const relationGraph = buildRelations(entities, relations);
  const relationSet = new Set(relations.map(relationKey));
  const flowNames = new Set([
    ...(appCompletion.flows ?? []).map((flow) => flow.userFlow),
    ...entities.map((entity) => flowForText(entityText(entity))),
  ]);

  const chains = [...flowNames].sort().map((flow) => {
    const seeds = entities.filter((entity) => flowForText(entityText(entity)) === flow);
    const connected = new Map();
    for (const seed of seeds) {
      connected.set(seed.id, seed);
      for (const id of relationGraph.out.get(seed.id) ?? []) {
        const entity = relationGraph.entitiesById.get(id);
        if (entity) connected.set(id, entity);
      }
      for (const id of relationGraph.inbound.get(seed.id) ?? []) {
        const entity = relationGraph.entitiesById.get(id);
        if (entity) connected.set(id, entity);
      }
    }
    const all = [...connected.values()];
    const groupedLayers = {
      frontend: all.filter((entity) => layerForEntity(entity) === "frontend"),
      backend: all.filter((entity) => layerForEntity(entity) === "backend"),
      worker: all.filter((entity) => layerForEntity(entity) === "worker"),
      data: all.filter((entity) => layerForEntity(entity) === "data"),
      tests: all.filter((entity) => layerForEntity(entity) === "test"),
      docs: all.filter((entity) => layerForEntity(entity) === "docs"),
    };
    const layers = Object.fromEntries(
      Object.entries(groupedLayers).map(([layer, layerEntities]) => [layer, {
        count: layerEntities.length,
        sample: layerEntities.slice(0, maxLayerSample).map(entitySummary),
        truncated: layerEntities.length > maxLayerSample,
      }]),
    );
    const requiredLayers = ["frontend", "backend", "worker"];
    const missingLayers = requiredLayers.filter((layer) => layers[layer].count === 0);
    const linkedRelationCount = relations.filter((relation) =>
      connected.has(relation.from) && connected.has(relation.to) && relationSet.has(relationKey(relation))
    ).length;
    return {
      userFlow: flow,
      entityCount: all.length,
      linkedRelationCount,
      layers,
      missingLayers,
      status: missingLayers.length === 0 ? "chain_indexed" : "chain_incomplete",
      nextOwner: missingLayers.length > 0 ? "CTO Architect + Engineering Delivery Lead" : "Project Manager",
      nextAction: missingLayers.length > 0
        ? `Map ${missingLayers.join(", ")} entities into this flow before claiming holistic status.`
        : "Use linked entities to drive repair, verification, docs, and deploy proof.",
    };
  });

  return {
    observedAt,
    generatedAt,
    project: projectName,
    root: toPosix(repoRoot),
    sourceGraph: toPosix(path.relative(repoRoot, graphPath)),
    counts: {
      chains: chains.length,
      incompleteChains: chains.filter((chain) => chain.status !== "chain_indexed").length,
    },
    chains,
  };
}

function entitySummary(entity) {
  return {
    id: entity.id,
    type: entity.type,
    name: entity.name,
    path: entity.path,
    owner: entity.owner,
    status: entity.status,
  };
}

function buildRuntimeErrorIndex({ appCompletion, publicProbe }) {
  const items = [];
  if (publicProbe?.status === "failed") {
    items.push({
      id: "production-public-probe",
      severity: "critical",
      layer: "production",
      status: "failing",
      summary: publicProbe.summary,
      evidence: publicProbe.evidence,
      nextOwner: "Deployment Reliability Engineer + Ops Release Lead",
      nextAction: "Create or resume a release mutation permit for read-only diagnosis, then rollback/restart/redeploy only with named resource, SHA/image, rollback, and smoke proof.",
    });
  }
  for (const item of appCompletion.priorityReviewItems ?? []) {
    if (item.risk === "blocked") {
      items.push({
        id: item.id,
        severity: "high",
        layer: item.kind === "api_endpoint" ? "backend" : "application",
        status: "blocked",
        summary: `${item.userFlow}: ${item.name}`,
        evidence: [item.path].filter(Boolean),
        nextOwner: item.owner ?? "Project Manager",
        nextAction: "Convert blocked app-completion item into a one-owner repair/proof issue with exact verification.",
      });
    }
  }
  return {
    generatedAt,
    project: projectName,
    root: toPosix(repoRoot),
    counts: {
      runtimeFindings: items.length,
      criticalFindings: items.filter((item) => item.severity === "critical").length,
      blockedFindings: items.filter((item) => item.status === "blocked").length,
    },
    findings: items,
  };
}

function appCompletionGapForItem(item) {
  const risk = String(item.risk ?? "");
  if (!risk || risk === "ok" || risk === "blocked") return null;
  const ownerByRisk = {
    needs_browser_review: "QA Regression Lead + Frontend Experience Lead",
    missing_test_link: "Test Automation Engineer + QA Regression Lead",
    missing_doc_link: "Docs Memory Lead + Project Manager",
    implemented_needs_proof: "QA Regression Lead + Project Manager",
  };
  const actionByRisk = {
    needs_browser_review: "Capture browser/clickthrough proof or create the smallest Frontend/UX repair lane for this visible flow.",
    missing_test_link: "Add or link the smallest relevant automated/manual verification for this flow before claiming it works.",
    missing_doc_link: "Link or update the source-of-truth docs/status entry for this flow so future agents can reason from evidence.",
    implemented_needs_proof: "Run and record fresh proof for the implemented behavior, then update completion/project-truth indexes.",
  };
  return {
    kind: "app_completion_gap",
    severity: risk === "needs_browser_review" ? "high" : "medium",
    userFlow: item.userFlow ?? null,
    summary: `${item.userFlow ?? "Unclassified flow"}: ${item.name ?? item.id} has app-completion risk ${risk}.`,
    nextOwner: ownerByRisk[risk] ?? item.owner ?? "Project Manager",
    nextAction: actionByRisk[risk] ?? "Create the smallest owner-scoped proof/repair lane for this app-completion risk.",
    evidence: [item.path].filter(Boolean),
    sourceItemId: item.id ?? null,
    risk,
  };
}

function buildAppCompletionGapIndex(appCompletion) {
  const priorityItems = Array.isArray(appCompletion.priorityReviewItems)
    ? appCompletion.priorityReviewItems
    : [];
  const itemGaps = priorityItems.map(appCompletionGapForItem).filter(Boolean);
  const grouped = new Map();
  for (const gap of itemGaps) {
    const key = `${gap.userFlow ?? "Unclassified user workflow"}:${gap.risk}`;
    const current = grouped.get(key) ?? { ...gap, sourceItemIds: [], evidence: [], affectedItemCount: 0 };
    current.affectedItemCount += 1;
    if (gap.sourceItemId) current.sourceItemIds.push(gap.sourceItemId);
    for (const evidence of gap.evidence ?? []) {
      if (!current.evidence.includes(evidence) && current.evidence.length < 20) current.evidence.push(evidence);
    }
    current.summary = `${gap.userFlow ?? "Unclassified user workflow"} has ${current.affectedItemCount} item(s) with app-completion risk ${gap.risk}.`;
    grouped.set(key, current);
  }
  const gaps = [...grouped.values()];
  const counts = appCompletion.counts ?? {};
  const knownAppCompletionGaps = Number.isFinite(Number(counts.appCompletionRiskItems))
    ? Number(counts.appCompletionRiskItems)
    : gaps.length;
  const knownRiskItems = Number.isFinite(Number(counts.riskItems))
    ? Number(counts.riskItems)
    : priorityItems.length;
  const priorityReviewLimit = Number.isFinite(Number(counts.priorityReviewLimit))
    ? Number(counts.priorityReviewLimit)
    : priorityItems.length;
  const priorityReviewTruncated = Boolean(counts.priorityReviewTruncated)
    || knownRiskItems > priorityItems.length;
  return {
    generatedAt,
    project: projectName,
    root: toPosix(repoRoot),
    counts: {
      priorityReviewItems: priorityItems.length,
      priorityReviewLimit,
      priorityReviewTruncated,
      indexedAppCompletionGaps: gaps.length,
      appCompletionGaps: gaps.length,
      affectedAppCompletionItems: knownAppCompletionGaps,
      knownAppCompletionRiskItems: knownRiskItems,
      knownBlockedAppCompletionItems: Number(counts.blocked ?? 0),
      needsBrowserReview: Number(counts.needsBrowserReview ?? gaps.filter((gap) => gap.risk === "needs_browser_review").length),
      missingTestLink: Number(counts.missingTestLink ?? gaps.filter((gap) => gap.risk === "missing_test_link").length),
      missingDocLink: Number(counts.missingDocLink ?? gaps.filter((gap) => gap.risk === "missing_doc_link").length),
      implementedNeedsProof: Number(counts.implementedNeedsProof ?? gaps.filter((gap) => gap.risk === "implemented_needs_proof").length),
    },
    gaps,
  };
}

function buildOperationalReadinessIndex({ eventChainIndex, runtimeErrorIndex, appCompletionGapIndex, appCompletion, publicProbe, missingInputs, repository }) {
  const sourceTimestamp = Date.parse(generatedAt);
  const sourceFresh = Number.isFinite(sourceTimestamp) && (Date.now() - sourceTimestamp) <= 24 * 3_600_000;
  const releaseAligned = Boolean(repository.upstreamSha)
    && (Number(repository.ahead) === 0 || repository.controlPlaneOnlyAhead)
    && Number(repository.behind) === 0;
  const deployedSha = publicProbe?.deployedSha ?? null;
  const deploymentAligned = Boolean(deployedSha && repository.releaseSha
    && (repository.releaseSha.startsWith(deployedSha) || deployedSha.startsWith(repository.releaseSha)));
  const gates = [
    {
      gate: "source_freshness",
      status: sourceFresh ? "fresh" : "stale",
      evidence: generatedAt,
      requiredFor: "current project truth rather than historical evidence",
    },
    {
      gate: "release_branch_alignment",
      status: releaseAligned ? (repository.controlPlaneOnlyAhead ? "control_plane_only_ahead" : "aligned") : repository.upstreamSha ? "diverged" : "unknown",
      evidence: repository,
      requiredFor: "an exact source release candidate",
    },
    {
      gate: "deployment_identity",
      status: deploymentAligned ? "aligned" : deployedSha ? "mismatch" : "unknown",
      evidence: { sourceSha: repository.headSha, releaseSha: repository.releaseSha, deployedSha },
      requiredFor: "proof that the owner-visible runtime matches source",
    },
    {
      gate: "architecture_exports",
      status: missingInputs.includes(toPosix(path.relative(repoRoot, graphPath))) ? "missing" : "present",
      evidence: "docs/graphs/architecture-awareness.json",
      requiredFor: "cross-layer ownership and dependency tracing",
    },
    {
      gate: "app_completion_index",
      status: (appCompletion.counts?.items ?? 0) > 0 ? "present" : "missing_or_empty",
      evidence: "docs/status/app-completion-index.json",
      requiredFor: "user-flow works/fails/unknown classification",
    },
    {
      gate: "event_chain_index",
      status: eventChainIndex.counts.incompleteChains === 0 ? "covered" : "incomplete",
      evidence: "docs/status/event-chain-index.json",
      requiredFor: "backend/frontend/worker impact analysis",
    },
    {
      gate: "runtime_error_index",
      status: runtimeErrorIndex.counts.criticalFindings === 0 ? "covered" : "critical_findings",
      evidence: "docs/status/runtime-error-index.json",
      requiredFor: "agent-owned bug discovery and repair routing",
    },
    {
      gate: "app_completion_risk_index",
      status: appCompletionGapIndex.counts.appCompletionGaps === 0 ? "covered" : "gaps_indexed",
      evidence: "docs/status/app-completion-index.json",
      requiredFor: "user-facing flow verification across frontend, backend, tests, docs, auth/config, and browser proof",
    },
    {
      gate: "public_runtime_probe",
      status: publicProbe?.status ?? "unknown",
      evidence: publicProbe?.evidence ?? [],
      requiredFor: "production parity with local behavior",
    },
  ];
  return {
    observedAt,
    generatedAt,
    project: projectName,
    root: toPosix(repoRoot),
    repository,
    deployment: { deployedSha, matchesSource: deploymentAligned },
    status: gates.every((gate) => ["present", "covered", "gaps_indexed", "pass", "fresh", "aligned", "control_plane_only_ahead"].includes(gate.status))
      ? "ready_for_repair_flow"
      : "truth_incomplete",
    gates,
    nextAction: "Use the first failing gate to create or wake the smallest owner-scoped repair/proof lane; do not rely on narrative status.",
  };
}

function buildProjectTruthIndex({ eventChainIndex, runtimeErrorIndex, appCompletionGapIndex, operationalReadinessIndex, appCompletion, repository, publicProbe }) {
  const eventChainGaps = eventChainIndex.chains.filter((chain) => chain.status !== "chain_indexed");
  const operationalGateGaps = operationalReadinessIndex.gates.filter((gate) => !["present", "covered", "gaps_indexed", "pass", "fresh", "aligned", "control_plane_only_ahead"].includes(gate.status));
  const gaps = [
    ...eventChainGaps
      .map((chain) => ({
        kind: "event_chain_gap",
        severity: "high",
        userFlow: chain.userFlow,
        summary: `Missing ${chain.missingLayers.join(", ")} layer(s) in event chain.`,
        nextOwner: chain.nextOwner,
        nextAction: chain.nextAction,
      })),
    ...runtimeErrorIndex.findings.map((finding) => ({
      kind: "runtime_error",
      severity: finding.severity,
      userFlow: null,
      summary: finding.summary,
      nextOwner: finding.nextOwner,
      nextAction: finding.nextAction,
    })),
    ...appCompletionGapIndex.gaps,
    ...operationalGateGaps
      .map((gate) => ({
        kind: "operational_gate_gap",
        severity: gate.status === "critical_findings" ? "critical" : "high",
        userFlow: null,
        summary: `${gate.gate}: ${gate.status}`,
        nextOwner: gate.gate === "public_runtime_probe" ? "Deployment Reliability Engineer" : "Project Manager",
        nextAction: `Restore ${gate.requiredFor}.`,
      })),
  ];
  const totalKnownGaps = eventChainGaps.length
    + runtimeErrorIndex.counts.runtimeFindings
    + appCompletionGapIndex.counts.appCompletionGaps
    + operationalGateGaps.length;

  return {
    observedAt,
    generatedAt,
    project: projectName,
    root: toPosix(repoRoot),
    repository,
    deployment: {
      deployedSha: publicProbe?.deployedSha ?? null,
      matchesSource: operationalReadinessIndex.deployment.matchesSource,
      probeStatus: publicProbe?.status ?? "unknown",
    },
    status: totalKnownGaps === 0 ? "known_and_routable" : "gaps_require_routing",
    counts: {
      appCompletionItems: appCompletion.counts?.items ?? 0,
      eventChains: eventChainIndex.counts.chains,
      incompleteEventChains: eventChainIndex.counts.incompleteChains,
      runtimeFindings: runtimeErrorIndex.counts.runtimeFindings,
      criticalRuntimeFindings: runtimeErrorIndex.counts.criticalFindings,
      appCompletionGaps: appCompletionGapIndex.counts.appCompletionGaps,
      indexedAppCompletionGaps: appCompletionGapIndex.counts.indexedAppCompletionGaps,
      knownAppCompletionRiskItems: appCompletionGapIndex.counts.knownAppCompletionRiskItems,
      appCompletionPriorityReviewItems: appCompletionGapIndex.counts.priorityReviewItems,
      appCompletionPriorityReviewTruncated: appCompletionGapIndex.counts.priorityReviewTruncated,
      operationalGateGaps: operationalGateGaps.length,
      indexedGaps: gaps.length,
      totalGaps: totalKnownGaps,
    },
    firstGap: gaps[0] ?? null,
    gaps,
  };
}

function renderEventChainMarkdown(index) {
  return [
    "# Event Chain Index",
    "",
    `Generated: ${index.generatedAt}`,
    `Project: ${index.project}`,
    "",
    "This index maps user-facing flows to backend, frontend, worker, data, test, and docs entities.",
    "",
    `Incomplete chains: ${index.counts.incompleteChains}/${index.counts.chains}`,
    "",
      "| Flow | Status | Frontend | Backend | Worker | Missing | Next owner |",
      "| --- | --- | ---: | ---: | ---: | --- | --- |",
      ...index.chains.map((chain) =>
      `| ${chain.userFlow} | ${chain.status} | ${chain.layers.frontend.count} | ${chain.layers.backend.count} | ${chain.layers.worker.count} | ${chain.missingLayers.join(", ") || "-"} | ${chain.nextOwner} |`
    ),
    "",
  ].join("\n");
}

function renderRuntimeErrorMarkdown(index) {
  return [
    "# Runtime Error Index",
    "",
    `Generated: ${index.generatedAt}`,
    `Project: ${index.project}`,
    "",
    `Critical findings: ${index.counts.criticalFindings}`,
    "",
    index.findings.length
      ? [
        "| Severity | Layer | Status | Summary | Next owner |",
        "| --- | --- | --- | --- | --- |",
        ...index.findings.map((finding) =>
          `| ${finding.severity} | ${finding.layer} | ${finding.status} | ${String(finding.summary).replaceAll("|", "\\|")} | ${finding.nextOwner} |`
        ),
      ].join("\n")
      : "_No runtime findings indexed._",
    "",
  ].join("\n");
}

function renderOperationalMarkdown(index) {
  return [
    "# Operational Readiness Index",
    "",
    `Generated: ${index.generatedAt}`,
    `Project: ${index.project}`,
    `Status: ${index.status}`,
    "",
    "| Gate | Status | Required for |",
    "| --- | --- | --- |",
    ...index.gates.map((gate) =>
      `| ${gate.gate} | ${gate.status} | ${gate.requiredFor} |`
    ),
    "",
  ].join("\n");
}

function renderTruthMarkdown(index) {
  return [
    "# Project Truth Index",
    "",
    `Generated: ${index.generatedAt}`,
    `Observed: ${index.observedAt}`,
    `Project: ${index.project}`,
    `Status: ${index.status}`,
    `Source HEAD: ${index.repository?.headSha ?? "unknown"}`,
    `Source ahead/behind: ${index.repository?.ahead ?? "unknown"}/${index.repository?.behind ?? "unknown"}`,
    `Deployed SHA: ${index.deployment?.deployedSha ?? "unknown"}`,
    "",
    "This is the routing surface agents should use before guessing whether an app works.",
    "",
    "| Metric | Count |",
    "| --- | ---: |",
    ...Object.entries(index.counts).map(([key, value]) => `| ${key} | ${value} |`),
    "",
    "## First Gap",
    "",
    index.firstGap
      ? `- ${index.firstGap.severity}: ${index.firstGap.summary}\n- Owner: ${index.firstGap.nextOwner}\n- Next action: ${index.firstGap.nextAction}`
      : "- none",
    "",
    "## Gaps",
    "",
    index.gaps.length
      ? [
        "| Severity | Kind | Flow | Summary | Next owner |",
        "| --- | --- | --- | --- | --- |",
        ...index.gaps.slice(0, 80).map((gap) =>
          `| ${gap.severity} | ${gap.kind} | ${gap.userFlow ?? "-"} | ${String(gap.summary).replaceAll("|", "\\|")} | ${gap.nextOwner} |`
        ),
      ].join("\n")
      : "_No gaps indexed._",
    "",
  ].join("\n");
}

async function publicProbeForProject() {
  const defaultPublicUrls = {
    soar: {
      web: "https://soar.luckysparrow.ch",
      api: "https://api.soar.luckysparrow.ch",
    },
    roost: {
      web: "https://roost.luckysparrow.ch",
      api: "https://api.roost.luckysparrow.ch",
    },
    featherly: {
      web: "https://wroblewskipatryk.pl",
      requireBuildInfo: false,
    },
  };
  const defaults = defaultPublicUrls[projectName.toLowerCase()] ?? {};
  const webUrl = process.env[`${projectName.toUpperCase()}_PUBLIC_URL`] ?? defaults.web;
  const apiUrl = process.env[`${projectName.toUpperCase()}_API_PUBLIC_URL`] ?? defaults.api;
  if (!webUrl && !apiUrl) return { status: "unknown", summary: "No public URL configured.", evidence: [], checks: [] };

  const checks = [
    webUrl ? { name: "web_home", url: webUrl, required: true } : null,
    webUrl && defaults.requireBuildInfo !== false ? { name: "web_build_info", url: new URL("/api/build-info", webUrl).toString(), required: true } : null,
    apiUrl ? { name: "api_health", url: new URL("/health", apiUrl).toString(), required: true } : null,
    apiUrl ? { name: "api_ready", url: new URL("/ready", apiUrl).toString(), required: true } : null,
  ].filter(Boolean);

  const results = [];
  for (const check of checks) {
    try {
      const response = await fetch(check.url, {
        signal: AbortSignal.timeout(15_000),
        headers: { "Cache-Control": "no-cache" },
      });
      const body = await response.text();
      const bodyPrefix = response.ok ? "" : body.slice(0, 120);
      let responseData = null;
      if (check.name === "web_build_info" && response.ok) {
        try { responseData = JSON.parse(body); } catch { responseData = null; }
      }
      results.push({
        ...check,
        status: response.ok ? "pass" : "failed",
        httpStatus: response.status,
        summary: `${check.name} ${check.url} returned ${response.status}${bodyPrefix ? `: ${bodyPrefix}` : ""}`,
        deployedSha: deploymentShaFrom(responseData),
      });
    } catch (error) {
      results.push({
        ...check,
        status: "failed",
        summary: `${check.name} ${check.url} probe failed: ${error?.message ?? String(error)}`,
      });
    }
  }

  const failed = results.filter((result) => result.required && result.status !== "pass");
  const deployedSha = results.find((result) => result.name === "web_build_info")?.deployedSha ?? null;
  return {
    status: failed.length === 0 ? "pass" : "failed",
    summary: failed.length === 0
      ? `All public runtime probes passed: ${results.map((result) => result.name).join(", ")}.`
      : failed.map((result) => result.summary).join("; "),
    evidence: results.map((result) => result.url),
    checks: results,
    deployedSha,
  };
}

const [graph, appCompletion, publicProbe] = await Promise.all([
  readJsonIfExists(graphPath, { entities: [], relations: [] }),
  readJsonIfExists(appCompletionPath, { counts: {}, flows: [], priorityReviewItems: [] }),
  publicProbeForProject(),
]);

generatedAt = [
  graph.generated_at,
  graph.generatedAt,
  appCompletion.generatedAt,
  publicProbe.generatedAt,
]
  .filter((value) => typeof value === "string" && value.length > 0)
  .sort()
  .at(-1) ?? generatedAt;

const missingInputs = [];
if (!await fileExists(graphPath)) missingInputs.push(toPosix(path.relative(repoRoot, graphPath)));
if (!await fileExists(appCompletionPath)) missingInputs.push(toPosix(path.relative(repoRoot, appCompletionPath)));
const repository = repositorySnapshot();

const eventChainIndex = buildEventChainIndex({ graph, appCompletion });
const runtimeErrorIndex = buildRuntimeErrorIndex({ appCompletion, publicProbe });
const appCompletionGapIndex = buildAppCompletionGapIndex(appCompletion);
const operationalReadinessIndex = buildOperationalReadinessIndex({
  eventChainIndex,
  runtimeErrorIndex,
  appCompletionGapIndex,
  appCompletion,
  publicProbe,
  missingInputs,
  repository,
});
const projectTruthIndex = buildProjectTruthIndex({
  eventChainIndex,
  runtimeErrorIndex,
  appCompletionGapIndex,
  operationalReadinessIndex,
  appCompletion,
  repository,
  publicProbe,
});

if (apply) {
  await mkdir(statusDir, { recursive: true });
  await Promise.all([
    writeFile(outputPaths.eventChainJson, `${JSON.stringify(eventChainIndex, null, 2)}\n`),
    writeFile(outputPaths.eventChainMd, renderEventChainMarkdown(eventChainIndex)),
    writeFile(outputPaths.runtimeErrorJson, `${JSON.stringify(runtimeErrorIndex, null, 2)}\n`),
    writeFile(outputPaths.runtimeErrorMd, renderRuntimeErrorMarkdown(runtimeErrorIndex)),
    writeFile(outputPaths.operationalJson, `${JSON.stringify(operationalReadinessIndex, null, 2)}\n`),
    writeFile(outputPaths.operationalMd, renderOperationalMarkdown(operationalReadinessIndex)),
    writeFile(outputPaths.truthJson, `${JSON.stringify(projectTruthIndex, null, 2)}\n`),
    writeFile(outputPaths.truthMd, renderTruthMarkdown(projectTruthIndex)),
  ]);
}

console.log(JSON.stringify({
  mode: apply ? "apply" : "dry-run",
  generatedAt,
  repository,
  project: projectName,
  root: toPosix(repoRoot),
  missingInputs,
  outputs: Object.fromEntries(Object.entries(outputPaths).map(([key, value]) => [key, toPosix(value)])),
  publicProbe,
  eventChain: eventChainIndex.counts,
  runtimeErrors: runtimeErrorIndex.counts,
  appCompletionGaps: appCompletionGapIndex.counts,
  operationalReadiness: {
    status: operationalReadinessIndex.status,
    gates: operationalReadinessIndex.gates,
  },
  projectTruth: {
    status: projectTruthIndex.status,
    counts: projectTruthIndex.counts,
    firstGap: projectTruthIndex.firstGap,
    gaps: projectTruthIndex.gaps,
  },
}, null, 2));
