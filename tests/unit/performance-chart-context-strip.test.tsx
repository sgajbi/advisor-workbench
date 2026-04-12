import React from "react";
import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import PerformanceChartContextStrip from "../../src/apps/performance/components/performance-chart-context-strip";

function compactPattern(text: string) {
  return new RegExp(text.replace(/[.*+?^${}()|[\]\\]/g, "\\$&").replaceAll(" ", "\\s*"));
}

describe("PerformanceChartContextStrip", () => {
  it("renders only benchmark and resolved window context without duplicating metric values", () => {
    render(
      <PerformanceChartContextStrip
        period="YTD"
        detailBasis="NET"
        benchmarkContextValue="Global Balanced 60/40 • USD"
      />
    );

    const context = screen.getByRole("group", { name: "Return vs Benchmark" });
    expect(context).toHaveTextContent(compactPattern("Benchmark Global Balanced 60/40 • USD"));
    expect(context).toHaveTextContent(compactPattern("Period Range / Basis YTD • Net"));
    expect(context).not.toHaveTextContent("Available");
    expect(context.querySelectorAll(".performance-chart-context-field")).toHaveLength(2);
    expect(context.querySelectorAll(".workbench-chart-context-row-item")).toHaveLength(0);
  });

  it("renders an honest unassigned benchmark state without inventing relative metrics", () => {
    render(
      <PerformanceChartContextStrip
        period="YTD"
        detailBasis="NET"
        benchmarkContextValue="Unassigned"
      />
    );

    const context = screen.getByRole("group", { name: "Return vs Benchmark" });
    expect(context).toHaveTextContent(compactPattern("Benchmark Unassigned"));
    expect(context).toHaveTextContent(compactPattern("Period Range / Basis YTD • Net"));
  });

  it("keeps the assigned benchmark visible when relative comparison is partial", () => {
    render(
      <PerformanceChartContextStrip
        period="YTD"
        detailBasis="GROSS"
        benchmarkContextValue="Global Balanced 60/40"
      />
    );

    const context = screen.getByRole("group", { name: "Return vs Benchmark" });
    expect(context).toHaveTextContent(compactPattern("Benchmark Global Balanced 60/40"));
    expect(context).toHaveTextContent(compactPattern("Period Range / Basis YTD • Gross"));
  });
});
