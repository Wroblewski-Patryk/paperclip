import assert from "node:assert/strict";
import test from "node:test";

import {
  agentMatchesNameOrAlias,
  buildAgentLookup,
  findAgentByNameOrAlias,
} from "./lib/softwarehouse-agent-resolver.mjs";

const agents = [
  {
    name: "01 Portfolio Lead",
    title: "Portfolio Director",
    metadata: { rosterKey: "innovation-portfolio-manager" },
    status: "active",
  },
  {
    name: "Aviary PM",
    title: "Aviary Project Manager",
    metadata: { rosterKey: "aviary-product-manager" },
    status: "active",
  },
  {
    name: "Nest PM",
    title: "Nest Project Manager",
    urlKey: "nest-project-manager",
    status: "active",
  },
];

test("findAgentByNameOrAlias resolves name, title, roster key, and legacy aliases", () => {
  assert.equal(findAgentByNameOrAlias(agents, "01 Portfolio Lead")?.title, "Portfolio Director");
  assert.equal(findAgentByNameOrAlias(agents, "Portfolio Director")?.name, "01 Portfolio Lead");
  assert.equal(findAgentByNameOrAlias(agents, "innovation-portfolio-manager")?.name, "01 Portfolio Lead");
  assert.equal(findAgentByNameOrAlias(agents, "Aviary Project Manager")?.name, "Aviary PM");
  assert.equal(findAgentByNameOrAlias(agents, "Nest Project Manager")?.name, "Nest PM");
});

test("agentMatchesNameOrAlias accepts legacy roster aliases", () => {
  const aviary = agents.find((agent) => agent.name === "Aviary PM");

  assert.equal(agentMatchesNameOrAlias(aviary, "Aviary Project Manager"), true);
  assert.equal(agentMatchesNameOrAlias(aviary, "personality-project-manager"), true);
  assert.equal(findAgentByNameOrAlias(agents, "personality-project-manager")?.name, "Aviary PM");
});

test("findAgentByNameOrAlias prefers runnable agents over paused alias matches", () => {
  const qaAgents = [
    {
      name: "Test Automation Engineer",
      title: "Automated Test Specialist",
      metadata: { rosterKey: "test-automation-engineer" },
      status: "paused",
    },
    {
      name: "09 QVE (QA & Verification Engineer)",
      title: "QA and Verification Engineer",
      metadata: { rosterKey: "qa-verification-engineer" },
      status: "idle",
    },
  ];

  assert.equal(
    findAgentByNameOrAlias(qaAgents, "QA Regression Lead")?.name,
    "09 QVE (QA & Verification Engineer)",
  );
});

test("buildAgentLookup exposes map-compatible get lookup", () => {
  const lookup = buildAgentLookup(agents);

  assert.equal(lookup.get("Portfolio Director")?.name, "01 Portfolio Lead");
  assert.equal(lookup.byName("Nest Project Manager")?.name, "Nest PM");
  assert.equal(lookup.get("Missing Agent"), null);
});
