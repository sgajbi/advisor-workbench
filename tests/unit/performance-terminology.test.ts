import { describe, expect, it } from "vitest";

import {
  getPerformanceFeeBasisLabel,
  getPerformanceReturnPathTitle,
  PERFORMANCE_FEE_BASIS_LABELS,
  PERFORMANCE_RETURN_DEFINITIONS,
  PERFORMANCE_RETURN_LABELS,
} from "../../src/apps/performance/performance-terminology";

describe("performance terminology", () => {
  it("keeps return methodology separate from fee basis", () => {
    expect(PERFORMANCE_RETURN_LABELS).toEqual({
      timeWeightedReturn: "Time-weighted return (TWR)",
      portfolioTwr: "Portfolio TWR",
      benchmarkTwr: "Benchmark TWR",
      activeReturn: "Active return",
      moneyWeightedReturn: "Money-weighted return (MWR)",
    });
    expect(PERFORMANCE_FEE_BASIS_LABELS).toEqual({
      net: "Net of fees",
      gross: "Gross of fees",
      unavailable: "Fee basis not confirmed",
    });
  });

  it.each([
    ["NET", "Net of fees"],
    [" net ", "Net of fees"],
    ["GROSS", "Gross of fees"],
    ["gross", "Gross of fees"],
    ["", "Fee basis not confirmed"],
    ["unknown", "Fee basis not confirmed"],
  ])("maps source fee basis %s without treating it as a return method", (basis, expected) => {
    expect(getPerformanceFeeBasisLabel(basis)).toBe(expected);
  });

  it("builds a method-first return-path title", () => {
    expect(getPerformanceReturnPathTitle("NET")).toBe(
      "Time-weighted return path · Net of fees",
    );
    expect(getPerformanceReturnPathTitle("GROSS")).toBe(
      "Time-weighted return path · Gross of fees",
    );
  });

  it("defines TWR and MWR as different source-owned methods", () => {
    expect(PERFORMANCE_RETURN_DEFINITIONS.timeWeightedReturn).toContain(
      "removing the effect of the timing and size of external cash flows",
    );
    expect(PERFORMANCE_RETURN_DEFINITIONS.moneyWeightedReturn).toContain(
      "reflects the timing and size of external cash flows",
    );
  });
});
