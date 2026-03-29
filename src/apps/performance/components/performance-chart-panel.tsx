"use client";

import { FormEvent, useEffect, useMemo, useState } from "react";
import ReactECharts from "echarts-for-react";
import type { EChartsOption } from "echarts";
import {
  Box,
  Button,
  Chip,
  Stack,
  TextField,
  ToggleButton,
  ToggleButtonGroup,
  Typography,
} from "@mui/material";

import { AnalyticsSectionHeader, AnalyticsStat, Panel } from "@/design-system";
import type { PerformanceWorkspaceCapabilities } from "../capabilities";
import type {
  PerformanceBenchmarkOptionView,
  PerformanceChartPoint,
} from "@/features/workbench/types";

import { formatDate, formatPct } from "../formatters";
import { BASIS_OPTIONS, CHART_FREQUENCY_OPTIONS, PERIOD_OPTIONS } from "../navigation";

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
};

const CHART_COLORS = {
  portfolio: "#da1e28",
  benchmark: "#2d3748",
  portfolioBar: "rgba(218, 30, 40, 0.18)",
  benchmarkBar: "rgba(45, 55, 72, 0.16)",
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

function formatBenchmarkLabel(
  benchmark?: string,
  benchmarkOptions: PerformanceBenchmarkOptionView[] = []
) {
  if (!benchmark) {
    return "Benchmark";
  }
  return (
    benchmarkOptions.find((option) => option.benchmark_code === benchmark)?.benchmark_name ??
    benchmark
  );
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

  useEffect(() => {
    setFromDate(resolvedReportDates.startDate);
    setToDate(resolvedReportDates.endDate);
  }, [resolvedReportDates.endDate, resolvedReportDates.startDate]);

  const hasBenchmarkSeries = points.some(
    (point) =>
      point.benchmark_return_pct !== null || point.cumulative_benchmark_return_pct !== null
  );
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

  const chartOption = useMemo(() => {
    const categories = points.map((point) => point.label);
    const portfolioCumulative = points.map((point) =>
      toNumeric(point.cumulative_portfolio_return_pct)
    );
    const benchmarkCumulative = points.map((point) =>
      toNumeric(point.cumulative_benchmark_return_pct)
    );
    const portfolioPeriodic = points.map((point) => toNumeric(point.portfolio_return_pct));
    const benchmarkPeriodic = points.map((point) => toNumeric(point.benchmark_return_pct));

    const cumulativeBounds = buildPercentAxisBounds([
      ...portfolioCumulative,
      ...benchmarkCumulative,
    ]);
    const barBounds = buildPercentAxisBounds([...portfolioPeriodic, ...benchmarkPeriodic]);

    return {
      animation: false,
      color: [
        CHART_COLORS.portfolio,
        CHART_COLORS.benchmark,
        CHART_COLORS.portfolioBar,
        CHART_COLORS.benchmarkBar,
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
          "Portfolio Return",
          ...(hasBenchmarkSeries
            ? [formatBenchmarkLabel(benchmark, resolvedBenchmarkOptions)]
            : []),
          "Portfolio Period",
          ...(hasBenchmarkSeries ? ["Benchmark Period"] : []),
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
        ...(hasBenchmarkSeries
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
        ...(hasBenchmarkSeries
          ? [
              {
                name: formatBenchmarkLabel(benchmark, resolvedBenchmarkOptions),
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
      ],
    } satisfies EChartsOption;
  }, [benchmark, hasBenchmarkSeries, points, resolvedBenchmarkOptions]);

  const latest = points.at(-1);
  const periodicPortfolioValues = points
    .map((point) => toNumeric(point.portfolio_return_pct))
    .filter((value): value is number => value !== null);
  const latestValue = latest?.portfolio_return_pct ?? summary.portfolio_return_pct;
  const highestValue = periodicPortfolioValues.length ? Math.max(...periodicPortfolioValues) : null;
  const lowestValue = periodicPortfolioValues.length ? Math.min(...periodicPortfolioValues) : null;
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
    <Panel id={id} className="performance-chart-stage">
      <Stack spacing={2.25}>
        <Stack
          direction={{ xs: "column", xl: "row" }}
          spacing={2}
          justifyContent="space-between"
          alignItems={{ xs: "stretch", xl: "flex-start" }}
        >
          <Stack spacing={1.5} sx={{ flex: 1, minWidth: 0 }}>
            <AnalyticsSectionHeader title={title} subtitle={explicitDateRange} />
            <Stack spacing={1.25}>
              <Stack direction={{ xs: "column", lg: "row" }} spacing={1.25} useFlexGap flexWrap="wrap">
                <Box>
                  <Typography sx={controlLabelSx}>Horizon</Typography>
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
                </Box>

                <Box component="form" onSubmit={applyExplicitDates}>
                  <Typography sx={controlLabelSx}>Explicit Dates</Typography>
                  <Stack direction={{ xs: "column", sm: "row" }} spacing={1} useFlexGap>
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
                </Box>
              </Stack>

              <Stack direction={{ xs: "column", lg: "row" }} spacing={1.25} useFlexGap flexWrap="wrap">
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
                    <option key={option.value} value={option.value}>
                      {option.label}
                    </option>
                  ))}
                </TextField>

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

                <Box>
                  <Typography sx={controlLabelSx}>Basis</Typography>
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
                </Box>
              </Stack>
            </Stack>
          </Stack>

          <Stack
            direction={{ xs: "column", sm: "row", xl: "column" }}
            spacing={1}
            sx={{ minWidth: { xl: 280 }, maxWidth: { xl: 320 } }}
          >
            <Chip
              label={`Portfolio ${formatPct(summary.portfolio_return_pct)}`}
              color="error"
              variant="outlined"
              sx={summaryChipSx}
            />
            <Chip
              label={`${formatBenchmarkLabel(benchmark, resolvedBenchmarkOptions)} ${
                hasBenchmarkSeries ? formatPct(summary.benchmark_return_pct) : "N/A"
              }`}
              variant="outlined"
              sx={summaryChipSx}
            />
            <Chip
              label={`Active ${hasBenchmarkSeries ? formatPct(summary.active_return_pct) : "N/A"}`}
              variant="outlined"
              sx={summaryChipSx}
            />
          </Stack>
        </Stack>

      {capabilities.returnPath.state === "supported" && points.length ? (
        <>
          <Box
            className="performance-chart-summary-band"
            sx={{
              display: "grid",
              gridTemplateColumns: {
                xs: "repeat(2, minmax(0, 1fr))",
                md: "repeat(4, minmax(0, 1fr))",
              },
              gap: 1.25,
            }}
          >
            <AnalyticsStat label="Latest" value={formatPct(latestValue)} />
            <AnalyticsStat label="High" value={formatPct(highestValue)} />
            <AnalyticsStat label="Low" value={formatPct(lowestValue)} />
            <AnalyticsStat label="Observations" value={points.length} />
          </Box>

          <div
            className="performance-chart-library-frame"
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
        </>
      ) : isDetailsPending ? (
        <div className="performance-chart-loading-state">
          <p className="muted">Loading analytical time series and benchmark comparison.</p>
        </div>
      ) : (
        <div className="performance-chart-unavailable" aria-label={`${title} unavailable`}>
          <strong>Return series unavailable</strong>
          <p>
            {capabilities.returnPath.reason ??
              "The selected period does not currently have published performance observations for this mandate."}
          </p>
          <span>
            Adjust the horizon or explicit dates once performance history is available for the
            requested window.
          </span>
        </div>
      )}
      </Stack>
    </Panel>
  );
}

const controlLabelSx = {
  mb: 0.5,
  fontSize: "0.6875rem",
  fontWeight: 800,
  letterSpacing: "0.08em",
  textTransform: "uppercase",
  color: "text.secondary",
} as const;

const toggleGroupSx = {
  flexWrap: "wrap",
  gap: 0.75,
  "& .MuiToggleButtonGroup-grouped": {
    borderRadius: "999px !important",
    border: "1px solid rgba(31, 39, 51, 0.1) !important",
    px: 1.3,
    py: 0.6,
    color: "text.secondary",
    textTransform: "none",
    fontWeight: 700,
    fontSize: "0.8rem",
  },
  "& .Mui-selected": {
    bgcolor: "#1f2733 !important",
    color: "#fff !important",
  },
} as const;

const selectControlSx = {
  minWidth: { xs: "100%", sm: 200 },
  "& .MuiInputBase-input": {
    fontSize: "0.875rem",
    fontWeight: 600,
  },
} as const;

const summaryChipSx = {
  justifyContent: "space-between",
  borderRadius: "999px",
  px: 1,
  py: 2.2,
  fontWeight: 700,
  "& .MuiChip-label": {
    display: "flex",
    justifyContent: "space-between",
    width: "100%",
    gap: 1,
  },
} as const;
