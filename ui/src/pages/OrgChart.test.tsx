// @vitest-environment jsdom

import { act } from "react";
import { createRoot } from "react-dom/client";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { OrgChart, sortOrgTreeByName } from "./OrgChart";

const navigateMock = vi.fn();
const orgMock = vi.fn();
const listMock = vi.fn();
const liveRunsMock = vi.fn();

vi.mock("@/lib/router", () => ({
  Link: ({ to, children }: { to: string; children: React.ReactNode }) => <a href={to}>{children}</a>,
  useNavigate: () => navigateMock,
}));

vi.mock("../context/CompanyContext", () => ({
  useCompany: () => ({ selectedCompanyId: "company-1" }),
}));

vi.mock("../context/BreadcrumbContext", () => ({
  useBreadcrumbs: () => ({ setBreadcrumbs: vi.fn() }),
}));

vi.mock("../api/agents", () => ({
  agentsApi: {
    org: () => orgMock(),
    list: () => listMock(),
  },
}));

vi.mock("../api/heartbeats", () => ({
  heartbeatsApi: {
    liveRunsForCompany: () => liveRunsMock(),
  },
}));

vi.mock("../components/AgentIconPicker", () => ({
  AgentIcon: () => <span data-testid="agent-icon" />,
}));

// eslint-disable-next-line @typescript-eslint/no-explicit-any
(globalThis as any).IS_REACT_ACT_ENVIRONMENT = true;

const orgTree = [
  {
    id: "agent-1",
    name: "CEO",
    role: "ceo",
    status: "active",
    reports: [
      {
        id: "agent-2",
        name: "Engineer",
        role: "engineer",
        status: "active",
        reports: [],
      },
    ],
  },
];

const agents = [
  {
    id: "agent-1",
    companyId: "company-1",
    name: "CEO",
    role: "ceo",
    title: null,
    status: "active",
    reportsTo: null,
    capabilities: null,
    adapterType: "codex_local",
    adapterConfig: {},
    contextMode: "thin",
    budgetMonthlyCents: 0,
    spentMonthlyCents: 0,
    lastHeartbeatAt: null,
    icon: "briefcase",
    metadata: null,
    createdAt: new Date("2026-04-01T00:00:00.000Z"),
    updatedAt: new Date("2026-04-01T00:00:00.000Z"),
    urlKey: "ceo",
    pauseReason: null,
    pausedAt: null,
    permissions: null,
  },
  {
    id: "agent-2",
    companyId: "company-1",
    name: "Engineer",
    role: "engineer",
    title: null,
    status: "active",
    reportsTo: "agent-1",
    capabilities: null,
    adapterType: "codex_local",
    adapterConfig: {},
    contextMode: "thin",
    budgetMonthlyCents: 0,
    spentMonthlyCents: 0,
    lastHeartbeatAt: null,
    icon: "code",
    metadata: null,
    createdAt: new Date("2026-04-01T00:00:00.000Z"),
    updatedAt: new Date("2026-04-01T00:00:00.000Z"),
    urlKey: "engineer",
    pauseReason: null,
    pausedAt: null,
    permissions: null,
  },
];

function createTouchEvent(type: string, touches: Array<{ clientX: number; clientY: number }>) {
  const event = new Event(type, { bubbles: true, cancelable: true });
  Object.defineProperty(event, "touches", {
    value: touches,
  });
  Object.defineProperty(event, "changedTouches", {
    value: touches,
  });
  return event;
}

async function flushReact() {
  await act(async () => {
    await Promise.resolve();
    await new Promise((resolve) => window.setTimeout(resolve, 0));
  });
}

