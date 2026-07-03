import { cn } from "@/lib/utils";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { AgentIcon } from "./AgentIconPicker";

type IdentitySize = "xs" | "sm" | "default" | "lg";

export interface IdentityProps {
  name: string;
  avatarUrl?: string | null;
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

export function Identity({ name, avatarUrl, agentIcon, initials, size = "default", className }: IdentityProps) {
  const displayInitials = initials ?? deriveInitials(name);

  return (
    <span className={cn("inline-flex gap-1.5 items-center", size === "xs" && "gap-1", size === "lg" && "gap-2", className)}>
      <Avatar size={size}>
        {avatarUrl && <AvatarImage src={avatarUrl} alt={name} />}
        <AvatarFallback>
          {!avatarUrl && agentIcon ? (
            <AgentIcon icon={agentIcon} className={cn(
              size === "lg" ? "h-5 w-5" : size === "xs" ? "h-3 w-3" : "h-3.5 w-3.5",
            )} />
          ) : displayInitials}
        </AvatarFallback>
      </Avatar>
      <span className={cn("truncate", textSize[size])}>{name}</span>
    </span>
  );
}
