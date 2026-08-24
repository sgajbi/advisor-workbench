import { fireEvent, render, screen, within } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import RiskSnapshotPanel from "../../src/apps/performance/components/risk/risk-snapshot-panel";
import {
  buildFixtureRiskSummary,
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
    riskSummary: buildFixtureRiskSummary(scenario.workspace, "YTD", "NET"),
  });
}

describe("RiskSnapshotPanel", () => {
  it("prioritizes executive headline metrics ahead of supporting measures", () => {
    const viewModel = buildRiskViewModel();
    const { container } = render(<RiskSnapshotPanel viewModel={viewModel} />);

    expect(screen.getByRole("heading", { name: "Risk snapshot" })).toBeInTheDocument();
    expect(screen.queryByLabelText("Risk snapshot business reading")).not.toBeInTheDocument();
    expect(
      screen.getByRole("button", { name: "Risk snapshot methodology and coverage" })
    ).toBeInTheDocument();
    expect(screen.queryByRole("heading", { name: "Context and methodology" })).not.toBeInTheDocument();
    expect(screen.queryByText("Stateful risk metric")).not.toBeInTheDocument();

    const headlineLabels = Array.from(
      container.querySelectorAll(".performance-risk-snapshot-headline-grid .ui-text-label")
    ).map((node) => node.textContent?.trim());
    expect(headlineLabels).toEqual([
      "Volatility",
      "Sharpe",
      "Beta",
      "Tracking error",
      "Information ratio",
      "Sortino",
      "Value at risk",
    ]);
    expect(
      screen.queryByText("Overall realised risk level of the portfolio over the selected period.")
    ).not.toBeInTheDocument();
    expect(screen.queryByRole("heading", { name: "Supporting risk measures" })).not.toBeInTheDocument();
    expect(container.querySelectorAll(".performance-risk-snapshot-headline-card")).toHaveLength(7);
    expect(screen.queryByText("Efficiency of active risk taken versus the benchmark.")).not.toBeInTheDocument();
    expect(
      screen.getByRole("button", {
        name: "Information ratio: Active return earned per unit of tracking error.",
      })
    ).toBeInTheDocument();
  });

  it("keeps methodology hidden until explicitly requested", () => {
    const viewModel = buildRiskViewModel();
    render(<RiskSnapshotPanel viewModel={viewModel} />);

    expect(
      screen.queryByRole("dialog", { name: "Risk snapshot methodology and coverage" })
    ).not.toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: "Risk snapshot methodology and coverage" }));

    const dialog = screen.getByRole("dialog", {
      name: "Risk snapshot methodology and coverage",
    });
    expect(dialog).toBeInTheDocument();
    expect(within(dialog).getByText("Portfolio observations")).toBeInTheDocument();
    expect(within(dialog).getByText("Benchmark context")).toBeInTheDocument();
  });

  it("qualifies benchmark-relative interpretation when benchmark context is unavailable", () => {
    const viewModel = buildRiskViewModel({ benchmarkUnassigned: true });
    render(<RiskSnapshotPanel viewModel={viewModel} />);

    expect(screen.queryByLabelText("Risk snapshot business reading")).not.toBeInTheDocument();
    expect(screen.getAllByText("N/A").length).toBeGreaterThanOrEqual(2);
    fireEvent.click(screen.getByRole("button", { name: "Risk snapshot methodology and coverage" }));
    expect(
      screen.getByRole("dialog", { name: "Risk snapshot methodology and coverage" })
    ).toHaveTextContent("Relative risk is not being applied for this selection.");
  });
});
