import React, { useState } from "react";
import { fireEvent, render, screen, within } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

import RiskRollingPanel from "../../src/apps/performance/components/risk/risk-rolling-panel";
import {
  buildFixtureRiskRolling,
  buildPerformanceRiskViewModel,
} from "../../src/apps/performance/risk-workspace-view-model";
import {
  buildBenchmarkUnassignedPerformanceScenario,
  buildSupportedPerformanceScenario,
} from "../fixtures/performance-workspace-fixtures";

function buildRiskViewModel({
  benchmarkUnassigned = false,
}: {
  benchmarkUnassigned?: boolean;
} = {}) {
  const scenario = benchmarkUnassigned
    ? buildBenchmarkUnassignedPerformanceScenario()
    : buildSupportedPerformanceScenario();

  return buildPerformanceRiskViewModel({
    workspace: scenario.workspace,
    period: "YTD",
    detailBasis: "NET",
    riskRolling: buildFixtureRiskRolling(scenario.workspace, "YTD", "NET"),
  });
}

describe("RiskRollingPanel", () => {
  function renderRollingPanel(viewModel: ReturnType<typeof buildRiskViewModel>) {
    function RollingHarness() {
      const [selectedWindowKey, setSelectedWindowKey] = useState("");

      return (
        <RiskRollingPanel
          viewModel={viewModel}
          selectedWindowKey={selectedWindowKey}
          onWindowChange={setSelectedWindowKey}
          onViewSeries={() => {}}
        />
      );
    }

    return render(<RollingHarness />);
  }

  it("presents the shortest rolling window as the executive first read", () => {
    const viewModel = buildRiskViewModel();
    const { container } = renderRollingPanel(viewModel);
    const businessReading = screen.getByLabelText("Rolling risk business reading");

    expect(screen.getByRole("heading", { name: "Rolling Risk" })).toBeInTheDocument();
    expect(
      within(businessReading).getByText(
        "Short-window risk is elevated, but not outside the recent range."
      )
    ).toBeInTheDocument();
    expect(
      within(businessReading).getByText(
        /review 63D to separate short-term noise from longer-horizon posture\./i
      )
    ).toBeInTheDocument();
    expect(businessReading).toHaveClass("performance-risk-briefing-card-compact");

    const headlineLabels = Array.from(
      container.querySelectorAll(".performance-risk-rolling-headline-card")
    ).map((node) => node.getAttribute("aria-label")?.replace(" headline metric", ""));
    expect(headlineLabels).toEqual(["Volatility", "Tracking Error", "Beta", "Max Drawdown"]);
    expect(container.querySelector(".performance-risk-rolling-headline-grid")).toBeTruthy();

    expect(screen.getByRole("tab", { name: "21D" })).toHaveAttribute("aria-selected", "true");
    expect(screen.getByText("Review window")).toBeInTheDocument();
    expect(screen.getByText("21D selected-window review")).toBeInTheDocument();
    expect(screen.getByLabelText("Rolling risk summary table")).toBeInTheDocument();
    expect(container.querySelector(".performance-risk-detail-section-compact")).toBeTruthy();
    expect(container.querySelector(".performance-risk-analytical-table-compact")).toBeTruthy();
    expect(container.querySelector(".performance-risk-rolling-detail-table")).toBeTruthy();
    expect(container.querySelector(".performance-risk-compact-segmented-control")).toBeTruthy();
    expect(screen.getByRole("columnheader", { name: "Current" })).toBeInTheDocument();
    expect(screen.getByRole("columnheader", { name: "Typical" })).toBeInTheDocument();
    expect(screen.getByRole("columnheader", { name: "Range" })).toBeInTheDocument();
    expect(screen.getByRole("columnheader", { name: "Review note" })).toBeInTheDocument();
    expect(screen.getAllByText("Current reading is above typical but still in range.").length).toBeGreaterThan(0);
    expect(screen.getByText("Benchmark-relative review is limited in one emitted window")).toBeInTheDocument();
    expect(
      screen.getByRole("button", { name: "Rolling Risk methodology and coverage" })
    ).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "View rolling series" })).toBeInTheDocument();
  });

  it("switches windows through the analytical control and refreshes the review copy", () => {
    const viewModel = buildRiskViewModel();
    renderRollingPanel(viewModel);

    fireEvent.click(screen.getByRole("tab", { name: "63D" }));

    expect(screen.getByRole("tab", { name: "63D" })).toHaveAttribute("aria-selected", "true");
    expect(screen.getByText("63D selected-window review")).toBeInTheDocument();
    expect(screen.queryByText("21D selected-window review")).not.toBeInTheDocument();
  });

  it("qualifies benchmark-dependent measures when benchmark context is unavailable", () => {
    const viewModel = buildRiskViewModel({ benchmarkUnassigned: true });
    renderRollingPanel(viewModel);
    const businessReading = screen.getByLabelText("Rolling risk business reading");

    expect(
      businessReading
    ).toBeInTheDocument();
    expect(businessReading).toHaveTextContent(
      "Benchmark-relative review should be qualified for beta and tracking error."
    );
    expect(screen.queryByText("Tracking Error")).not.toBeInTheDocument();
    expect(screen.queryByText("Beta")).not.toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: "Rolling Risk methodology and coverage" }));

    expect(screen.getByRole("dialog", { name: "Rolling Risk methodology and coverage" })).toBeInTheDocument();
    expect(screen.getByText("Benchmark-relative review is not active for this request.")).toBeInTheDocument();
  });

  it("reveals rolling methodology and coverage on demand", () => {
    const viewModel = buildRiskViewModel();
    renderRollingPanel(viewModel);

    fireEvent.click(screen.getByRole("button", { name: "Rolling Risk methodology and coverage" }));

    expect(screen.getByRole("dialog", { name: "Rolling Risk methodology and coverage" })).toBeInTheDocument();
    expect(screen.getByText("Window set")).toBeInTheDocument();
    expect(screen.getByText("Benchmark alignment")).toBeInTheDocument();
    expect(screen.getByText("Risk-free alignment")).toBeInTheDocument();
    expect(screen.getByText("Methodology")).toBeInTheDocument();
  });

  it("passes the selected window into the drill-down action", () => {
    const viewModel = buildRiskViewModel();
    const onViewSeries = vi.fn();

    function RollingHarness() {
      const [selectedWindowKey, setSelectedWindowKey] = useState("");

      return (
        <RiskRollingPanel
          viewModel={viewModel}
          selectedWindowKey={selectedWindowKey}
          onWindowChange={setSelectedWindowKey}
          onViewSeries={onViewSeries}
        />
      );
    }

    render(<RollingHarness />);

    fireEvent.click(screen.getByRole("tab", { name: "63D" }));
    fireEvent.click(screen.getByRole("button", { name: "View rolling series" }));

    expect(onViewSeries).toHaveBeenCalledWith("63");
  });
});
