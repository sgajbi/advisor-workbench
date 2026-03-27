"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import type { EChartsOption } from "echarts";
import ReactECharts from "echarts-for-react";
import { Typography } from "@mui/material";

import { AnalyticsModule } from "@/design-system";
import { getWorkbenchPerformanceAttributionTrendClient } from "@/features/workbench/api";
import type { PerformanceAttributionTrendRow } from "@/features/workbench/types";

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

  return (
    <AnalyticsModule
      title="Attribution Over Time"
      subtitle={`${detailBasis} benchmark-relative effect path`}
      actions={
        <Typography
          component="span"
          sx={{
            fontSize: "0.75rem",
            fontWeight: 700,
            letterSpacing: "0.08em",
            textTransform: "uppercase",
            color: "text.secondary",
          }}
        >
          {chartFrequency}
        </Typography>
      }
    >
      {isLoading ? (
        <p className="muted">Loading attribution effect trend.</p>
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
        <p className="muted">Attribution trend is not available for the current selection.</p>
      )}
    </AnalyticsModule>
  );
}
