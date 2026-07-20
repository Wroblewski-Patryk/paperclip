import { ArrowRight, Plus } from "lucide-react";
import type { LucideIcon } from "lucide-react";
import { Button } from "@/components/ui/button";

interface EmptyStateProps {
  icon: LucideIcon;
  message: string;
  title?: string;
  description?: string;
  examples?: string[];
  action?: string;
  onAction?: () => void;
  secondaryAction?: string;
  onSecondaryAction?: () => void;
}

export function EmptyState({
  icon: Icon,
  message,
  title,
  description,
  examples,
  action,
  onAction,
  secondaryAction,
  onSecondaryAction,
}: EmptyStateProps) {
  return (
    <div className="paperclip-surface flex flex-col items-center justify-center px-6 py-14 text-center">
      <div className="mb-4 rounded-xl border border-[var(--company-accent-border)] bg-[var(--company-accent-subtle)] p-3.5">
        <Icon className="h-7 w-7 text-[var(--company-accent-strong)]" />
      </div>
      <h2 className="text-base font-semibold text-foreground">{title ?? message}</h2>
      {(title || description) ? (
        <p className="mt-1.5 max-w-xl text-sm leading-6 text-muted-foreground">{description ?? message}</p>
      ) : null}
      {examples?.length ? (
        <div className="mt-4 flex max-w-2xl flex-wrap justify-center gap-2" aria-label="Examples">
          {examples.map((example) => (
            <span key={example} className="rounded-full border border-border bg-muted/35 px-2.5 py-1 text-xs text-muted-foreground">
              {example}
            </span>
          ))}
        </div>
      ) : null}
      {(action && onAction) || (secondaryAction && onSecondaryAction) ? (
        <div className="mt-5 flex flex-wrap items-center justify-center gap-2">
          {action && onAction ? (
            <Button onClick={onAction}>
              <Plus className="mr-1.5 h-4 w-4" />
              {action}
            </Button>
          ) : null}
          {secondaryAction && onSecondaryAction ? (
            <Button variant="ghost" onClick={onSecondaryAction}>
              {secondaryAction}
              <ArrowRight className="ml-1.5 h-4 w-4" />
            </Button>
          ) : null}
        </div>
      ) : null}
    </div>
  );
}
