import React from "react";
import { render, screen, waitFor } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";

import PerformanceMultiHorizonPanel from "../../src/apps/performance/components/performance-multi-horizon-panel";

const getSummaryClientMock = vi.fn();

vi.mock("../../src/features/workbench/api", () => ({
  getWorkbenchPerformanceWorkspaceSummaryClient: (...args: unknown[]) =>
    getSummaryClientMock(...args),
}));

describe("PerformanceMultiHorizonPanel", () => {
  afterEach(() => {
    getSummaryClientMock.mockReset();
  });

  it("loads standard horizons from the split summary contract", async () => {
    getSummaryClientMock.mockImplementation(
      async (
        _portfolioId: string,
        params: { period: string; detailBasis: string; benchmark?: string }
      ) => ({
        correlation_id: "corr",
        contract_version: "v1",
        portfolio_id: "PF_1001",
        as_of_date: "2026-03-27",
        period: params.period,
        report_start_date: "2026-01-01",
        report_end_date: "2026-03-27",
        chart_frequency: "monthly",
        detail_basis: params.detailBasis,
        benchmark_code: params.benchmark ?? "BMK_GLOBAL_BALANCED_60_40",
        benchmark_options: [
          {
            benchmark_code: "BMK_GLOBAL_BALANCED_60_40",
            benchmark_name: "Global Balanced 60/40",
            is_assigned: true,
          },
        ],
        portfolio: {
          portfolio_id: "PF_1001",
          client_id: "CIF_1",
          base_currency: "USD",
          booking_center_code: "SG",
        },
        overview: {
          market_value_base: 1000000,
          cash_weight_pct: 5,
          position_count: 10,
        },
        net_performance: {
          metric_basis: "NET",
          portfolio_return_pct:
            params.period === "MTD"
              ? 1.2
              : params.period === "QTD"
                ? 2.8
                : params.period === "YTD"
                  ? 5.4
                  : 12.1,
          benchmark_return_pct:
            params.period === "MTD"
              ? 1.0
              : params.period === "QTD"
                ? 2.4
                : params.period === "YTD"
                  ? 4.9
                  : 10.7,
          active_return_pct: 0.5,
          annualized_return_pct: null,
          benchmark_id: "BMK_GLOBAL_BALANCED_60_40",
          benchmark_return_source: "calculated",
        },
        gross_performance: {
          metric_basis: "GROSS",
          portfolio_return_pct: 0,
          benchmark_return_pct: 0,
          active_return_pct: 0,
          annualized_return_pct: null,
          benchmark_id: "BMK_GLOBAL_BALANCED_60_40",
          benchmark_return_source: "calculated",
        },
        money_weighted_return: null,
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
        contributionDimension="asset_class"
        attributionDimension="asset_class"
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
    expect(getSummaryClientMock).toHaveBeenCalledTimes(4);
  });
});
