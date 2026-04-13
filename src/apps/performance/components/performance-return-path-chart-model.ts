import type { EChartsOption } from "echarts";
import type { CallbackDataParams } from "echarts/types/src/util/types.js";

import { lotusThemeTokens } from "@/design-system/theme/tokens";
import type { PerformanceChartPoint } from "@/features/workbench/types";

import { formatPct } from "../formatters";
import { buildReturnPathTooltipFormatter } from "./performance-return-path-tooltip";

type ReturnPathChartOptionArgs = {
  points: PerformanceChartPoint[];
  chartViewMode: "combined" | "absolute" | "relative";
  hasBenchmarkSeries: boolean;
};

export const CHART_COLORS = {
  portfolio: "#163a5c",
  benchmark: "#697b92",
  active: "#9b7a1f",
  portfolioBar: "rgba(22, 58, 92, 0.24)",
  benchmarkBar: "rgba(105, 123, 146, 0.22)",
  activeBar: "rgba(155, 122, 31, 0.22)",
};

export const SHARED_CHART_TEXT = {
  legendSize: Number.parseFloat(lotusThemeTokens.typography.size.textSm),
  axisSize: Number.parseFloat(lotusThemeTokens.typography.size.textXs),
  legendWeight: lotusThemeTokens.typography.variant.cardTitle.weight,
  axisWeight: lotusThemeTokens.typography.variant.label.weight,
  tooltipWeight: 600,
  tooltipPadding: [
    Number.parseInt(lotusThemeTokens.spacing.step3, 10),
    Number.parseInt(lotusThemeTokens.spacing.step4, 10),
  ] as [number, number],
  barRadius: [lotusThemeTokens.radius.sm, lotusThemeTokens.radius.sm, 0, 0] as [
    number,
    number,
    number,
    number,
  ],
  refreshRadius: lotusThemeTokens.radius.control,
};

function formatAxisPct(value: number) {
  if (value > 0) {
    return `+${value}%`;
  }
  return `${value}%`;
}

function buildAreaGradient(stops: Array<{ offset: number; color: string }>) {
  return {
    type: "linear" as const,
    x: 0,
    y: 0,
    x2: 0,
    y2: 1,
    colorStops: stops,
  };
}

export function toNumeric(value: number | null | undefined): number | null {
  return value === null || value === undefined || Number.isNaN(value) ? null : value;
}

function deriveDifference(
  minuend: number | null | undefined,
  subtrahend: number | null | undefined
) {
  const resolvedMinuend = toNumeric(minuend);
  const resolvedSubtrahend = toNumeric(subtrahend);

  if (resolvedMinuend === null || resolvedSubtrahend === null) {
    return null;
  }

  return Number((resolvedMinuend - resolvedSubtrahend).toFixed(6));
}

export function resolveActivePeriodReturn(point: PerformanceChartPoint) {
  return (
    toNumeric(point.active_return_pct) ??
    deriveDifference(point.portfolio_return_pct, point.benchmark_return_pct)
  );
}

export function resolveActiveCumulativeReturn(point: PerformanceChartPoint) {
  return (
    toNumeric(point.cumulative_active_return_pct) ??
    deriveDifference(
      point.cumulative_portfolio_return_pct,
      point.cumulative_benchmark_return_pct
    )
  );
}

