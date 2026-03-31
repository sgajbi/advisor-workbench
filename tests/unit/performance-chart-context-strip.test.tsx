import React from "react";
import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import PerformanceChartContextStrip from "../../src/apps/performance/components/performance-chart-context-strip";

function compactPattern(text: string) {
  return new RegExp(text.replace(/[.*+?^${}()|[\]\\]/g, "\\$&").replaceAll(" ", "\\s*"));
}

describe("PerformanceChartContextStrip", () => {
  it("renders the selected period, benchmark, active return, and relative-context availability", () => {
    render(
      <PerformanceChartContextStrip
        period="YTD"
        detailBasis="NET"
        benchmarkContextValue="Global Balanced 60/40 • Calculated"
        activeReturn="0.80%"
        relativeContextStatus="available"
      />
    );

    const context = screen.getByRole("group", { name: "Return path context" });
    expect(context).toHaveTextContent(compactPattern("Portfolio line Portfolio"));
    expect(context).toHaveTextContent(
      compactPattern("Benchmark line Global Balanced 60/40 • Calculated")
    );
    expect(context).toHaveTextContent(compactPattern("Active context 0.80% • Available"));
    expect(context).toHaveTextContent(compactPattern("Resolved window / basis YTD • Net"));
  });

  it("renders an honest unavailable relative context when no benchmark is assigned", () => {
    render(
      <PerformanceChartContextStrip
        period="YTD"
        detailBasis="NET"
        benchmarkContextValue="Unassigned"
        activeReturn="Unavailable"
        relativeContextStatus="unavailable"
      />
    );

    const context = screen.getByRole("group", { name: "Return path context" });
    expect(context).toHaveTextContent(compactPattern("Benchmark line Unassigned"));
    expect(context).toHaveTextContent(compactPattern("Active context Unavailable • Unavailable"));
    expect(context).toHaveTextContent(compactPattern("Resolved window / basis YTD • Net"));
  });

  it("keeps the assigned benchmark visible when relative comparison is partial", () => {
    render(
      <PerformanceChartContextStrip
        period="YTD"
        detailBasis="GROSS"
        benchmarkContextValue="Global Balanced 60/40"
        activeReturn="Unavailable"
        relativeContextStatus="partial"
      />
    );

    const context = screen.getByRole("group", { name: "Return path context" });
    expect(context).toHaveTextContent(compactPattern("Benchmark line Global Balanced 60/40"));
    expect(context).toHaveTextContent(compactPattern("Active context Unavailable • Partial"));
    expect(context).toHaveTextContent(compactPattern("Resolved window / basis YTD • Gross"));
  });
});
