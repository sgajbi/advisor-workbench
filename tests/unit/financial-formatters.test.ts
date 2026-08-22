import { describe, expect, it } from "vitest";

import {
  formatBusinessDateValue,
  formatCurrencyValue,
  formatDateValue,
  formatNumber,
  formatPercent,
  formatTimestampValue,
  isBusinessDateValue,
  isTimestampValue,
  parseBusinessDateValue,
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

  it("formats numbers and date evidence through one shared presentation contract", () => {
    expect(formatNumber(1250.125, { maximumFractionDigits: 4 })).toBe("1,250.125");
    expect(formatDateValue("2026-03-28")).toBe("28 Mar 2026");
    expect(formatDateValue("2026-03-28T08:00:00Z")).toBe(
      "28 Mar 2026, 08:00 UTC",
    );
  });

  it("keeps business dates as validated calendar components", () => {
    expect(parseBusinessDateValue("2024-02-29")).toEqual({
      year: 2024,
      month: 2,
      day: 29,
    });
    expect(isBusinessDateValue("2026-02-29")).toBe(false);
    expect(isBusinessDateValue("2026-04-31")).toBe(false);
    expect(formatBusinessDateValue("2026-04-10")).toBe("10 Apr 2026");
    expect(
      formatBusinessDateValue("2026-02-29", { nullDisplay: "Not confirmed" }),
    ).toBe("Not confirmed");
  });

  it("requires timestamp zone evidence and always discloses normalized UTC", () => {
    expect(formatTimestampValue("2026-03-28T16:00:00+08:00")).toBe(
      "28 Mar 2026, 08:00 UTC",
    );
    expect(formatTimestampValue("2026-03-28T08:00:00")).toBe("N/A");
    expect(isTimestampValue("2026-03-28T08:00:00Z")).toBe(true);
    expect(isTimestampValue("2026-03-28T08:00:00")).toBe(false);
    expect(
      formatTimestampValue("not-a-timestamp", { nullDisplay: "Not available" }),
    ).toBe("Not available");
  });
});
