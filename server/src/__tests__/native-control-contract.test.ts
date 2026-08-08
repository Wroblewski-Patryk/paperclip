import { describe, expect, it } from "vitest";
import { buildNativeControlMatrix, nativeControlCheckIds } from "../services/native-control-contract.js";

describe("native control contract", () => {
  it("publishes the complete stable structured matrix without a super-watchdog", () => {
    const matrix = buildNativeControlMatrix({ companyId: "company-1", now: new Date("2026-08-04T00:00:00Z") });
    expect(matrix).toHaveLength(27);
    expect(new Set(matrix.map((row) => row.check_id))).toEqual(new Set(nativeControlCheckIds));
    expect(matrix.some((row) => /super.?watchdog/i.test(row.check_id))).toBe(false);
    expect(matrix.every((row) => row.check_version === 1 && row.finding_fingerprint && row.native_action && row.owner && row.next_check_at)).toBe(true);
  });
});
