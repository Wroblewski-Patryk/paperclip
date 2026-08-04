import { describe, expect, it } from "vitest";
import { productivityReviewTitle } from "../services/productivity-review.ts";

describe("productivityReviewTitle", () => {
  it("preserves the canonical application marker from an innovation project", () => {
    expect(productivityReviewTitle("LUC-2397", "11 Innovation: Soar"))
      .toBe("[Soar] Review productivity for LUC-2397");
  });

  it("supports future project names without a hard-coded application allowlist", () => {
    expect(productivityReviewTitle("LUC-3000", "11 Innovation: New Product"))
      .toBe("[New Product] Review productivity for LUC-3000");
  });

  it("keeps unscoped historical work readable", () => {
    expect(productivityReviewTitle("LUC-1000", null))
      .toBe("Review productivity for LUC-1000");
  });
});
