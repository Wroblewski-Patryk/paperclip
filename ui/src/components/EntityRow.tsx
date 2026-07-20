import { type ReactNode } from "react";
import { Link } from "@/lib/router";
import { cn } from "../lib/utils";

interface EntityRowProps {
  leading?: ReactNode;
  identifier?: string;
  title: string;
  subtitle?: string;
  trailing?: ReactNode;
  selected?: boolean;
  to?: string;
  onClick?: () => void;
  className?: string;
  reserveSubtitleSpace?: boolean;
}

export function EntityRow({
  leading,
  identifier,
  title,
  subtitle,
  trailing,
  selected,
  to,
  onClick,
  className,
  reserveSubtitleSpace,
}: EntityRowProps) {
  const isClickable = !!(to || onClick);
  const classes = cn(
    "group flex items-center gap-3 border-b border-border/70 px-4 py-2.5 text-sm transition-colors last:border-b-0",
    isClickable && "cursor-pointer hover:bg-[var(--company-accent-subtle)]",
    selected && "border-l-2 border-l-[var(--company-accent)] bg-[var(--company-accent-subtle)] pl-[14px]",
    className
  );

  const content = (
    <>
      {leading && <div className="flex items-center gap-2 shrink-0">{leading}</div>}
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2">
          {identifier && (
            <span className="text-xs text-muted-foreground font-mono shrink-0 relative top-[1px]">
              {identifier}
            </span>
          )}
          <span className="truncate">{title}</span>
        </div>
        {(subtitle || reserveSubtitleSpace) && (
          <p
            className={cn("text-xs text-muted-foreground truncate mt-0.5 min-h-4", !subtitle && "invisible")}
            aria-hidden={!subtitle}
          >
            {subtitle}
          </p>
        )}
      </div>
      {trailing && <div className="flex items-center gap-2 shrink-0">{trailing}</div>}
    </>
  );

  if (to) {
    return (
      <Link to={to} className={cn("no-underline text-inherit", classes)} onClick={onClick}>
        {content}
      </Link>
    );
  }

  return (
    <div className={classes} onClick={onClick}>
      {content}
    </div>
  );
}
