import { describe, expect, it } from "vitest";
import { projectScopedRecoveryTitle } from "../services/recovery/service.ts";

describe("projectScopedRecoveryTitle", () => {
  it("preserves application identity for missing-disposition recovery", () => {
    expect(projectScopedRecoveryTitle(
      "Recover missing next step",
      "LUC-2477",
      "11 Innovation: Featherly",
    )).toBe("[Featherly] Recover missing next step LUC-2477");
  });

  it("supports future projects without a product allowlist", () => {
    expect(projectScopedRecoveryTitle(
      "Recover stalled issue",
      "LUC-3000",
      "11 Innovation: Next App",
    )).toBe("[Next App] Recover stalled issue LUC-3000");
  });
});
