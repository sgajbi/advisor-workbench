import { describe, expect, it } from "vitest";

import {
  formatCurrencyValue,
  formatDateValue,
  formatNumber,
  formatPercent,
} from "@/design-system/utils/financial-formatters";

describe("financial-formatters", () => {
  it("formats percentages consistently with configurable null states", () => {
    expect(formatPercent(12.5)).toBe("12.50%");
    expect(formatPercent(null)).toBe("N/A");
    expect(formatPercent(undefined, { nullDisplay: "--" })).toBe("--");
  });

  it("formats currency in code and symbol display modes", () => {
    expect(formatCurrencyValue(1250000, { currency: "USD", display: "code" })).toBe(
      "1,250,000 USD"
    );
    expect(
      formatCurrencyValue(1250000, {
        currency: "USD",
        display: "symbol",
        maximumFractionDigits: 0,
      })
    ).toBe("$1,250,000");
  });

  it("formats numbers and dates through one shared locale contract", () => {
    expect(formatNumber(1250.125, { maximumFractionDigits: 4 })).toBe("1,250.125");
    expect(formatDateValue("2026-03-28")).toBe("28 Mar 2026");
    expect(formatDateValue("2026-03-28T08:00:00Z")).toBe("28 Mar 2026");
  });
});
