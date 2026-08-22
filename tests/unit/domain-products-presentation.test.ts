import { describe, expect, it } from "vitest";

import { formatDateTime } from "@/features/domain-products/presentation";

describe("domain-product timestamp presentation", () => {
  it("uses the governed offset-bearing timestamp policy", () => {
    expect(formatDateTime("2026-04-10T10:00:00+08:00")).toBe(
      "10 Apr 2026, 02:00 UTC",
    );
    expect(formatDateTime("2026-04-10T02:00:00")).toBe("Not available");
    expect(formatDateTime(null)).toBe("Not available");
  });
});
