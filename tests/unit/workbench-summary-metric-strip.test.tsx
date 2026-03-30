import React from "react";
import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import WorkbenchSummaryMetricStrip from "../../src/design-system/components/workbench-summary-metric-strip";

describe("WorkbenchSummaryMetricStrip", () => {
  it("renders shared summary metrics with support and unavailable treatment", () => {
    render(
      <WorkbenchSummaryMetricStrip
        ariaLabel="Return strip"
        items={[
          { key: "portfolio", label: "Portfolio Return", value: "5.40%" },
          {
            key: "benchmark",
            label: "Benchmark Return",
            value: "Unavailable",
            support: "Relative returns incomplete",
            unavailable: true,
          },
        ]}
      />
    );

    expect(screen.getByLabelText("Return strip")).toBeInTheDocument();
    expect(screen.getByText("Portfolio Return")).toHaveClass("workbench-summary-metric-label");
    expect(screen.getByText("5.40%")).toHaveClass("workbench-summary-metric-value");
    expect(screen.getByText("Relative returns incomplete")).toHaveClass(
      "workbench-summary-metric-support"
    );
    expect(document.querySelector(".workbench-summary-metric-card-unavailable")).toBeTruthy();
  });
});
