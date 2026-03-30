import React from "react";
import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import PerformanceChartContextStrip from "../../src/apps/performance/components/performance-chart-context-strip";

describe("PerformanceChartContextStrip", () => {
  it("renders the selected period, benchmark, active return, and relative-context availability", () => {
    render(
      <PerformanceChartContextStrip
        period="YTD"
        detailBasis="NET"
        benchmarkLabel="Global Balanced 60/40"
        benchmarkAssigned
        activeReturn="0.80%"
        relativeContextStatus="available"
      />
    );

    const context = screen.getByRole("group", { name: "Return path context" });
    expect(context).toHaveTextContent("Portfolio line Portfolio");
    expect(context).toHaveTextContent("Benchmark line Global Balanced 60/40");
    expect(context).toHaveTextContent("Active context 0.80% • Available");
    expect(context).toHaveTextContent("Window / basis YTD • Net");
  });

  it("renders an honest unavailable relative context when no benchmark is assigned", () => {
    render(
      <PerformanceChartContextStrip
        period="YTD"
        detailBasis="NET"
        benchmarkLabel="Benchmark"
        benchmarkAssigned={false}
        activeReturn="Unavailable"
        relativeContextStatus="unavailable"
      />
    );

    const context = screen.getByRole("group", { name: "Return path context" });
    expect(context).toHaveTextContent("Benchmark line Unassigned");
    expect(context).toHaveTextContent("Active context Unavailable • Unavailable");
    expect(context).toHaveTextContent("Window / basis YTD • Net");
  });

  it("keeps the assigned benchmark visible when relative comparison is partial", () => {
    render(
      <PerformanceChartContextStrip
        period="YTD"
        detailBasis="GROSS"
        benchmarkLabel="Global Balanced 60/40"
        benchmarkAssigned
        activeReturn="Unavailable"
        relativeContextStatus="partial"
      />
    );

    const context = screen.getByRole("group", { name: "Return path context" });
    expect(context).toHaveTextContent("Benchmark line Global Balanced 60/40");
    expect(context).toHaveTextContent("Active context Unavailable • Partial");
    expect(context).toHaveTextContent("Window / basis YTD • Gross");
  });
});
