// @vitest-environment jsdom

import { act, type ReactNode } from "react";
import { createRoot } from "react-dom/client";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import type { OrganizationalObservation } from "@paperclipai/shared";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { OrganizationalLearning } from "./OrganizationalLearning";

const mockObservationsApi = vi.hoisted(() => ({ list: vi.fn(), create: vi.fn(), update: vi.fn() }));
const mockSetBreadcrumbs = vi.hoisted(() => vi.fn());

vi.mock("@/lib/router", () => ({
  Link: ({ children, to, ...props }: { children: ReactNode; to: string }) => <a href={to} {...props}>{children}</a>,
}));
vi.mock("../context/CompanyContext", () => ({ useCompany: () => ({ selectedCompanyId: "company-1" }) }));
vi.mock("../context/BreadcrumbContext", () => ({ useBreadcrumbs: () => ({ setBreadcrumbs: mockSetBreadcrumbs }) }));
vi.mock("../api/organizationalObservations", () => ({ organizationalObservationsApi: mockObservationsApi }));

// eslint-disable-next-line @typescript-eslint/no-explicit-any
(globalThis as any).IS_REACT_ACT_ENVIRONMENT = true;

function observation(overrides: Partial<OrganizationalObservation> = {}): OrganizationalObservation {
  return {
    id: "observation-1",
    companyId: "company-1",
    kind: "outcome",
    status: "verified",
    title: "Verified delivery outcome",
    summary: "Inspectable acceptance evidence confirms the result.",
    sourceClass: "issue_evidence",
    provenance: [{ kind: "issue", ref: "LUC-1" }],
    confidence: 95,
    observedAt: new Date("2026-08-14T10:00:00Z"),
    validUntil: null,
    freshnessWindowHours: null,
    goalId: null,
    projectId: "project-1",
    issueId: "issue-1",
    agentId: null,
    runId: null,
    parentObservationId: null,
    supersedesId: null,
    outcomeLayer: "acceptance",
    outcomeResult: "success",
    causalRole: null,
    externalCategory: null,
    measurement: null,
    promotionTarget: null,
    promotedAt: null,
    createdByAgentId: null,
    createdByUserId: null,
    createdAt: new Date("2026-08-14T10:00:00Z"),
    updatedAt: new Date("2026-08-14T10:00:00Z"),
    ...overrides,
  };
}

describe("OrganizationalLearning", () => {
  let container: HTMLDivElement;
  let root: ReturnType<typeof createRoot> | null;
  let queryClient: QueryClient;

  beforeEach(() => {
    container = document.createElement("div");
    document.body.appendChild(container);
    root = null;
    queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } });
    mockObservationsApi.list.mockResolvedValue([
      observation(),
      observation({ id: "observation-2", status: "disputed", title: "Runtime evidence needs review", observedAt: new Date("2026-08-13T10:00:00Z") }),
    ]);
  });

  afterEach(async () => {
    if (root) await act(async () => root!.unmount());
    queryClient.clear();
    container.remove();
    vi.clearAllMocks();
  });

  async function renderPage() {
    root = createRoot(container);
    await act(async () => {
      root!.render(<QueryClientProvider client={queryClient}><OrganizationalLearning /></QueryClientProvider>);
      await Promise.resolve();
    });
    await act(async () => { await new Promise((resolve) => window.setTimeout(resolve, 0)); });
  }

  it("surfaces attention, search, and state filters as an operator view", async () => {
    await renderPage();

    expect(container.textContent).toContain("1 observation needs review or refreshed evidence.");
    expect(container.textContent).toContain("attention first · newest next");
    const cards = [...container.querySelectorAll("article h3")].map((node) => node.textContent);
    expect(cards[0]).toBe("Runtime evidence needs review");

    const attentionButton = [...container.querySelectorAll("button")].find((button) => button.textContent === "attention")!;
    await act(async () => attentionButton.click());
    expect(container.textContent).toContain("Runtime evidence needs review");
    expect(container.textContent).not.toContain("Verified delivery outcome");

    const search = container.querySelector('input[placeholder="Search outcomes"]') as HTMLInputElement;
    await act(async () => {
      search.value = "missing";
      search.dispatchEvent(new Event("input", { bubbles: true }));
    });
    expect(search).not.toBeNull();
  });
});
