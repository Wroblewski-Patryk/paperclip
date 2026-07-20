import { useEffect, type ReactNode } from "react";
import { useCompany } from "./CompanyContext";

const COMPANY_APPEARANCE_PROPERTIES = [
  "--company-accent",
  "--company-accent-foreground",
  "--company-accent-soft",
  "--company-accent-subtle",
  "--company-accent-border",
  "--company-accent-strong",
  "--primary",
  "--primary-foreground",
  "--ring",
  "--sidebar-primary",
  "--sidebar-primary-foreground",
] as const;

export const DEFAULT_COMPANY_ACCENT = "#64748b";

export function normalizeBrandColor(value: string | null | undefined): string | null {
  if (!value) return null;
  const normalized = value.trim().toLowerCase();
  if (/^#[0-9a-f]{6}$/.test(normalized)) return normalized;
  if (/^#[0-9a-f]{3}$/.test(normalized)) {
    const [r, g, b] = normalized.slice(1).split("");
    return `#${r}${r}${g}${g}${b}${b}`;
  }
  return null;
}

function relativeLuminance(hex: string): number {
  const channels = [1, 3, 5].map((start) => Number.parseInt(hex.slice(start, start + 2), 16) / 255);
  const [r, g, b] = channels.map((channel) =>
    channel <= 0.04045 ? channel / 12.92 : ((channel + 0.055) / 1.055) ** 2.4,
  );
  return 0.2126 * r! + 0.7152 * g! + 0.0722 * b!;
}

function contrastRatio(first: number, second: number): number {
  const lighter = Math.max(first, second);
  const darker = Math.min(first, second);
  return (lighter + 0.05) / (darker + 0.05);
}

export function readableForeground(accent: string): "#ffffff" | "#111827" {
  const luminance = relativeLuminance(accent);
  return contrastRatio(luminance, 0) >= contrastRatio(luminance, 1) ? "#111827" : "#ffffff";
}

export function companyAppearanceVariables(brandColor: string | null | undefined) {
  const accent = normalizeBrandColor(brandColor) ?? DEFAULT_COMPANY_ACCENT;
  const foreground = readableForeground(accent);

  return {
    "--company-accent": accent,
    "--company-accent-foreground": foreground,
    "--company-accent-soft": `color-mix(in oklab, ${accent} 14%, transparent)`,
    "--company-accent-subtle": `color-mix(in oklab, ${accent} 7%, var(--background))`,
    "--company-accent-border": `color-mix(in oklab, ${accent} 38%, var(--border))`,
    "--company-accent-strong": `color-mix(in oklab, ${accent} 82%, var(--foreground))`,
    "--primary": accent,
    "--primary-foreground": foreground,
    "--ring": accent,
    "--sidebar-primary": accent,
    "--sidebar-primary-foreground": foreground,
  } satisfies Record<(typeof COMPANY_APPEARANCE_PROPERTIES)[number], string>;
}

function applyCompanyAppearance(brandColor: string | null | undefined) {
  const root = document.documentElement;
  const variables = companyAppearanceVariables(brandColor);
  for (const [property, value] of Object.entries(variables)) {
    root.style.setProperty(property, value);
  }
  root.dataset.companyAccent = variables["--company-accent"];
}

function clearCompanyAppearance() {
  const root = document.documentElement;
  for (const property of COMPANY_APPEARANCE_PROPERTIES) root.style.removeProperty(property);
  delete root.dataset.companyAccent;
}

export function CompanyAppearanceProvider({ children }: { children: ReactNode }) {
  const { selectedCompany } = useCompany();

  useEffect(() => {
    applyCompanyAppearance(selectedCompany?.brandColor);
    return clearCompanyAppearance;
  }, [selectedCompany?.brandColor]);

  return children;
}
