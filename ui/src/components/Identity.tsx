import { cn } from "@/lib/utils";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { AgentIcon } from "@/components/AgentIconPicker";

type IdentitySize = "xs" | "sm" | "default" | "lg";

export interface IdentityProps {
  name: string;
  avatarUrl?: string | null;
  /** Pass for agent identities. Undefined keeps the generic initials fallback; null uses the default agent icon. */
  agentIcon?: string | null;
  initials?: string;
  size?: IdentitySize;
  className?: string;
}

export function deriveInitials(name: string): string {
  const parts = name.trim().split(/\s+/);
  if (parts.length >= 2) return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
  return name.slice(0, 2).toUpperCase();
}

const textSize: Record<IdentitySize, string> = {
  xs: "text-sm",
  sm: "text-xs",
  default: "text-sm",
  lg: "text-sm",
};

const iconSize: Record<IdentitySize, string> = {
  xs: "h-3 w-3",
  sm: "h-3.5 w-3.5",
  default: "h-4 w-4",
  lg: "h-5 w-5",
};

export function Identity({ name, avatarUrl, agentIcon, initials, size = "default", className }: IdentityProps) {
  const displayInitials = initials ?? deriveInitials(name);
  const isAgentIdentity = agentIcon !== undefined;

  return (
    <span className={cn("inline-flex min-w-0 max-w-full items-center gap-1.5", size === "xs" && "gap-1", size === "lg" && "gap-2", className)}>
      <Avatar size={size}>
        {avatarUrl && <AvatarImage src={avatarUrl} alt={name} />}
        <AvatarFallback>
          {isAgentIdentity ? (
            <AgentIcon icon={agentIcon} className={iconSize[size]} />
          ) : (
            displayInitials
          )}
        </AvatarFallback>
      </Avatar>
      <span className={cn("block min-w-0 truncate", textSize[size])}>{name}</span>
    </span>
  );
}
