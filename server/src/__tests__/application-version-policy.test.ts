import { describe, expect, it } from "vitest";
import { evaluateApplicationVersionPolicy } from "../services/application-version-policy.js";

describe("application release policy", () => {
  it("separates Soar v0 repair from locked mobile and AI releases", () => {
    expect(evaluateApplicationVersionPolicy({ projectName: "11 Innovation: Soar", title: "Repair DCA live adapter" }).disposition).toBe("authorized_current");
    expect(evaluateApplicationVersionPolicy({ projectName: "11 Innovation: Soar", title: "Build mobile app" })).toMatchObject({ disposition: "future_version_locked", targetVersion: "v1" });
    expect(evaluateApplicationVersionPolicy({ projectName: "11 Innovation: Soar", title: "Add MCP agent API" })).toMatchObject({ disposition: "future_version_locked", targetVersion: "v2" });
  });

  it("rejects the foreign Exchange domain in Featherly", () => {
    expect(evaluateApplicationVersionPolicy({ projectName: "11 Innovation: Featherly", title: "Exchange connection contract" })).toMatchObject({
      disposition: "product_domain_not_authorized",
      marker: "exchange",
    });
  });
});
