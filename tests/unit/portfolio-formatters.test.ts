import { describe, expect, it } from "vitest";

import { formatCount, formatCurrency, formatDate, formatPct, formatQuantity, formatStatus } from "@/apps/portfolio/formatters";

describe("portfolio formatters", () => {
  it("renders percentages with two decimal places", () => {
    expect(formatPct(12)).toBe("12.00%");
    expect(formatPct(12.5)).toBe("12.50%");
    expect(formatPct(12.34)).toBe("12.34%");
    expect(formatPct(0)).toBe("0.00%");
  });

  it("removes unnecessary quantity decimals for whole-number positions", () => {
    expect(formatQuantity(1250)).toBe("1,250");
    expect(formatQuantity(1250.125)).toBe("1,250.125");
  });

  it("formats currency amounts with institutional rounded display", () => {
    expect(formatCurrency(1250000, "USD")).toBe("1,250,000 USD");
    expect(formatCurrency(1250000.5, "USD")).toBe("1,250,000.5 USD");
    expect(formatCurrency(-250.25, "USD")).toBe("-250.25 USD");
  });

  it("formats dates consistently across the page", () => {
    expect(formatDate("2026-03-28")).toBe("28 Mar 2026");
    expect(formatDate("2026-03-28T08:00:00Z")).toBe("28 Mar 2026");
  });

  it("formats counts and statuses consistently", () => {
    expect(formatCount(0, "holding")).toBe("0 holdings");
    expect(formatCount(1, "holding")).toBe("1 holding");
    expect(formatCount(12, "holding")).toBe("12 holdings");
    expect(formatStatus("SETTLED")).toBe("Settled");
    expect(formatStatus("LONG_TERM")).toBe("Long Term");
  });
});
