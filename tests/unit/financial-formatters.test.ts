import { describe, expect, it } from "vitest";

import {
  formatBusinessDateValue,
  formatCalendarDateValue,
  formatCurrencyValue,
  formatDateValue,
  formatNumber,
  formatPercent,
  formatTimestampValue,
  formatYearMonthValue,
  isBusinessDateValue,
  isTimestampValue,
  parseBusinessDateValue,
  timestampsRepresentSameInstant,
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

  it("normalizes legacy timestamp-encoded business dates to the UTC calendar", () => {
    expect(formatCalendarDateValue("2026-03-28")).toBe("28 Mar 2026");
    expect(formatCalendarDateValue("2026-03-28T23:30:00-05:00")).toBe("29 Mar 2026");
    expect(formatCalendarDateValue("2026-03-28T08:00:00")).toBe("N/A");
  });

  it("formats year-month reporting periods without inventing a date or timezone", () => {
    expect(formatYearMonthValue("2026-04")).toBe("Apr '26");
    expect(formatYearMonthValue("2026-04", { compact: true })).toBe("Apr\n'26");
    expect(formatYearMonthValue("2026-13", { nullDisplay: "Not reported" })).toBe(
      "Not reported",
    );
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

  it("rejects impossible timestamp calendar, clock, and offset components", () => {
    expect(formatTimestampValue("2026-02-30T08:32:00Z")).toBe("N/A");
    expect(formatTimestampValue("2026-01-01T24:00:00Z")).toBe("N/A");
    expect(formatTimestampValue("2026-01-01T08:60:00Z")).toBe("N/A");
    expect(formatTimestampValue("2026-01-01T08:32:60Z")).toBe("N/A");
    expect(formatTimestampValue("2026-01-01T08:32:00+24:00")).toBe("N/A");
  });

  it("compares zoned timestamps by their exact represented instant", () => {
    expect(
      timestampsRepresentSameInstant(
        "2026-08-27T15:02:35.41829Z",
        "2026-08-27T23:02:35.418290+08:00",
      ),
    ).toBe(true);
    expect(
      timestampsRepresentSameInstant(
        "2026-08-27T15:02:35.1234Z",
        "2026-08-27T15:02:35.1235Z",
      ),
    ).toBe(false);
    expect(
      timestampsRepresentSameInstant(
        "2026-08-27T15:02:35Z",
        "2026-08-27T15:02:35",
      ),
    ).toBe(false);
    expect(
      timestampsRepresentSameInstant(
        " 2026-08-27T15:02:35Z",
        "2026-08-27T15:02:35Z",
      ),
    ).toBe(false);
    expect(
      timestampsRepresentSameInstant(
        "2026-08-27T15:02:35Z",
        "2026-08-27T15:02:35Z ",
      ),
    ).toBe(false);
  });
});
