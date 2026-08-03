import { getTableConfig } from "drizzle-orm/pg-core";
import { describe, expect, it } from "vitest";
import { assignmentProposals, deliveryTasks, deliveryTransitions, productDeliveries, productOutcomes } from "./schema/index.js";

const config = (table: Parameters<typeof getTableConfig>[0]) => getTableConfig(table);
const indexNames = (table: Parameters<typeof getTableConfig>[0]) => config(table).indexes.map((index) => index.config.name);

describe("task, delivery, and outcome persistence", () => {
  it("keeps delivery and outcome state in separate tables", () => {
    expect(config(productDeliveries).columns.map((column) => column.name)).toEqual(expect.arrayContaining([
      "stage", "local_sha", "origin_sha", "integration_sha", "deployed_sha", "deployment_url", "evidence",
    ]));
    expect(config(productOutcomes).columns.map((column) => column.name)).toEqual(expect.arrayContaining([
      "status", "statement", "acceptance_criteria", "evidence", "accepted_at",
    ]));
    expect(indexNames(productOutcomes)).toContain("product_outcomes_delivery_unique");
  });

  it("links tasks without copying issue status and preserves transition history", () => {
    expect(config(deliveryTasks).columns.map((column) => column.name)).not.toContain("status");
    expect(indexNames(deliveryTasks)).toContain("delivery_tasks_delivery_issue_unique");
    expect(indexNames(deliveryTransitions)).toContain("delivery_transitions_delivery_key_unique");
  });

  it("persists assignment intent separately from system-applied issue state", () => {
    expect(config(assignmentProposals).columns.map((column) => column.name)).toEqual(expect.arrayContaining([
      "proposed_assignee_agent_id", "proposed_by_agent_id", "admission_decision_id", "status", "disposition", "applied_at",
    ]));
    expect(indexNames(assignmentProposals)).toContain("assignment_proposals_company_key_unique");
  });
});
