import React from "react";
import { act, render, screen, waitFor } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";

import type { WorkbenchPerformanceWorkspace } from "../../src/features/workbench/types";
import PerformanceWorkspaceClient from "../../src/apps/performance/components/performance-workspace-client";

const replaceMock = vi.fn();
const getWorkspaceClientMock = vi.fn();

vi.mock("next/navigation", () => ({
  useRouter: () => ({
    replace: replaceMock,
  }),
}));

vi.mock("../../src/features/workbench/api", () => ({
  getWorkbenchPerformanceWorkspaceClient: (...args: unknown[]) =>
    getWorkspaceClientMock(...args),
}));

vi.mock("../../src/apps/performance/components/performance-workspace-view", () => ({
  default: ({
    workspace,
    period,
    onRequestChange,
    isUpdating,
  }: {
    workspace: WorkbenchPerformanceWorkspace | null;
    period: string;
    onRequestChange?: (patch: {
      period?: string;
      detailBasis?: string;
      contributionDimension?: string;
      attributionDimension?: string;
      chartFrequency?: string;
      benchmark?: string;
      reportStartDate?: string;
      reportEndDate?: string;
    }) => void;
    isUpdating?: boolean;
  }) => (
    <div>
      <div data-testid="period">{period}</div>
      <div data-testid="return">
        {workspace?.net_performance.portfolio_return_pct ?? "none"}
      </div>
      <div data-testid="updating">{String(Boolean(isUpdating))}</div>
      <button type="button" onClick={() => onRequestChange?.({ period: "3Y" })}>
        Switch 3Y
      </button>
      <button type="button" onClick={() => onRequestChange?.({ period: "YTD" })}>
        Switch YTD
      </button>
    </div>
  ),
}));

function buildWorkspace(
  overrides: Partial<WorkbenchPerformanceWorkspace> = {}
): WorkbenchPerformanceWorkspace {
  return {
    correlation_id: "corr",
    contract_version: "v1",
    portfolio_id: "PF_1001",
    as_of_date: "2026-03-27",
    period: "YTD",
    report_start_date: "2026-01-01",
    report_end_date: "2026-03-27",
    chart_frequency: "monthly",
    contribution_dimension: "asset_class",
    attribution_dimension: "asset_class",
    detail_basis: "NET",
    benchmark_code: "BMK_GLOBAL_BALANCED_60_40",
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
      portfolio_return_pct: 2.1,
      benchmark_return_pct: 1.8,
      active_return_pct: 0.3,
      annualized_return_pct: 2.1,
      benchmark_id: "BMK_GLOBAL_BALANCED_60_40",
      benchmark_return_source: "calculated",
    },
    gross_performance: {
      metric_basis: "GROSS",
      portfolio_return_pct: 2.3,
      benchmark_return_pct: 1.8,
      active_return_pct: 0.5,
      annualized_return_pct: 2.3,
      benchmark_id: "BMK_GLOBAL_BALANCED_60_40",
      benchmark_return_source: "calculated",
    },
    money_weighted_return: null,
    net_chart: [],
    gross_chart: [],
    contribution: null,
    attribution: null,
    warnings: [],
    partial_failures: [],
    ...overrides,
  };
}

describe("PerformanceWorkspaceClient", () => {
  afterEach(() => {
    replaceMock.mockReset();
    getWorkspaceClientMock.mockReset();
  });

  it("reuses cached workspace responses when switching back to a previously loaded control state", async () => {
    const threeYearWorkspace = buildWorkspace({
      period: "3Y",
      report_start_date: "2023-03-28",
      net_performance: {
        ...buildWorkspace().net_performance,
        portfolio_return_pct: 18.4,
      },
    });

    getWorkspaceClientMock.mockResolvedValueOnce(threeYearWorkspace);

    render(
      <PerformanceWorkspaceClient
        initialWorkspace={buildWorkspace()}
        initialPortfolioId="PF_1001"
        initialPeriod="YTD"
        initialDetailBasis="NET"
        initialContributionDimension="asset_class"
        initialAttributionDimension="asset_class"
        initialChartFrequency="monthly"
        initialBenchmark="BMK_GLOBAL_BALANCED_60_40"
      />
    );

    expect(screen.getByTestId("return")).toHaveTextContent("2.1");

    await act(async () => {
      screen.getByRole("button", { name: "Switch 3Y" }).click();
    });

    await waitFor(() => {
      expect(screen.getByTestId("period")).toHaveTextContent("3Y");
      expect(screen.getByTestId("return")).toHaveTextContent("18.4");
    });

    expect(getWorkspaceClientMock).toHaveBeenCalledTimes(1);

    await act(async () => {
      screen.getByRole("button", { name: "Switch YTD" }).click();
    });

    await waitFor(() => {
      expect(screen.getByTestId("period")).toHaveTextContent("YTD");
      expect(screen.getByTestId("return")).toHaveTextContent("2.1");
    });

    await act(async () => {
      screen.getByRole("button", { name: "Switch 3Y" }).click();
    });

    await waitFor(() => {
      expect(screen.getByTestId("period")).toHaveTextContent("3Y");
      expect(screen.getByTestId("return")).toHaveTextContent("18.4");
    });

    expect(getWorkspaceClientMock).toHaveBeenCalledTimes(1);
  });

  it("ignores stale responses when a newer interaction finishes later", async () => {
    let resolveThreeYear: ((value: WorkbenchPerformanceWorkspace) => void) | null = null;
    const threeYearPromise = new Promise<WorkbenchPerformanceWorkspace>((resolve) => {
      resolveThreeYear = resolve;
    });

    getWorkspaceClientMock
      .mockImplementationOnce(() => threeYearPromise)
      .mockResolvedValueOnce(buildWorkspace());

    render(
      <PerformanceWorkspaceClient
        initialWorkspace={buildWorkspace()}
        initialPortfolioId="PF_1001"
        initialPeriod="YTD"
        initialDetailBasis="NET"
        initialContributionDimension="asset_class"
        initialAttributionDimension="asset_class"
        initialChartFrequency="monthly"
        initialBenchmark="BMK_GLOBAL_BALANCED_60_40"
      />
    );

    await act(async () => {
      screen.getByRole("button", { name: "Switch 3Y" }).click();
    });

    await act(async () => {
      screen.getByRole("button", { name: "Switch YTD" }).click();
    });

    await waitFor(() => {
      expect(screen.getByTestId("period")).toHaveTextContent("YTD");
      expect(screen.getByTestId("return")).toHaveTextContent("2.1");
    });

    await act(async () => {
      resolveThreeYear?.(
        buildWorkspace({
          period: "3Y",
          report_start_date: "2023-03-28",
          net_performance: {
            ...buildWorkspace().net_performance,
            portfolio_return_pct: 18.4,
          },
        })
      );
      await threeYearPromise;
    });

    expect(screen.getByTestId("period")).toHaveTextContent("YTD");
    expect(screen.getByTestId("return")).toHaveTextContent("2.1");
  });
});
