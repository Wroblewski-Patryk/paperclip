import assert from "node:assert/strict";
import test from "node:test";
import { agentWipBlockerFor, summarizeAgentWip } from "./lib/agent-wip-guard.mjs";

test("agent WIP guard blocks only the busy assignee when live runs are known", () => {
  const state = summarizeAgentWip({
    activeRunCount: 1,
    liveRuns: [{ agentId: "agent-a" }],
  });

  assert.equal(agentWipBlockerFor("agent-a", state), "agent_live_run");
  assert.equal(agentWipBlockerFor("agent-b", state), null);
});

test("agent WIP guard fails closed when active-run count cannot be attributed", () => {
  const state = summarizeAgentWip({
    activeRunCount: 2,
    liveRuns: [{ agentId: "agent-a" }],
  });

  assert.equal(state.unknownActiveRunCount, 1);
  assert.equal(agentWipBlockerFor("agent-b", state), "unknown_active_run");
});
