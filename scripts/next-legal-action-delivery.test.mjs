import test from "node:test";
import assert from "node:assert/strict";
import { pickAction } from "./run-next-legal-action-selector.mjs";

const healthy = { checked: true, ok: true };
const noRuns = { checked: true, ok: true, liveRunCount: 0 };
const cleanSource = { checked: true, ok: true, repos: [] };
const quietGovernor = { checked: true, ok: true, decision: "blocked_needs_triage", counts: { eligibleRunnableIssues: 0 } };

test("owner-visible Roost release debt outranks blocked triage and generic backlog", () => {
  const action = pickAction(
    { activeRunCount: 0 },
    { activeRunCount: 0, projects: [{ runnableIssueCount: 30 }] },
    healthy,
    noRuns,
    null,
    quietGovernor,
    cleanSource,
    { checked: true, ok: true, actions: [] },
    {
      checked: true,
      ok: true,
      projects: [
        { name: "Soar", ahead: 34, behind: 0, dirtyCount: 0, pushAllowed: true, decision: "push_candidate_requires_ops_verification" },
        { name: "Roost", ahead: 111, behind: 0, dirtyCount: 0, pushAllowed: true, decision: "push_candidate_requires_ops_verification", head: "candidate" },
      ],
    },
  );
  assert.equal(action.decision, "start_release_delivery");
  assert.equal(action.target, "Roost");
  assert.match(action.reason, /outranks new documentation/);
});

test("exact release blocker outranks new docs-only work", () => {
  const action = pickAction(
    { activeRunCount: 0 },
    { activeRunCount: 0 },
    healthy,
    noRuns,
    null,
    quietGovernor,
    cleanSource,
    { checked: true, ok: true, actions: [] },
    {
      checked: true,
      ok: true,
      projects: [{
        name: "Roost",
        ahead: 111,
        behind: 0,
        dirtyCount: 0,
        pushAllowed: false,
        decision: "push_blocked_until_project_coolify_ready",
      }],
    },
  );
  assert.equal(action.decision, "resolve_release_delivery_blocker");
  assert.equal(action.target, "Roost");
  assert.match(action.reason, /before creating documentation/);
});

test("a successful live API readback suppresses a stale health timeout", () => {
  const action = pickAction(
    { activeRunCount: 0 },
    { activeRunCount: 0 },
    { checked: true, ok: false, error: "timeout" },
    { checked: true, ok: true, liveRunCount: 0 },
    null,
    { checked: true, ok: true, decision: "runnable_work_assignment_needed", counts: {} },
    { checked: true, ok: true, clean: true, repos: [] },
    { checked: true, ok: true, actions: [{ action: "noop_no_unhealthy_resource" }] },
    {
      checked: true,
      ok: true,
      projects: [{
        name: "Roost",
        ahead: 111,
        behind: 0,
        dirtyCount: 0,
        pushAllowed: true,
        decision: "push_candidate_requires_ops_verification",
      }],
    },
  );

  assert.equal(action.decision, "start_release_delivery");
  assert.equal(action.target, "Roost");
});
