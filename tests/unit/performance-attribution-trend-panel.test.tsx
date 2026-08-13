import React from "react";
import { fireEvent, render, screen, waitFor, within } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";

import PerformanceAttributionTrendPanel from "../../src/apps/performance/components/performance-attribution-trend-panel";
import { WorkbenchApiError } from "../../src/features/workbench/api-client";

const getTrendMock = vi.fn();

vi.mock("echarts-for-react", () => ({
  default: ({
    option,
    style,
  }: {
    option?: Record<string, unknown>;
    style?: React.CSSProperties;
  }) => (
    <div
      data-testid="performance-attribution-trend-chart"
      data-option={JSON.stringify(option)}
      style={style}
    />
  ),
}));

vi.mock("../../src/features/workbench/api", () => ({
  getWorkbenchPerformanceAttributionTrendClient: (...args: unknown[]) => getTrendMock(...args),
}));

describe("PerformanceAttributionTrendPanel", () => {
  afterEach(() => {
    getTrendMock.mockReset();
  });

  it("renders the attribution-over-time chart from the dedicated trend contract", async () => {
    getTrendMock.mockResolvedValue({
      correlation_id: "corr-performance",
      contract_version: "v1",
      portfolio_id: "PF_1001",
      as_of_date: "2026-03-27",
      period: "YTD",
      report_start_date: "2026-01-01",
      report_end_date: "2026-03-27",
      chart_frequency: "monthly",
      detail_basis: "NET",
      attribution_dimension: "asset_class",
      benchmark_code: "BMK_GLOBAL_BALANCED_60_40",
      rows: [
        {
          period_label: "2026-01",
          period_start: "2026-01-01",
          period_end: "2026-01-31",
          frequency: "monthly",
          allocation_pct: 0.12,
          selection_pct: 0.08,
          interaction_pct: 0.02,
          total_effect_pct: 0.22,
          cumulative_total_effect_pct: 0.22,
          active_return_pct: 0.22,
          residual_pct: 0,
        },
        {
          period_label: "2026-02",
          period_start: "2026-02-01",
          period_end: "2026-02-28",
          frequency: "monthly",
          allocation_pct: 0.09,
          selection_pct: 0.04,
          interaction_pct: -0.01,
          total_effect_pct: 0.12,
          cumulative_total_effect_pct: 0.34,
          active_return_pct: 0.13,
          residual_pct: 0.01,
        },
      ],
      warnings: [],
      partial_failures: [],
    });

    render(
      <PerformanceAttributionTrendPanel
        portfolioId="PF_1001"
        period="YTD"
        chartFrequency="monthly"
        attributionDimension="asset_class"
        detailBasis="NET"
        benchmark="BMK_GLOBAL_BALANCED_60_40"
        reportStartDate="2026-01-01"
        reportEndDate="2026-03-27"
      />,
    );

    expect(screen.getByText("Loading attribution effect trend.")).toBeInTheDocument();
    expect(
      document.querySelector(".performance-analysis-state-panel-loading .workbench-loading-state"),
    ).toBeTruthy();

    await waitFor(() => {
      expect(screen.getByRole("img", { name: "Attribution over time chart" })).toBeInTheDocument();
    });

    expect(
      document.querySelector(".performance-analysis-trend-shell.workbench-chart-shell"),
    ).toBeTruthy();
    expect(screen.queryByLabelText("Attribution trend context")).not.toBeInTheDocument();
    const trendSummaryStrip = screen.getByLabelText("Attribution trend summary strip");
    expect(trendSummaryStrip).toBeInTheDocument();
    expect(screen.getByText("Total Effect")).toBeInTheDocument();
    expect(screen.getByText("Cumulative Total")).toBeInTheDocument();
    expect(within(trendSummaryStrip).queryByText("Active Return")).not.toBeInTheDocument();
    expect(within(trendSummaryStrip).queryByText("Residual")).not.toBeInTheDocument();
    expect(screen.getByTestId("performance-attribution-trend-chart")).toBeInTheDocument();
    const chartOption = JSON.parse(
      screen.getByTestId("performance-attribution-trend-chart").getAttribute("data-option") ?? "{}",
    ) as {
      series?: Array<{
        barWidth?: number;
        smooth?: boolean;
        symbol?: string;
        symbolSize?: number;
        lineStyle?: { cap?: string; join?: string };
      }>;
      tooltip?: {
        backgroundColor?: string;
        textStyle?: { color?: string };
      };
    };
    expect(chartOption.series?.[0]?.barWidth).toBe(14);
    expect(chartOption.series?.[3]?.smooth).toBe(false);
    expect(chartOption.series?.[3]?.symbol).toBe("circle");
    expect(chartOption.series?.[3]?.symbolSize).toBe(6);
    expect(chartOption.series?.[3]?.lineStyle).toMatchObject({
      cap: "round",
      join: "round",
    });
    expect(chartOption.tooltip?.backgroundColor).toBe("rgba(255, 255, 255, 0.98)");
    expect(chartOption.tooltip?.textStyle?.color).toBe("#172033");
    const trendTable = screen.getByLabelText("Attribution trend table");
    expect(within(trendTable).getByText("Allocation")).toBeInTheDocument();
    expect(within(trendTable).getByText("Selection")).toBeInTheDocument();
    expect(within(trendTable).getByText("Interaction")).toBeInTheDocument();
    expect(within(trendTable).getByText("Cumulative Effect")).toBeInTheDocument();
    expect(within(trendTable).getByText("Residual")).toBeInTheDocument();
    expect(within(trendTable).getByText("2026-01")).toBeInTheDocument();
    expect(within(trendTable).getByText("2026-02")).toBeInTheDocument();
    expect(getTrendMock).toHaveBeenCalledWith("PF_1001", {
      period: "YTD",
      chartFrequency: "monthly",
      attributionDimension: "asset_class",
      detailBasis: "NET",
      benchmark: "BMK_GLOBAL_BALANCED_60_40",
      reportStartDate: "2026-01-01",
      reportEndDate: "2026-03-27",
    });
  });

  it("renders a shared unavailable panel when the trend contract returns no rows", async () => {
    getTrendMock.mockResolvedValue({
      correlation_id: "corr-performance",
      contract_version: "v1",
      portfolio_id: "PF_1001",
      as_of_date: "2026-03-27",
      period: "YTD",
      report_start_date: "2026-01-01",
      report_end_date: "2026-03-27",
      chart_frequency: "monthly",
      detail_basis: "NET",
      attribution_dimension: "asset_class",
      benchmark_code: null,
      rows: [],
      warnings: [],
      partial_failures: [],
    });

    render(
      <PerformanceAttributionTrendPanel
        portfolioId="PF_1001"
        period="YTD"
        chartFrequency="monthly"
        attributionDimension="asset_class"
        detailBasis="NET"
      />,
    );

    await waitFor(() => {
      expect(screen.getByText("Attribution trend unavailable")).toBeInTheDocument();
    });

    expect(
      screen.getByText("Attribution trend is not available for the current selection."),
    ).toBeInTheDocument();
    expect(
      document.querySelector(".performance-analysis-state-panel-unavailable .module-state-panel"),
    ).toBeTruthy();
  });

  it("renders one published observation without implying a time trend", async () => {
    getTrendMock.mockResolvedValue(buildTrendContract());

    render(<PerformanceAttributionTrendPanel {...buildProps()} />);

    expect(
      await screen.findByRole("heading", { name: "Attribution Observation" }),
    ).toBeInTheDocument();
    expect(screen.getByText("One published observation")).toBeInTheDocument();
    expect(
      screen.getByText(/A time trend requires at least two published observations/),
    ).toBeInTheDocument();
    expect(screen.getByLabelText("Attribution observation table")).toBeInTheDocument();
    expect(
      screen.queryByRole("img", { name: "Attribution over time chart" }),
    ).not.toBeInTheDocument();
    expect(screen.queryByLabelText("Attribution trend table")).not.toBeInTheDocument();
  });

  it("keeps request failure distinct from source-confirmed absence and retries the exact selection", async () => {
    getTrendMock
      .mockRejectedValueOnce(new WorkbenchApiError("performance attribution trend", 503))
      .mockResolvedValueOnce(buildTrendContract());

    render(<PerformanceAttributionTrendPanel {...buildProps()} />);

    const failure = await screen.findByRole("alert");
    expect(failure).toHaveTextContent("Attribution history could not be refreshed");
    expect(failure).toHaveTextContent("Source response 503");
    expect(screen.queryByText("Attribution trend unavailable")).not.toBeInTheDocument();

    const refresh = screen.getByRole("button", { name: "Refresh history" });
    refresh.focus();
    fireEvent.click(refresh);

    expect(screen.getByRole("button", { name: "Refreshing…" })).toHaveFocus();
    expect(screen.getByRole("button", { name: "Refreshing…" })).toHaveAttribute(
      "aria-disabled",
      "true",
    );
    expect(
      await screen.findByRole("heading", { name: "Attribution Observation" }),
    ).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Refresh history" })).toHaveFocus();
    expect(getTrendMock).toHaveBeenCalledTimes(2);
    expect(getTrendMock.mock.calls[1]).toEqual(getTrendMock.mock.calls[0]);
  });

  it("fails permission blocks closed without exposing a retry", async () => {
    getTrendMock.mockRejectedValue(new WorkbenchApiError("performance attribution trend", 403));

    render(<PerformanceAttributionTrendPanel {...buildProps()} />);

    const failure = await screen.findByRole("alert");
    expect(failure).toHaveTextContent("Attribution history restricted");
    expect(failure).toHaveTextContent("Source response 403");
    expect(screen.queryByRole("button", { name: "Refresh history" })).not.toBeInTheDocument();
    expect(screen.getByRole("button", { name: "History restricted" })).toHaveAttribute(
      "aria-disabled",
      "true",
    );
  });

  it("does not let an obsolete request replace newer trend evidence", async () => {
    let resolveObsolete!: (value: ReturnType<typeof buildTrendContract>) => void;
    getTrendMock
      .mockReturnValueOnce(
        new Promise((resolve) => {
          resolveObsolete = resolve;
        }),
      )
      .mockResolvedValueOnce(
        buildTrendContract({
          period: "1Y",
          rows: [
            {
              ...buildTrendContract().rows[0],
              period_label: "Current evidence",
            },
          ],
        }),
      );

    const { rerender } = render(<PerformanceAttributionTrendPanel {...buildProps()} />);
    rerender(<PerformanceAttributionTrendPanel {...buildProps({ period: "1Y" })} />);

    expect(await screen.findByText("Current evidence")).toBeInTheDocument();
    resolveObsolete(
      buildTrendContract({
        rows: [
          {
            ...buildTrendContract().rows[0],
            period_label: "Obsolete evidence",
          },
        ],
      }),
    );

    await waitFor(() => {
      expect(screen.queryByText("Obsolete evidence")).not.toBeInTheDocument();
    });
    expect(screen.getByText("Current evidence")).toBeInTheDocument();
  });

  it("shows a normalization notice when the trend endpoint adjusts unsupported controls", async () => {
    getTrendMock.mockResolvedValue({
      correlation_id: "corr-performance",
      contract_version: "v1",
      portfolio_id: "PF_1001",
      as_of_date: "2026-03-27",
      period: "YTD",
      report_start_date: "2026-01-01",
      report_end_date: "2026-03-27",
      chart_frequency: "monthly",
      detail_basis: "NET",
      attribution_dimension: "asset_class",
      requested_chart_frequency_supported: false,
      requested_attribution_dimension_supported: false,
      benchmark_code: "BMK_GLOBAL_BALANCED_60_40",
      rows: [
        {
          period_label: "2026-01",
          period_start: "2026-01-01",
          period_end: "2026-01-31",
          frequency: "monthly",
          allocation_pct: 0.12,
          selection_pct: 0.08,
          interaction_pct: 0.02,
          total_effect_pct: 0.22,
          cumulative_total_effect_pct: 0.22,
          active_return_pct: 0.22,
          residual_pct: 0,
        },
      ],
      warnings: [
        "PERFORMANCE_ATTRIBUTION_TREND_CHART_FREQUENCY_NORMALIZED",
        "PERFORMANCE_ATTRIBUTION_TREND_DIMENSION_NORMALIZED",
      ],
      partial_failures: [],
    });

    render(
      <PerformanceAttributionTrendPanel
        portfolioId="PF_1001"
        period="YTD"
        chartFrequency="weekly"
        attributionDimension="issuer"
        detailBasis="NET"
        benchmark="BMK_GLOBAL_BALANCED_60_40"
        reportStartDate="2026-01-01"
        reportEndDate="2026-03-27"
      />,
    );

    const notice = await screen.findByRole("status", {
      name: "Attribution trend normalization",
    });
    expect(notice).toHaveTextContent("Selection adjusted");
    expect(notice).toHaveTextContent("frequency reset to Monthly");
    expect(notice).toHaveTextContent("segment reset to Asset Class");
  });

  it("pushes resolved trend controls back through the shared request handler", async () => {
    const onRequestChange = vi.fn();
    getTrendMock.mockResolvedValue({
      correlation_id: "corr-performance",
      contract_version: "v1",
      portfolio_id: "PF_1001",
      as_of_date: "2026-03-27",
      period: "YTD",
      report_start_date: "2026-01-01",
      report_end_date: "2026-03-27",
      chart_frequency: "monthly",
      detail_basis: "NET",
      attribution_dimension: "asset_class",
      requested_chart_frequency_supported: false,
      requested_attribution_dimension_supported: false,
      benchmark_code: "BMK_GLOBAL_BALANCED_60_40",
      rows: [
        {
          period_label: "2026-01",
          period_start: "2026-01-01",
          period_end: "2026-01-31",
          frequency: "monthly",
          allocation_pct: 0.12,
          selection_pct: 0.08,
          interaction_pct: 0.02,
          total_effect_pct: 0.22,
          cumulative_total_effect_pct: 0.22,
          active_return_pct: 0.22,
          residual_pct: 0,
        },
      ],
      warnings: [],
      partial_failures: [],
    });

    render(
      <PerformanceAttributionTrendPanel
        portfolioId="PF_1001"
        period="YTD"
        chartFrequency="weekly"
        attributionDimension="issuer"
        detailBasis="NET"
        benchmark="BMK_GLOBAL_BALANCED_60_40"
        reportStartDate="2026-01-01"
        reportEndDate="2026-03-27"
        onRequestChange={onRequestChange}
      />,
    );

    await waitFor(() => {
      expect(onRequestChange).toHaveBeenCalledWith({
        chartFrequency: "monthly",
        attributionDimension: "asset_class",
      });
    });
  });
});

