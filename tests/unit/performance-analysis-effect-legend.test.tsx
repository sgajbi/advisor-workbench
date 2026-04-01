import React from "react";
import { render, screen, within } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import PerformanceAnalysisEffectLegend from "../../src/apps/performance/components/performance-analysis-effect-legend";

describe("PerformanceAnalysisEffectLegend", () => {
  it("renders the shared attribution legend items", () => {
    render(<PerformanceAnalysisEffectLegend />);

    const legend = screen.getByLabelText("Attribution effect legend");
    expect(legend).toBeInTheDocument();
    expect(within(legend).getByText("Allocation")).toBeInTheDocument();
    expect(within(legend).getByText("Selection")).toBeInTheDocument();
    expect(within(legend).getByText("Interaction")).toBeInTheDocument();
    expect(legend.querySelectorAll(".performance-effect-legend-item")).toHaveLength(3);
  });
});
