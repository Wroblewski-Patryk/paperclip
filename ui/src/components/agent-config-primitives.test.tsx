// @vitest-environment jsdom

import { act } from "react";
import { createRoot } from "react-dom/client";
import { afterEach, describe, expect, it } from "vitest";
import { TooltipProvider } from "@/components/ui/tooltip";
import { Field, ToggleField } from "./agent-config-primitives";

// eslint-disable-next-line @typescript-eslint/no-explicit-any
(globalThis as any).IS_REACT_ACT_ENVIRONMENT = true;

describe("agent config accessibility primitives", () => {
  afterEach(() => {
    document.body.innerHTML = "";
  });

  it("names help and toggle controls from their visible field labels", async () => {
    const container = document.createElement("div");
    document.body.appendChild(container);
    const root = createRoot(container);

    await act(async () => {
      root.render(
        <TooltipProvider>
          <Field label="Company name" hint="The display name for your company.">
            <input aria-label="Company name" />
          </Field>
          <ToggleField
            label="Require approval"
            hint="Keep hiring governed."
            checked
            onChange={() => undefined}
          />
        </TooltipProvider>,
      );
    });

    expect(container.querySelector('[aria-label="Help for Company name"]')).not.toBeNull();
    expect(container.querySelector('[aria-label="Help for Require approval"]')).not.toBeNull();
    expect(container.querySelector('[role="switch"][aria-label="Require approval"]')?.getAttribute("aria-checked")).toBe("true");

    await act(async () => {
      root.unmount();
    });
  });
});
