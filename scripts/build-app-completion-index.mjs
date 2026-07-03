import { readFile, mkdir, writeFile } from "node:fs/promises";
import path from "node:path";

function argValue(name, fallback = null) {
  const index = process.argv.indexOf(name);
  return index >= 0 ? process.argv[index + 1] ?? fallback : fallback;
}

const projectName = argValue("--project", "Soar");
const rootArg = argValue("--root", path.resolve(process.cwd(), "..", projectName));
const outArg = argValue("--out", path.join(path.resolve(rootArg), "docs"));
const repoRoot = path.resolve(rootArg);
const outputRoot = path.resolve(outArg);
const graphPath = path.join(outputRoot, "graphs", "architecture-awareness.json");
const statusDir = path.join(outputRoot, "status");
const jsonOut = path.join(statusDir, "app-completion-index.json");
const mdOut = path.join(statusDir, "app-completion-index.md");
const generatedAt = new Date().toISOString();

function rel(value) {
  return value.split(path.sep).join("/");
}

function lower(value) {
  return String(value ?? "").toLowerCase();
}

function includesAny(value, needles) {
  const text = lower(value);
  return needles.some((needle) => text.includes(needle));
}

function hasSubscriptionPlanPhrase(value) {
  const text = String(value ?? "");
  return /\b(subscription|billing|payment|pricing|paid|free|starter|pro|premium|enterprise)\s+plan\b/i.test(text)
    || /\bplan\s+(tier|price|pricing|checkout|subscription|billing|payment)\b/i.test(text);
}

function hasSubscriptionIntent(value) {
  return includesAny(value, ["subscription", "billing", "stripe", "checkout", "payment"])
    || hasSubscriptionPlanPhrase(value);
}

function entityText(entity) {
  return [
    entity.name,
    entity.path,
    entity.description,
    entity.owner,
    ...(entity.evidence ?? []),
  ].join("\n");
}

function statusBucket(entity) {
  if (entity.status === "verified") return "verified";
  if (entity.status === "tested") return "tested";
  if (entity.status === "implemented") return "implemented_needs_proof";
  if (entity.status === "blocked") return "blocked";
  if (entity.status === "planned" || entity.status === "in_progress") return entity.status;
  return "unknown";
}

function routeKind(entity) {
  const text = entityText(entity);
  if (entity.type === "route") return "screen_or_route";
  if (entity.type === "component" && includesAny(text, ["/pages/", "/app/", "screen", "page", "view"])) {
    return "screen_or_route";
  }
  if (entity.type === "api_endpoint") return "api_endpoint";
  return null;
}

function gateForEntity(entity) {
  const text = entityText(entity);
  const gates = [];
  if (includesAny(text, ["login", "logout", "session", "auth", "register", "user"])) gates.push("auth");
  if (hasSubscriptionIntent(text)) gates.push("subscription");
  if (includesAny(text, ["config", "settings", "api key", "apikey", "credential", "secret", "exchange"])) gates.push("configuration");
  if (includesAny(text, ["binance"])) gates.push("binance");
  if (includesAny(text, ["gateio", "gate.io", "gate io"])) gates.push("gateio");
  return gates;
}

function userFlowName(entity) {
  const text = entityText(entity);
  if (includesAny(text, ["login", "register", "session", "auth"])) return "Account access";
  if (hasSubscriptionIntent(text)) return "Subscription and entitlement";
  if (includesAny(text, ["binance", "gateio", "gate.io", "exchange", "api key", "credential"])) return "Exchange connection and configuration";
  if (includesAny(text, ["dashboard", "home", "overview"])) return "Dashboard overview";
  if (includesAny(text, ["bot", "strategy", "trade", "order", "position", "wallet", "market"])) return "Trading operation";
  if (includesAny(text, ["settings", "profile", "config"])) return "User configuration";
  if (includesAny(text, ["admin"])) return "Admin operation";
  return "Unclassified user workflow";
}

