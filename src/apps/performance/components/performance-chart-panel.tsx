"use client";

import { FormEvent, useEffect, useMemo, useState } from "react";
import ReactECharts from "echarts-for-react";
import type { EChartsOption } from "echarts";
import {
  Box,
  Button,
  Stack,
  TextField,
  ToggleButton,
  ToggleButtonGroup,
  Typography,
} from "@mui/material";

import {
  AnalyticsTable,
  WorkbenchChartShell,
  WorkbenchSegmentedControl,
  WorkbenchSummaryMetricStrip,
} from "@/design-system";
import type { PerformanceWorkspaceCapabilities } from "../capabilities";
import type {
  PerformanceBenchmarkOptionView,
  PerformanceChartPoint,
} from "@/features/workbench/types";

import { formatDate } from "../formatters";
import { BASIS_OPTIONS, CHART_FREQUENCY_OPTIONS, PERIOD_OPTIONS } from "../navigation";
import PerformanceCapabilityNotice from "./performance-capability-notice";
import { buildPerformanceReturnPathTableModel } from "./performance-analytics-table-models";
import { isCapabilityOptionSupported } from "./performance-capability-options";
import PerformanceChartContextStrip from "./performance-chart-context-strip";
import { getPerformanceReturnPathPresentation } from "./performance-summary-context-helpers";

type PerformanceControlPatch = {
  portfolioId?: string;
  period?: string;
  detailBasis?: string;
  contributionDimension?: string;
  attributionDimension?: string;
  chartFrequency?: string;
  benchmark?: string;
  reportStartDate?: string;
  reportEndDate?: string;
};

type ComparativeSummary = {
  portfolio_return_pct: number | null;
  benchmark_return_pct: number | null;
  active_return_pct: number | null;
  annualized_return_pct?: number | null;
  end_market_value?: number | null;
  net_cash_flow?: number | null;
  benchmark_return_source?: string | null;
};

type PerformanceChartViewMode = "combined" | "absolute" | "relative";

const CHART_COLORS = {
  portfolio: "#da1e28",
  benchmark: "#2d3748",
  active: "#315d8a",
  portfolioBar: "rgba(218, 30, 40, 0.18)",
  benchmarkBar: "rgba(45, 55, 72, 0.16)",
  activeBar: "rgba(49, 93, 138, 0.18)",
};

function toNumeric(value: number | null | undefined): number | null {
  return value === null || value === undefined || Number.isNaN(value) ? null : value;
}

function buildPercentAxisBounds(values: Array<number | null | undefined>) {
  const numericValues = values
    .map((value) => toNumeric(value))
    .filter((value): value is number => value !== null);

  if (!numericValues.length) {
    return { min: -1, max: 1 };
  }

  const rawMin = Math.min(...numericValues, 0);
  const rawMax = Math.max(...numericValues, 0);
  const spread = rawMax - rawMin || 1;
  const padding = Math.max(spread * 0.12, 1);

  return {
    min: Math.floor((rawMin - padding) * 10) / 10,
    max: Math.ceil((rawMax + padding) * 10) / 10,
  };
}

function resolveReportDates(
  points: PerformanceChartPoint[],
  reportStartDate?: string,
  reportEndDate?: string
) {
  const fallbackStartDate =
    points.find((point) => point.period_start)?.period_start ??
    points.find((point) => point.period_end)?.period_end ??
    "";
  const fallbackEndDate =
    [...points].reverse().find((point) => point.period_end)?.period_end ??
    [...points].reverse().find((point) => point.period_start)?.period_start ??
    fallbackStartDate;

  return {
    startDate: reportStartDate || fallbackStartDate,
    endDate: reportEndDate || fallbackEndDate,
  };
}