describe("OrgChart mobile gestures", () => {
  let container: HTMLDivElement;
  let root: ReturnType<typeof createRoot>;
  let queryClient: QueryClient;

  beforeEach(() => {
    container = document.createElement("div");
    document.body.appendChild(container);
    queryClient = new QueryClient({
      defaultOptions: { queries: { retry: false } },
    });
    orgMock.mockResolvedValue(orgTree);
    listMock.mockResolvedValue(agents);
    liveRunsMock.mockResolvedValue([]);

    Object.defineProperty(HTMLElement.prototype, "clientWidth", {
      configurable: true,
      get() {
        return this.getAttribute("data-testid") === "org-chart-viewport" ? 360 : 0;
      },
    });
    Object.defineProperty(HTMLElement.prototype, "clientHeight", {
      configurable: true,
      get() {
        return this.getAttribute("data-testid") === "org-chart-viewport" ? 520 : 0;
      },
    });
    vi.spyOn(HTMLElement.prototype, "getBoundingClientRect").mockImplementation(function getRect(this: HTMLElement) {
      if (this.getAttribute("data-testid") === "org-chart-viewport") {
        return {
          x: 0,
          y: 0,
          left: 0,
          top: 0,
          right: 360,
          bottom: 520,
          width: 360,
          height: 520,
          toJSON: () => ({}),
        };
      }
      return {
        x: 0,
        y: 0,
        left: 0,
        top: 0,
        right: 0,
        bottom: 0,
        width: 0,
        height: 0,
        toJSON: () => ({}),
      };
    });
  });

  afterEach(async () => {
    if (root) {
      await act(async () => {
        root.unmount();
      });
    }
    container.remove();
    document.body.innerHTML = "";
    vi.restoreAllMocks();
    vi.clearAllMocks();
  });

  async function renderOrgChart() {
    root = createRoot(container);
    await act(async () => {
      root.render(
        <QueryClientProvider client={queryClient}>
          <OrgChart />
        </QueryClientProvider>,
      );
    });
    await flushReact();
    await flushReact();
    return {
      viewport: container.querySelector('[data-testid="org-chart-viewport"]') as HTMLDivElement,
      layer: container.querySelector('[data-testid="org-chart-card-layer"]') as HTMLDivElement,
    };
  }

  it("pans the chart with one-finger touch drag", async () => {
    const { viewport, layer } = await renderOrgChart();

    await act(async () => {
      viewport.dispatchEvent(createTouchEvent("touchstart", [{ clientX: 100, clientY: 100 }]));
      viewport.dispatchEvent(createTouchEvent("touchmove", [{ clientX: 130, clientY: 145 }]));
      viewport.dispatchEvent(createTouchEvent("touchend", []));
    });

    expect(layer.style.transform).toBe("translate(50px, 175.54545454545453px) scale(0.7272727272727273)");
  });

  it("suppresses card navigation after a touch pan", async () => {
    const { viewport } = await renderOrgChart();
    const card = container.querySelector("[data-org-card]") as HTMLDivElement;

    await act(async () => {
      viewport.dispatchEvent(createTouchEvent("touchstart", [{ clientX: 100, clientY: 100 }]));
      viewport.dispatchEvent(createTouchEvent("touchmove", [{ clientX: 130, clientY: 145 }]));
      viewport.dispatchEvent(createTouchEvent("touchend", []));
      card.dispatchEvent(new MouseEvent("click", { bubbles: true, cancelable: true }));
    });

    expect(navigateMock).not.toHaveBeenCalled();
  });

  it("allows card expansion after a touch tap without movement", async () => {
    const { viewport } = await renderOrgChart();
    const card = container.querySelector("[data-org-card]") as HTMLDivElement;
    const toggle = card.querySelector("button") as HTMLButtonElement;

    await act(async () => {
      viewport.dispatchEvent(createTouchEvent("touchstart", [{ clientX: 100, clientY: 100 }]));
      viewport.dispatchEvent(createTouchEvent("touchend", []));
      toggle.dispatchEvent(new MouseEvent("click", { bubbles: true, cancelable: true }));
    });

    expect(toggle.getAttribute("aria-expanded")).toBe("true");
    expect(navigateMock).not.toHaveBeenCalled();
  });

  it("reserves vertical space for expanded cards before laying out reports", async () => {
    await renderOrgChart();
    const cardsBefore = Array.from(container.querySelectorAll("[data-org-card]")) as HTMLDivElement[];
    expect(cardsBefore[0]?.style.height).toBe("82px");
    expect(cardsBefore[1]?.style.top).toBe("214px");

    const toggle = cardsBefore[0]?.querySelector("button") as HTMLButtonElement;
    await act(async () => {
      toggle.dispatchEvent(new MouseEvent("click", { bubbles: true, cancelable: true }));
    });
    await flushReact();

    const cardsAfter = Array.from(container.querySelectorAll("[data-org-card]")) as HTMLDivElement[];
    expect(cardsAfter[0]?.style.height).toBe("166px");
    expect(cardsAfter[1]?.style.top).toBe("298px");
  });

  it("highlights live agents and animates their reporting line", async () => {
    liveRunsMock.mockResolvedValue([
      {
        id: "run-1",
        status: "running",
        invocationSource: "assignment",
        triggerDetail: null,
        startedAt: "2026-05-31T00:00:00.000Z",
        finishedAt: null,
        createdAt: "2026-05-31T00:00:00.000Z",
        agentId: "agent-2",
        agentName: "Engineer",
        adapterType: "codex_local",
        issueId: "issue-1",
      },
    ]);

    await renderOrgChart();

    expect(container.querySelector('[data-org-card][data-live="true"]')?.textContent).toContain("Live");
    expect(container.querySelector('[data-testid="org-chart-live-edge"]')).not.toBeNull();
    expect(container.querySelector('[data-testid="org-chart-live-edge"]')?.getAttribute("d"))
      .toBe(container.querySelector('[data-testid="org-chart-edge"]')?.getAttribute("d"));
  });

  it("animates only the active branch to a live descendant", async () => {
    orgMock.mockResolvedValue([
      {
        id: "agent-1",
        name: "CEO",
        role: "ceo",
        status: "active",
        reports: [
          {
            id: "agent-2",
            name: "Engineer",
            role: "engineer",
            status: "active",
            reports: [
              {
                id: "agent-4",
                name: "Runtime",
                role: "engineer",
                status: "active",
                reports: [],
              },
            ],
          },
          {
            id: "agent-3",
            name: "Designer",
            role: "designer",
            status: "active",
            reports: [],
          },
        ],
      },
    ]);
    liveRunsMock.mockResolvedValue([
      {
        id: "run-1",
        status: "running",
        invocationSource: "assignment",
        triggerDetail: null,
        startedAt: "2026-05-31T00:00:00.000Z",
        finishedAt: null,
        createdAt: "2026-05-31T00:00:00.000Z",
        agentId: "agent-4",
        agentName: "Runtime",
        adapterType: "codex_local",
        issueId: "issue-1",
      },
    ]);

    await renderOrgChart();

    expect(container.querySelectorAll('[data-testid="org-chart-edge"]')).toHaveLength(3);
    expect(container.querySelectorAll('[data-testid="org-chart-live-edge"]')).toHaveLength(2);
  });

  it("animates every active sibling branch instead of stopping at the first live child", async () => {
    orgMock.mockResolvedValue([
      {
        id: "agent-1",
        name: "CEO",
        role: "ceo",
        status: "active",
        reports: [
          {
            id: "agent-2",
            name: "Innovation",
            role: "director",
            status: "active",
            reports: [
              {
                id: "agent-4",
                name: "Soar PM",
                role: "manager",
                status: "active",
                reports: [],
              },
            ],
          },
          {
            id: "agent-3",
            name: "CTO",
            role: "architect",
            status: "active",
            reports: [],
          },
        ],
      },
    ]);
    liveRunsMock.mockResolvedValue([
      {
        id: "run-1",
        status: "running",
        invocationSource: "assignment",
        triggerDetail: null,
        startedAt: "2026-05-31T00:00:00.000Z",
        finishedAt: null,
        createdAt: "2026-05-31T00:00:00.000Z",
        agentId: "agent-4",
        agentName: "Soar PM",
        adapterType: "codex_local",
        issueId: "issue-1",
      },
      {
        id: "run-2",
        status: "running",
        invocationSource: "assignment",
        triggerDetail: null,
        startedAt: "2026-05-31T00:00:00.000Z",
        finishedAt: null,
        createdAt: "2026-05-31T00:00:00.000Z",
        agentId: "agent-3",
        agentName: "CTO",
        adapterType: "codex_local",
        issueId: "issue-2",
      },
    ]);

    await renderOrgChart();

    expect(container.querySelectorAll('[data-testid="org-chart-edge"]')).toHaveLength(3);
    expect(container.querySelectorAll('[data-testid="org-chart-live-edge"]')).toHaveLength(3);
  });

  it("keeps cards collapsed by default even when their branch is active", async () => {
    liveRunsMock.mockResolvedValue([
      {
        id: "run-1",
        status: "running",
        invocationSource: "assignment",
        triggerDetail: null,
        startedAt: "2026-05-31T00:00:00.000Z",
        finishedAt: null,
        createdAt: "2026-05-31T00:00:00.000Z",
        agentId: "agent-2",
        agentName: "Engineer",
        adapterType: "codex_local",
        issueId: "issue-1",
      },
    ]);

    await renderOrgChart();
    const rootToggle = container.querySelector("[data-org-card] button") as HTMLButtonElement;
    expect(rootToggle.getAttribute("aria-expanded")).toBe("false");
  });

  it("keeps manual expansion stable when live activity changes", async () => {
    liveRunsMock.mockResolvedValue([]);

    await renderOrgChart();
    const rootToggle = container.querySelector("[data-org-card] button") as HTMLButtonElement;
    expect(rootToggle.getAttribute("aria-expanded")).toBe("false");

    await act(async () => {
      rootToggle.dispatchEvent(new MouseEvent("click", { bubbles: true, cancelable: true }));
    });
    await flushReact();

    expect(rootToggle.getAttribute("aria-expanded")).toBe("true");

    liveRunsMock.mockResolvedValue([
      {
        id: "run-1",
        status: "running",
        invocationSource: "assignment",
        triggerDetail: null,
        startedAt: "2026-05-31T00:00:00.000Z",
        finishedAt: null,
        createdAt: "2026-05-31T00:00:00.000Z",
        agentId: "agent-2",
        agentName: "Engineer",
        adapterType: "codex_local",
        issueId: "issue-1",
      },
    ]);

    await act(async () => {
      await queryClient.invalidateQueries({ queryKey: ["live-runs"] });
    });
    await flushReact();

    expect(rootToggle.getAttribute("aria-expanded")).toBe("true");
  });

  it("sorts roots and reports by name at every hierarchy level", () => {
    expect(sortOrgTreeByName([
      {
        id: "root-b",
        name: "08 CAO (Chief Assets Officer)",
        role: "pm",
        status: "idle",
        reports: [],
      },
      {
        id: "root-a",
        name: "02 CPO (Chief Product Officer)",
        role: "pm",
        status: "idle",
        reports: [
          {
            id: "child-b",
            name: "02 UXW (UX Web Designer)",
            role: "designer",
            status: "idle",
            reports: [],
          },
          {
            id: "child-a",
            name: "02 UID (UI Visual Designer)",
            role: "designer",
            status: "idle",
            reports: [],
          },
        ],
      },
    ])).toMatchObject([
      {
        id: "root-a",
        reports: [
          { id: "child-a" },
          { id: "child-b" },
        ],
      },
      { id: "root-b" },
    ]);
  });

  it("pinch-zooms toward the touch center", async () => {
    const { viewport, layer } = await renderOrgChart();

    await act(async () => {
      viewport.dispatchEvent(createTouchEvent("touchstart", [
        { clientX: 100, clientY: 100 },
        { clientX: 200, clientY: 100 },
      ]));
      viewport.dispatchEvent(createTouchEvent("touchmove", [
        { clientX: 75, clientY: 100 },
        { clientX: 225, clientY: 100 },
      ]));
      viewport.dispatchEvent(createTouchEvent("touchend", []));
    });

    expect(layer.style.transform).toBe("translate(-44.99999999999997px, 145.81818181818178px) scale(1.0909090909090908)");
  });
});
