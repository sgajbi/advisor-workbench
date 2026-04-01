import React from "react";
import { act, render, screen, waitFor } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";

import type {
  WorkbenchPerformanceWorkspaceDetails,
  WorkbenchPerformanceWorkspaceSummary,
  WorkbenchPerformanceWorkspace,
} from "../../src/features/workbench/types";
import PerformanceWorkspaceClient from "../../src/apps/performance/components/performance-workspace-client";
import {
  buildPerformanceWorkspaceDetails,
  buildPerformanceWorkspaceSummary,
} from "../fixtures/performance-workspace-fixtures";

const replaceMock = vi.fn();
const getSummaryClientMock = vi.fn();
const getDetailsClientMock = vi.fn();
const DEFAULT_PORTFOLIO_RETURN = String(
  buildPerformanceWorkspaceSummary().net_performance.portfolio_return_pct
);

vi.mock("next/navigation", () => ({
  useRouter: () => ({
    replace: replaceMock,
  }),
}));

vi.mock("../../src/features/workbench/api", () => ({
  getWorkbenchPerformanceWorkspaceSummaryClient: (...args: unknown[]) =>
    getSummaryClientMock(...args),
  getWorkbenchPerformanceWorkspaceDetailsClient: (...args: unknown[]) =>
    getDetailsClientMock(...args),
}));

vi.mock("../../src/apps/performance/components/performance-workspace-view", () => ({
  default: ({
    workspace,
    period,
    onRequestChange,
    isUpdating,
    isDetailsPending,
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
    isDetailsPending?: boolean;
  }) => (
    <div>
      <div data-testid="period">{period}</div>
      <div data-testid="return">
        {workspace?.net_performance.portfolio_return_pct ?? "none"}
      </div>
      <div data-testid="chart-points">{workspace?.net_chart.length ?? 0}</div>
      <div data-testid="updating">{String(Boolean(isUpdating))}</div>
      <div data-testid="details-pending">{String(Boolean(isDetailsPending))}</div>
      <button type="button" onClick={() => onRequestChange?.({ period: "3Y" })}>
        Switch 3Y
      </button>
      <button type="button" onClick={() => onRequestChange?.({ period: "YTD" })}>
        Switch YTD
      </button>
      <button
        type="button"
        onClick={() => onRequestChange?.({ contributionDimension: "sector" })}
      >
        Switch Contribution Segment
      </button>
    </div>
  ),
}));

function buildSummary(
  overrides: Partial<WorkbenchPerformanceWorkspaceSummary> = {}
): WorkbenchPerformanceWorkspaceSummary {
  return {
    ...buildPerformanceWorkspaceSummary(),
    ...overrides,
  };
}

function buildDetails(
  overrides: Partial<WorkbenchPerformanceWorkspaceDetails> = {}
): WorkbenchPerformanceWorkspaceDetails {
  return {
    ...buildPerformanceWorkspaceDetails(),
    ...overrides,
  };
}

