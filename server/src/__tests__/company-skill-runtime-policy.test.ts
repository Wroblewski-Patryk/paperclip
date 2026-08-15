import { describe, expect, it } from "vitest";
import { resolveBundledRuntimeSkillRequired } from "../services/company-skills.ts";

describe("company skill runtime policy", () => {
  it("keeps bundled skills required by default", () => {
    expect(resolveBundledRuntimeSkillRequired(
      "paperclip_bundled",
      "---\nname: paperclip\n---\n# Paperclip\n",
    )).toBe(true);
  });

  it("honors an explicit required: false frontmatter flag", () => {
    expect(resolveBundledRuntimeSkillRequired(
      "paperclip_bundled",
      "---\nname: specialist\nrequired: false\n---\n# Specialist\n",
    )).toBe(false);
  });

  it("does not turn non-bundled skills into global requirements", () => {
    expect(resolveBundledRuntimeSkillRequired("catalog", "# Optional\n")).toBe(false);
  });
});
