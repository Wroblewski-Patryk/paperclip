// @vitest-environment jsdom

import { act } from "react";
import { createRoot } from "react-dom/client";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { CodexSubscriptionPanel } from "./CodexSubscriptionPanel";

(globalThis as unknown as { IS_REACT_ACT_ENVIRONMENT: boolean }).IS_REACT_ACT_ENVIRONMENT = true;

describe("CodexSubscriptionPanel", () => {
  let container: HTMLDivElement;

  beforeEach(() => {
    container = document.createElement("div");
    document.body.appendChild(container);
  });

  afterEach(() => {
    container.remove();
  });

  it("labels last-known-good limits without hiding the provider refresh failure", () => {
    const root = createRoot(container);
    act(() => {
      root.render(
        <CodexSubscriptionPanel
          windows={[{
            label: "Weekly limit",
            usedPercent: 17,
            resetsAt: "2026-07-21T20:00:00.000Z",
            valueLabel: null,
          }]}
          source="codex-wham"
          error="temporary 503"
          stale
          observedAt="2026-07-14T20:00:00.000Z"
        />,
      );
    });

    expect(container.textContent).toContain("Last known Codex quota windows.");
    expect(container.textContent).toContain("Live refresh failed; showing the last successful observation");
    expect(container.textContent).toContain("temporary 503");
    expect(container.textContent).toContain("17% used");

    act(() => root.unmount());
  });
});
