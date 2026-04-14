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
    mode,
    onModeChange,
    period,
    onRequestChange,
    isUpdating,
    isDetailsPending,
  }: {
    workspace: WorkbenchPerformanceWorkspace | null;
    mode: string;
    onModeChange?: (mode: "summary" | "analysis" | "advisor" | "risk") => void;
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
      <div data-testid="mode">{mode}</div>
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
      <button type="button" onClick={() => onModeChange?.("analysis")}>
        Switch Analysis Mode
      </button>
      <button type="button" onClick={() => onModeChange?.("risk")}>
        Switch Risk Mode
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

  it("treats summary-only first paint as detail-pending and hydrates details after mount", async () => {
    let resolveDetails:
      | ((value: WorkbenchPerformanceWorkspaceDetails) => void)
      | null = null;
    const detailsPromise = new Promise<WorkbenchPerformanceWorkspaceDetails>((resolve) => {
      resolveDetails = resolve;
    });
    getDetailsClientMock.mockImplementationOnce(() => detailsPromise);

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
      expect(screen.getByTestId("return")).toHaveTextContent(DEFAULT_PORTFOLIO_RETURN);
      expect(screen.getByTestId("details-pending")).toHaveTextContent("true");
    });

    expect(getDetailsClientMock).toHaveBeenCalledTimes(1);
    expect(getSummaryClientMock).not.toHaveBeenCalled();

    await act(async () => {
      resolveDetails?.(buildDetails());
      await detailsPromise;
    });

    await waitFor(() => {
      expect(screen.getByTestId("chart-points")).toHaveTextContent("1");
      expect(screen.getByTestId("details-pending")).toHaveTextContent("false");
    });
  });

  it("normalizes stale initial detail dimensions during first client hydration", async () => {
    const baseDetails = buildDetails();
    const degradedInitialDetails = buildDetails({
      contribution_dimension: "country",
      attribution_dimension: "country",
      segment: "country",
      net_chart: [],
      contribution: {
        ...baseDetails.contribution!,
        position_rows: [],
      },
      attribution: null,
      partial_failures: [
        {
          source_service: "lotus-performance",
          error_code: "HTTP_422",
          detail: "Benchmark component missing classification label for country.",
        },
      ],
      capabilities: {
        ...baseDetails.capabilities!,
        return_path: {
          ...baseDetails.capabilities!.return_path,
          state: "unavailable",
          reason: "Published return observations are not available for the selected horizon.",
        },
        contribution_ranking: {
          ...baseDetails.capabilities!.contribution_ranking,
          state: "partial",
          reason: "Contribution exists, but only aggregate rows are available.",
        },
        attribution_detail: {
          ...baseDetails.capabilities!.attribution_detail,
          state: "unavailable",
          reason: "Attribution detail is not available for the current selection.",
        },
      },
    });
    const normalizedDetails = buildDetails();

    getDetailsClientMock
      .mockResolvedValueOnce(degradedInitialDetails)
      .mockResolvedValueOnce(normalizedDetails);

    render(
      <PerformanceWorkspaceClient
        initialSummary={buildSummary()}
        initialPortfolioId="PF_1001"
        initialPeriod="YTD"
        initialDetailBasis="NET"
        initialContributionDimension="country"
        initialAttributionDimension="country"
        initialChartFrequency="monthly"
        initialBenchmark="BMK_GLOBAL_BALANCED_60_40"
      />
    );

    await waitFor(() => {
      expect(screen.getByTestId("chart-points")).toHaveTextContent("1");
      expect(screen.getByTestId("details-pending")).toHaveTextContent("false");
    });

    expect(getDetailsClientMock).toHaveBeenCalledTimes(2);
    expect(getDetailsClientMock.mock.calls[0]?.[1]).toMatchObject({
      contributionDimension: "country",
      attributionDimension: "country",
    });
    expect(getDetailsClientMock.mock.calls[1]?.[1]).toMatchObject({
      contributionDimension: "asset_class",
      attributionDimension: "asset_class",
    });
    expect(replaceMock).toHaveBeenCalledWith(
      "/performance?portfolioId=PF_1001&period=YTD&detailBasis=NET&contributionDimension=asset_class&attributionDimension=asset_class&chartFrequency=monthly&benchmark=BMK_GLOBAL_BALANCED_60_40",
      { scroll: false }
    );
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

  it("updates the route immediately for mode switches without refetching summary or details", async () => {
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
      expect(screen.getByTestId("mode")).toHaveTextContent("summary");
      expect(screen.getByTestId("details-pending")).toHaveTextContent("false");
    });

    await act(async () => {
      screen.getByRole("button", { name: "Switch Analysis Mode" }).click();
    });

    await waitFor(() => {
      expect(screen.getByTestId("mode")).toHaveTextContent("analysis");
    });

    expect(replaceMock).toHaveBeenLastCalledWith(
      "/performance?portfolioId=PF_1001&mode=analysis&period=YTD&detailBasis=NET&contributionDimension=asset_class&attributionDimension=asset_class&chartFrequency=monthly&benchmark=BMK_GLOBAL_BALANCED_60_40",
      { scroll: false }
    );
    expect(getSummaryClientMock).not.toHaveBeenCalled();
    expect(getDetailsClientMock).not.toHaveBeenCalled();

    await act(async () => {
      screen.getByRole("button", { name: "Switch Risk Mode" }).click();
    });

    await waitFor(() => {
      expect(screen.getByTestId("mode")).toHaveTextContent("risk");
    });

    expect(replaceMock).toHaveBeenLastCalledWith(
      "/performance?portfolioId=PF_1001&mode=risk&period=YTD&detailBasis=NET&contributionDimension=asset_class&attributionDimension=asset_class&chartFrequency=monthly&benchmark=BMK_GLOBAL_BALANCED_60_40",
      { scroll: false }
    );
    expect(getSummaryClientMock).not.toHaveBeenCalled();
    expect(getDetailsClientMock).not.toHaveBeenCalled();
  });
});
