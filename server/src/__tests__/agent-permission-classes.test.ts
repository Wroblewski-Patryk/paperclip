import { describe, expect, it } from "vitest";
import { defaultPermissionsForRole, normalizeAgentPermissions } from "../services/agent-permissions.js";

describe("agent execution permission classes", () => {
  it("defaults reviewers to review_test, managers to read_only, and executors to project_write", () => {
    expect(defaultPermissionsForRole("qa").executionPermissionClass).toBe("review_test");
    expect(defaultPermissionsForRole("pm").executionPermissionClass).toBe("read_only");
    expect(defaultPermissionsForRole("engineer").executionPermissionClass).toBe("project_write");
  });

  it("preserves only declared permission classes", () => {
    expect(normalizeAgentPermissions({ executionPermissionClass: "privileged_local" }, "devops").executionPermissionClass)
      .toBe("system_maintenance");
    expect(normalizeAgentPermissions({ executionPermissionClass: "root_everything" }, "engineer").executionPermissionClass)
      .toBe("project_write");
  });
});
