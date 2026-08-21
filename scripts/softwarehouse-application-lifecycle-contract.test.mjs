import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

const root = new URL("../", import.meta.url);

async function source(path) {
  return readFile(new URL(path, root), "utf8");
}

test("application lifecycle covers business, engineering, production, and learning", async () => {
  const lifecycle = await source("docs/softwarehouse/19-autonomous-application-business-lifecycle.md");

  for (const required of [
    "PROC-SH-APPLICATION-LIFECYCLE",
    "Opportunity and problem validation",
    "Business framing",
    "Product discovery and requirements",
    "UX and accessibility design",
    "Architecture, data, and threat design",
    "Automated verification",
    "User-flow QA",
    "Independent review",
    "Deployment and migration",
    "Production acceptance",
    "Operate, support, and observe",
    "Retrospective and improvement",
    "commercial readiness",
    "immutable deployed SHA",
    "owner intent capture and assumption classification",
    "softwarehouse-product-intent-trace:v1",
    "softwarehouse-managed-resource-lifecycle:v1",
    "future cleanup procedure is not closure",
  ]) {
    assert.match(lifecycle, new RegExp(required, "i"), `missing lifecycle contract: ${required}`);
  }
});
test("shared agent instructions require the canonical lifecycle", async () => {
  const instructions = await source("softwarehouse/instructions/shared/21-autonomous-application-lifecycle.md");

  assert.match(instructions, /19-autonomous-application-business-lifecycle\.md/);
  assert.match(instructions, /Paperclip owns live execution, gates, and evidence/);
  assert.match(instructions, /Coolify-bound push/);
  assert.match(instructions, /commercial\s+boundary/i);
  assert.match(instructions, /owner direction -> captured intent -> assumptions classified/);
  assert.match(instructions, /softwarehouse-product-intent-trace:v1/);
  assert.match(instructions, /softwarehouse-managed-resource-lifecycle:v1/);
  assert.match(instructions, /A teardown plan is not teardown evidence/);
  assert.match(instructions, /never create a\s+duplicate/i);
  assert.match(instructions, /Application teardown and empty-environment teardown are distinct destructive\s+phases/i);
  assert.match(instructions, /Never infer permission to delete an environment/i);
});

test("architecture, SDLC, procedure registry, and policy gates link the lifecycle", async () => {
  const paths = [
    "docs/architecture.md",
    "docs/softwarehouse-sdlc.md",
    "docs/agent-policy-gates.md",
    ".agents/state/softwarehouse-procedure-system.md",
  ];

  for (const path of paths) {
    const text = await source(path);
    assert.match(text, /19-autonomous-application-business-lifecycle\.md/, `${path} does not link the lifecycle`);
  }
});