export function buildPercentAxisBounds(values: Array<number | null | undefined>) {
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

export function resolveReportDates(
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

export function getLatestNumeric(values: Array<number | null | undefined>) {
  return [...values].reverse().find((value): value is number => value !== null && value !== undefined) ?? null;
}

export function formatTerminalValueLabel(
  params: CallbackDataParams,
  lastIndex: number
) {
  const value = typeof params.value === "number" ? params.value : null;
  return params.dataIndex === lastIndex && value !== null ? formatPct(value) : "";
}

export function buildTerminalValueLabelStyle({
  color,
  backgroundColor,
  borderColor,
  fontWeight,
}: {
  color: string;
  backgroundColor: string;
  borderColor: string;
  fontWeight: number;
}) {
  return {
    show: true,
    distance: 14,
    color,
    backgroundColor,
    borderColor,
    borderWidth: 1,
    borderRadius: 999,
    padding: [4, 8],
    fontSize: 11,
    fontWeight,
  };
}

function buildReturnPathLineSeries({
  name,
  data,
  color,
  lineWidth,
  lastIndex,
  fillColor,
  dashed = false,
  baseline = false,
}: {
  name: "Portfolio" | "Benchmark" | "Active";
  data: Array<number | null>;
  color: string;
  lineWidth: number;
  lastIndex: number;
  fillColor?:
    | string
    | {
        type: "linear";
        x: number;
        y: number;
        x2: number;
        y2: number;
        colorStops: Array<{ offset: number; color: string }>;
      };
  dashed?: boolean;
  baseline?: boolean;
}) {
  return {
    name,
    type: "line" as const,
    data,
    smooth: false,
    symbol: "circle",
    symbolSize: 7,
    showSymbol: false,
    connectNulls: true,
    clip: false,
    z: 4,
    lineStyle: {
      width: lineWidth,
      color,
      type: dashed ? ("dashed" as const) : undefined,
      cap: "round" as const,
      join: "round" as const,
      opacity: dashed ? 0.92 : 1,
    },
    markLine: baseline
      ? {
          silent: true,
          symbol: "none",
          animation: false,
          label: { show: false },
          lineStyle: {
            color: "rgba(22, 58, 92, 0.16)",
            width: 1,
            type: "solid" as const,
          },
          data: [{ yAxis: 0 }],
        }
      : undefined,
    emphasis: {
      focus: "series" as const,
      lineStyle: {
        width: Math.max(lineWidth + 0.4, 3.2),
      },
    },
    endLabel: {
      ...buildTerminalValueLabelStyle({
        color,
        backgroundColor:
          name === "Active" ? "rgba(255, 251, 235, 0.96)" : "rgba(255, 255, 255, 0.94)",
        borderColor:
          name === "Portfolio"
            ? "rgba(22, 58, 92, 0.12)"
            : name === "Benchmark"
              ? "rgba(105, 123, 146, 0.14)"
              : "rgba(155, 122, 31, 0.18)",
        fontWeight: name === "Active" ? 760 : 800,
      }),
      formatter: (params: CallbackDataParams) =>
        formatTerminalValueLabel(params, lastIndex),
    },
    labelLayout: {
      hideOverlap: true,
      moveOverlap: "shiftY" as const,
    },
    areaStyle: fillColor ? { color: fillColor, opacity: 1 } : undefined,
  };
}

export function buildReturnPathChartOption({
  points,
  chartViewMode,
  hasBenchmarkSeries,
}: ReturnPathChartOptionArgs): EChartsOption {
  const categories = points.map((point) => point.label);
  const portfolioCumulative = points.map((point) =>
    toNumeric(point.cumulative_portfolio_return_pct)
  );
  const benchmarkCumulative = points.map((point) =>
    toNumeric(point.cumulative_benchmark_return_pct)
  );
  const activeCumulative = points.map((point) => resolveActiveCumulativeReturn(point));
  const hasActiveCumulativeSeries =
    hasBenchmarkSeries && activeCumulative.some((value) => value !== null);
  const includeAbsoluteSeries = chartViewMode !== "relative";
  const includeRelativeSeries = chartViewMode !== "absolute";
  const showBenchmarkSeries = includeAbsoluteSeries && hasBenchmarkSeries;
  const showActiveCumulativeSeries = includeRelativeSeries && hasActiveCumulativeSeries;

  const cumulativeBounds = buildPercentAxisBounds([
    ...(includeAbsoluteSeries ? portfolioCumulative : []),
    ...(showBenchmarkSeries ? benchmarkCumulative : []),
    ...(showActiveCumulativeSeries ? activeCumulative : []),
  ]);

  return {
    animation: false,
    backgroundColor: "transparent",
    color: [
      CHART_COLORS.portfolio,
      CHART_COLORS.benchmark,
      CHART_COLORS.active,
      CHART_COLORS.portfolioBar,
      CHART_COLORS.benchmarkBar,
      CHART_COLORS.activeBar,
    ],
    grid: {
      left: 64,
      right: 126,
      top: 20,
      bottom: 30,
      containLabel: true,
    },
    legend: {
      show: false,
    },
    tooltip: {
      trigger: "axis",
      triggerOn: "mousemove|click",
      showDelay: 0,
      hideDelay: 40,
      enterable: false,
      confine: false,
      appendToBody: true,
      renderMode: "html",
      className: "performance-return-path-tooltip",
      transitionDuration: 0,
      axisPointer: {
        type: "line",
        snap: true,
        label: { show: false },
        lineStyle: {
          color: "rgba(22, 58, 92, 0.28)",
          width: 1,
          type: "dashed",
        },
      },
      backgroundColor: "rgba(252, 253, 255, 0.985)",
      borderColor: "rgba(36, 50, 70, 0.16)",
      borderWidth: 1,
      textStyle: {
        color: "#172033",
        fontSize: SHARED_CHART_TEXT.legendSize,
        fontWeight: SHARED_CHART_TEXT.tooltipWeight,
      },
      extraCssText:
        "pointer-events:none; box-shadow: 0 18px 32px rgba(15, 23, 42, 0.14); border-radius: 10px;",
      padding: SHARED_CHART_TEXT.tooltipPadding,
      formatter: buildReturnPathTooltipFormatter({
        points,
        showAbsoluteSeries: includeAbsoluteSeries,
        showBenchmarkSeries,
        showActiveSeries: showActiveCumulativeSeries,
      }),
    },
    xAxis: {
      type: "category",
      data: categories,
      boundaryGap: false,
      axisLine: { lineStyle: { color: "rgba(22, 58, 92, 0.18)", width: 1 } },
      axisTick: { show: false },
      axisPointer: { label: { show: false } },
      axisLabel: {
        color: "#5a6779",
        fontSize: SHARED_CHART_TEXT.axisSize,
        fontWeight: SHARED_CHART_TEXT.axisWeight,
        margin: 12,
      },
    },
    yAxis: {
      type: "value",
      min: cumulativeBounds.min,
      max: cumulativeBounds.max,
      splitNumber: 5,
      axisPointer: { label: { show: false } },
      axisLabel: {
        color: "#637083",
        formatter: formatAxisPct,
      },
      axisLine: { show: false },
      axisTick: { show: false },
      splitLine: {
        lineStyle: {
          color: "rgba(22, 58, 92, 0.085)",
          width: 1,
          type: "dashed",
        },
      },
      splitArea: {
        show: true,
        areaStyle: {
          color: ["rgba(248, 250, 252, 0.38)", "rgba(255, 255, 255, 0.76)"],
        },
      },
    },
    series: [
      ...(includeAbsoluteSeries
        ? [
            buildReturnPathLineSeries({
              name: "Portfolio",
              data: portfolioCumulative,
              color: CHART_COLORS.portfolio,
              lineWidth: 3.6,
              lastIndex: portfolioCumulative.length - 1,
              fillColor: buildAreaGradient([
                { offset: 0, color: "rgba(22, 58, 92, 0.12)" },
                { offset: 0.42, color: "rgba(22, 58, 92, 0.05)" },
                { offset: 1, color: "rgba(22, 58, 92, 0.01)" },
              ]),
              baseline: true,
            }),
          ]
        : []),
      ...(showBenchmarkSeries
        ? [
            buildReturnPathLineSeries({
              name: "Benchmark",
              data: benchmarkCumulative,
              color: CHART_COLORS.benchmark,
              lineWidth: 2.6,
              lastIndex: benchmarkCumulative.length - 1,
              dashed: true,
            }),
          ]
        : []),
      ...(showActiveCumulativeSeries
        ? [
            buildReturnPathLineSeries({
              name: "Active",
              data: activeCumulative,
              color: CHART_COLORS.active,
              lineWidth: 2.8,
              lastIndex: activeCumulative.length - 1,
              fillColor:
                chartViewMode === "relative"
                  ? buildAreaGradient([
                      { offset: 0, color: "rgba(155, 122, 31, 0.14)" },
                      { offset: 0.45, color: "rgba(155, 122, 31, 0.06)" },
                      { offset: 1, color: "rgba(155, 122, 31, 0.015)" },
                    ])
                  : undefined,
              dashed: true,
            }),
          ]
        : []),
    ],
  } satisfies EChartsOption;
}
