import React from "react";
import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import PerformanceRelativeSegmentPanel from "../../src/apps/performance/components/performance-relative-segment-panel";

describe("PerformanceRelativeSegmentPanel", () => {
  it("renders the relative segment matrix inside the compact detail surface", () => {
    render(
      <PerformanceRelativeSegmentPanel
        rows={[
          {
            key_label: "Equity",
            portfolio_weight_avg_pct: 61,
            benchmark_weight_avg_pct: 58,
            portfolio_return_pct: 7.4,
            benchmark_return_pct: 6.8,
            allocation_pct: 0.18,
            selection_pct: 0.24,
            interaction_pct: 0.03,
            total_effect_pct: 0.45,
            active_weight_pct: 3,
            active_return_pct: 0.6,
          },
        ]}
      />
    );

    expect(screen.getByLabelText("Relative Segment Context")).toBeInTheDocument();
    expect(screen.getByText("Active Weight")).toBeInTheDocument();
    expect(screen.getByText("Active Return")).toBeInTheDocument();
    expect(screen.getByText("Total Effect")).toBeInTheDocument();
    expect(screen.getByText("Equity")).toBeInTheDocument();
    expect(document.querySelectorAll(".performance-relative-row")).toHaveLength(1);
    expect(
      screen.getByText(/Portfolio Weight\s*61\.00%\s*•\s*Benchmark Weight\s*58\.00%/)
    ).toBeInTheDocument();
    expect(
      screen.getByText(/Portfolio Return\s*7\.40%\s*•\s*Benchmark Return\s*6\.80%/)
    ).toBeInTheDocument();
  });

  it("renders a compact empty state inside the detail surface", () => {
    render(<PerformanceRelativeSegmentPanel rows={[]} />);

    expect(screen.getByLabelText("Relative Segment Context")).toBeInTheDocument();
    expect(screen.getByText("Relative segment context unavailable")).toBeInTheDocument();
    expect(
      screen.getByText(
        "Segment-level relative weight and return context is not available for this selection."
      )
    ).toBeInTheDocument();
    expect(
      document.querySelector(".performance-analysis-state-panel-unavailable .module-state-panel")
    ).toBeTruthy();
  });
});
