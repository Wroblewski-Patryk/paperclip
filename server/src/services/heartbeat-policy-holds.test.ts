import { describe, expect, it } from "vitest";
import { isIssueExecutionQuotaHoldError } from "./heartbeat.js";

describe("heartbeat policy holds", () => {
  it("recognizes the issue execution hard quota as a policy hold", () => {
    expect(isIssueExecutionQuotaHoldError(new Error("Issue execution quota hard hold"))).toBe(true);
  });

  it("does not classify ordinary adapter failures as policy holds", () => {
    expect(isIssueExecutionQuotaHoldError(new Error("Adapter process exited with code 1"))).toBe(false);
    expect(isIssueExecutionQuotaHoldError("Issue execution quota hard hold")).toBe(false);
  });
});
