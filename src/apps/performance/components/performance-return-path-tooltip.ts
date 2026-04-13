import type { CallbackDataParams } from "echarts/types/src/util/types.js";

import type { PerformanceChartPoint } from "@/features/workbench/types";

import { formatPct } from "../formatters";
import {
  CHART_COLORS,
  resolveActiveCumulativeReturn,
  resolveActivePeriodReturn,
  toNumeric,
} from "./performance-return-path-chart-model";

type ReturnPathTooltipOptions = {
  points: PerformanceChartPoint[];
  showAbsoluteSeries: boolean;
  showBenchmarkSeries: boolean;
  showActiveSeries: boolean;
};

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

function buildTooltipContainer(title: string, rows: string, minWidth: number) {
  return [
    `<div style="display:grid;gap:8px;min-width:${minWidth}px;">`,
    `<div style="color:#607086;font-size:11px;font-weight:800;letter-spacing:0.08em;text-transform:uppercase;">${escapeTooltipHtml(title)}</div>`,
    rows,
    "</div>",
  ].join("");
}

function buildTooltipGroup(
  title: string,
  color: string,
  rows: Array<{ label: string; value: number | null | undefined }>
) {
  const content = rows
    .map(({ label, value }) => {
      const numericValue = toNumeric(value);
      if (numericValue === null) {
        return "";
      }

      return [
        '<div style="display:flex;align-items:center;justify-content:space-between;gap:12px;">',
        `<span style="color:#607086;font-size:11px;font-weight:800;letter-spacing:0.06em;text-transform:uppercase;">${escapeTooltipHtml(label)}</span>`,
        `<strong style="color:#172033;font-size:12px;font-weight:800;">${escapeTooltipHtml(formatPct(numericValue))}</strong>`,
        "</div>",
      ].join("");
    })
    .filter(Boolean)
    .join("");

  if (!content) {
    return "";
  }

  return [
    '<section style="display:grid;gap:6px;padding:8px 10px;border:1px solid rgba(36, 50, 70, 0.08);border-radius:10px;background:rgba(248,250,252,0.78);">',
    `<div style="display:inline-flex;align-items:center;gap:8px;color:#334155;font-size:12px;font-weight:800;">`,
    `<span style="width:8px;height:8px;border-radius:999px;background:${color};display:inline-block;"></span>`,
    `${escapeTooltipHtml(title)}`,
    "</div>",
    content,
    "</section>",
  ].join("");
}

function buildTooltipNotice(title: string, body: string) {
  return buildTooltipContainer(
    title,
    `<div style="color:#334155;font-size:12px;line-height:1.45;">${escapeTooltipHtml(body)}</div>`,
    180
  );
}

export function formatReturnPathTooltip(params: CallbackDataParams | CallbackDataParams[]) {
  const entries = (Array.isArray(params) ? params : [params]).filter(
    (entry) => getTooltipNumericValue(entry.value) !== null
  );

  const firstEntry = Array.isArray(params) ? params[0] : params;
  const axisLabel = String(
    (firstEntry as CallbackDataParams & { axisValue?: string })?.axisValue ??
      firstEntry?.name ??
      "Observation"
  );

  if (!entries.length) {
    return buildTooltipNotice(axisLabel, "No published values are available at this point.");
  }

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
    return buildTooltipNotice(axisLabel, "No published values are available at this point.");
  }

  return buildTooltipContainer(axisLabel, rows, 180);
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
    const dataIndex = typeof firstEntry?.dataIndex === "number" ? firstEntry.dataIndex : -1;
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
            buildTooltipGroup("Portfolio", CHART_COLORS.portfolio, [
              { label: "Period", value: point.portfolio_return_pct },
              { label: "Cumulative", value: point.cumulative_portfolio_return_pct },
            ]),
            ...(showBenchmarkSeries
              ? [
                  buildTooltipGroup("Benchmark", CHART_COLORS.benchmark, [
                    { label: "Period", value: point.benchmark_return_pct },
                    { label: "Cumulative", value: point.cumulative_benchmark_return_pct },
                  ]),
                ]
              : []),
          ]
        : []),
      ...(showActiveSeries
        ? [
            buildTooltipGroup("Active", CHART_COLORS.active, [
              { label: "Period", value: resolveActivePeriodReturn(point) },
              { label: "Cumulative", value: resolveActiveCumulativeReturn(point) },
            ]),
          ]
        : []),
    ]
      .filter(Boolean)
      .join("");

    if (!rows) {
      return buildTooltipNotice(
        axisLabel,
        "Return observations are not available for the hovered point."
      );
    }

    return buildTooltipContainer(axisLabel, rows, 260);
  };
}