function buildProps(
  overrides: Partial<React.ComponentProps<typeof PerformanceAttributionTrendPanel>> = {},
) {
  return {
    portfolioId: "PF_1001",
    period: "YTD",
    chartFrequency: "monthly",
    attributionDimension: "asset_class",
    detailBasis: "NET",
    benchmark: "BMK_GLOBAL_BALANCED_60_40",
    reportStartDate: "2026-01-01",
    reportEndDate: "2026-03-27",
    ...overrides,
  };
}

function buildTrendContract(overrides: Partial<Awaited<ReturnType<typeof getTrendMock>>> = {}) {
  return {
    correlation_id: "corr-performance",
    contract_version: "v1",
    portfolio_id: "PF_1001",
    as_of_date: "2026-03-27",
    period: "YTD",
    report_start_date: "2026-01-01",
    report_end_date: "2026-03-27",
    chart_frequency: "monthly",
    detail_basis: "NET",
    attribution_dimension: "asset_class",
    benchmark_code: "BMK_GLOBAL_BALANCED_60_40",
    rows: [
      {
        period_label: "2026-01",
        period_start: "2026-01-01",
        period_end: "2026-01-31",
        frequency: "monthly",
        allocation_pct: 0.12,
        selection_pct: 0.08,
        interaction_pct: 0.02,
        total_effect_pct: 0.22,
        cumulative_total_effect_pct: 0.22,
        active_return_pct: 0.22,
        residual_pct: 0,
      },
    ],
    warnings: [],
    partial_failures: [],
    ...overrides,
  };
}
