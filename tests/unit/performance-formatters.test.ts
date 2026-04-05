import { describe, expect, it } from "vitest";

import {
  formatCompactPct,
  formatCurrency,
  formatDate,
  formatPct,
} from "@/apps/performance/formatters";

describe("performance formatters", () => {
  it("formats percentages through the shared numeric contract", () => {
    expect(formatPct(4.2)).toBe("4.20%");
    expect(formatCompactPct(undefined)).toBe("--");
  });

  it("formats currency and dates consistently for performance surfaces", () => {
    expect(formatCurrency(1250000, "USD")).toBe("$1,250,000");
    expect(formatDate("2026-03-28")).toBe("28 Mar 2026");
  });
});
