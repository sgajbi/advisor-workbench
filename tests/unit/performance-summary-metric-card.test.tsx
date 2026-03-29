import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import PerformanceSummaryMetricCard from "../../src/apps/performance/components/performance-summary-metric-card";

describe("PerformanceSummaryMetricCard", () => {
  it("renders emphasized metric cards with shared summary classes", () => {
    const { container } = render(
      <PerformanceSummaryMetricCard
        label="Net Return"
        value="5.42%"
        support="Active 0.52% versus benchmark"
        emphasize
      />
    );

    expect(screen.getByText("Net Return")).toBeInTheDocument();
    expect(screen.getByText("5.42%")).toBeInTheDocument();
    expect(container.querySelector(".performance-summary-kpi-card-primary")).toBeTruthy();
    expect(container.querySelector(".workbench-summary-metric-card")).toBeTruthy();
  });

  it("renders unavailable metric cards without fake placeholder values", () => {
    const { container } = render(
      <PerformanceSummaryMetricCard
        label="Benchmark"
        value="Unassigned"
        support="Assign a benchmark to enable relative analytics."
        unavailable
      />
    );

    expect(screen.getByText("Unassigned")).toBeInTheDocument();
    expect(screen.getByText("Assign a benchmark to enable relative analytics.")).toBeInTheDocument();
    expect(container.querySelector(".performance-summary-kpi-card-unavailable")).toBeTruthy();
    expect(screen.queryByText("N/A")).not.toBeInTheDocument();
  });
});
