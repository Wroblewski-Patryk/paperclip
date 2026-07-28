import { describe, expect, it } from "vitest";
import {
  roostBridgePortfolioProjectionSchema,
  roostBridgePortfolioSchemaVersion,
} from "./softwarehouse.js";

describe("roostBridgePortfolioProjectionSchema", () => {
  it("accepts the v1 packet and rejects raw or unversioned fields", () => {
    const packet = {
      schemaVersion: roostBridgePortfolioSchemaVersion,
      sourceVersion: "softwarehouse-status-v1",
      compatibility: {
        routeVersion: "v1",
        supportedSchemaVersions: ["1.0"],
        backwardCompatibleWith: [],
      },
      observedAt: "2026-07-28T02:00:00.000Z",
      companyId: "company-1",
      sourceSnapshotId: `sha256:${"a".repeat(64)}`,
      sourceState: "available",
      stale: false,
      conflictState: "none",
      supersessionState: "current",
      failure: null,
      items: [],
    } as const;

    expect(roostBridgePortfolioProjectionSchema.parse(packet)).toEqual(packet);
    expect(roostBridgePortfolioProjectionSchema.safeParse({
      ...packet,
      rawPrompt: "must not cross the bridge",
    }).success).toBe(false);
    expect(roostBridgePortfolioProjectionSchema.safeParse({
      ...packet,
      schemaVersion: "2.0",
    }).success).toBe(false);
  });
});
