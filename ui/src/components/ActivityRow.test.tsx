// @vitest-environment jsdom

import { act } from "react";
import { createRoot } from "react-dom/client";
import { afterEach, describe, expect, it, vi } from "vitest";
import type { ActivityEvent } from "@paperclipai/shared";
import { ActivityRow } from "./ActivityRow";

(globalThis as typeof globalThis & { IS_REACT_ACT_ENVIRONMENT: boolean }).IS_REACT_ACT_ENVIRONMENT = true;

const navigate = vi.hoisted(() => vi.fn());

vi.mock("@/lib/router", () => ({
  useNavigate: () => navigate,
}));

vi.mock("./IssueReferenceActivitySummary", () => ({
  IssueReferenceActivitySummary: () => <a href="/issues/LUC-751">LUC-751</a>,
}));

const event = {
  id: "activity-1",
  companyId: "company-1",
  actorType: "system",
  actorId: "system",
  action: "issue.updated",
  entityType: "issue",
  entityId: "issue-1",
  details: {},
  createdAt: new Date("2026-07-12T12:00:00.000Z"),
} as ActivityEvent;

describe("ActivityRow", () => {
  let container: HTMLDivElement | null = null;

  afterEach(() => {
    navigate.mockReset();
    container?.remove();
    container = null;
  });

  it("keeps referenced issue links outside of an outer anchor", async () => {
    container = document.createElement("div");
    document.body.appendChild(container);
    const root = createRoot(container);

    await act(async () => {
      root.render(
        <ActivityRow
          event={event}
          agentMap={new Map()}
          entityNameMap={new Map([["issue:issue-1", "LUC-805"]])}
        />,
      );
    });

    const row = container.querySelector<HTMLElement>("[role='link']");
    const issueLink = container.querySelector<HTMLAnchorElement>("a[href='/issues/LUC-751']");
    expect(row).not.toBeNull();
    expect(issueLink).not.toBeNull();
    expect(container.querySelector("a a")).toBeNull();
    issueLink?.addEventListener("click", (clickEvent) => clickEvent.preventDefault());

    await act(async () => {
      row?.dispatchEvent(new MouseEvent("click", { bubbles: true }));
    });
    expect(navigate).toHaveBeenCalledWith("/issues/LUC-805");

    navigate.mockReset();
    await act(async () => {
      issueLink?.dispatchEvent(new MouseEvent("click", { bubbles: true, cancelable: true }));
    });
    expect(navigate).not.toHaveBeenCalled();
  });
});
