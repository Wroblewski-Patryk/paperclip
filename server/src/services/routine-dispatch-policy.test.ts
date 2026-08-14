import { describe, expect, it } from "vitest";
import { shouldCoalesceOpenRoutineIssue, shouldReuseIdleRoutineIssue } from "./routines.js";

describe("routine dispatch policy", () => {
  it("reuses only an idle todo issue under the explicit reuse policy", () => {
    expect(shouldReuseIdleRoutineIssue({
      concurrencyPolicy: "reuse_idle_issue",
      issueStatus: "todo",
      hasLiveExecution: false,
    })).toBe(true);
    expect(shouldReuseIdleRoutineIssue({
      concurrencyPolicy: "reuse_idle_issue",
      issueStatus: "todo",
      hasLiveExecution: true,
    })).toBe(false);
    expect(shouldReuseIdleRoutineIssue({
      concurrencyPolicy: "coalesce_if_active",
      issueStatus: "todo",
      hasLiveExecution: false,
    })).toBe(false);
    expect(shouldReuseIdleRoutineIssue({
      concurrencyPolicy: "reuse_idle_issue",
      issueStatus: "blocked",
      hasLiveExecution: false,
    })).toBe(false);
  });

  it("does not let a historical blocked reusable envelope absorb a new tick", () => {
    expect(shouldCoalesceOpenRoutineIssue({
      concurrencyPolicy: "reuse_idle_issue",
      hasOpenIssue: true,
      hasLiveExecution: false,
    })).toBe(false);
    expect(shouldCoalesceOpenRoutineIssue({
      concurrencyPolicy: "reuse_idle_issue",
      hasOpenIssue: true,
      hasLiveExecution: true,
    })).toBe(true);
    expect(shouldCoalesceOpenRoutineIssue({
      concurrencyPolicy: "coalesce_if_active",
      hasOpenIssue: true,
      hasLiveExecution: false,
    })).toBe(true);
  });
});
