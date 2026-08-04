import { readFile, stat } from "node:fs/promises";
import path from "node:path";

export const PRODUCT_INTENT_TRACE_MARKER = "softwarehouse-product-intent-trace:v1";

function posix(value) {
  return value.split(path.sep).join("/");
}

async function exists(filePath) {
  try {
    await stat(filePath);
    return true;
  } catch {
    return false;
  }
}

function normalizedEntries(value) {
  return Array.isArray(value)
    ? value.filter((entry) => typeof entry === "string" && entry.trim()).map((entry) => entry.trim().replaceAll("\\", "/"))
    : [];
}

function pathBelongsToAuthority(relativePath, authorityEntries) {
  const candidate = relativePath.split("#", 1)[0].replace(/^\.\//, "");
  return authorityEntries.some((entry) => {
    const authority = entry.replace(/^\.\//, "");
    return authority.endsWith("/")
      ? candidate.startsWith(authority)
      : candidate === authority || candidate.startsWith(`${authority}/`);
  });
}

function defaultEntrypoints(manifest, authorityEntries) {
  return normalizedEntries(manifest.defaultAgentContext)
    .filter((entry) => pathBelongsToAuthority(entry, authorityEntries));
}

async function existingEntrypoints(root, entries) {
  const output = [];
  for (const relative of entries) {
    const absolute = path.resolve(root, relative);
    if (absolute !== root && !absolute.startsWith(`${root}${path.sep}`)) continue;
    if (await exists(absolute)) output.push(relative);
  }
  return output;
}

async function sourceIsSubstantive(root, relative, kind) {
  const text = await readFile(path.join(root, relative), "utf8");
  const words = text
    .replace(/```[\s\S]*?```/g, " ")
    .replace(/[#>*_`|\-[\]():]/g, " ")
    .split(/\s+/)
    .filter((word) => /[\p{L}\p{N}]/u.test(word));
  if (words.length < 25) return false;
  if (kind === "product") {
    const emptyFields = text.split(/\r?\n/).filter((line) => /^\s*[-*]\s+[^:]{2,80}:\s*$/.test(line)).length;
    if (emptyFields >= 3) return false;
  }
  return true;
}

export async function inspectProductIntentContract({ name, root }) {
  const manifestRelative = "docs/documentation-contract.json";
  const manifestPath = path.join(root, manifestRelative);
  const findings = [];
  let manifest;
  try {
    manifest = JSON.parse(await readFile(manifestPath, "utf8"));
  } catch (error) {
    return {
      name,
      root: posix(root),
      ready: false,
      findings: [{ code: "intent_manifest_missing_or_invalid", message: error instanceof Error ? error.message : String(error) }],
    };
  }

  const productAuthority = normalizedEntries(manifest.authority?.product);
  const architectureAuthority = normalizedEntries(manifest.authority?.architecture);
  const decisionAuthority = normalizedEntries(manifest.authority?.decisions)
    .concat(architectureAuthority.filter((entry) => /(?:adr|decisions)(?:\/|$)/i.test(entry)));
  const assumptionAuthority = normalizedEntries(manifest.authority?.assumptions);
  const productSources = await existingEntrypoints(root, defaultEntrypoints(manifest, productAuthority));
  const architectureSources = await existingEntrypoints(root, defaultEntrypoints(manifest, architectureAuthority));
  const observedStateSource = String(manifest.projectTruthPath ?? "docs/status/project-truth-index.json").replaceAll("\\", "/");

  if (productAuthority.length === 0) findings.push({ code: "product_authority_missing", message: "documentation-contract.json does not declare authority.product." });
  if (architectureAuthority.length === 0) findings.push({ code: "architecture_authority_missing", message: "documentation-contract.json does not declare authority.architecture." });
  if (productSources.length === 0) findings.push({ code: "product_entrypoint_missing", message: "defaultAgentContext has no existing product-authority entrypoint." });
  if (architectureSources.length === 0) findings.push({ code: "architecture_entrypoint_missing", message: "defaultAgentContext has no existing architecture-authority entrypoint." });
  for (const source of productSources) {
    if (!await sourceIsSubstantive(root, source, "product")) findings.push({ code: "product_entrypoint_placeholder", message: `${source} is empty, placeholder-only, or too small to authorize implementation.` });
  }
  for (const source of architectureSources) {
    if (!await sourceIsSubstantive(root, source, "architecture")) findings.push({ code: "architecture_entrypoint_placeholder", message: `${source} is empty, placeholder-only, or too small to constrain implementation.` });
  }
  if (!await exists(path.join(root, observedStateSource))) findings.push({ code: "observed_state_missing", message: `${observedStateSource} does not exist.` });

  return {
    schemaVersion: 1,
    name,
    root: posix(root),
    ready: findings.length === 0,
    manifestPath: manifestRelative,
    productAuthority,
    architectureAuthority,
    decisionAuthority: [...new Set(decisionAuthority)],
    assumptionAuthority,
    productSources,
    architectureSources,
    observedStateSource,
    findings,
  };
}

function field(text, label) {
  const match = text.match(new RegExp(`^\\s*[-*]?\\s*${label}\\s*:\\s*(.+?)\\s*$`, "im"));
  return match?.[1]?.trim() ?? null;
}

export function parseProductIntentTrace(text) {
  const source = String(text ?? "");
  if (!source.includes(PRODUCT_INTENT_TRACE_MARKER)) return null;
  return {
    schemaVersion: 1,
    ownerIntent: field(source, "Owner intent"),
    productContract: field(source, "Product contract"),
    architectureContract: field(source, "Architecture contract"),
    observedGap: field(source, "Observed gap"),
    assumptionDisposition: field(source, "Assumption disposition"),
    expectedOutcome: field(source, "Expected outcome"),
    acceptanceEvidence: field(source, "Acceptance evidence"),
  };
}

function substantive(value, minimum = 20) {
  return typeof value === "string" && value.trim().length >= minimum;
}

function validSource(value, authority) {
  return typeof value === "string" && pathBelongsToAuthority(value, authority);
}

export function evaluateProductIntentTrace({ trace, contract }) {
  const missing = [];
  const conflicts = [];
  if (!contract?.ready) missing.push("project_intent_contract");
  if (!trace) {
    missing.push("trace_marker", "owner_intent", "product_contract", "architecture_contract", "observed_gap", "assumption_disposition", "expected_outcome", "acceptance_evidence");
    return { ready: false, missing, conflicts };
  }
  if (!validSource(trace.ownerIntent, contract.productAuthority ?? [])) missing.push("owner_intent");
  if (!validSource(trace.productContract, contract.productAuthority ?? [])) missing.push("product_contract");
  const architectureNotApplicable = /^not_applicable\s+-\s+.{20,}$/i.test(trace.architectureContract ?? "");
  if (!architectureNotApplicable && !validSource(trace.architectureContract, contract.architectureAuthority ?? [])) missing.push("architecture_contract");
  if (!substantive(trace.observedGap)) missing.push("observed_gap");
  if (!substantive(trace.expectedOutcome)) missing.push("expected_outcome");
  if (!substantive(trace.acceptanceEvidence)) missing.push("acceptance_evidence");

  const disposition = String(trace.assumptionDisposition ?? "").toLowerCase();
  if (!disposition) missing.push("assumption_disposition");
  else if (/\b(?:pending|unknown|unvalidated|needs_decision|conflict)\b/.test(disposition)) conflicts.push("unresolved_assumption_or_source_conflict");
  else if (!/^(?:none|validated|owner_approved|rejected|experiment_only)(?:\s+-\s+.+)?$/i.test(trace.assumptionDisposition)) missing.push("assumption_disposition");

  return { ready: missing.length === 0 && conflicts.length === 0, missing: [...new Set(missing)], conflicts: [...new Set(conflicts)] };
}

export function renderProductIntentTraceTemplate(contract, values = {}) {
  const productSource = values.productContract ?? contract?.productSources?.[0] ?? "docs/product/product.md";
  const architectureSource = values.architectureContract ?? contract?.architectureSources?.[0] ?? "docs/architecture/architecture-source-of-truth.md";
  return [
    `<!-- ${PRODUCT_INTENT_TRACE_MARKER} -->`,
    "## Product Intent Trace",
    "",
    `- Owner intent: ${values.ownerIntent ?? productSource}`,
    `- Product contract: ${productSource}`,
    `- Architecture contract: ${architectureSource}`,
    `- Observed gap: ${values.observedGap ?? "Describe the evidence-backed difference between intended and observed behavior."}`,
    `- Assumption disposition: ${values.assumptionDisposition ?? "needs_decision - classify every assumption before implementation"}`,
    `- Expected outcome: ${values.expectedOutcome ?? "Describe the smallest owner-visible or risk-reducing state change."}`,
    `- Acceptance evidence: ${values.acceptanceEvidence ?? "Name the tests, user-flow proof, review, deployment, and observation evidence required."}`,
  ].join("\n");
}

export function productIntentDecisionContract({ contract, trace, issue, project }) {
  return {
    schemaVersion: 1,
    marker: PRODUCT_INTENT_TRACE_MARKER,
    project: { id: project.id, name: project.name },
    issue: { id: issue.id, identifier: issue.identifier },
    manifestPath: contract.manifestPath,
    productAuthority: contract.productAuthority,
    architectureAuthority: contract.architectureAuthority,
    productSources: contract.productSources,
    architectureSources: contract.architectureSources,
    observedStateSource: contract.observedStateSource,
    trace,
  };
}
