"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import type { EChartsOption } from "echarts";
import ReactECharts from "echarts-for-react";

import {
  WorkbenchChartContextRow,
  WorkbenchChartShell,
  WorkbenchSummaryMetricStrip,
} from "@/design-system";
import { getWorkbenchPerformanceAttributionTrendClient } from "@/features/workbench/api";
import type { PerformanceAttributionTrendRow } from "@/features/workbench/types";

import { formatPct } from "../formatters";
import PerformanceAnalysisStatePanel from "./performance-analysis-state-panel";

type Props = {
  portfolioId: string;
  period: string;
  chartFrequency: string;
  attributionDimension: string;
  detailBasis: string;
  benchmark?: string;
  reportStartDate?: string;
  reportEndDate?: string;
};

const ATTRIBUTION_TREND_COLORS = {
  allocation: "#4d96d9",
  selection: "#4caf50",
  interaction: "#da1e28",
  total: "#2d3748",
};

export default function PerformanceAttributionTrendPanel({
  portfolioId,
  period,
  chartFrequency,
  attributionDimension,
  detailBasis,
  benchmark,
  reportStartDate,
  reportEndDate,
}: Props) {
  const [rows, setRows] = useState<PerformanceAttributionTrendRow[] | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const requestIdRef = useRef(0);
  const cacheRef = useRef<Map<string, PerformanceAttributionTrendRow[]>>(new Map());

  useEffect(() => {
    const cacheKey = JSON.stringify({
      portfolioId,
      period,
      chartFrequency,
      attributionDimension,
      detailBasis,
      benchmark: benchmark ?? null,
      reportStartDate: reportStartDate ?? null,
      reportEndDate: reportEndDate ?? null,
    });
    const cached = cacheRef.current.get(cacheKey);
    if (cached) {
      setRows(cached);
      setIsLoading(false);
      return;
    }

    const requestId = requestIdRef.current + 1;
    requestIdRef.current = requestId;
    setIsLoading(true);

    void getWorkbenchPerformanceAttributionTrendClient(portfolioId, {
      period,
      chartFrequency,
      attributionDimension,
      detailBasis,
      benchmark,
      reportStartDate,
      reportEndDate,
    })
      .then((result) => {
        if (requestIdRef.current !== requestId) {
          return;
        }
        cacheRef.current.set(cacheKey, result.rows);
        setRows(result.rows);
      })
      .catch(() => {
        if (requestIdRef.current !== requestId) {
          return;
        }
        setRows([]);
      })
      .finally(() => {
        if (requestIdRef.current === requestId) {
          setIsLoading(false);
        }
      });
  }, [
    attributionDimension,
    benchmark,
    chartFrequency,
    detailBasis,
    period,
    portfolioId,
    reportEndDate,
    reportStartDate,
  ]);

  const chartOption = useMemo<EChartsOption | null>(() => {
    if (!rows || rows.length === 0) {
      return null;
    }

    return {
      animation: false,
      color: [
        ATTRIBUTION_TREND_COLORS.allocation,
        ATTRIBUTION_TREND_COLORS.selection,
        ATTRIBUTION_TREND_COLORS.interaction,
        ATTRIBUTION_TREND_COLORS.total,
      ],
      grid: {
        left: 54,
        right: 24,
        top: 20,
        bottom: 48,
        containLabel: true,
      },
      legend: {
        bottom: 6,
        left: "center",
        itemWidth: 16,
        itemHeight: 8,
        textStyle: {
          color: "#586377",
          fontSize: 12,
          fontWeight: 700,
        },
      },
      tooltip: {
        trigger: "axis",
        axisPointer: { type: "cross" },
        valueFormatter: (value: unknown) =>
          typeof value === "number" ? `${value.toFixed(2)}%` : "",
      },
      xAxis: {
        type: "category",
        data: rows.map((row) => row.period_label),
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
          type: "value",
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
      ],
      series: [
        {
          name: "Allocation",
          type: "bar",
          stack: "effects",
          data: rows.map((row) => row.allocation_pct),
          barWidth: 12,
        },
        {
          name: "Selection",
          type: "bar",
          stack: "effects",
          data: rows.map((row) => row.selection_pct),
          barWidth: 12,
        },
        {
          name: "Interaction",
          type: "bar",
          stack: "effects",
          data: rows.map((row) => row.interaction_pct),
          barWidth: 12,
        },
        {
          name: "Cumulative Total",
          type: "line",
          data: rows.map((row) => row.cumulative_total_effect_pct),
          smooth: true,
          symbol: "none",
          lineStyle: {
            width: 3,
            color: ATTRIBUTION_TREND_COLORS.total,
          },
        },
      ],
    };
  }, [rows]);

  const latestRow = rows?.at(-1) ?? null;

  return (
    <WorkbenchChartShell
      title="Attribution Over Time"
      subtitle="Benchmark-relative effect path across the selected window."
      className="performance-analysis-module performance-analysis-trend-shell"
      actions={
        <span className="performance-analysis-shell-action">
          {chartFrequency}
        </span>
      }
      contextRow={
        <WorkbenchChartContextRow
          label="Attribution trend context"
          className="performance-analysis-context-row"
          items={[
            {
              label: "Window",
              value:
                reportStartDate && reportEndDate
                  ? `${reportStartDate} - ${reportEndDate}`
                  : period,
            },
            {
              label: "Basis",
              value: detailBasis,
            },
            {
              label: "Benchmark",
              value: benchmark ?? "Unassigned",
            },
            {
              label: "Segment",
              value: attributionDimension,
            },
          ]}
        />
      }
      metricStrip={
        latestRow ? (
          <WorkbenchSummaryMetricStrip
            className="performance-analysis-metric-strip"
            ariaLabel="Attribution trend summary strip"
            items={[
              {
                label: "Latest Active Return",
                value: formatPct(latestRow.active_return_pct),
              },
              {
                label: "Cumulative Total",
                value: formatPct(latestRow.cumulative_total_effect_pct),
              },
              {
                label: "Residual",
                value: formatPct(latestRow.residual_pct),
              },
            ]}
          />
        ) : undefined
      }
    >
      {isLoading ? (
        <PerformanceAnalysisStatePanel
          state="loading"
          title="Loading attribution trend"
          body="Loading attribution effect trend."
        />
      ) : chartOption ? (
        <div
          className="performance-chart-library-frame"
          role="img"
          aria-label="Attribution over time chart"
        >
          <ReactECharts
            option={chartOption}
            style={{ width: "100%", height: "320px" }}
            opts={{ renderer: "svg" }}
            notMerge
            lazyUpdate
          />
        </div>
      ) : (
        <PerformanceAnalysisStatePanel
          state="unavailable"
          title="Attribution trend unavailable"
          body="Attribution trend is not available for the current selection."
        />
      )}
    </WorkbenchChartShell>
  );
}
