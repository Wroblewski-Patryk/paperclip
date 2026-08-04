import assert from "node:assert/strict";
import { mkdtemp, mkdir, writeFile } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import test from "node:test";
import {
  evaluateProductIntentTrace,
  inspectProductIntentContract,
  parseProductIntentTrace,
  renderProductIntentTraceTemplate,
} from "./lib/product-intent-traceability.mjs";

async function fixture() {
  const root = await mkdtemp(path.join(os.tmpdir(), "paperclip-intent-contract-"));
  await mkdir(path.join(root, "docs/product"), { recursive: true });
  await mkdir(path.join(root, "docs/architecture"), { recursive: true });
  await mkdir(path.join(root, "docs/status"), { recursive: true });
  await writeFile(path.join(root, "docs/product/product.md"), [
    "# Product",
    "",
    "The product gives authenticated customers a private workspace for managing their account and work.",
    "A successful release lets the customer sign in, understand the current state, and complete the promised job safely.",
  ].join("\n"));
  await writeFile(path.join(root, "docs/architecture/architecture-source-of-truth.md"), [
    "# Architecture",
    "",
    "The web application separates authenticated routes from public routes and keeps account changes behind authorization.",
    "Server-side validation and focused browser tests provide the implementation and verification boundary.",
  ].join("\n"));
  await writeFile(path.join(root, "docs/status/project-truth-index.json"), "{}\n");
  await writeFile(path.join(root, "docs/documentation-contract.json"), JSON.stringify({
    defaultAgentContext: [
      "docs/product/product.md",
      "docs/architecture/architecture-source-of-truth.md",
      "docs/status/project-truth-index.json",
    ],
    authority: {
      product: ["docs/product/"],
      architecture: ["docs/architecture/", "docs/adr/"],
      derivedStatus: ["docs/status/"],
    },
    projectTruthPath: "docs/status/project-truth-index.json",
  }));
  return root;
}

test("accepts an explicit trace from product intent through observed gap and proof", async () => {
  const root = await fixture();
  const contract = await inspectProductIntentContract({ name: "Example", root });
  const text = renderProductIntentTraceTemplate(contract, {
    observedGap: "Authenticated users cannot currently reach account settings from the dashboard.",
    assumptionDisposition: "owner_approved - the settings route belongs in the authenticated client area",
    expectedOutcome: "An authenticated user reaches settings from the dashboard sidebar and can update account data.",
    acceptanceEvidence: "Route tests, authenticated browser proof, independent review, and deployed smoke evidence.",
  });
  const trace = parseProductIntentTrace(text);
  assert.equal(contract.ready, true);
  assert.equal(evaluateProductIntentTrace({ trace, contract }).ready, true);
});

test("blocks implementation when an assumption or source conflict still needs a decision", async () => {
  const root = await fixture();
  const contract = await inspectProductIntentContract({ name: "Example", root });
  const trace = parseProductIntentTrace(renderProductIntentTraceTemplate(contract, {
    observedGap: "The product notes disagree about whether registration is public or invite-only.",
    assumptionDisposition: "needs_decision - product sources conflict",
    expectedOutcome: "One approved registration rule controls product, architecture, tests, and implementation.",
    acceptanceEvidence: "Owner decision, superseded conflicting text, architecture update, and contract tests.",
  }));
  const result = evaluateProductIntentTrace({ trace, contract });
  assert.equal(result.ready, false);
  assert.deepEqual(result.conflicts, ["unresolved_assumption_or_source_conflict"]);
});

test("rejects a product source outside the declared authority", async () => {
  const root = await fixture();
  const contract = await inspectProductIntentContract({ name: "Example", root });
  const trace = parseProductIntentTrace(renderProductIntentTraceTemplate(contract, {
    productContract: "docs/status/generated-report.md",
    observedGap: "The implemented route has no approved user-facing product behavior contract.",
    assumptionDisposition: "none",
    expectedOutcome: "The route behavior follows a canonical product contract rather than a generated report.",
    acceptanceEvidence: "Product approval, tests, browser proof, and independent review are inspectable.",
  }));
  const result = evaluateProductIntentTrace({ trace, contract });
  assert.equal(result.ready, false);
  assert(result.missing.includes("product_contract"));
});

test("rejects a placeholder product entrypoint that contains no usable product decision", async () => {
  const root = await fixture();
  await writeFile(path.join(root, "docs/product/product.md"), [
    "# Product Definition",
    "",
    "- Core user problem:",
    "- Core promise:",
    "- Business intent:",
    "- Primary user:",
    "- Success signal:",
  ].join("\n"));
  const contract = await inspectProductIntentContract({ name: "Example", root });
  assert.equal(contract.ready, false);
  assert(contract.findings.some((finding) => finding.code === "product_entrypoint_placeholder"));
});
