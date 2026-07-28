import { describe, expect, it } from "vitest";
import {
  normalizeWorkspaceResourceKey,
  parseWorkspaceResourceClaimDeclarations,
} from "../services/workspace-resource-claims.js";

describe("workspace resource claim declarations", () => {
  it("normalizes resource identities and retains independent resources", () => {
    expect(normalizeWorkspaceResourceKey(" Roost / CompanyCore Test Postgres : 55432 "))
      .toBe("roost:companycore:test:postgres:55432");
    expect(parseWorkspaceResourceClaimDeclarations({
      resourceClaims: [
        { resourceKey: "roost:postgres:55432", leaseMs: 5_000 },
        { resourceKey: "browser:chrome" },
      ],
    })).toEqual([
      { resourceKey: "roost:postgres:55432", leaseMs: 5_000 },
      { resourceKey: "browser:chrome" },
    ]);
  });

  it("rejects duplicate normalized claims before a command can start", () => {
    expect(() => parseWorkspaceResourceClaimDeclarations({
      resourceClaims: [{ resourceKey: "roost postgres" }, { resourceKey: "roost:postgres" }],
    })).toThrow("Duplicate workspace resource claim");
  });

  it("rejects malformed declarations", () => {
    expect(() => parseWorkspaceResourceClaimDeclarations({ resourceClaims: "postgres" }))
      .toThrow("must be an array");
    expect(() => parseWorkspaceResourceClaimDeclarations({ resourceClaims: [{ resourceKey: "postgres", leaseMs: 1 }] }))
      .toThrow("at least 1000");
  });
});
