import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

test("effective plan budgets use the monthly plan value for calendar-month policies", async () => {
  const source = await readFile("scripts/configure-effective-plan-budgets.mjs", "utf8");

  assert.match(source, /summary\.subscriptionMonthlyBudgetCents \?\? planBudgetCents/);
  assert.match(source, /effectivePlanBudgetCents \* tokens\) \/ totalTokens/);
  assert.match(source, /monthlyPlanShareCents/);
  assert.doesNotMatch(source, /subscriptionSpendCents \* tokens\) \/ totalTokens/);
});
