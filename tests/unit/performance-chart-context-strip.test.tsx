import React from "react";
import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import PerformanceChartContextStrip from "../../src/apps/performance/components/performance-chart-context-strip";

describe("PerformanceChartContextStrip", () => {
  it("renders the selected period, benchmark, active return, and relative-context availability", () => {
    render(
      <PerformanceChartContextStrip
        period="YTD"
        benchmarkLabel="Global Balanced 60/40"
        benchmarkAssigned
        activeReturn="0.80%"
      />
    );

    const context = screen.getByRole("group", { name: "Return path context" });
    expect(context).toHaveTextContent("Selected period YTD");
    expect(context).toHaveTextContent("Compared against Global Balanced 60/40");
    expect(context).toHaveTextContent("Active return 0.80%");
    expect(context).toHaveTextContent("Relative context Available");
  });

  it("renders an honest unavailable relative context when no benchmark is assigned", () => {
    render(
      <PerformanceChartContextStrip
        period="YTD"
        benchmarkLabel="Benchmark"
        benchmarkAssigned={false}
        activeReturn="Unavailable"
      />
    );

    const context = screen.getByRole("group", { name: "Return path context" });
    expect(context).toHaveTextContent("Compared against Unassigned");
    expect(context).toHaveTextContent("Active return Unavailable");
    expect(context).toHaveTextContent("Relative context Unavailable");
  });
});