export default function PerformanceChartPanel({
  title,
  points,
  summary,
  portfolioId,
  period,
  detailBasis,
  contributionDimension,
  attributionDimension,
  chartFrequency,
  benchmark,
  benchmarkOptions = [],
  reportingCurrency,
  reportStartDate,
  reportEndDate,
  capabilities,
  onRequestChange,
  isUpdating = false,
  isDetailsPending = false,
  id,
}: {
  title: string;
  points: PerformanceChartPoint[];
  summary: ComparativeSummary;
  portfolioId: string;
  period: string;
  detailBasis: string;
  contributionDimension: string;
  attributionDimension: string;
  chartFrequency: string;
  benchmark?: string;
  benchmarkOptions?: PerformanceBenchmarkOptionView[];
  reportingCurrency: string;
  reportStartDate: string;
  reportEndDate: string;
  capabilities: PerformanceWorkspaceCapabilities;
  onRequestChange: (patch: PerformanceControlPatch) => void;
  isUpdating?: boolean;
  isDetailsPending?: boolean;
  id?: string;
}) {
  const resolvedReportDates = useMemo(
    () => resolveReportDates(points, reportStartDate, reportEndDate),
    [points, reportEndDate, reportStartDate]
  );
  const [fromDate, setFromDate] = useState(resolvedReportDates.startDate);
  const [toDate, setToDate] = useState(resolvedReportDates.endDate);
  const hasBenchmarkSeries = points.some(
    (point) =>
      point.benchmark_return_pct !== null || point.cumulative_benchmark_return_pct !== null
  );
  const hasActiveSeries = points.some(
    (point) => point.active_return_pct !== null || point.cumulative_active_return_pct !== null
  );
  const [chartViewMode, setChartViewMode] = useState<PerformanceChartViewMode>(
    hasBenchmarkSeries && hasActiveSeries ? "combined" : "absolute"
  );

  useEffect(() => {
    setFromDate(resolvedReportDates.startDate);
    setToDate(resolvedReportDates.endDate);
  }, [resolvedReportDates.endDate, resolvedReportDates.startDate]);

  useEffect(() => {
    if (chartViewMode === "relative" && !hasActiveSeries) {
      setChartViewMode(hasBenchmarkSeries ? "combined" : "absolute");
      return;
    }
    if (chartViewMode === "combined" && !hasBenchmarkSeries) {
      setChartViewMode("absolute");
    }
  }, [chartViewMode, hasActiveSeries, hasBenchmarkSeries]);
  const resolvedBenchmarkOptions = useMemo(() => {
    if (benchmarkOptions.length > 0) {
      return benchmarkOptions;
    }
    if (!benchmark) {
      return [];
    }
    return [
      {
        benchmark_code: benchmark,
        benchmark_name: benchmark,
        is_assigned: true,
      } satisfies PerformanceBenchmarkOptionView,
    ];
  }, [benchmark, benchmarkOptions]);
  const returnPathPresentation = getPerformanceReturnPathPresentation({
    summary,
    points,
    benchmark,
    benchmarkOptions: resolvedBenchmarkOptions,
    capabilities,
    reportingCurrency,
  });
  const chartTableModel = useMemo(
    () =>
      buildPerformanceReturnPathTableModel({
        points,
        viewMode: chartViewMode,
        includeBenchmarkSeries: hasBenchmarkSeries,
        includeActiveSeries: hasActiveSeries,
      }),
    [chartViewMode, hasActiveSeries, hasBenchmarkSeries, points]
  );

  const chartOption = useMemo(() => {
    const categories = points.map((point) => point.label);
    const portfolioCumulative = points.map((point) =>
      toNumeric(point.cumulative_portfolio_return_pct)
    );
    const benchmarkCumulative = points.map((point) =>
      toNumeric(point.cumulative_benchmark_return_pct)
    );
    const activeCumulative = points.map((point) =>
      toNumeric(point.cumulative_active_return_pct)
    );
    const portfolioPeriodic = points.map((point) => toNumeric(point.portfolio_return_pct));
    const benchmarkPeriodic = points.map((point) => toNumeric(point.benchmark_return_pct));
    const activePeriodic = points.map((point) => toNumeric(point.active_return_pct));
    const hasActiveCumulativeSeries = hasBenchmarkSeries && activeCumulative.some((value) => value !== null);
    const hasActivePeriodicSeries = hasBenchmarkSeries && activePeriodic.some((value) => value !== null);
    const includeAbsoluteSeries = chartViewMode !== "relative";
    const includeRelativeSeries = chartViewMode !== "absolute";
    const showBenchmarkSeries = includeAbsoluteSeries && hasBenchmarkSeries;
    const showActiveCumulativeSeries = includeRelativeSeries && hasActiveCumulativeSeries;
    const showActivePeriodicSeries = includeRelativeSeries && hasActivePeriodicSeries;

    const cumulativeBounds = buildPercentAxisBounds([
      ...(includeAbsoluteSeries ? portfolioCumulative : []),
      ...(showBenchmarkSeries ? benchmarkCumulative : []),
      ...(showActiveCumulativeSeries ? activeCumulative : []),
    ]);
    const barBounds = buildPercentAxisBounds([
      ...(includeAbsoluteSeries ? portfolioPeriodic : []),
      ...(showBenchmarkSeries ? benchmarkPeriodic : []),
      ...(showActivePeriodicSeries ? activePeriodic : []),
    ]);

    return {
      animation: false,
      color: [
        CHART_COLORS.portfolio,
        CHART_COLORS.benchmark,
        CHART_COLORS.active,
        CHART_COLORS.portfolioBar,
        CHART_COLORS.benchmarkBar,
        CHART_COLORS.activeBar,
      ],
      grid: {
        left: 58,
        right: 24,
        top: 24,
        bottom: 52,
        containLabel: true,
      },
      legend: {
        bottom: 6,
        left: "center",
        itemWidth: 18,
        itemHeight: 8,
        textStyle: {
          color: "#586377",
          fontSize: 12,
          fontWeight: 700,
        },
        data: [
          ...(includeAbsoluteSeries ? ["Portfolio Return"] : []),
          ...(showBenchmarkSeries ? [returnPathPresentation.benchmarkLabel] : []),
          ...(showActiveCumulativeSeries ? ["Active Cumulative"] : []),
          ...(includeAbsoluteSeries ? ["Portfolio Period"] : []),
          ...(showBenchmarkSeries ? ["Benchmark Period"] : []),
          ...(showActivePeriodicSeries ? ["Active Period"] : []),
        ],
      },
      tooltip: {
        trigger: "axis",
        axisPointer: { type: "cross" },
        valueFormatter: (value: unknown) => {
          if (typeof value === "number") {
            return `${value.toFixed(2)}%`;
          }
          if (typeof value === "string") {
            return value;
          }
          return "";
        },
      },
      xAxis: {
        type: "category" as const,
        data: categories,
        axisLine: { lineStyle: { color: "rgba(52, 70, 95, 0.18)" } },
        axisTick: { show: false },
        axisLabel: {
          color: "#5a6476",
          fontSize: 11,
          fontWeight: 600,
        },
      },
      yAxis: [
        {
          type: "value" as const,
          min: cumulativeBounds.min,
          max: cumulativeBounds.max,
          axisLabel: {
            color: "#5a6476",
            formatter: (value: number) => `${value}%`,
          },
          splitLine: {
            lineStyle: {
              color: "rgba(52, 70, 95, 0.1)",
            },
          },
        },
        {
          type: "value" as const,
          min: barBounds.min,
          max: barBounds.max,
          show: false,
        },
      ],
      series: [
        ...(includeAbsoluteSeries
          ? [
              {
                name: "Portfolio Period",
                type: "bar" as const,
                yAxisIndex: 1,
                data: portfolioPeriodic,
                barWidth: 10,
                barGap: "20%",
                z: 1,
                itemStyle: {
                  color: CHART_COLORS.portfolioBar,
                  borderRadius: [4, 4, 0, 0],
                },
              },
            ]
          : []),
        ...(showBenchmarkSeries
          ? [
              {
                name: "Benchmark Period",
                type: "bar" as const,
                yAxisIndex: 1,
                data: benchmarkPeriodic,
                barWidth: 10,
                z: 1,
                itemStyle: {
                  color: CHART_COLORS.benchmarkBar,
                  borderRadius: [4, 4, 0, 0],
                },
              },
            ]
          : []),
        ...(showActivePeriodicSeries
          ? [
              {
                name: "Active Period",
                type: "bar" as const,
                yAxisIndex: 1,
                data: activePeriodic,
                barWidth: 10,
                z: 1,
                itemStyle: {
                  color: CHART_COLORS.activeBar,
                  borderRadius: [4, 4, 0, 0],
                },
              },
            ]
          : []),
        ...(includeAbsoluteSeries
          ? [
              {
                name: "Portfolio Return",
                type: "line" as const,
                data: portfolioCumulative,
                smooth: true,
                symbol: "none",
                z: 3,
                lineStyle: {
                  width: 4,
                  color: CHART_COLORS.portfolio,
                },
                areaStyle: {
                  color: "rgba(218, 30, 40, 0.05)",
                },
              },
            ]
          : []),
        ...(showBenchmarkSeries
          ? [
              {
                name: returnPathPresentation.benchmarkLabel,
                type: "line" as const,
                data: benchmarkCumulative,
                smooth: true,
                symbol: "none",
                z: 3,
                lineStyle: {
                  width: 3,
                  color: CHART_COLORS.benchmark,
                },
              },
            ]
          : []),
        ...(showActiveCumulativeSeries
          ? [
              {
                name: "Active Cumulative",
                type: "line" as const,
                data: activeCumulative,
                smooth: true,
                symbol: "none",
                z: 3,
                lineStyle: {
                  width: 2,
                  type: "dashed" as const,
                  color: CHART_COLORS.active,
                },
              },
            ]
          : []),
      ],
    } satisfies EChartsOption;
  }, [chartViewMode, hasBenchmarkSeries, points, returnPathPresentation.benchmarkLabel]);

  const explicitDateRange =
    resolvedReportDates.startDate && resolvedReportDates.endDate
      ? `${formatDate(resolvedReportDates.startDate)} - ${formatDate(resolvedReportDates.endDate)}`
      : "Date range unavailable";

  function applyExplicitDates(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!fromDate || !toDate) {
      return;
    }
    onRequestChange({
      period: "EXPLICIT",
      reportStartDate: fromDate,
      reportEndDate: toDate,
    });
  }

  function updateSelection(patch: PerformanceControlPatch) {
    onRequestChange({
      portfolioId,
      period,
      detailBasis,
      contributionDimension,
      attributionDimension,
      chartFrequency,
      benchmark,
      reportStartDate,
      reportEndDate,
      ...patch,
    });
  }

  return (
    <WorkbenchChartShell
      id={id}
      title={title}
      subtitle={explicitDateRange}
      className="performance-chart-stage workbench-summary-panel"
      contextRow={
        <PerformanceChartContextStrip
          period={period}
          detailBasis={detailBasis}
          benchmarkLabel={returnPathPresentation.benchmarkLabel}
          benchmarkSourceLabel={returnPathPresentation.benchmarkSourceLabel}
          benchmarkAssigned={returnPathPresentation.benchmarkAssigned}
          activeReturn={returnPathPresentation.activeReturnValue}
          relativeContextStatus={returnPathPresentation.relativeContextStatus}
          reportStartDate={resolvedReportDates.startDate}
          reportEndDate={resolvedReportDates.endDate}
        />
      }
      toolbar={
        <div className="performance-chart-control-band workbench-summary-toolbar">
          <div className="performance-chart-control-card">
            <Typography sx={controlLabelSx}>Horizon</Typography>
            <div className="performance-chart-toggle-wrap">
              <ToggleButtonGroup
                exclusive
                size="small"
                value={period}
                aria-label="Horizon"
                sx={toggleGroupSx}
              >
                {PERIOD_OPTIONS.map((option) => (
                  <ToggleButton
                    key={option}
                    value={option}
                    onClick={() =>
                      updateSelection({
                        period: option,
                        reportStartDate: undefined,
                        reportEndDate: undefined,
                      })
                    }
                    disabled={isUpdating && option === period}
                  >
                    {option}
                  </ToggleButton>
                ))}
              </ToggleButtonGroup>
            </div>
          </div>

          <div className="performance-chart-control-card performance-chart-control-card-dates">
            <Typography sx={controlLabelSx}>Explicit Dates</Typography>
            <Stack
              component="form"
              className="performance-chart-date-stack"
              direction={{ xs: "column", sm: "row" }}
              spacing={1}
              useFlexGap
              onSubmit={applyExplicitDates}
            >
              <TextField
                size="small"
                type="date"
                value={fromDate}
                slotProps={{
                  htmlInput: {
                    "aria-label": "From",
                    max: toDate || resolvedReportDates.endDate,
                  },
                }}
                onChange={(event) => setFromDate(event.currentTarget.value)}
              />
              <TextField
                size="small"
                type="date"
                value={toDate}
                slotProps={{
                  htmlInput: {
                    "aria-label": "To",
                    min: fromDate,
                    max: resolvedReportDates.endDate,
                  },
                }}
                onChange={(event) => setToDate(event.currentTarget.value)}
              />
              <Button type="submit" variant="contained" size="small" disableElevation>
                {isUpdating ? "Updating..." : "Apply"}
              </Button>
            </Stack>
          </div>

          <div className="performance-chart-control-card">
            <Typography sx={controlLabelSx}>View</Typography>
            <WorkbenchSegmentedControl
              ariaLabel="Return path view mode"
              className="performance-chart-view-control"
              value={chartViewMode}
              onChange={setChartViewMode}
              options={[
                { key: "combined", label: "Combined", disabled: !hasBenchmarkSeries },
                { key: "absolute", label: "Absolute" },
                {
                  key: "relative",
                  label: "Relative",
                  disabled: !hasActiveSeries,
                  title: hasActiveSeries
                    ? undefined
                    : "Relative comparison requires benchmark-relative observations.",
                },
              ]}
            />
          </div>

          <div className="performance-chart-control-card">
            <Typography sx={controlLabelSx}>Frequency</Typography>
            <TextField
              select
              size="small"
              label="Frequency"
              value={chartFrequency}
              onChange={(event) =>
                updateSelection({
                  chartFrequency: event.target.value,
                })
              }
              disabled={isUpdating}
              sx={selectControlSx}
              SelectProps={{ native: true }}
              slotProps={{
                inputLabel: { shrink: true },
                htmlInput: { "aria-label": "Frequency" },
              }}
            >
              {CHART_FREQUENCY_OPTIONS.map((option) => (
                <option
                  key={option.value}
                  value={option.value}
                  disabled={
                    !isCapabilityOptionSupported(
                      capabilities.returnPath,
                      "frequency",
                      option.value
                    )
                  }
                >
                  {option.label}
                </option>
              ))}
            </TextField>
          </div>

          <div className="performance-chart-control-card">
            <Typography sx={controlLabelSx}>Compared To</Typography>
            <TextField
              select
              size="small"
              label="Compared To"
              value={benchmark ?? ""}
              onChange={(event) =>
                updateSelection({
                  benchmark: event.target.value || undefined,
                })
              }
              disabled={isUpdating}
              sx={selectControlSx}
              SelectProps={{ native: true }}
              slotProps={{
                inputLabel: { shrink: true },
                htmlInput: { "aria-label": "Compared To" },
              }}
            >
              {resolvedBenchmarkOptions.map((option) => (
                <option key={option.benchmark_code} value={option.benchmark_code}>
                  {option.benchmark_name}
                </option>
              ))}
            </TextField>
          </div>

          <div className="performance-chart-control-card performance-chart-control-card-basis">
            <Typography sx={controlLabelSx}>Basis</Typography>
            <div className="performance-chart-toggle-wrap">
              <ToggleButtonGroup
                exclusive
                size="small"
                value={detailBasis}
                aria-label="Basis"
                sx={toggleGroupSx}
              >
                {BASIS_OPTIONS.map((option) => (
                  <ToggleButton
                    key={option}
                    value={option}
                    onClick={() =>
                      updateSelection({
                        detailBasis: option,
                      })
                    }
                    disabled={isUpdating && option === detailBasis}
                  >
                    {option}
                  </ToggleButton>
                ))}
              </ToggleButtonGroup>
            </div>
          </div>
        </div>
      }
      metricStrip={
        capabilities.returnPath.state === "supported" && points.length ? (
          <WorkbenchSummaryMetricStrip
            className="performance-chart-summary-band"
            items={returnPathPresentation.metrics.map((metric) => ({
              key: metric.label,
              label: metric.label,
              value: metric.value,
              unavailable: metric.unavailable,
              className: "performance-chart-summary-stat",
            }))}
          />
        ) : undefined
      }
      loadingState={
        isDetailsPending ? (
          <div className="performance-chart-loading-state">
            <p className="muted">Loading analytical time series and benchmark comparison.</p>
          </div>
        ) : undefined
      }
      fallbackState={
        !isDetailsPending ? (
          <div className="performance-chart-unavailable" aria-label={`${title} unavailable`}>
            <PerformanceCapabilityNotice
              capability={capabilities.returnPath}
              partialTitle="Return series is partial"
              unavailableTitle="Return series unavailable"
              body={
                capabilities.returnPath.reason ??
                "The selected period does not currently have published performance observations for this mandate."
              }
              hint="Adjust the horizon or explicit dates once performance history is available for the requested window."
            />
          </div>
        ) : undefined
      }
    >
      {capabilities.returnPath.state === "supported" && points.length ? (
        <>
          {returnPathPresentation.benchmarkStateBody ? (
            <div className="performance-chart-benchmark-state">
              <strong>Benchmark unassigned</strong>
              <span>{returnPathPresentation.benchmarkStateBody}</span>
            </div>
          ) : null}
          <div
            className="performance-chart-library-frame workbench-summary-visual"
            role="img"
            aria-label={`${title} chart`}
            style={{ position: "relative" }}
          >
            <ReactECharts
              option={chartOption}
              style={{ width: "100%", height: "460px" }}
              opts={{ renderer: "svg" }}
              notMerge
              lazyUpdate
            />
            {isDetailsPending ? (
              <Box
                sx={{
                  position: "absolute",
                  top: 12,
                  right: 12,
                  px: 1.25,
                  py: 0.5,
                  borderRadius: 999,
                  bgcolor: "rgba(255,255,255,0.92)",
                  border: "1px solid rgba(31,39,51,0.08)",
                  boxShadow: "0 8px 18px rgba(16, 40, 51, 0.08)",
                }}
              >
                <Typography sx={{ fontSize: "0.75rem", fontWeight: 700, color: "text.secondary" }}>
                  Refreshing analytical series
                </Typography>
              </Box>
            ) : null}
          </div>
          <AnalyticsTable
            ariaLabel="Return path observation table"
            columns={chartTableModel.columns}
            rows={chartTableModel.rows}
            dense
            className="performance-chart-observation-table"
          />
        </>
      ) : null}
    </WorkbenchChartShell>
  );
}

const controlLabelSx = {
  mb: 0.15,
  fontSize: "0.6875rem",
  fontWeight: 800,
  letterSpacing: "0.08em",
  textTransform: "uppercase",
  color: "text.secondary",
} as const;

const toggleGroupSx = {
  flexWrap: "wrap",
  gap: 0.5,
  "& .MuiToggleButtonGroup-grouped": {
    borderRadius: "8px !important",
    border: "1px solid rgba(31, 39, 51, 0.1) !important",
    px: 1.05,
    py: 0.45,
    color: "text.secondary",
    textTransform: "none",
    fontWeight: 700,
    fontSize: "0.78rem",
    minHeight: 34,
    backgroundColor: "#ffffff",
  },
  "& .Mui-selected": {
    bgcolor: "#1f2733 !important",
    color: "#fff !important",
  },
} as const;

const selectControlSx = {
  minWidth: { xs: "100%", sm: 140 },
  "& .MuiInputBase-input": {
    fontSize: "0.8125rem",
    fontWeight: 600,
  },
  "& .MuiInputLabel-root": {
    fontSize: "0.75rem",
    fontWeight: 700,
  },
} as const;
