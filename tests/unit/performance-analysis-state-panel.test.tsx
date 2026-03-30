import React from "react";
import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import PerformanceAnalysisStatePanel from "../../src/apps/performance/components/performance-analysis-state-panel";

describe("PerformanceAnalysisStatePanel", () => {
  it("renders a shared loading panel", () => {
    render(
      <PerformanceAnalysisStatePanel
        state="loading"
        title="Loading attribution trend"
        body="Loading attribution effect trend."
      />
    );

    expect(screen.getByText("Loading attribution trend")).toBeInTheDocument();
    expect(screen.getByText("Loading attribution effect trend.")).toBeInTheDocument();
    expect(
      document.querySelector(".performance-analysis-state-panel-loading .module-state-panel")
    ).toBeTruthy();
  });

  it("renders a shared unavailable panel", () => {
    render(
      <PerformanceAnalysisStatePanel
        state="unavailable"
        title="Contribution detail unavailable"
        body="Contribution detail is not available for the current selection."
      />
    );

    expect(screen.getByText("Contribution detail unavailable")).toBeInTheDocument();
    expect(
      screen.getByText("Contribution detail is not available for the current selection.")
    ).toBeInTheDocument();
    expect(
      document.querySelector(".performance-analysis-state-panel-unavailable .module-state-panel")
    ).toBeTruthy();
  });
});
