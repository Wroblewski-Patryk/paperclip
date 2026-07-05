import type { ProviderQuotaResult, QuotaWindow } from "@paperclipai/shared";

const DEFAULT_CODEX_LOCAL_SUBSCRIPTION_BUDGET_CENTS = 20_000;
const DEFAULT_CODEX_LOCAL_SUBSCRIPTION_PLAN_LABEL = "ChatGPT Pro / Codex plan";

export interface EffectiveSubscriptionCost {
  provider: string;
  source: string | null;
  planLabel: string;
  spendCents: number;
  budgetCents: number;
  utilizationPercent: number;
  windowLabel: string | null;
  resetsAt: string | null;
}

function envInt(name: string, fallback: number): number {
  const raw = process.env[name];
  if (raw == null || raw.trim() === "") return fallback;
  const parsed = Number.parseInt(raw, 10);
  return Number.isFinite(parsed) && parsed >= 0 ? parsed : fallback;
}

function planBudgetCents(): number {
  return envInt(
    "PAPERCLIP_CODEX_LOCAL_SUBSCRIPTION_BUDGET_CENTS",
    DEFAULT_CODEX_LOCAL_SUBSCRIPTION_BUDGET_CENTS,
  );
}

function planLabel(): string {
  return process.env.PAPERCLIP_CODEX_LOCAL_SUBSCRIPTION_PLAN_LABEL
    ?? DEFAULT_CODEX_LOCAL_SUBSCRIPTION_PLAN_LABEL;
}

function isConsumptionWindow(window: QuotaWindow): boolean {
  if (typeof window.usedPercent !== "number" || !Number.isFinite(window.usedPercent)) {
    return false;
  }
  const text = `${window.label} ${window.valueLabel ?? ""} ${window.detail ?? ""}`.toLowerCase();
  return !text.includes("credit") && !text.includes("remaining") && !text.includes("balance");
}

export function estimateCodexLocalSubscriptionCost(
  quotaResults: ProviderQuotaResult[],
): EffectiveSubscriptionCost | null {
  const budgetCents = planBudgetCents();
  if (budgetCents <= 0) return null;

  let best: {
    source: string | null;
    window: QuotaWindow;
    usedPercent: number;
  } | null = null;

  for (const result of quotaResults) {
    if (result.provider !== "openai" || !result.source?.startsWith("codex-")) continue;
    if (!result.ok) continue;

    for (const window of result.windows) {
      if (!isConsumptionWindow(window)) continue;
      const usedPercent = Math.max(0, Math.min(100, window.usedPercent!));
      if (!best || usedPercent > best.usedPercent) {
        best = { source: result.source, window, usedPercent };
      }
    }
  }

  if (!best) return null;

  const utilizationPercent = Number(best.usedPercent.toFixed(2));
  return {
    provider: "openai",
    source: best.source,
    planLabel: planLabel(),
    spendCents: Math.round((budgetCents * utilizationPercent) / 100),
    budgetCents,
    utilizationPercent,
    windowLabel: best.window.label ?? null,
    resetsAt: best.window.resetsAt ?? null,
  };
}
