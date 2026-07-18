import { describe, expect, it } from "vitest";
import {
  BOARD_ROUTE_ROOTS,
  LEGACY_BOARD_ROUTE_ALIASES,
  applyCompanyPrefix,
  extractCompanyPrefixFromPath,
  isBoardPathWithoutPrefix,
  toCompanyRelativePath,
} from "./company-routes";

describe("company routes", () => {
  it("treats execution workspace paths as board routes that need a company prefix", () => {
    expect(isBoardPathWithoutPrefix("/execution-workspaces/workspace-123")).toBe(true);
    expect(isBoardPathWithoutPrefix("/execution-workspaces/workspace-123/routines")).toBe(true);
    expect(extractCompanyPrefixFromPath("/execution-workspaces/workspace-123")).toBeNull();
    expect(applyCompanyPrefix("/execution-workspaces/workspace-123", "PAP")).toBe(
      "/PAP/execution-workspaces/workspace-123",
    );
    expect(applyCompanyPrefix("/execution-workspaces/workspace-123/routines", "PAP")).toBe(
      "/PAP/execution-workspaces/workspace-123/routines",
    );
  });

  it("normalizes prefixed execution workspace paths back to company-relative paths", () => {
    expect(toCompanyRelativePath("/PAP/execution-workspaces/workspace-123")).toBe(
      "/execution-workspaces/workspace-123",
    );
    expect(toCompanyRelativePath("/PAP/execution-workspaces/workspace-123/routines")).toBe(
      "/execution-workspaces/workspace-123/routines",
    );
  });

  it("treats /search as a board route that needs a company prefix", () => {
    expect(isBoardPathWithoutPrefix("/search")).toBe(true);
    expect(extractCompanyPrefixFromPath("/search")).toBeNull();
    expect(applyCompanyPrefix("/search", "PAP")).toBe("/PAP/search");
    expect(applyCompanyPrefix("/search?q=hello%20world", "PAP")).toBe("/PAP/search?q=hello%20world");
    expect(toCompanyRelativePath("/PAP/search?q=foo")).toBe("/search?q=foo");
  });

  it.each([
    "memory",
    "learning",
    "softwarehouse",
    "artifacts",
    "teams",
    "plugins",
  ])(
    "treats /%s as a company-scoped board route",
    (route) => {
      expect(isBoardPathWithoutPrefix(`/${route}`)).toBe(true);
      expect(extractCompanyPrefixFromPath(`/${route}`)).toBeNull();
      expect(applyCompanyPrefix(`/${route}`, "LUC")).toBe(`/LUC/${route}`);
      expect(toCompanyRelativePath(`/LUC/${route}`)).toBe(`/${route}`);
    },
  );

  it.each(Object.entries(LEGACY_BOARD_ROUTE_ALIASES))(
    "keeps legacy /%s links company-scoped while routing them to /%s",
    (legacyRoute, canonicalRoute) => {
      expect(isBoardPathWithoutPrefix(`/${legacyRoute}`)).toBe(true);
      expect(extractCompanyPrefixFromPath(`/${legacyRoute}`)).toBeNull();
      expect(applyCompanyPrefix(`/${legacyRoute}`, "LUC")).toBe(`/LUC/${legacyRoute}`);
      expect(toCompanyRelativePath(`/LUC/${legacyRoute}`)).toBe(`/${legacyRoute}`);
      expect(BOARD_ROUTE_ROOTS).toContain(canonicalRoute);
    },
  );
});