describe("PerformanceWorkspaceClient", () => {
  afterEach(() => {
    replaceMock.mockReset();
    getSummaryClientMock.mockReset();
    getDetailsClientMock.mockReset();
  });

  it("reuses cached summary and detail responses when switching back to a previously loaded control state", async () => {
    const threeYearSummary = buildSummary({
      period: "3Y",
      report_start_date: "2023-03-28",
      net_performance: {
        ...buildSummary().net_performance,
        portfolio_return_pct: 18.4,
      },
    });
    const threeYearDetails = buildDetails({
      period: "3Y",
      report_start_date: "2023-03-28",
      net_chart: [
        {
          ...buildDetails().net_chart[0],
          label: "2026-03",
          cumulative_portfolio_return_pct: 18.4,
        },
      ],
    });

    getDetailsClientMock
      .mockResolvedValueOnce(buildDetails())
      .mockResolvedValueOnce(threeYearDetails);
    getSummaryClientMock.mockResolvedValueOnce(threeYearSummary);

    render(
      <PerformanceWorkspaceClient
        initialSummary={buildSummary()}
        initialPortfolioId="PF_1001"
        initialPeriod="YTD"
        initialDetailBasis="NET"
        initialContributionDimension="asset_class"
        initialAttributionDimension="asset_class"
        initialChartFrequency="monthly"
        initialBenchmark="BMK_GLOBAL_BALANCED_60_40"
      />
    );

    await waitFor(() => {
      expect(screen.getByTestId("chart-points")).toHaveTextContent("1");
    });

    expect(screen.getByTestId("return")).toHaveTextContent(DEFAULT_PORTFOLIO_RETURN);

    await act(async () => {
      screen.getByRole("button", { name: "Switch 3Y" }).click();
    });

    await waitFor(() => {
      expect(screen.getByTestId("period")).toHaveTextContent("3Y");
      expect(screen.getByTestId("return")).toHaveTextContent("18.4");
    });

    expect(getSummaryClientMock).toHaveBeenCalledTimes(1);
    expect(getDetailsClientMock).toHaveBeenCalledTimes(2);

    await act(async () => {
      screen.getByRole("button", { name: "Switch YTD" }).click();
    });

    await waitFor(() => {
      expect(screen.getByTestId("period")).toHaveTextContent("YTD");
      expect(screen.getByTestId("return")).toHaveTextContent(DEFAULT_PORTFOLIO_RETURN);
    });

    await act(async () => {
      screen.getByRole("button", { name: "Switch 3Y" }).click();
    });

    await waitFor(() => {
      expect(screen.getByTestId("period")).toHaveTextContent("3Y");
      expect(screen.getByTestId("return")).toHaveTextContent("18.4");
    });

    expect(getSummaryClientMock).toHaveBeenCalledTimes(1);
    expect(getDetailsClientMock).toHaveBeenCalledTimes(2);
  });

  it("uses server-provided initial details without an immediate client refetch", async () => {
    render(
      <PerformanceWorkspaceClient
        initialSummary={buildSummary()}
        initialDetails={buildDetails()}
        initialPortfolioId="PF_1001"
        initialPeriod="YTD"
        initialDetailBasis="NET"
        initialContributionDimension="asset_class"
        initialAttributionDimension="asset_class"
        initialChartFrequency="monthly"
        initialBenchmark="BMK_GLOBAL_BALANCED_60_40"
      />
    );

    await waitFor(() => {
      expect(screen.getByTestId("chart-points")).toHaveTextContent("1");
      expect(screen.getByTestId("details-pending")).toHaveTextContent("false");
    });

    expect(getDetailsClientMock).not.toHaveBeenCalled();
    expect(getSummaryClientMock).not.toHaveBeenCalled();
  });

  it("normalizes stale initial control params to the server-resolved detail controls", async () => {
    render(
      <PerformanceWorkspaceClient
        initialSummary={buildSummary({
          chart_frequency: "monthly",
        })}
        initialDetails={buildDetails({
          contribution_dimension: "asset_class",
          attribution_dimension: "asset_class",
          chart_frequency: "monthly",
        })}
        initialPortfolioId="PF_1001"
        initialPeriod="YTD"
        initialDetailBasis="NET"
        initialContributionDimension="currency"
        initialAttributionDimension="issuer"
        initialChartFrequency="weekly"
        initialBenchmark="BMK_GLOBAL_BALANCED_60_40"
      />
    );

    await waitFor(() => {
      expect(replaceMock).toHaveBeenCalledWith(
        "/performance?portfolioId=PF_1001&period=YTD&detailBasis=NET&contributionDimension=asset_class&attributionDimension=asset_class&chartFrequency=monthly&benchmark=BMK_GLOBAL_BALANCED_60_40",
        { scroll: false }
      );
    });
    expect(getDetailsClientMock).not.toHaveBeenCalled();
    expect(getSummaryClientMock).not.toHaveBeenCalled();
  });

  it("ignores stale responses when a newer interaction finishes later", async () => {
    let resolveThreeYearSummary:
      | ((value: WorkbenchPerformanceWorkspaceSummary) => void)
      | null = null;
    let resolveThreeYearDetails:
      | ((value: WorkbenchPerformanceWorkspaceDetails) => void)
      | null = null;
    const threeYearSummaryPromise = new Promise<WorkbenchPerformanceWorkspaceSummary>(
      (resolve) => {
        resolveThreeYearSummary = resolve;
      }
    );
    const threeYearDetailsPromise = new Promise<WorkbenchPerformanceWorkspaceDetails>(
      (resolve) => {
        resolveThreeYearDetails = resolve;
      }
    );

    getDetailsClientMock
      .mockResolvedValueOnce(buildDetails())
      .mockImplementationOnce(() => threeYearDetailsPromise);
    getSummaryClientMock
      .mockImplementationOnce(() => threeYearSummaryPromise)
      .mockResolvedValueOnce(buildSummary());

    render(
      <PerformanceWorkspaceClient
        initialSummary={buildSummary()}
        initialPortfolioId="PF_1001"
        initialPeriod="YTD"
        initialDetailBasis="NET"
        initialContributionDimension="asset_class"
        initialAttributionDimension="asset_class"
        initialChartFrequency="monthly"
        initialBenchmark="BMK_GLOBAL_BALANCED_60_40"
      />
    );

    await waitFor(() => {
      expect(screen.getByTestId("chart-points")).toHaveTextContent("1");
    });

    await act(async () => {
      screen.getByRole("button", { name: "Switch 3Y" }).click();
    });

    await act(async () => {
      screen.getByRole("button", { name: "Switch YTD" }).click();
    });

    await waitFor(() => {
      expect(screen.getByTestId("period")).toHaveTextContent("YTD");
      expect(screen.getByTestId("return")).toHaveTextContent(DEFAULT_PORTFOLIO_RETURN);
    });

    await act(async () => {
      resolveThreeYearSummary?.(
        buildSummary({
          period: "3Y",
          report_start_date: "2023-03-28",
          net_performance: {
            ...buildSummary().net_performance,
            portfolio_return_pct: 18.4,
          },
        })
      );
      resolveThreeYearDetails?.(
        buildDetails({
          period: "3Y",
          report_start_date: "2023-03-28",
        })
      );
      await Promise.all([threeYearSummaryPromise, threeYearDetailsPromise]);
    });

    expect(screen.getByTestId("period")).toHaveTextContent("YTD");
    expect(screen.getByTestId("return")).toHaveTextContent(DEFAULT_PORTFOLIO_RETURN);
  });

  it("refreshes only the details contract for analytic-only control changes", async () => {
    getDetailsClientMock
      .mockResolvedValueOnce(buildDetails())
      .mockResolvedValueOnce(
        buildDetails({
          contribution_dimension: "sector",
          segment: "sector",
        })
      );

    render(
      <PerformanceWorkspaceClient
        initialSummary={buildSummary()}
        initialPortfolioId="PF_1001"
        initialPeriod="YTD"
        initialDetailBasis="NET"
        initialContributionDimension="asset_class"
        initialAttributionDimension="asset_class"
        initialChartFrequency="monthly"
        initialBenchmark="BMK_GLOBAL_BALANCED_60_40"
      />
    );

    await waitFor(() => {
      expect(screen.getByTestId("chart-points")).toHaveTextContent("1");
    });

    await act(async () => {
      screen.getByRole("button", { name: "Switch Contribution Segment" }).click();
    });

    await waitFor(() => {
      expect(screen.getByTestId("details-pending")).toHaveTextContent("false");
    });

    expect(getSummaryClientMock).not.toHaveBeenCalled();
    expect(getDetailsClientMock).toHaveBeenCalledTimes(2);
    expect(replaceMock).toHaveBeenCalledTimes(1);
  });

  it("preserves the previous analytical canvas while new details are loading", async () => {
    let resolveThreeYearSummary:
      | ((value: WorkbenchPerformanceWorkspaceSummary) => void)
      | null = null;
    let resolveThreeYearDetails:
      | ((value: WorkbenchPerformanceWorkspaceDetails) => void)
      | null = null;

    const threeYearSummaryPromise = new Promise<WorkbenchPerformanceWorkspaceSummary>((resolve) => {
      resolveThreeYearSummary = resolve;
    });
    const threeYearDetailsPromise = new Promise<WorkbenchPerformanceWorkspaceDetails>((resolve) => {
      resolveThreeYearDetails = resolve;
    });

    getDetailsClientMock
      .mockResolvedValueOnce(buildDetails())
      .mockImplementationOnce(() => threeYearDetailsPromise);
    getSummaryClientMock.mockImplementationOnce(() => threeYearSummaryPromise);

    render(
      <PerformanceWorkspaceClient
        initialSummary={buildSummary()}
        initialPortfolioId="PF_1001"
        initialPeriod="YTD"
        initialDetailBasis="NET"
        initialContributionDimension="asset_class"
        initialAttributionDimension="asset_class"
        initialChartFrequency="monthly"
        initialBenchmark="BMK_GLOBAL_BALANCED_60_40"
      />
    );

    await waitFor(() => {
      expect(screen.getByTestId("chart-points")).toHaveTextContent("1");
    });

    await act(async () => {
      screen.getByRole("button", { name: "Switch 3Y" }).click();
    });

    await waitFor(() => {
      expect(screen.getByTestId("period")).toHaveTextContent("3Y");
      expect(screen.getByTestId("return")).toHaveTextContent(DEFAULT_PORTFOLIO_RETURN);
      expect(screen.getByTestId("chart-points")).toHaveTextContent("1");
      expect(screen.getByTestId("details-pending")).toHaveTextContent("true");
    });

    await act(async () => {
      resolveThreeYearSummary?.(
        buildSummary({
          period: "3Y",
          report_start_date: "2023-03-28",
          net_performance: {
            ...buildSummary().net_performance,
            portfolio_return_pct: 18.4,
          },
        })
      );
      resolveThreeYearDetails?.(
        buildDetails({
          period: "3Y",
          report_start_date: "2023-03-28",
          net_chart: [
            {
              ...buildDetails().net_chart[0],
              label: "2026-03",
              cumulative_portfolio_return_pct: 18.4,
            },
          ],
        })
      );
      await Promise.all([threeYearSummaryPromise, threeYearDetailsPromise]);
    });

    await waitFor(() => {
      expect(screen.getByTestId("return")).toHaveTextContent("18.4");
      expect(screen.getByTestId("details-pending")).toHaveTextContent("false");
    });
  });
});
