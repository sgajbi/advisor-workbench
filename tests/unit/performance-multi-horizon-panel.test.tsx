import React from "react";
import { fireEvent, render, screen, waitFor, within } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";

import PerformanceMultiHorizonPanel from "../../src/apps/performance/components/performance-multi-horizon-panel";
import type { WorkbenchPerformanceHorizonComparison } from "../../src/features/workbench/types";
import { buildPerformanceHorizonComparison } from "../fixtures/performance-workspace-fixtures";

const getHorizonComparisonClientMock = vi.fn();

vi.mock("../../src/features/workbench/api", () => ({
  getWorkbenchPerformanceHorizonComparisonClient: (...args: unknown[]) =>
    getHorizonComparisonClientMock(...args),
}));

function buildHorizonComparison(
  overrides: Partial<WorkbenchPerformanceHorizonComparison> = {}
): WorkbenchPerformanceHorizonComparison {
  return {
    ...buildPerformanceHorizonComparison(),
    ...overrides,
  } as WorkbenchPerformanceHorizonComparison;
}

describe("PerformanceMultiHorizonPanel", () => {
  afterEach(() => {
    getHorizonComparisonClientMock.mockReset();
  });

  it("loads standard horizons from the dedicated horizon comparison contract", async () => {
    getHorizonComparisonClientMock.mockImplementation(
      async (_portfolioId: string, params: { detailBasis: string; benchmark?: string }) =>
        buildHorizonComparison({
          detail_basis: params.detailBasis,
          benchmark_code: params.benchmark ?? "BMK_GLOBAL_BALANCED_60_40",
        })
    );

    render(
      <PerformanceMultiHorizonPanel
        portfolioId="PF_1001"
        period="YTD"
        detailBasis="NET"
        benchmark="BMK_GLOBAL_BALANCED_60_40"
        chartFrequency="monthly"
        reportStartDate="2026-01-01"
        reportEndDate="2026-03-27"
        benchmarkOptions={[
          {
            benchmark_code: "BMK_GLOBAL_BALANCED_60_40",
            benchmark_name: "Global Balanced 60/40",
            is_assigned: true,
          },
        ]}
      />
    );

    expect(screen.getByRole("status")).toHaveTextContent("Loading horizon comparison");
    expect(screen.getByRole("status")).toHaveTextContent("Loading horizon comparison.");

    await waitFor(() => {
      expect(screen.getByText("Horizon Comparison")).toBeInTheDocument();
      expect(screen.getByLabelText("Multi-horizon returns")).toBeInTheDocument();
    });

    expect(document.querySelector(".performance-summary-driver-module.workbench-chart-shell")).toBeTruthy();
    expect(document.querySelector(".performance-horizon-review-bar")).toBeTruthy();
    expect(screen.queryByText("Portfolio vs Global Balanced 60/40")).not.toBeInTheDocument();
    expect(screen.queryByText("NET")).not.toBeInTheDocument();
    expect(screen.queryByRole("group", { name: "Horizon comparison context" })).not.toBeInTheDocument();
    expect(document.querySelector(".workbench-summary-toolbar.performance-horizon-toolbar")).toBeTruthy();
    expect(document.querySelector(".performance-horizon-panel-body")).toBeTruthy();
    expect(document.querySelectorAll(".performance-horizon-matrix-row")).toHaveLength(4);
    expect(document.querySelector(".performance-horizon-bar-support-grid")).toBeFalsy();
    expect(screen.getByText("Detailed table")).toBeInTheDocument();
    expect(
      screen.queryByText("Open the full economics and return breakdown. Scroll horizontally for wide columns.")
    ).not.toBeInTheDocument();
    expect(screen.getByRole("radiogroup", { name: "Horizon table view" })).toBeInTheDocument();
    expect(screen.getByRole("radiogroup", { name: "Horizon basis view" })).toBeInTheDocument();
    expect(screen.getByRole("radiogroup", { name: "Horizon visual mode" })).toBeInTheDocument();
    expect(screen.getAllByText("Portfolio").length).toBeGreaterThan(0);
    expect(screen.getAllByText("Benchmark").length).toBeGreaterThan(0);
    fireEvent.click(screen.getByText("Detailed table"));
    const horizonTable = screen.getByLabelText("Multi-horizon return table");
    expect(screen.getByRole("region", { name: "Scrollable horizon comparison table" })).toBeInTheDocument();
    expect(
      horizonTable.closest(".performance-horizon-table.performance-chart-observation-table")
    ).toBeTruthy();
    expect(within(horizonTable).getByText("Opening MV")).toBeInTheDocument();
    expect(within(horizonTable).getByText("Opening Cash Flow")).toBeInTheDocument();
    expect(within(horizonTable).getByText("Closing Cash Flow")).toBeInTheDocument();
    expect(within(horizonTable).getByText("Flow-Adjusted MV")).toBeInTheDocument();
    expect(within(horizonTable).getByText("Net Flow")).toBeInTheDocument();
    expect(within(horizonTable).getByText("Gross Return")).toBeInTheDocument();
    expect(within(horizonTable).getByText("Fee Drag")).toBeInTheDocument();
    expect(within(horizonTable).getByText("Cumulative Net")).toBeInTheDocument();
    expect(within(horizonTable).getByText("Cumulative Gross")).toBeInTheDocument();
    expect(within(horizonTable).getByText("Cumulative Benchmark")).toBeInTheDocument();
    expect(within(horizonTable).getByText("Cumulative Active")).toBeInTheDocument();
    expect(within(horizonTable).getAllByText("$450,000")).toHaveLength(2);
    expect(within(horizonTable).getAllByText("$26,000")).toHaveLength(2);
    expect(within(horizonTable).getAllByText("-$3,500")).toHaveLength(2);
    expect(within(horizonTable).getAllByText("$486,370")).toHaveLength(2);
    expect(within(horizonTable).getAllByText("$22,500")).toHaveLength(2);
    expect(within(horizonTable).getAllByText("5.88%").length).toBeGreaterThan(0);
    expect(within(horizonTable).getAllByText("0.46%").length).toBeGreaterThan(0);
    expect(screen.getAllByText("MTD").length).toBeGreaterThanOrEqual(2);
    expect(screen.getAllByText("QTD").length).toBeGreaterThanOrEqual(2);
    expect(screen.getAllByText("YTD").length).toBeGreaterThanOrEqual(2);
    expect(screen.getAllByText("1Y").length).toBeGreaterThanOrEqual(2);

    fireEvent.click(screen.getByRole("radio", { name: "Returns" }));
    expect(within(horizonTable).queryByText("Opening MV")).not.toBeInTheDocument();
    expect(within(horizonTable).queryByText("Opening Cash Flow")).not.toBeInTheDocument();
    expect(within(horizonTable).queryByText("Closing Cash Flow")).not.toBeInTheDocument();
    expect(within(horizonTable).queryByText("Flow-Adjusted MV")).not.toBeInTheDocument();
    expect(within(horizonTable).queryByText("Net Flow")).not.toBeInTheDocument();
    expect(within(horizonTable).getByText("Benchmark Return")).toBeInTheDocument();
    expect(within(horizonTable).getByText("Cumulative Net")).toBeInTheDocument();
    expect(within(horizonTable).getByText("Cumulative Benchmark")).toBeInTheDocument();
    expect(within(horizonTable).getByText("Annualized Net")).toBeInTheDocument();

    fireEvent.click(screen.getByRole("radio", { name: "Economics" }));
    expect(within(horizonTable).getByText("Opening MV")).toBeInTheDocument();
    expect(within(horizonTable).getByText("Opening Cash Flow")).toBeInTheDocument();
    expect(within(horizonTable).getByText("Closing Cash Flow")).toBeInTheDocument();
    expect(within(horizonTable).getByText("Flow-Adjusted MV")).toBeInTheDocument();
    expect(within(horizonTable).getByText("Net Flow")).toBeInTheDocument();
    expect(within(horizonTable).queryByText("Benchmark Return")).not.toBeInTheDocument();
    expect(within(horizonTable).queryByText("Cumulative Active")).not.toBeInTheDocument();

    fireEvent.click(screen.getByRole("radio", { name: "Relative" }));
    expect(screen.getAllByText("Active").length).toBeGreaterThan(0);
    expect(screen.getAllByText("Cumulative").length).toBeGreaterThan(0);
    expect(screen.getByLabelText("MTD Active")).toBeInTheDocument();
    expect(screen.getByLabelText("MTD Cumulative")).toBeInTheDocument();
    expect(screen.queryByText("Support")).not.toBeInTheDocument();

    fireEvent.click(screen.getByRole("radio", { name: "Combined" }));
    fireEvent.click(screen.getByRole("radio", { name: "Net" }));
    expect(within(horizonTable).getByText("Net Return")).toBeInTheDocument();
    expect(within(horizonTable).getByText("Cumulative Net")).toBeInTheDocument();
    expect(within(horizonTable).getByText("Annualized Net")).toBeInTheDocument();
    expect(within(horizonTable).queryByText("Gross Return")).not.toBeInTheDocument();
    expect(within(horizonTable).queryByText("Cumulative Gross")).not.toBeInTheDocument();
    expect(within(horizonTable).queryByText("Fee Drag")).not.toBeInTheDocument();

    fireEvent.click(screen.getByRole("radio", { name: "Basis" }));
    expect(screen.getAllByText("Net").length).toBeGreaterThan(0);
    expect(screen.getAllByText("Gross").length).toBeGreaterThan(0);
    expect(screen.getByText("Support")).toBeInTheDocument();
    expect(screen.getByLabelText("MTD Net")).toBeInTheDocument();
    expect(screen.getByLabelText("MTD Gross")).toBeInTheDocument();

    fireEvent.click(screen.getByRole("radio", { name: "Gross" }));
    expect(within(horizonTable).getByText("Gross Return")).toBeInTheDocument();
    expect(within(horizonTable).getByText("Cumulative Gross")).toBeInTheDocument();
    expect(within(horizonTable).getByText("Annualized Gross")).toBeInTheDocument();
    expect(within(horizonTable).queryByText("Net Return")).not.toBeInTheDocument();
    expect(within(horizonTable).queryByText("Cumulative Net")).not.toBeInTheDocument();
    expect(within(horizonTable).queryByText("Fee Drag")).not.toBeInTheDocument();
    expect(getHorizonComparisonClientMock).toHaveBeenCalledTimes(1);
    expect(getHorizonComparisonClientMock).toHaveBeenCalledWith("PF_1001", {
      period: "YTD",
      detailBasis: "NET",
      benchmark: "BMK_GLOBAL_BALANCED_60_40",
      chartFrequency: "monthly",
      reportStartDate: "2026-01-01",
      reportEndDate: "2026-03-27",
    });
  });

  it("reuses cached horizon data when rerendered with the same analytical inputs", async () => {
    getHorizonComparisonClientMock.mockResolvedValue(
      buildHorizonComparison({
        detail_basis: "NET",
        benchmark_code: "BMK_GLOBAL_BALANCED_60_40",
        benchmark_options: [],
        rows: [
          {
            period: "YTD",
            portfolio_return_pct: 5.4,
            benchmark_return_pct: 4.9,
            active_return_pct: 0.5,
            annualized_return_pct: 5.4,
          },
        ],
      })
    );

    const view = render(
      <PerformanceMultiHorizonPanel
        portfolioId="PF_1001"
        period="YTD"
        detailBasis="NET"
        benchmark="BMK_GLOBAL_BALANCED_60_40"
        chartFrequency="monthly"
      />
    );

      await waitFor(() => {
        expect(screen.getByLabelText("Multi-horizon returns")).toBeInTheDocument();
      });
    expect(getHorizonComparisonClientMock).toHaveBeenCalledTimes(1);

    view.rerender(
      <PerformanceMultiHorizonPanel
        portfolioId="PF_1001"
        period="YTD"
        detailBasis="NET"
        benchmark="BMK_GLOBAL_BALANCED_60_40"
        chartFrequency="monthly"
      />
    );

    expect(screen.getByLabelText("Multi-horizon returns")).toBeInTheDocument();
    expect(getHorizonComparisonClientMock).toHaveBeenCalledTimes(1);
  });

  it("keeps benchmark context honest when the selected-period active return is unavailable", async () => {
    getHorizonComparisonClientMock.mockResolvedValue(
      buildHorizonComparison({
        detail_basis: "NET",
        benchmark_code: null,
        benchmark_options: [],
        rows: [
          {
            period: "YTD",
            portfolio_return_pct: 5.4,
            benchmark_return_pct: null,
            active_return_pct: null,
            annualized_return_pct: 5.4,
          },
        ],
      })
    );

    render(
      <PerformanceMultiHorizonPanel
        portfolioId="PF_1001"
        period="YTD"
        detailBasis="NET"
        chartFrequency="monthly"
      />
    );

    await waitFor(() => {
      expect(screen.getByLabelText("Multi-horizon returns")).toBeInTheDocument();
    });
    expect(screen.queryByRole("group", { name: "Horizon comparison context" })).not.toBeInTheDocument();
  });

  it("shows a normalization notice when the horizon endpoint adjusts an unsupported frequency", async () => {
    getHorizonComparisonClientMock.mockResolvedValue(
      buildHorizonComparison({
        chart_frequency: "monthly",
        requested_chart_frequency_supported: false,
      })
    );

    render(
      <PerformanceMultiHorizonPanel
        portfolioId="PF_1001"
        period="YTD"
        detailBasis="NET"
        benchmark="BMK_GLOBAL_BALANCED_60_40"
        chartFrequency="weekly"
      />
    );

    const notice = await screen.findByRole("status", {
      name: "Horizon comparison normalization",
    });
    expect(notice).toHaveTextContent("Selection adjusted");
    expect(notice).toHaveTextContent("Unsupported frequency was replaced with Monthly.");
  });

  it("renders a designed unavailable state when no horizon rows are exposed", async () => {
    getHorizonComparisonClientMock.mockResolvedValue(
      buildHorizonComparison({
        rows: [],
      })
    );

    render(
      <PerformanceMultiHorizonPanel
        portfolioId="PF_1001"
        period="YTD"
        detailBasis="NET"
        benchmark="BMK_GLOBAL_BALANCED_60_40"
        chartFrequency="monthly"
      />
    );

    expect(
      await screen.findByLabelText("Horizon comparison unavailable state")
    ).toBeInTheDocument();
    expect(
      screen.getByText("Horizon comparison is unavailable for this mandate")
    ).toBeInTheDocument();
    expect(screen.queryByText("Still available")).not.toBeInTheDocument();
    expect(screen.queryByText("Needs source support")).not.toBeInTheDocument();
    expect(screen.queryByLabelText("Multi-horizon return table")).not.toBeInTheDocument();
  });

  it("pushes the resolved horizon frequency back through the shared request handler", async () => {
    const onRequestChange = vi.fn();
    getHorizonComparisonClientMock.mockResolvedValue(
      buildHorizonComparison({
        chart_frequency: "monthly",
        requested_chart_frequency_supported: false,
      })
    );

    render(
      <PerformanceMultiHorizonPanel
        portfolioId="PF_1001"
        period="YTD"
        detailBasis="NET"
        benchmark="BMK_GLOBAL_BALANCED_60_40"
        chartFrequency="weekly"
        onRequestChange={onRequestChange}
      />
    );

    await waitFor(() => {
      expect(onRequestChange).toHaveBeenCalledWith({ chartFrequency: "monthly" });
    });
  });
});
