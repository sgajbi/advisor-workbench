import React from "react";
import { fireEvent, render, screen, waitFor, within } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";

import PerformanceMultiHorizonPanel from "../../src/apps/performance/components/performance-multi-horizon-panel";
import type { WorkbenchPerformanceHorizonComparison } from "../../src/features/workbench/types";
import { buildPerformanceHorizonComparison } from "../fixtures/performance-workspace-fixtures";

const getHorizonComparisonClientMock = vi.fn();

function compactPattern(text: string) {
  return new RegExp(text.replaceAll(" ", "\\s*"));
}

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

    expect(screen.getByText("Loading horizon comparison.")).toBeInTheDocument();

    await waitFor(() => {
      expect(screen.getByText("How did this compare across horizons?")).toBeInTheDocument();
      expect(screen.getByLabelText("Multi-horizon returns")).toBeInTheDocument();
      expect(screen.getByRole("group", { name: "Horizon comparison context" })).toBeInTheDocument();
      expect(screen.getByLabelText("Multi-horizon return table")).toBeInTheDocument();
    });

    expect(document.querySelector(".performance-summary-driver-module.workbench-chart-shell")).toBeTruthy();
    expect(screen.getByRole("group", { name: "Horizon comparison context" })).toHaveTextContent(
      compactPattern("Resolved window 01 Jan 2026 - 24 Feb 2026")
    );
    expect(screen.getByRole("group", { name: "Horizon comparison context" })).toHaveTextContent(
      compactPattern("Active return 0.51%")
    );
    expect(screen.getByRole("group", { name: "Horizon comparison context" })).toHaveTextContent(
      compactPattern("Compared against Global Balanced 60/40")
    );
    expect(document.querySelector(".performance-horizon-context-row.workbench-chart-context-row")).toBeTruthy();
    expect(screen.getByText("Portfolio vs Global Balanced 60/40")).toBeInTheDocument();
    expect(screen.getByText("NET")).toBeInTheDocument();
    expect(document.querySelector(".workbench-summary-toolbar.performance-mini-legend")).toBeTruthy();
    expect(document.querySelectorAll(".workbench-summary-visual-card")).toHaveLength(4);
    expect(screen.getByRole("tablist", { name: "Horizon table view" })).toBeInTheDocument();
    expect(screen.getByRole("tablist", { name: "Horizon basis view" })).toBeInTheDocument();
    expect(screen.getByRole("tablist", { name: "Horizon visual mode" })).toBeInTheDocument();
    expect(screen.getByText("Active 0.20%")).toBeInTheDocument();
    const horizonTable = screen.getByLabelText("Multi-horizon return table");
    expect(within(horizonTable).getByText("Begin MV")).toBeInTheDocument();
    expect(within(horizonTable).getByText("Flow-Adj MV")).toBeInTheDocument();
    expect(within(horizonTable).getByText("Net Flow")).toBeInTheDocument();
    expect(within(horizonTable).getByText("Gross")).toBeInTheDocument();
    expect(within(horizonTable).getByText("Fee Drag")).toBeInTheDocument();
    expect(within(horizonTable).getByText("Cum Net")).toBeInTheDocument();
    expect(within(horizonTable).getByText("Cum Gross")).toBeInTheDocument();
    expect(within(horizonTable).getByText("Cum Benchmark")).toBeInTheDocument();
    expect(within(horizonTable).getByText("Cum Active")).toBeInTheDocument();
    expect(within(horizonTable).getAllByText("$450,000")).toHaveLength(2);
    expect(within(horizonTable).getAllByText("$486,370")).toHaveLength(2);
    expect(within(horizonTable).getAllByText("$22,500")).toHaveLength(2);
    expect(within(horizonTable).getAllByText("5.88%").length).toBeGreaterThan(0);
    expect(within(horizonTable).getAllByText("0.46%").length).toBeGreaterThan(0);
    expect(screen.getAllByText("MTD")).toHaveLength(2);
    expect(screen.getAllByText("QTD")).toHaveLength(2);
    expect(screen.getAllByText("YTD")).toHaveLength(2);
    expect(screen.getAllByText("1Y")).toHaveLength(2);
    expect(screen.getAllByLabelText("YTD horizon comparison row")).toHaveLength(1);

    fireEvent.click(screen.getByRole("tab", { name: "Returns" }));
    expect(within(horizonTable).queryByText("Begin MV")).not.toBeInTheDocument();
    expect(within(horizonTable).queryByText("Flow-Adj MV")).not.toBeInTheDocument();
    expect(within(horizonTable).queryByText("Net Flow")).not.toBeInTheDocument();
    expect(within(horizonTable).getByText("Benchmark")).toBeInTheDocument();
    expect(within(horizonTable).getByText("Cum Net")).toBeInTheDocument();
    expect(within(horizonTable).getByText("Cum Benchmark")).toBeInTheDocument();
    expect(within(horizonTable).getByText("Ann. Net")).toBeInTheDocument();

    fireEvent.click(screen.getByRole("tab", { name: "Economics" }));
    expect(within(horizonTable).getByText("Begin MV")).toBeInTheDocument();
    expect(within(horizonTable).getByText("Flow-Adj MV")).toBeInTheDocument();
    expect(within(horizonTable).getByText("Net Flow")).toBeInTheDocument();
    expect(within(horizonTable).queryByText("Benchmark")).not.toBeInTheDocument();
    expect(within(horizonTable).queryByText("Cum Active")).not.toBeInTheDocument();

    fireEvent.click(screen.getByRole("tab", { name: "Relative" }));
    expect(screen.getByText("Spread 0.20%")).toBeInTheDocument();
    expect(screen.getAllByText("Cum 0.51%").length).toBeGreaterThan(0);
    expect(screen.getByLabelText("MTD Active")).toBeInTheDocument();
    expect(screen.getByLabelText("MTD Cum Active")).toBeInTheDocument();

    fireEvent.click(screen.getByRole("tab", { name: "Combined" }));
    fireEvent.click(screen.getByRole("tab", { name: "Net" }));
    expect(within(horizonTable).getByText("Net")).toBeInTheDocument();
    expect(within(horizonTable).getByText("Cum Net")).toBeInTheDocument();
    expect(within(horizonTable).getByText("Ann. Net")).toBeInTheDocument();
    expect(within(horizonTable).queryByText("Gross")).not.toBeInTheDocument();
    expect(within(horizonTable).queryByText("Cum Gross")).not.toBeInTheDocument();
    expect(within(horizonTable).queryByText("Fee Drag")).not.toBeInTheDocument();

    fireEvent.click(screen.getByRole("tab", { name: "Basis" }));
    expect(screen.getByText("Fee Drag 0.02%")).toBeInTheDocument();
    expect(screen.getByLabelText("MTD Net")).toBeInTheDocument();
    expect(screen.getByLabelText("MTD Gross")).toBeInTheDocument();

    fireEvent.click(screen.getByRole("tab", { name: "Gross" }));
    expect(within(horizonTable).getByText("Gross")).toBeInTheDocument();
    expect(within(horizonTable).getByText("Cum Gross")).toBeInTheDocument();
    expect(within(horizonTable).getByText("Ann. Gross")).toBeInTheDocument();
    expect(within(horizonTable).queryByText("Net")).not.toBeInTheDocument();
    expect(within(horizonTable).queryByText("Cum Net")).not.toBeInTheDocument();
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
        expect(screen.getByRole("group", { name: "Horizon comparison context" })).toHaveTextContent(
        compactPattern("Resolved window 01 Jan 2026 - 24 Feb 2026")
        );
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

    expect(screen.getByRole("group", { name: "Horizon comparison context" })).toHaveTextContent(
      compactPattern("Resolved window 01 Jan 2026 - 24 Feb 2026")
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
      expect(screen.getByRole("group", { name: "Horizon comparison context" })).toBeInTheDocument();
    });

    expect(screen.getByText("Portfolio comparison across standard reporting windows")).toBeInTheDocument();
    expect(screen.getByRole("group", { name: "Horizon comparison context" })).toHaveTextContent(
      compactPattern("Active return Unavailable")
    );
    expect(screen.getByRole("group", { name: "Horizon comparison context" })).toHaveTextContent(
      compactPattern("Compared against Benchmark")
    );
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