function hasLinkedType(entity, relationsByFrom, relationsByTo, entitiesById, type) {
  const relationTargets = relationsByFrom.get(entity.id) ?? [];
  const relationSources = relationsByTo.get(entity.id) ?? [];
  return relationTargets.some((targetId) => entitiesById.get(targetId)?.type === type)
    || relationSources.some((sourceId) => entitiesById.get(sourceId)?.type === type);
}

function evidenceState(entity, relationsByFrom, relationsByTo, entitiesById) {
  const hasTest = hasLinkedType(entity, relationsByFrom, relationsByTo, entitiesById, "test")
    || includesAny(entityText(entity), ["test", "spec", "playwright", "vitest"]);
  const hasDoc = hasLinkedType(entity, relationsByFrom, relationsByTo, entitiesById, "document")
    || includesAny(entityText(entity), ["docs/", "readme", "architecture"]);
  const needsBrowserProof = routeKind(entity) === "screen_or_route";
  return {
    hasTest,
    hasDoc,
    needsBrowserProof,
    needsScreenshotReview: needsBrowserProof && entity.status !== "verified",
  };
}

function isAppCompletionCandidate(entity, kind) {
  if (["agent", "document", "task", "test"].includes(entity.type)) return false;
  return Boolean(kind)
    || ["api_endpoint", "component", "feature", "function", "module", "route"].includes(entity.type);
}

function completionRisk(item) {
  if (item.status === "blocked") return "blocked";
  if (item.evidence.needsScreenshotReview) return "needs_browser_review";
  if (!item.evidence.hasTest) return "missing_test_link";
  if (!item.evidence.hasDoc) return "missing_doc_link";
  if (item.status === "implemented_needs_proof" && item.kind !== "api_endpoint") return "implemented_needs_proof";
  return "ok";
}

const graph = JSON.parse(await readFile(graphPath, "utf8"));
const entities = graph.entities ?? [];
const relations = graph.relations ?? [];
const entitiesById = new Map(entities.map((entity) => [entity.id, entity]));
const relationsByFrom = new Map();
const relationsByTo = new Map();
for (const relation of relations) {
  const fromList = relationsByFrom.get(relation.from) ?? [];
  fromList.push(relation.to);
  relationsByFrom.set(relation.from, fromList);

  const toList = relationsByTo.get(relation.to) ?? [];
  toList.push(relation.from);
  relationsByTo.set(relation.to, toList);
}

const items = entities
  .map((entity) => {
    const kind = routeKind(entity);
    const gates = gateForEntity(entity);
    if (!isAppCompletionCandidate(entity, kind)) return null;
    const userFlow = kind || gates.length > 0 || entity.type === "feature" || ["function", "module"].includes(entity.type)
      ? userFlowName(entity)
      : null;
    if (!userFlow) return null;
    const evidence = evidenceState(entity, relationsByFrom, relationsByTo, entitiesById);
    const item = {
      id: entity.id,
      type: entity.type,
      kind: kind ?? "feature_or_capability",
      name: entity.name,
      path: entity.path,
      owner: entity.owner,
      status: statusBucket(entity),
      userFlow,
      gates,
      evidence,
      relatedEntityCount: (entity.related_entities ?? []).length + (relationsByFrom.get(entity.id) ?? []).length,
    };
    return { ...item, risk: completionRisk(item) };
  })
  .filter(Boolean)
  .sort((a, b) => `${a.userFlow}:${a.kind}:${a.path}`.localeCompare(`${b.userFlow}:${b.kind}:${b.path}`));

const byFlow = new Map();
for (const item of items) {
  const flow = byFlow.get(item.userFlow) ?? {
    userFlow: item.userFlow,
    total: 0,
    risks: {},
    gates: {},
  };
  flow.total += 1;
  flow.risks[item.risk] = (flow.risks[item.risk] ?? 0) + 1;
  for (const gate of item.gates) flow.gates[gate] = (flow.gates[gate] ?? 0) + 1;
  byFlow.set(item.userFlow, flow);
}

const priorityReviewLimit = 200;
const riskItems = items.filter((item) => item.risk !== "ok");
const priorityItems = riskItems.slice(0, priorityReviewLimit);

