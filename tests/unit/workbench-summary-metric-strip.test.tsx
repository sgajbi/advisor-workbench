import React from "react";
import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import WorkbenchSummaryMetricStrip from "../../src/design-system/components/workbench-summary-metric-strip";

describe("WorkbenchSummaryMetricStrip", () => {
  it("uses the responsive component layout unless a caller explicitly owns the grid", () => {
    const items = [{ key: "portfolio", label: "Portfolio Return", value: "5.40%" }];
    const { rerender } = render(
      <WorkbenchSummaryMetricStrip ariaLabel="Responsive strip" items={items} />,
    );

    const responsiveStrip = screen.getByLabelText("Responsive strip");
    expect(responsiveStrip).toHaveClass("workbench-summary-metric-strip");
    expect(responsiveStrip.classList).toHaveLength(2);

    rerender(
      <WorkbenchSummaryMetricStrip
        ariaLabel="Custom strip"
        className="screen-owned-grid"
        items={items}
        layout="custom"
      />,
    );

    expect(screen.getByLabelText("Custom strip")).toHaveClass(
      "workbench-summary-metric-strip",
      "screen-owned-grid",
    );
    expect(screen.getByLabelText("Custom strip").classList).toHaveLength(2);
  });

  it("renders shared summary metrics with support and unavailable treatment", () => {
    render(
      <WorkbenchSummaryMetricStrip
        ariaLabel="Return strip"
        items={[
          {
            key: "portfolio",
            label: "Portfolio Return",
            value: "5.40%",
            valueClassName: "screen-owned-value",
          },
          {
            key: "benchmark",
            label: "Benchmark Return",
            value: "Unavailable",
            support: "Relative returns incomplete",
            definition: "Benchmark return is not available for the selected period.",
            unavailable: true,
          },
        ]}
      />
    );

    expect(screen.getByLabelText("Return strip")).toBeInTheDocument();
    expect(screen.getByText("Portfolio Return")).toHaveClass(
      "ui-text-data-label",
      "workbench-summary-metric-label"
    );
    expect(screen.getByText("5.40%")).toHaveClass(
      "ui-text-metric-value-m",
      "workbench-summary-metric-value",
      "screen-owned-value",
    );
    expect(screen.getByText("Relative returns incomplete")).toHaveClass(
      "ui-text-body-small",
      "workbench-summary-metric-support"
    );
    expect(document.querySelector(".workbench-summary-metric-card-unavailable")).toBeTruthy();
    const tooltipItem = screen.getByText("Benchmark Return").closest(
      ".workbench-summary-metric-item",
    );
    expect(tooltipItem).toBeTruthy();
    expect(tooltipItem?.querySelector(".workbench-summary-metric-card")).toBeTruthy();
  });
});
