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
        benchmarkContextValue="Global Balanced 60/40 • USD"
      />
    );

    const context = screen.getByRole("group", { name: "Return path context" });
    expect(context).toHaveTextContent(compactPattern("Benchmark Global Balanced 60/40 • USD"));
    expect(context).toHaveTextContent(compactPattern("Window YTD"));
    expect(context).not.toHaveTextContent("Available");
    expect(context.querySelectorAll(".performance-chart-context-field")).toHaveLength(2);
    expect(context.querySelectorAll(".workbench-chart-context-row-item")).toHaveLength(0);
  });

  it("renders resolved dates when explicit report dates are present", () => {
    render(
      <PerformanceChartContextStrip
        period="YTD"
        benchmarkContextValue="Global Balanced 60/40 • USD"
        reportStartDate="2026-01-01"
        reportEndDate="2026-04-12"
      />
    );

    const context = screen.getByRole("group", { name: "Return path context" });
    expect(context).toHaveTextContent(compactPattern("Benchmark Global Balanced 60/40 • USD"));
    expect(context).toHaveTextContent(compactPattern("Window 01 Jan 2026 - 12 Apr 2026"));
  });

  it("does not repeat basis or frequency labels in the compact context row", () => {
    render(
      <PerformanceChartContextStrip
        period="YTD"
        benchmarkContextValue="Global Balanced 60/40"
      />
    );

    const context = screen.getByRole("group", { name: "Return path context" });
    expect(context).toHaveTextContent(compactPattern("Benchmark Global Balanced 60/40"));
    expect(context).toHaveTextContent(compactPattern("Window YTD"));
    expect(context).not.toHaveTextContent("Basis");
    expect(context).not.toHaveTextContent("Frequency");
  });
});
