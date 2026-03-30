import React from "react";
import { render, screen, waitFor } from "@testing-library/react";
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
  };
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
        benchmarkOptions={[
          {
            benchmark_code: "BMK_GLOBAL_BALANCED_60_40",
            benchmark_name: "Global Balanced 60/40",
            is_assigned: true,
          },
        ]}
      />
    );

    expect(screen.getByText("Loading comparative horizon summaries.")).toBeInTheDocument();

    await waitFor(() => {
      expect(screen.getByText("How did this compare across horizons?")).toBeInTheDocument();
      expect(screen.getByLabelText("Multi-horizon returns")).toBeInTheDocument();
      expect(screen.getByRole("group", { name: "Horizon comparison context" })).toBeInTheDocument();
    });

    expect(screen.getByRole("group", { name: "Horizon comparison context" })).toHaveTextContent(
      "Selected period YTD"
    );
    expect(screen.getByRole("group", { name: "Horizon comparison context" })).toHaveTextContent(
      "Active return 0.51%"
    );
    expect(screen.getByRole("group", { name: "Horizon comparison context" })).toHaveTextContent(
      "Compared against Global Balanced 60/40"
    );
    expect(document.querySelector(".workbench-summary-toolbar.performance-mini-legend")).toBeTruthy();
    expect(document.querySelectorAll(".workbench-summary-visual-card")).toHaveLength(4);
    expect(screen.getByText("MTD")).toBeInTheDocument();
    expect(screen.getByText("QTD")).toBeInTheDocument();
    expect(screen.getAllByText("YTD")).toHaveLength(2);
    expect(screen.getByText("1Y")).toBeInTheDocument();
    expect(getHorizonComparisonClientMock).toHaveBeenCalledTimes(1);
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
        "Selected period YTD"
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
      "Selected period YTD"
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

    expect(screen.getByRole("group", { name: "Horizon comparison context" })).toHaveTextContent(
      "Active return Unavailable"
    );
    expect(screen.getByRole("group", { name: "Horizon comparison context" })).toHaveTextContent(
      "Compared against Benchmark"
    );
  });
});