const summary = {
  generatedAt,
  project: projectName,
  root: rel(repoRoot),
  sourceGraph: rel(path.relative(repoRoot, graphPath)),
  counts: {
    items: items.length,
    flows: byFlow.size,
    needsBrowserReview: items.filter((item) => item.risk === "needs_browser_review").length,
    missingTestLink: items.filter((item) => item.risk === "missing_test_link").length,
    missingDocLink: items.filter((item) => item.risk === "missing_doc_link").length,
    implementedNeedsProof: items.filter((item) => item.risk === "implemented_needs_proof").length,
    blocked: items.filter((item) => item.risk === "blocked").length,
    riskItems: riskItems.length,
    appCompletionRiskItems: riskItems.filter((item) => item.risk !== "blocked").length,
    priorityReviewItems: priorityItems.length,
    priorityReviewLimit,
    priorityReviewTruncated: riskItems.length > priorityItems.length,
  },
  flows: [...byFlow.values()],
  priorityReviewItems: priorityItems,
};

function tableRows(rows) {
  if (rows.length === 0) return "_None._";
  return [
    "| User flow | Risk | Kind | Entity | Owner | Path | Gates |",
    "| --- | --- | --- | --- | --- | --- | --- |",
    ...rows.map((item) => [
      item.userFlow,
      item.risk,
      item.kind,
      item.name,
      item.owner,
      item.path,
      item.gates.join(", ") || "-",
    ].map((value) => String(value ?? "").replaceAll("|", "\\|")).join(" | ")).map((row) => `| ${row} |`),
  ].join("\n");
}

const flowSummary = [...byFlow.values()]
  .sort((a, b) => b.total - a.total)
  .map((flow) => `- ${flow.userFlow}: ${flow.total} entities; risks ${JSON.stringify(flow.risks)}; gates ${JSON.stringify(flow.gates)}`)
  .join("\n");

const markdown = [
  "# App Completion Index",
  "",
  `Generated: ${generatedAt}`,
  `Project: ${projectName}`,
  `Root: ${rel(repoRoot)}`,
  `Source graph: ${rel(path.relative(repoRoot, graphPath))}`,
  "",
  "## Purpose",
  "",
  "This index turns architecture-awareness entities into user-facing completion lanes.",
  "Agents use it to decide what to plan next: backend/API proof, frontend/browser proof, auth/subscription/configuration gates, exchange integration proof, or cleanup.",
  "",
  "## Counts",
  "",
  `- Items: ${summary.counts.items}`,
  `- User flows: ${summary.counts.flows}`,
  `- Needs browser/screenshot review: ${summary.counts.needsBrowserReview}`,
  `- Missing test link: ${summary.counts.missingTestLink}`,
  `- Missing doc link: ${summary.counts.missingDocLink}`,
  `- Implemented, needs proof: ${summary.counts.implementedNeedsProof}`,
  `- Blocked: ${summary.counts.blocked}`,
  `- Known non-ok risk items: ${summary.counts.riskItems}`,
  `- Priority review items indexed: ${summary.counts.priorityReviewItems}/${summary.counts.riskItems}`,
  `- Priority review truncated: ${summary.counts.priorityReviewTruncated}`,
  "",
  "## Flow Summary",
  "",
  flowSummary || "_No user flows detected._",
  "",
  "## Priority Review Queue",
  "",
  tableRows(priorityItems.slice(0, 80)),
  "",
  "## Agent Rule",
  "",
  "A user-facing feature is not complete until the backend/API state, frontend route/component state, configuration/auth/subscription gates, tests, docs, and browser screenshot/clickthrough evidence are either verified or explicitly blocked with an owner/action.",
].join("\n");

await mkdir(statusDir, { recursive: true });
await writeFile(jsonOut, `${JSON.stringify(summary, null, 2)}\n`);
await writeFile(mdOut, `${markdown}\n`);

console.log(JSON.stringify({
  project: projectName,
  sourceGraph: graphPath,
  outputs: [jsonOut, mdOut],
  counts: summary.counts,
}, null, 2));
