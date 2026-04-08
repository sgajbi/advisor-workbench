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

    expect(screen.getByRole("heading", { name: "Risk Snapshot" })).toBeInTheDocument();
    expect(
      screen.getByText(/Risk posture is contained, and benchmark-relative reading is reliable\./)
    ).toBeInTheDocument();
    expect(
      screen.getByText(/Next review: confirm active risk remains appropriate through beta and tracking error\./)
    ).toBeInTheDocument();
    expect(screen.getByRole("heading", { name: "Supporting risk measures" })).toBeInTheDocument();
    expect(
      screen.getByRole("button", { name: "Risk Snapshot methodology and coverage" })
    ).toBeInTheDocument();
    expect(screen.queryByRole("heading", { name: "Context and methodology" })).not.toBeInTheDocument();
    expect(screen.queryByText("Stateful risk metric")).not.toBeInTheDocument();

    const headlineLabels = Array.from(
      container.querySelectorAll(
        ".performance-risk-snapshot-headline-grid .workbench-summary-metric-label"
      )
    ).map((node) => node.textContent?.trim());
    expect(headlineLabels).toEqual(["Volatility", "Sharpe", "Beta", "Tracking Error"]);

    const supportingSection = screen
      .getByRole("heading", { name: "Supporting risk measures" })
      .closest(".performance-risk-detail-section");
    expect(supportingSection).toBeTruthy();
    expect(within(supportingSection as HTMLElement).getByText("Information Ratio")).toBeInTheDocument();
    expect(within(supportingSection as HTMLElement).getByText("Sortino")).toBeInTheDocument();
    expect(within(supportingSection as HTMLElement).getByText("Value at Risk")).toBeInTheDocument();
    expect(
      within(supportingSection as HTMLElement).getByText(
        "Efficiency of active risk taken versus the benchmark."
      )
    ).toBeInTheDocument();
  });

  it("keeps methodology hidden until explicitly requested", () => {
    const viewModel = buildRiskViewModel();
    render(<RiskSnapshotPanel viewModel={viewModel} />);

    expect(
      screen.queryByRole("dialog", { name: "Risk Snapshot methodology and coverage" })
    ).not.toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: "Risk Snapshot methodology and coverage" }));

    const dialog = screen.getByRole("dialog", {
      name: "Risk Snapshot methodology and coverage",
    });
    expect(dialog).toBeInTheDocument();
    expect(within(dialog).getByText("Portfolio observations")).toBeInTheDocument();
    expect(within(dialog).getByText("Benchmark context")).toBeInTheDocument();
  });

  it("qualifies benchmark-relative interpretation when benchmark context is unavailable", () => {
    const viewModel = buildRiskViewModel({ benchmarkUnassigned: true });
    render(<RiskSnapshotPanel viewModel={viewModel} />);

    expect(
      screen.getByText(/Risk posture is contained, and benchmark-relative reading is unavailable\./)
    ).toBeInTheDocument();
    expect(
      screen.getByText(/Next review: rely on total-risk measures first, then confirm benchmark alignment\./)
    ).toBeInTheDocument();
    expect(screen.getAllByText("N/A").length).toBeGreaterThanOrEqual(2);
    expect(
      screen.getAllByText("Benchmark-relative risk requires benchmark context.").length
    ).toBeGreaterThanOrEqual(2);
    fireEvent.click(screen.getByRole("button", { name: "Risk Snapshot methodology and coverage" }));
    expect(
      screen.getByRole("dialog", { name: "Risk Snapshot methodology and coverage" })
    ).toHaveTextContent("Relative risk is not being applied for this selection.");
  });
});
