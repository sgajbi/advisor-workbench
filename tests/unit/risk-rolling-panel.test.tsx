import React, { useState } from "react";
import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

import RiskRollingPanel from "../../src/apps/performance/components/risk/risk-rolling-panel";
import {
  buildFixtureRiskRolling,
  buildFixtureRiskSummary,
  buildPerformanceRiskViewModel,
  buildUnavailableRiskRolling,
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

    expect(screen.getByRole("heading", { name: "Rolling Risk" })).toBeInTheDocument();
    expect(screen.queryByLabelText("Rolling risk business reading")).not.toBeInTheDocument();

    const headlineLabels = Array.from(
      container.querySelectorAll(".performance-risk-rolling-headline-card .ui-text-label")
    ).map((node) => node.textContent?.trim());
    expect(headlineLabels).toEqual(
      expect.arrayContaining([
        "Volatility",
        "Tracking error",
        "Beta",
        "Max drawdown",
        "Sharpe",
        "Information ratio",
      ])
    );
    expect(headlineLabels.length).toBeGreaterThan(4);
    expect(container.querySelector(".performance-risk-rolling-headline-grid")).toBeTruthy();

    expect(screen.getByRole("radio", { name: "21D" })).toHaveAttribute("aria-checked", "true");
    expect(screen.getByText("Review window")).toBeInTheDocument();
    expect(screen.getByLabelText("Rolling risk summary table")).toBeInTheDocument();
    expect(screen.queryByText("Window detail")).not.toBeInTheDocument();
    expect(container.querySelector(".performance-risk-detail-section-compact")).toBeTruthy();
    expect(container.querySelector(".performance-risk-analytical-table-compact")).toBeTruthy();
    expect(container.querySelector(".performance-risk-rolling-detail-table")).toBeTruthy();
    expect(screen.getByRole("radiogroup", { name: "Rolling risk windows" })).toBeInTheDocument();
    expect(container.querySelector(".performance-risk-rolling-headline-grid")).toBeTruthy();
    expect(screen.getByRole("columnheader", { name: "Current" })).toBeInTheDocument();
    expect(screen.getByRole("columnheader", { name: "Typical" })).toBeInTheDocument();
    expect(screen.getByRole("columnheader", { name: "Range" })).toBeInTheDocument();
    expect(screen.getByRole("columnheader", { name: "Review note" })).toBeInTheDocument();
    expect(container.querySelectorAll(".performance-risk-range-indicator")).toHaveLength(2);
    expect(screen.queryByLabelText("Rolling review notes")).not.toBeInTheDocument();
    expect(
      screen.queryByText("Benchmark-relative review is limited in one emitted window")
    ).not.toBeInTheDocument();
    expect(screen.queryByText(/Typical 4\.07%/i)).not.toBeInTheDocument();
    expect(screen.queryByText("Below typical and still contained")).not.toBeInTheDocument();
    expect(
      screen.getByRole("button", {
        name: "Volatility: Observed variability of portfolio returns over the selected rolling window.",
      })
    ).toBeInTheDocument();
    expect(
      screen.getByRole("button", { name: "Rolling Risk methodology and coverage" })
    ).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "View rolling series" })).toBeInTheDocument();
  });

  it("switches windows through the analytical control and refreshes the review copy", () => {
    const viewModel = buildRiskViewModel();
    renderRollingPanel(viewModel);

    fireEvent.click(screen.getByRole("radio", { name: "63D" }));

    expect(screen.getByRole("radio", { name: "63D" })).toHaveAttribute("aria-checked", "true");
    expect(screen.queryByText("21D selected-window review")).not.toBeInTheDocument();
  });

  it("qualifies benchmark-dependent measures when benchmark context is unavailable", () => {
    const viewModel = buildRiskViewModel({ benchmarkUnassigned: true });
    renderRollingPanel(viewModel);

    expect(screen.queryByLabelText("Rolling risk business reading")).not.toBeInTheDocument();
    expect(screen.queryByText("Tracking error")).not.toBeInTheDocument();
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
    expect(screen.getAllByText("Benchmark-relative review")).not.toHaveLength(0);
    expect(
      screen.getByText(
        "Benchmark variance was limited in one emitted window, so beta may be less informative for that horizon."
      )
    ).toBeInTheDocument();
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

    fireEvent.click(screen.getByRole("radio", { name: "63D" }));
    fireEvent.click(screen.getByRole("button", { name: "View rolling series" }));

    expect(onViewSeries).toHaveBeenCalledWith("63");
  });

  it("renders an explicit partial-state note when rolling windows are not returned", () => {
    const scenario = buildSupportedPerformanceScenario();
    const viewModel = buildPerformanceRiskViewModel({
      workspace: scenario.workspace,
      period: "YTD",
      detailBasis: "NET",
      riskSummary: buildFixtureRiskSummary(scenario.workspace, "YTD", "NET"),
      riskRolling: buildUnavailableRiskRolling({
        workspace: scenario.workspace,
        period: "YTD",
        detailBasis: "NET",
        detail: "Risk rolling fetch failed.",
        includeTimeSeries: false,
      }),
    });

    renderRollingPanel(viewModel);

    expect(screen.getByText("Rolling stability review is partially available")).toBeInTheDocument();
    expect(
      screen.getByText(
        /Historical attribution remains available, but rolling-window review is incomplete for this selection\./i
      )
    ).toBeInTheDocument();
    expect(screen.queryByLabelText("Rolling risk summary table")).not.toBeInTheDocument();
    expect(screen.queryByRole("columnheader", { name: "Review note" })).not.toBeInTheDocument();
  });
});
