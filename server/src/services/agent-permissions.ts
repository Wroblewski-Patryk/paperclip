export type NormalizedAgentPermissions = Record<string, unknown> & {
  canCreateAgents: boolean;
  executionPermissionClass: "read_only" | "project_write" | "review_test" | "integration" | "deployment" | "system_maintenance";
};

export function defaultPermissionsForRole(role: string): NormalizedAgentPermissions {
  const normalizedRole = role.toLowerCase();
  const executionPermissionClass = ["ceo", "aia", "pm", "product_manager", "product manager"].includes(normalizedRole)
    ? "read_only" as const
    : ["reviewer", "qa"].includes(normalizedRole)
      ? "review_test" as const
      : ["integration", "integrator"].includes(normalizedRole)
        ? "integration" as const
        : ["dre", "devops", "deployment"].includes(normalizedRole)
          ? "deployment" as const
          : ["system_maintenance", "operational_doctor"].includes(normalizedRole)
            ? "system_maintenance" as const
            : "project_write" as const;
  return {
    canCreateAgents: role === "ceo",
    executionPermissionClass,
  };
}

export function canonicalExecutionPermissionClass(value: unknown) {
  if (value === "observe") return "read_only" as const;
  if (value === "review") return "review_test" as const;
  if (value === "workspace_write") return "project_write" as const;
  if (value === "privileged_local") return "system_maintenance" as const;
  if (value === "read_only" || value === "project_write" || value === "review_test" || value === "integration" || value === "deployment" || value === "system_maintenance") return value;
  return null;
}

export function normalizeAgentPermissions(
  permissions: unknown,
  role: string,
): NormalizedAgentPermissions {
  const defaults = defaultPermissionsForRole(role);
  if (typeof permissions !== "object" || permissions === null || Array.isArray(permissions)) {
    return defaults;
  }

  const record = permissions as Record<string, unknown>;
  const preserved = { ...record };
  return {
    ...preserved,
    canCreateAgents:
      typeof record.canCreateAgents === "boolean"
        ? record.canCreateAgents
        : defaults.canCreateAgents,
    executionPermissionClass: canonicalExecutionPermissionClass(record.executionPermissionClass) ?? defaults.executionPermissionClass,
  };
}
