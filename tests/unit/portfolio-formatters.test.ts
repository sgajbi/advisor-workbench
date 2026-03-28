import { describe, expect, it } from "vitest";

import { formatCurrency, formatPct, formatQuantity } from "@/apps/portfolio/formatters";

describe("portfolio formatters", () => {
  it("keeps whole-number percentages compact while preserving decimals when needed", () => {
    expect(formatPct(12)).toBe("12%");
    expect(formatPct(12.5)).toBe("12.5%");
    expect(formatPct(12.34)).toBe("12.34%");
  });

  it("removes unnecessary quantity decimals for whole-number positions", () => {
    expect(formatQuantity(1250)).toBe("1,250");
    expect(formatQuantity(1250.125)).toBe("1,250.125");
  });

  it("formats currency amounts with institutional rounded display", () => {
    expect(formatCurrency(1250000, "USD")).toBe("$1,250,000");
  });
});
