import React from "react";
import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import PerformanceChartContextStrip from "../../src/apps/performance/components/performance-chart-context-strip";

function compactPattern(text: string) {
  return new RegExp(text.replace(/[.*+?^${}()|[\]\\]/g, "\\$&").replaceAll(" ", "\\s*"));
}

describe("PerformanceChartContextStrip", () => {
  it("renders the selected period, benchmark, and active return without low-value status text", () => {
    render(
      <PerformanceChartContextStrip
        portfolioId="PB_SG_GLOBAL_BAL_001"
        period="YTD"
        detailBasis="NET"
        benchmarkContextValue="Global Balanced 60/40 • USD"
        activeReturn="0.80%"
      />
    );

    const context = screen.getByRole("group", { name: "Return vs Benchmark" });
    expect(context).toHaveTextContent(compactPattern("Portfolio PB_SG_GLOBAL_BAL_001"));
    expect(context).toHaveTextContent(compactPattern("Benchmark Global Balanced 60/40 • USD"));
    expect(context).toHaveTextContent(compactPattern("Active Return 0.80%"));
    expect(context).toHaveTextContent(compactPattern("Period / Basis YTD • Net"));
    expect(context).not.toHaveTextContent("Available");
    expect(context.querySelectorAll(".performance-chart-context-field")).toHaveLength(4);
    expect(context.querySelectorAll(".workbench-chart-context-row-item")).toHaveLength(0);
  });

  it("renders an honest unavailable relative context when no benchmark is assigned", () => {
    render(
      <PerformanceChartContextStrip
        portfolioId="PB_SG_GLOBAL_BAL_001"
        period="YTD"
        detailBasis="NET"
        benchmarkContextValue="Unassigned"
        activeReturn="Unavailable"
      />
    );

    const context = screen.getByRole("group", { name: "Return vs Benchmark" });
    expect(context).toHaveTextContent(compactPattern("Benchmark Unassigned"));
    expect(context).toHaveTextContent(compactPattern("Active Return Unavailable"));
    expect(context).toHaveTextContent(compactPattern("Period / Basis YTD • Net"));
  });

  it("keeps the assigned benchmark visible when relative comparison is partial", () => {
    render(
      <PerformanceChartContextStrip
        portfolioId="PB_SG_GLOBAL_BAL_001"
        period="YTD"
        detailBasis="GROSS"
        benchmarkContextValue="Global Balanced 60/40"
        activeReturn="Unavailable"
      />
    );

    const context = screen.getByRole("group", { name: "Return vs Benchmark" });
    expect(context).toHaveTextContent(compactPattern("Benchmark Global Balanced 60/40"));
    expect(context).toHaveTextContent(compactPattern("Active Return Unavailable"));
    expect(context).toHaveTextContent(compactPattern("Period / Basis YTD • Gross"));
  });
});
