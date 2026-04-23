import {
  CANONICAL_PERFORMANCE_PERIOD_OPTIONS,
  getPerformancePeriodDefinition,
} from "@/apps/performance/periods";

describe("performance period vocabulary", () => {
  it("keeps the canonical performance period options in business order", () => {
    expect(CANONICAL_PERFORMANCE_PERIOD_OPTIONS).toEqual([
      "MTD",
      "QTD",
      "YTD",
      "1Y",
      "3Y",
      "5Y",
    ]);
  });

  it("does not expose legacy service aliases in user-facing controls", () => {
    expect(CANONICAL_PERFORMANCE_PERIOD_OPTIONS).not.toContain("ONE_YEAR");
    expect(CANONICAL_PERFORMANCE_PERIOD_OPTIONS).not.toContain("THREE_YEAR");
    expect(CANONICAL_PERFORMANCE_PERIOD_OPTIONS).not.toContain("FIVE_YEAR");
    expect(CANONICAL_PERFORMANCE_PERIOD_OPTIONS).not.toContain("ITD");
  });

  it("keeps YTD distinct from trailing 1Y semantics", () => {
    expect(getPerformancePeriodDefinition("YTD")).toEqual({
      code: "YTD",
      label: "Year to date",
      semantics: "calendar_to_date",
      startRule: "first_day_of_anchor_year",
    });
    expect(getPerformancePeriodDefinition("1Y")).toEqual({
      code: "1Y",
      label: "Trailing one year",
      semantics: "trailing_window",
      startRule: "anchor_minus_1_year_plus_1_day",
    });
  });
});
