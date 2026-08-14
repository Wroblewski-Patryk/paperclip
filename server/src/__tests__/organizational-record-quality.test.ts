import { describe, expect, it } from "vitest";
import type { Db } from "@paperclipai/db";
import { organizationalRecordService } from "../services/organizational-records.js";

describe("organizational record quality", () => {
  it("rejects an ownerless commitment before touching persistence", async () => {
    const svc = organizationalRecordService({} as Db);

    await expect(svc.create("company-id", {
      kind: "commitment",
      status: "proposed",
      title: "Ownerless promise",
      statement: "This must fail instead of creating an unaccountable promise.",
    }, { userId: "board" })).rejects.toMatchObject({
      status: 400,
      message: "Commitments require an owner",
    });
  });
});
