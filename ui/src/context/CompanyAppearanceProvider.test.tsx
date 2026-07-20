// @vitest-environment jsdom

import { act } from "react";
import { createRoot, type Root } from "react-dom/client";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import {
  CompanyAppearanceProvider,
  companyAppearanceVariables,
  normalizeBrandColor,
  readableForeground,
} from "./CompanyAppearanceProvider";

const companyState = vi.hoisted(() => ({
  brandColor: "#167D7F" as string | null,
}));

vi.mock("./CompanyContext", () => ({
  useCompany: () => ({ selectedCompany: { brandColor: companyState.brandColor } }),
}));

// eslint-disable-next-line @typescript-eslint/no-explicit-any
(globalThis as any).IS_REACT_ACT_ENVIRONMENT = true;

describe("CompanyAppearanceProvider", () => {
  let container: HTMLDivElement;
  let root: Root;

  beforeEach(() => {
    container = document.createElement("div");
    document.body.appendChild(container);
    root = createRoot(container);
    companyState.brandColor = "#167D7F";
  });

  afterEach(() => {
    act(() => root.unmount());
    container.remove();
    document.documentElement.removeAttribute("style");
    delete document.documentElement.dataset.companyAccent;
  });

  it("normalizes supported brand colors and rejects unsafe values", () => {
    expect(normalizeBrandColor(" #ABC ")).toBe("#aabbcc");
    expect(normalizeBrandColor("#167D7F")).toBe("#167d7f");
    expect(normalizeBrandColor("red")).toBeNull();
    expect(normalizeBrandColor("#12345g")).toBeNull();
  });

  it("chooses the more readable black or white foreground", () => {
    expect(readableForeground("#ffffff")).toBe("#111827");
    expect(readableForeground("#000000")).toBe("#ffffff");
  });

  it("builds a neutral fallback when a company has no brand color", () => {
    expect(companyAppearanceVariables(null)["--company-accent"]).toBe("#64748b");
  });

  it("applies and updates the selected company's accent at the document root", () => {
    act(() => root.render(<CompanyAppearanceProvider><div>App</div></CompanyAppearanceProvider>));
    expect(document.documentElement.style.getPropertyValue("--company-accent")).toBe("#167d7f");
    expect(document.documentElement.style.getPropertyValue("--primary")).toBe("#167d7f");
    expect(document.documentElement.dataset.companyAccent).toBe("#167d7f");

    companyState.brandColor = "#f5b942";
    act(() => root.render(<CompanyAppearanceProvider><div>App</div></CompanyAppearanceProvider>));
    expect(document.documentElement.style.getPropertyValue("--company-accent")).toBe("#f5b942");
    expect(document.documentElement.style.getPropertyValue("--primary-foreground")).toBe("#111827");
  });
});
