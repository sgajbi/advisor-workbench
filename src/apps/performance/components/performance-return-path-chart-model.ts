import type { CallbackDataParams } from "echarts/types/src/util/types.js";

import { lotusThemeTokens } from "@/design-system/theme/tokens";
import type { PerformanceChartPoint } from "@/features/workbench/types";

import { formatPct } from "../formatters";

type ReturnPathTooltipOptions = {
  points: PerformanceChartPoint[];
  showAbsoluteSeries: boolean;
  showBenchmarkSeries: boolean;
  showActiveSeries: boolean;
};

export const CHART_COLORS = {
  portfolio: "#da1e28",
  benchmark: "#1f2e45",
  active: "#2f5f97",
  portfolioBar: "rgba(218, 30, 40, 0.28)",
  benchmarkBar: "rgba(31, 46, 69, 0.24)",
  activeBar: "rgba(47, 95, 151, 0.24)",
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

export function toNumeric(value: number | null | undefined): number | null {
  return value === null || value === undefined || Number.isNaN(value) ? null : value;
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

export function formatEndLabel(
  params: CallbackDataParams,
  label: string,
  lastIndex: number
) {
  const value = typeof params.value === "number" ? params.value : null;
  return params.dataIndex === lastIndex && value !== null ? `${label} ${formatPct(value)}` : "";
}

function getTooltipNumericValue(value: unknown): number | null {
  if (typeof value === "number") {
    return Number.isFinite(value) ? value : null;
  }
  if (Array.isArray(value) && typeof value[1] === "number" && Number.isFinite(value[1])) {
    return value[1];
  }
  return null;
}

function escapeTooltipHtml(value: string) {
  return value
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;");
}

export function formatReturnPathTooltip(params: CallbackDataParams | CallbackDataParams[]) {
  const entries = (Array.isArray(params) ? params : [params]).filter(
    (entry) => getTooltipNumericValue(entry.value) !== null
  );

  if (!entries.length) {
    return "";
  }

  const axisLabel = String(
    (entries[0] as CallbackDataParams & { axisValue?: string })?.axisValue ??
      entries[0]?.name ??
      ""
  );
  const rows = entries
    .map((entry) => {
      const numericValue = getTooltipNumericValue(entry.value);
      if (numericValue === null) {
        return "";
      }

      return [
        '<div style="display:flex;align-items:center;justify-content:space-between;gap:12px;">',
        `<span style="display:inline-flex;align-items:center;gap:8px;color:#334155;font-size:12px;font-weight:700;">${entry.marker ?? ""}${escapeTooltipHtml(entry.seriesName ?? "")}</span>`,
        `<strong style="color:#172033;font-size:12px;font-weight:800;">${escapeTooltipHtml(formatPct(numericValue))}</strong>`,
        "</div>",
      ].join("");
    })
    .filter(Boolean)
    .join("");

  if (!rows) {
    return "";
  }

  return [
    '<div style="display:grid;gap:8px;min-width:180px;">',
    `<div style="color:#5f6c7f;font-size:11px;font-weight:800;letter-spacing:0.08em;text-transform:uppercase;">${escapeTooltipHtml(axisLabel)}</div>`,
    rows,
    "</div>",
  ].join("");
}

function buildTooltipRow(label: string, value: number | null | undefined, color: string) {
  const numericValue = toNumeric(value);
  if (numericValue === null) {
    return "";
  }

  return [
    '<div style="display:flex;align-items:center;justify-content:space-between;gap:12px;">',
    `<span style="display:inline-flex;align-items:center;gap:8px;color:#334155;font-size:12px;font-weight:700;"><span style="width:8px;height:8px;border-radius:999px;background:${color};display:inline-block;"></span>${escapeTooltipHtml(label)}</span>`,
    `<strong style="color:#172033;font-size:12px;font-weight:800;">${escapeTooltipHtml(formatPct(numericValue))}</strong>`,
    "</div>",
  ].join("");
}

export function buildReturnPathTooltipFormatter({
  points,
  showAbsoluteSeries,
  showBenchmarkSeries,
  showActiveSeries,
}: ReturnPathTooltipOptions) {
  return (params: CallbackDataParams | CallbackDataParams[]) => {
    const entries = Array.isArray(params) ? params : [params];
    const firstEntry = entries[0];
    const dataIndex =
      typeof firstEntry?.dataIndex === "number" ? firstEntry.dataIndex : -1;
    const point = dataIndex >= 0 ? points[dataIndex] : undefined;
    const axisLabel = String(
      (firstEntry as CallbackDataParams & { axisValue?: string })?.axisValue ??
        firstEntry?.name ??
        point?.label ??
        ""
    );

    if (!point) {
      return formatReturnPathTooltip(params);
    }

    const rows = [
      ...(showAbsoluteSeries
        ? [
            buildTooltipRow("Portfolio period", point.portfolio_return_pct, CHART_COLORS.portfolio),
            ...(showBenchmarkSeries
              ? [buildTooltipRow("Benchmark period", point.benchmark_return_pct, CHART_COLORS.benchmark)]
              : []),
            buildTooltipRow(
              "Portfolio cumulative",
              point.cumulative_portfolio_return_pct,
              CHART_COLORS.portfolio
            ),
            ...(showBenchmarkSeries
              ? [
                  buildTooltipRow(
                    "Benchmark cumulative",
                    point.cumulative_benchmark_return_pct,
                    CHART_COLORS.benchmark
                  ),
                ]
              : []),
          ]
        : []),
      ...(showActiveSeries
        ? [
            buildTooltipRow("Active period", point.active_return_pct, CHART_COLORS.active),
            buildTooltipRow(
              "Active cumulative",
              point.cumulative_active_return_pct,
              CHART_COLORS.active
            ),
          ]
        : []),
    ]
      .filter(Boolean)
      .join("");

    if (!rows) {
      return "";
    }

    return [
      '<div style="display:grid;gap:8px;min-width:220px;">',
      `<div style="color:#5f6c7f;font-size:11px;font-weight:800;letter-spacing:0.08em;text-transform:uppercase;">${escapeTooltipHtml(axisLabel)}</div>`,
      rows,
      "</div>",
    ].join("");
  };
}
