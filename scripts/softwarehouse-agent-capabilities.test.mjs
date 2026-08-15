import assert from "node:assert/strict";
import test from "node:test";
import {
  BROWSER_CAPABILITY_AGENT_NAMES,
  COMPANYCORE_CAPABILITY_AGENT_NAMES,
  WEB_SEARCH_AGENT_NAMES,
  agentRosterDiff,
  capabilityExpectations,
  desiredSkillsForAgent,
  hasMcpServer,
  loadRosterAgentNames,
  skillPolicyDiff,
} from "./lib/softwarehouse-agent-capabilities.mjs";

test("routes authority-bearing Paperclip skills only to their owning roles", () => {
  assert(desiredSkillsForAgent("06 AIM (AI Agent Manager)").includes("paperclipai/paperclip/paperclip-create-agent"));
  assert(!desiredSkillsForAgent("07 CFO (Chief Financial Officer)").includes("paperclipai/paperclip/paperclip-create-agent"));
  assert(desiredSkillsForAgent("09 RTE (Runtime & Adapter Engineer)").includes("paperclipai/paperclip/paperclip-create-plugin"));
  assert(!desiredSkillsForAgent("02 UID (UI Visual Designer)").includes("paperclipai/paperclip/paperclip-create-plugin"));
});

test("keeps browser, hosted context, and fresh-web capability allowlists explicit", () => {
  assert.equal(BROWSER_CAPABILITY_AGENT_NAMES.length, 6);
  assert.equal(COMPANYCORE_CAPABILITY_AGENT_NAMES.length, 6);
  assert.equal(WEB_SEARCH_AGENT_NAMES.length, 12);
  assert.deepEqual(capabilityExpectations("09 DRE (Deployment & Reliability Engineer)"), {
    browser: true,
    companycore: true,
    webSearch: false,
  });
});

test("detects MCP servers without depending on argument ordering", () => {
  const config = {
    extraArgs: ["-c", "mcp_servers.playwright.command=\"node\"", "--unrelated"],
  };
  assert.equal(hasMcpServer(config, "playwright"), true);
  assert.equal(hasMcpServer(config, "companycore"), false);
});

test("skill policy ignores the one globally required Paperclip coordination skill", () => {
  const expected = desiredSkillsForAgent("04 DSM (Documentation Steward)");
  const diff = skillPolicyDiff("04 DSM (Documentation Steward)", [
    "paperclipai/paperclip/paperclip",
    ...expected,
  ]);
  assert.deepEqual(diff.missing, []);
  assert.deepEqual(diff.unexpected, []);
});

test("capability policy is bounded to the canonical 39-agent roster", async () => {
  const rosterNames = await loadRosterAgentNames();
  assert.equal(rosterNames.length, 39);
  assert.deepEqual(agentRosterDiff(rosterNames.map((name) => ({ name })), rosterNames), {
    missing: [],
    unexpected: [],
    duplicates: [],
  });
  for (const name of [
    ...BROWSER_CAPABILITY_AGENT_NAMES,
    ...COMPANYCORE_CAPABILITY_AGENT_NAMES,
    ...WEB_SEARCH_AGENT_NAMES,
  ]) {
    assert(rosterNames.includes(name), `Capability policy references an unknown agent: ${name}`);
  }
});
