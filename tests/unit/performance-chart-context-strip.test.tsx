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
        chartFrequency="monthly"
      />
    );

    const context = screen.getByRole("group", { name: "Return path context" });
    expect(context).toHaveTextContent(compactPattern("Benchmark Global Balanced 60/40 • USD"));
    expect(context).toHaveTextContent(compactPattern("Window YTD"));
    expect(context).toHaveTextContent(compactPattern("Basis Net"));
    expect(context).toHaveTextContent(compactPattern("Frequency Monthly"));
    expect(context).not.toHaveTextContent("Available");
    expect(context.querySelectorAll(".performance-chart-context-field")).toHaveLength(4);
    expect(context.querySelectorAll(".workbench-chart-context-row-item")).toHaveLength(0);
  });

  it("renders resolved dates when explicit report dates are present", () => {
    render(
      <PerformanceChartContextStrip
        period="YTD"
        detailBasis="NET"
        benchmarkContextValue="Global Balanced 60/40 • USD"
        chartFrequency="monthly"
        reportStartDate="2026-01-01"
        reportEndDate="2026-04-12"
      />
    );

    const context = screen.getByRole("group", { name: "Return path context" });
    expect(context).toHaveTextContent(compactPattern("Benchmark Global Balanced 60/40 • USD"));
    expect(context).toHaveTextContent(compactPattern("Window 01 Jan 2026 - 12 Apr 2026"));
    expect(context).toHaveTextContent(compactPattern("Basis Net"));
    expect(context).toHaveTextContent(compactPattern("Frequency Monthly"));
  });

  it("renders quarterly frequency truthfully", () => {
    render(
      <PerformanceChartContextStrip
        period="YTD"
        detailBasis="GROSS"
        benchmarkContextValue="Global Balanced 60/40"
        chartFrequency="quarterly"
      />
    );

    const context = screen.getByRole("group", { name: "Return path context" });
    expect(context).toHaveTextContent(compactPattern("Benchmark Global Balanced 60/40"));
    expect(context).toHaveTextContent(compactPattern("Window YTD"));
    expect(context).toHaveTextContent(compactPattern("Basis Gross"));
    expect(context).toHaveTextContent(compactPattern("Frequency Quarterly"));
  });
});
