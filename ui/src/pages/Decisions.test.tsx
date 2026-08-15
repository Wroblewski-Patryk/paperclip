// @vitest-environment jsdom

import { flushSync } from "react-dom";
import { createRoot } from "react-dom/client";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { MemoryRouter } from "react-router-dom";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import type { DecisionCenterItem, DecisionCenterResponse } from "@paperclipai/shared";
import { Decisions } from "./Decisions";

const companyState = vi.hoisted(() => ({ selectedCompanyId: "company-1" }));
const breadcrumbState = vi.hoisted(() => ({ setBreadcrumbs: vi.fn() }));
const decisionsApiMock = vi.hoisted(() => ({ list: vi.fn(), defer: vi.fn(), clearDefer: vi.fn() }));
const agentsApiMock = vi.hoisted(() => ({ list: vi.fn() }));

vi.mock("../context/CompanyContext", () => ({ useCompany: () => companyState }));
vi.mock("../context/BreadcrumbContext", () => ({ useBreadcrumbs: () => breadcrumbState }));
vi.mock("../api/decisions", () => ({ decisionsApi: decisionsApiMock }));
vi.mock("../api/agents", () => ({ agentsApi: agentsApiMock }));
vi.mock("../components/PageTabBar", () => ({
  PageTabBar: ({ items, onValueChange }: { items: Array<{ value: string; label: string }>; onValueChange: (value: string) => void }) => (
    <div>{items.map((item) => <button key={item.value} type="button" onClick={() => onValueChange(item.value)}>{item.label}</button>)}</div>
  ),
}));
vi.mock("../components/IssueThreadInteractionCard", () => ({
  IssueThreadInteractionCard: ({ interaction }: { interaction: { id: string } }) => (
    <div data-testid="decision-response">Odpowiedź dla {interaction.id}</div>
  ),
}));

function briefing(decision: string, recommendation: string) {
  return {
    version: 1 as const,
    language: "pl" as const,
    preparedBy: "aia" as const,
    decision,
    plainLanguageSummary: "To krótkie wyjaśnienie sprawy bez technicznego żargonu.",
    scope: ["Jedna operacja testowa w bezpiecznym środowisku."],
    outOfScope: ["Nie obejmuje produkcji ani prawdziwych środków."],
    openQuestions: ["Brak potwierdzenia dostępu do środowiska testowego."],
    safetyConstraints: ["Zatrzymaj próbę, jeśli nie można potwierdzić trybu testowego."],
    contextFacts: ["Fakt pierwszy", "Fakt drugi"],
    options: [{
      id: "recommended",
      label: "Opcja rekomendowana",
      description: "Opis opcji",
      benefit: "Korzyść",
      cost: "Koszt",
      risk: "Ryzyko",
    }],
    recommendation,
    afterApproval: ["AIA przekaże decyzję właściwemu agentowi."],
    rollback: "Zmianę można bezpiecznie cofnąć.",
  };
}

function decisionItem(id: string, decision: string, recommendation: string): DecisionCenterItem {
  return {
    id,
    companyId: "company-1",
    sourceType: "interaction",
    sourceId: id,
    state: "ready",
    category: "information_request",
    title: `Surowy tytuł ${id}`,
    summary: null,
    whyOwner: "Wymaga decyzji właścicielskiej.",
    recommendedAction: recommendation,
    ownerBriefing: briefing(decision, recommendation),
    risk: "medium",
    urgency: "low",
    createdAt: "2026-08-15T12:00:00.000Z",
    updatedAt: "2026-08-15T12:00:00.000Z",
    deferredUntil: null,
    deferNote: null,
    issue: { id: `issue-${id}`, identifier: `LUC-${id}`, title: `Zadanie ${id}`, status: "blocked", priority: "medium", projectId: null, assigneeAgentId: null },
    interaction: { id, issueId: `issue-${id}` } as DecisionCenterItem["interaction"],
    approval: null,
  };
}

async function flush() {
  await Promise.resolve();
  await new Promise((resolve) => setTimeout(resolve, 0));
}

async function waitForAssertion(assertion: () => void, attempts = 50) {
  let lastError: unknown;
  for (let attempt = 0; attempt < attempts; attempt += 1) {
    try {
      assertion();
      return;
    } catch (error) {
      lastError = error;
      await flush();
    }
  }
  throw lastError;
}

