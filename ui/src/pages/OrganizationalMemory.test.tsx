// @vitest-environment jsdom

import { act, type ReactNode } from "react";
import { createRoot } from "react-dom/client";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import type { Agent, OrganizationalRecord } from "@paperclipai/shared";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { OrganizationalMemory } from "./OrganizationalMemory";

const mockRecordsApi = vi.hoisted(() => ({
  list: vi.fn(),
  create: vi.fn(),
  update: vi.fn(),
}));

const mockAgentsApi = vi.hoisted(() => ({ list: vi.fn() }));
const mockSetBreadcrumbs = vi.hoisted(() => vi.fn());

vi.mock("@/lib/router", () => ({
  Link: ({ children, to, ...props }: { children: ReactNode; to: string }) => <a href={to} {...props}>{children}</a>,
}));

vi.mock("../context/CompanyContext", () => ({
  useCompany: () => ({ selectedCompanyId: "company-1" }),
}));

vi.mock("../context/BreadcrumbContext", () => ({
  useBreadcrumbs: () => ({ setBreadcrumbs: mockSetBreadcrumbs }),
}));

vi.mock("../api/organizationalRecords", () => ({ organizationalRecordsApi: mockRecordsApi }));
vi.mock("../api/agents", () => ({ agentsApi: mockAgentsApi }));

// eslint-disable-next-line @typescript-eslint/no-explicit-any
(globalThis as any).IS_REACT_ACT_ENVIRONMENT = true;

async function flushReact() {
  await act(async () => {
    await Promise.resolve();
    await new Promise((resolve) => window.setTimeout(resolve, 0));
  });
}

function makeRecord(overrides: Partial<OrganizationalRecord> = {}): OrganizationalRecord {
  return {
    id: "record-1",
    companyId: "company-1",
    kind: "decision",
    status: "accepted",
    title: "Use a durable decision journal",
    statement: "Persist decisions with their complete operating context.",
    rationale: "Future agents need to understand why the choice was made.",
    consequences: "Every decision keeps its downstream operational effect.",
    resolution: "Adopt the journal as the canonical record.",
    confidence: 95,
    ownerAgentId: "agent-1",
    ownerUserId: null,
    goalId: "goal-1",
    projectId: "project-1",
    issueId: "issue-1",
    supersedesId: null,
    evidence: [{ kind: "issue", ref: "LUC-123", label: "Decision evidence" }],
    dueAt: null,
    reviewAt: new Date("2099-01-01T00:00:00Z"),
    expiresAt: null,
    resolvedAt: new Date("2026-08-01T00:00:00Z"),
    createdByAgentId: "agent-1",
    createdByUserId: null,
    createdAt: new Date("2026-08-01T00:00:00Z"),
    updatedAt: new Date("2026-08-14T00:00:00Z"),
    ...overrides,
  };
}

function makeAgent(): Agent {
  return {
    id: "agent-1",
    companyId: "company-1",
    name: "Technical Architect",
    urlKey: "technical-architect",
    role: "cto",
    title: null,
    icon: null,
    status: "idle",
    reportsTo: null,
    capabilities: null,
    adapterType: "codex_local",
    adapterConfig: {},
    runtimeConfig: {},
    budgetMonthlyCents: 0,
    spentMonthlyCents: 0,
    pauseReason: null,
    pausedAt: null,
    permissions: { canCreateAgents: false },
    lastHeartbeatAt: null,
    metadata: null,
    createdAt: new Date("2026-01-01T00:00:00Z"),
    updatedAt: new Date("2026-01-01T00:00:00Z"),
  };
}

describe("OrganizationalMemory", () => {
  let container: HTMLDivElement;
  let root: ReturnType<typeof createRoot> | null;
  let queryClient: QueryClient;

  beforeEach(() => {
    container = document.createElement("div");
    document.body.appendChild(container);
    root = null;
    queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } });
    mockRecordsApi.list.mockResolvedValue([makeRecord()]);
    mockAgentsApi.list.mockResolvedValue([makeAgent()]);
  });

  afterEach(async () => {
    if (root) await act(async () => root!.unmount());
    queryClient.clear();
    container.remove();
    document.body.innerHTML = "";
    vi.clearAllMocks();
  });

  async function renderPage() {
    root = createRoot(container);
    await act(async () => {
      root!.render(<QueryClientProvider client={queryClient}><OrganizationalMemory /></QueryClientProvider>);
    });
    await flushReact();
    await flushReact();
  }

  it("opens the first populated category and makes empty categories explicit", async () => {
    await renderPage();

    expect(container.textContent).toContain("1 durable record keeps autonomous work aligned.");
    expect(container.textContent).toContain("Assumptions and Commitments are still empty.");
    expect(container.textContent).toContain("Use a durable decision journal");
    expect(container.querySelector('button[aria-pressed="true"]')?.textContent).toContain("Decisions");
  });

  it("reveals rationale, consequences, resolution, evidence, links, and owner", async () => {
    await renderPage();
    const expand = container.querySelector('button[aria-label^="Expand Use a durable decision journal"]') as HTMLButtonElement;

    await act(async () => expand.click());

    expect(container.textContent).toContain("Future agents need to understand why the choice was made.");
    expect(container.textContent).toContain("Every decision keeps its downstream operational effect.");
    expect(container.textContent).toContain("Adopt the journal as the canonical record.");
    expect(container.textContent).toContain("Decision evidence");
    expect(container.textContent).toContain("Technical Architect");
    expect(container.querySelector('a[href="/issues/LUC-123"]')).not.toBeNull();
    expect(container.querySelector('a[href="/agents/technical-architect"]')).not.toBeNull();
  });
});
