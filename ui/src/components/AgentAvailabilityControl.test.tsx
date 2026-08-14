// @vitest-environment jsdom

import { act } from "react";
import { createRoot } from "react-dom/client";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import type { AgentAvailability } from "@paperclipai/shared";
import { AgentAvailabilityControl } from "./AgentAvailabilityControl";

(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;

function availability(overrides: Partial<AgentAvailability> = {}): AgentAvailability {
  return {
    companyId: "company-1",
    state: "on",
    controlState: "open",
    enabled: true,
    acceptsNewRuns: true,
    activeRunCount: 0,
    deferredWorkCount: 0,
    changedAt: "2026-08-14T12:00:00.000Z",
    changedBy: { actorType: "user", actorId: "owner" },
    drainStartedAt: null,
    offSince: null,
    openedAt: "2026-08-14T12:00:00.000Z",
    replaySnapshot: null,
    ...overrides,
  };
}

describe("AgentAvailabilityControl", () => {
  let container: HTMLDivElement;
  let root: ReturnType<typeof createRoot>;

  beforeEach(() => {
    container = document.createElement("div");
    document.body.appendChild(container);
    root = createRoot(container);
  });

  afterEach(() => {
    act(() => root.unmount());
    container.remove();
  });

  it("exposes the admission state as an accessible switch", () => {
    const onChange = vi.fn();
    act(() => root.render(
      <AgentAvailabilityControl availability={availability()} onChange={onChange} />,
    ));

    const toggle = container.querySelector<HTMLButtonElement>('[role="switch"]');
    expect(toggle?.getAttribute("aria-checked")).toBe("true");
    expect(container.textContent).toContain("New agent runs may start");
    act(() => toggle?.click());
    expect(onChange).toHaveBeenCalledWith(false);
  });

  it("explains draining without presenting it as enabled", () => {
    act(() => root.render(
      <AgentAvailabilityControl
        availability={availability({
          state: "draining",
          controlState: "draining",
          enabled: false,
          acceptsNewRuns: false,
          activeRunCount: 2,
          deferredWorkCount: 5,
        })}
        onChange={() => undefined}
      />,
    ));

    expect(container.querySelector('[role="switch"]')?.getAttribute("aria-checked")).toBe("false");
    expect(container.textContent).toContain("Finishing 2 active run(s)");
    expect(container.textContent).toContain("5 deferred");
  });
});
