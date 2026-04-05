import React from "react";
import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import ScreenStatePanel from "../../src/design-system/components/screen-state-panel";

describe("ScreenStatePanel", () => {
  it("renders an analysis loading panel through the shared state contract", () => {
    render(
      <ScreenStatePanel
        kind="loading"
        title="Loading attribution trend"
        body="Loading attribution effect trend."
        surface="analysis"
      />
    );

    expect(screen.getByText("Loading attribution trend")).toBeInTheDocument();
    expect(screen.getByText("Loading attribution effect trend.")).toBeInTheDocument();
    expect(
      document.querySelector(".performance-analysis-state-panel-loading .workbench-loading-state")
    ).toBeTruthy();
  });

  it("renders an analysis unavailable panel through the shared state contract", () => {
    render(
      <ScreenStatePanel
        kind="unavailable"
        title="Contribution detail unavailable"
        body="Contribution detail is not available for the current selection."
        surface="analysis"
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
