import React from "react";
import { render, screen, waitFor } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";

import PerformanceMultiHorizonPanel from "../../src/apps/performance/components/performance-multi-horizon-panel";

const getHorizonComparisonClientMock = vi.fn();

vi.mock("../../src/features/workbench/api", () => ({
  getWorkbenchPerformanceHorizonComparisonClient: (...args: unknown[]) =>
    getHorizonComparisonClientMock(...args),
}));

describe("PerformanceMultiHorizonPanel", () => {
  afterEach(() => {
    getHorizonComparisonClientMock.mockReset();
  });

  it("loads standard horizons from the dedicated horizon comparison contract", async () => {
    getHorizonComparisonClientMock.mockImplementation(
      async (_portfolioId: string, params: { detailBasis: string; benchmark?: string }) => ({
        correlation_id: "corr",
        contract_version: "v1",
        portfolio_id: "PF_1001",
        as_of_date: "2026-03-27",
        detail_basis: params.detailBasis,
        benchmark_code: params.benchmark ?? "BMK_GLOBAL_BALANCED_60_40",
        benchmark_options: [
          {
            benchmark_code: "BMK_GLOBAL_BALANCED_60_40",
            benchmark_name: "Global Balanced 60/40",
            is_assigned: true,
          },
        ],
        rows: [
          {
            period: "MTD",
            portfolio_return_pct: 1.2,
            benchmark_return_pct: 1.0,
            active_return_pct: 0.2,
            annualized_return_pct: 1.2,
          },
          {
            period: "QTD",
            portfolio_return_pct: 2.8,
            benchmark_return_pct: 2.4,
            active_return_pct: 0.4,
            annualized_return_pct: 2.8,
          },
          {
            period: "YTD",
            portfolio_return_pct: 5.4,
            benchmark_return_pct: 4.9,
            active_return_pct: 0.5,
            annualized_return_pct: 5.4,
          },
          {
            period: "1Y",
            portfolio_return_pct: 12.1,
            benchmark_return_pct: 10.7,
            active_return_pct: 1.4,
            annualized_return_pct: 12.1,
          },
        ],
        warnings: [],
        partial_failures: [],
      })
    );

    render(
      <PerformanceMultiHorizonPanel
        portfolioId="PF_1001"
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
      expect(screen.getByText("Multi-Horizon Returns")).toBeInTheDocument();
      expect(screen.getByLabelText("Multi-horizon returns")).toBeInTheDocument();
    });

    expect(screen.getByText("MTD")).toBeInTheDocument();
    expect(screen.getByText("QTD")).toBeInTheDocument();
    expect(screen.getByText("YTD")).toBeInTheDocument();
    expect(screen.getByText("1Y")).toBeInTheDocument();
    expect(getHorizonComparisonClientMock).toHaveBeenCalledTimes(1);
  });
});
