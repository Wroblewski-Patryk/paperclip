import { createContext, useContext, type ReactNode } from "react";
import { NavLink } from "@/lib/router";
import { SIDEBAR_SCROLL_RESET_STATE } from "../lib/navigation-scroll";
import { cn } from "../lib/utils";
import { useSidebar } from "../context/SidebarContext";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import type { LucideIcon } from "lucide-react";

const SidebarNavExpandedContext = createContext(false);

export function SidebarNavExpandedProvider({ children }: { children: ReactNode }) {
  return (
    <SidebarNavExpandedContext.Provider value={true}>
      {children}
    </SidebarNavExpandedContext.Provider>
  );
}

export interface SidebarNavItemProps {
  to: string;
  label: string;
  icon: LucideIcon;
  end?: boolean;
  className?: string;
  badge?: number;
  badgeLabel?: string;
  badgeTone?: "default" | "danger";
  textBadge?: string;
  textBadgeTone?: "default" | "amber";
  alert?: boolean;
  liveCount?: number;
}

export function SidebarNavItem({
  to,
  label,
  icon: Icon,
  end,
  className,
  badge,
  badgeLabel,
  badgeTone = "default",
  textBadge,
  textBadgeTone = "default",
  alert = false,
  liveCount,
}: SidebarNavItemProps) {
  const { isMobile, setSidebarOpen, collapsed, peeking } = useSidebar();
  const forceExpanded = useContext(SidebarNavExpandedContext);
  const rail = collapsed && !peeking && !forceExpanded;
  const ariaParts = [label];
  if (rail && badge != null && badge > 0) ariaParts.push(`${badge} ${badgeLabel ?? "items"}`);
  if (rail && liveCount != null && liveCount > 0) ariaParts.push(`${liveCount} live`);

  const link = (
    <NavLink
      to={to}
      state={SIDEBAR_SCROLL_RESET_STATE}
      end={end}
      aria-label={rail ? ariaParts.join(", ") : undefined}
      onClick={() => { if (isMobile) setSidebarOpen(false); }}
      className={({ isActive }) =>
        cn(
          "relative flex items-center gap-2.5 rounded-md px-3 py-2 pointer-coarse:py-1.5 text-[13px] font-medium outline-none transition-[color,background-color,box-shadow] focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-1 focus-visible:ring-offset-sidebar",
          isActive
            ? "bg-[var(--company-accent-soft)] text-foreground shadow-[inset_2px_0_0_var(--company-accent)]"
            : "text-foreground/75 hover:bg-[var(--company-accent-soft)] hover:text-foreground",
          className,
        )
      }
    >
      <span className="relative shrink-0">
        <Icon className="h-4 w-4" />
        {alert && (
          <span className="absolute -right-0.5 -top-0.5 h-2 w-2 rounded-full bg-red-500 shadow-[0_0_0_2px_hsl(var(--background))]" />
        )}
      </span>
      <span
        className={cn(
          "truncate",
          rail
            ? "w-0 overflow-hidden opacity-0"
            : "flex-1",
        )}
      >
        {label}
      </span>
      {textBadge && (
        <span
          className={cn(
            "ml-auto rounded-full px-1.5 py-0.5 text-[10px] font-medium leading-none",
            textBadgeTone === "amber"
              ? "bg-amber-100 text-amber-800 dark:bg-amber-900/30 dark:text-amber-400"
              : "bg-muted text-muted-foreground",
          )}
        >
          {textBadge}
        </span>
      )}
      {liveCount != null && liveCount > 0 && !rail && (
        <span className="ml-auto flex items-center gap-1.5">
          <span className="relative flex h-2 w-2">
            <span className="animate-pulse absolute inline-flex h-full w-full rounded-full bg-[var(--status-live)] opacity-50" />
            <span className="relative inline-flex rounded-full h-2 w-2 bg-[var(--status-live)]" />
          </span>
          <span className="text-[11px] font-medium text-[var(--status-live-foreground)]">{liveCount} live</span>
        </span>
      )}
      {badge != null && badge > 0 && (
        <span
          className={cn(
            rail
              ? "ml-auto h-2 w-2 rounded-full p-0 text-[0px]"
              : "ml-auto rounded-full px-1.5 py-0.5 text-xs leading-none",
            badgeTone === "danger"
              ? "bg-red-600/90 text-red-50"
              : "bg-primary text-primary-foreground",
          )}
        >
          {badge}
        </span>
      )}
    </NavLink>
  );

  if (!rail) return link;

  return (
    <Tooltip>
      <TooltipTrigger>{link}</TooltipTrigger>
      <TooltipContent side="right">{ariaParts.join(", ")}</TooltipContent>
    </Tooltip>
  );
}
