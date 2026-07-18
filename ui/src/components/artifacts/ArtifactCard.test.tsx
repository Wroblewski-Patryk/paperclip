// @vitest-environment jsdom

import { act, type ReactNode } from "react";
import { createRoot } from "react-dom/client";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import type { CompanyArtifact } from "@/api/artifacts";
import { ArtifactCard } from "./ArtifactCard";

vi.mock("@/lib/router", () => ({
  Link: ({ to, children, disableIssueQuicklook: _disableIssueQuicklook, ...props }: {
    to: string;
    children: ReactNode;
    disableIssueQuicklook?: boolean;
  }) => <a href={to} {...props}>{children}</a>,
}));

// eslint-disable-next-line @typescript-eslint/no-explicit-any
(globalThis as any).IS_REACT_ACT_ENVIRONMENT = true;

const artifact: CompanyArtifact = {
  id: "artifact-1",
  source: "work_product",
  mediaKind: "text",
  title: "Release evidence",
  previewText: "Verification passed.",
  contentType: "text/markdown",
  contentPath: null,
  openPath: "/api/attachments/open/content",
  downloadPath: "/api/attachments/download/content",
  issue: {
    id: "11111111-1111-4111-8111-111111111111",
    identifier: "LUC-25",
    title: "Deliver Soar and Roost",
  },
  project: null,
  createdByAgent: {
    id: "22222222-2222-4222-8222-222222222222",
    name: "09 QVE",
  },
  updatedAt: "2026-07-18T02:00:00.000Z",
  href: "/issues/LUC-25#work-product-artifact-1",
};

describe("ArtifactCard", () => {
  let container: HTMLDivElement;

  beforeEach(() => {
    container = document.createElement("div");
    document.body.appendChild(container);
  });

  afterEach(() => {
    container.remove();
    document.body.innerHTML = "";
  });

  it("keeps the card destination and file actions as sibling links", async () => {
    const root = createRoot(container);
    await act(async () => {
      root.render(<ArtifactCard artifact={artifact} />);
    });

    const card = container.querySelector('[data-testid="artifact-card"]');
    expect(card?.querySelectorAll("a")).toHaveLength(3);
    expect(card?.querySelector("a a")).toBeNull();
    expect(card?.querySelector('a[aria-label="Open Release evidence"]')?.getAttribute("href"))
      .toBe("/issues/LUC-25#work-product-artifact-1");
    expect(card?.querySelector('a[aria-label="Open file in new tab"]')?.getAttribute("href"))
      .toBe("/api/attachments/open/content");
    expect(card?.querySelector('a[aria-label="Download file"]')?.getAttribute("href"))
      .toBe("/api/attachments/download/content");

    await act(async () => {
      root.unmount();
    });
  });
});