describe("Decisions page", () => {
  let container: HTMLDivElement;

  beforeEach(() => {
    container = document.createElement("div");
    document.body.appendChild(container);
    breadcrumbState.setBreadcrumbs.mockReset();
    decisionsApiMock.list.mockReset();
    agentsApiMock.list.mockReset().mockResolvedValue([]);
  });

  afterEach(() => container.remove());

  it("shows only AIA-prepared owner decisions and switches the briefing preview", async () => {
    const first = decisionItem("1", "Czy uruchomić publikację Featherly?", "Uruchom publikację po akceptacji.");
    const second = decisionItem("2", "Czy zwiększyć limit kosztów Soar?", "Pozostaw obecny limit.");
    const response: DecisionCenterResponse = {
      counts: { ready: 2, preparing: 53, deferred: 0, allOpen: 55 },
      items: [
        first,
        second,
        { ...decisionItem("internal", "Wewnętrzny routing agenta", "Przekaż do RTE."), state: "preparing", ownerBriefing: null },
      ],
    };
    decisionsApiMock.list.mockResolvedValue(response);

    const root = createRoot(container);
    const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } });
    flushSync(() => {
      root.render(
        <QueryClientProvider client={queryClient}>
          <MemoryRouter><Decisions /></MemoryRouter>
        </QueryClientProvider>,
      );
    });

    await waitForAssertion(() => {
      expect(container.textContent).toContain("AIA przygotowuje 53");
      expect(container.textContent).toContain("Decyzja 1 z 2");
      expect(container.textContent).toContain("Dlaczego pyta Ciebie?");
      expect(container.textContent).toContain("W skrócie");
      expect(container.textContent).toContain("To krótkie wyjaśnienie sprawy bez technicznego żargonu.");
      expect(container.textContent).toContain("Czego nadal brakuje");
      expect(container.textContent).toContain("Ta decyzja nie obejmuje");
      expect(container.textContent).toContain("Warunki bezpieczeństwa");
      expect(container.textContent).toContain("Krok 2 · Twoja odpowiedź");
      expect(container.textContent).toContain("Czy uruchomić publikację Featherly?");
      expect(container.textContent).toContain("Uruchom publikację po akceptacji.");
      expect(container.textContent).not.toContain("Wewnętrzny routing agenta");
    });

    const secondButton = [...container.querySelectorAll("button")]
      .find((button) => button.textContent?.includes("Czy zwiększyć limit kosztów Soar?"));
    expect(secondButton).toBeTruthy();
    flushSync(() => secondButton!.click());

    await waitForAssertion(() => {
      expect(container.textContent).toContain("Decyzja 2 z 2");
      expect(container.textContent).toContain("Pozostaw obecny limit.");
      expect(container.querySelector('[data-testid="decision-response"]')?.textContent).toContain("2");
    });

    flushSync(() => root.unmount());
  });

  it("marks resolved decisions as historical records and leads with the plain-language meaning", async () => {
    const historical = {
      ...decisionItem("1900", "Czy zamknąć historyczny incydent SMTP?", "Nie zgaduj brakujących wyników."),
      state: "resolved" as const,
    };
    decisionsApiMock.list.mockResolvedValue({
      counts: { ready: 0, preparing: 0, deferred: 0, allOpen: 0 },
      items: [historical],
    });

    const root = createRoot(container);
    const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } });
    flushSync(() => {
      root.render(
        <QueryClientProvider client={queryClient}>
          <MemoryRouter><Decisions /></MemoryRouter>
        </QueryClientProvider>,
      );
    });

    await waitForAssertion(() => expect(container.textContent).toContain("Historia 1"));
    const historyButton = [...container.querySelectorAll("button")]
      .find((button) => button.textContent?.includes("Historia 1"));
    expect(historyButton).toBeTruthy();
    flushSync(() => historyButton!.click());

    await waitForAssertion(() => {
      expect(container.textContent).toContain("Zakończona sprawa. To zapis historyczny — nie wymaga ponownego działania.");
      expect(container.textContent).toContain("To krótkie wyjaśnienie sprawy bez technicznego żargonu.");
      expect(container.textContent).toContain("Krok 2 · Zapisana odpowiedź");
    });

    flushSync(() => root.unmount());
  });
});
