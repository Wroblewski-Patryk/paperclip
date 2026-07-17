import { describe, expect, it } from "vitest";
import { selectDuplicateSharedWorkspaceIds } from "../services/shared-workspace-deduplication.js";

function row(id: string, sourceIssueId: string | null, name = "LUC-1") {
  return {
    id,
    companyId: "company-1",
    projectId: "project-1",
    projectWorkspaceId: "primary-1",
    sourceIssueId,
    name,
    cwd: "C:/projects/soar",
    lastUsedAt: new Date(),
  };
}

describe("selectDuplicateSharedWorkspaceIds", () => {
  it("preserves the issue-referenced row and archives other rows in the same logical session", () => {
    const rows = [row("newest", "issue-1"), row("referenced", "issue-1"), row("oldest", "issue-1")];
    expect(selectDuplicateSharedWorkspaceIds(rows, new Set(["referenced"]))).toEqual(["newest", "oldest"]);
  });

  it("keeps the newest unreferenced row and separates issue-less agent sessions by name", () => {
    const rows = [
      row("new", null, "agent-a"),
      row("old", null, "agent-a"),
      row("other-agent", null, "agent-b"),
    ];
    expect(selectDuplicateSharedWorkspaceIds(rows, new Set())).toEqual(["old"]);
  });
});
