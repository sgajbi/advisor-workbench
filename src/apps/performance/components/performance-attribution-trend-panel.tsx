"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import type { EChartsOption } from "echarts";
import ReactECharts from "echarts-for-react";

import {
  AnalyticsTable,
  ScreenStatePanel,
  WorkbenchChartShell,
  WorkbenchSummaryMetricStrip,
} from "@/design-system";
import { lotusThemeTokens } from "@/design-system/theme/tokens";
import { getWorkbenchPerformanceAttributionTrendClient } from "@/features/workbench/api";
import type {
  WorkbenchPerformanceAttributionTrend,
} from "@/features/workbench/types";

import { formatLabel } from "../formatters";
import { buildPerformanceAttributionTrendTableModel } from "./performance-analytics-table-models";
import type { PerformanceWorkspaceRequestPatch } from "./performance-workspace-types";
import {
  getAttributionTrendUnavailableBody,
  getAttributionTrendSummaryItems,
} from "./performance-attribution-presentations";

type Props = {
  portfolioId: string;
  period: string;
  chartFrequency: string;
  attributionDimension: string;
  detailBasis: string;
  benchmark?: string;
  reportStartDate?: string;
  reportEndDate?: string;
  onRequestChange?: (patch: PerformanceWorkspaceRequestPatch) => void;
};

const ATTRIBUTION_TREND_COLORS = {
  allocation: "#4d96d9",
  selection: "#4caf50",
  interaction: "#da1e28",
  total: "#2d3748",
};

const ATTRIBUTION_CHART_TEXT = {
  legendSize: Number.parseFloat(lotusThemeTokens.typography.size.textSm),
  axisSize: Number.parseFloat(lotusThemeTokens.typography.size.textXs),
  legendWeight: lotusThemeTokens.typography.variant.cardTitle.weight,
  axisWeight: lotusThemeTokens.typography.variant.label.weight,
  tooltipPadding: [
    Number.parseInt(lotusThemeTokens.spacing.step3, 10),
    Number.parseInt(lotusThemeTokens.spacing.step4, 10),
  ] as [number, number],
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
  onRequestChange,
}: Props) {
  const [trend, setTrend] = useState<WorkbenchPerformanceAttributionTrend | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const requestIdRef = useRef(0);
  const cacheRef = useRef<Map<string, WorkbenchPerformanceAttributionTrend>>(new Map());

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
      setTrend(cached);
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
        cacheRef.current.set(cacheKey, result);
        setTrend(result);
      })
      .catch(() => {
        if (requestIdRef.current !== requestId) {
          return;
        }
        setTrend({
          correlation_id: "",
          contract_version: "v1",
          portfolio_id: portfolioId,
          as_of_date: "",
          period,
          report_start_date: reportStartDate ?? "",
          report_end_date: reportEndDate ?? "",
          chart_frequency: chartFrequency,
          detail_basis: detailBasis,
          attribution_dimension: attributionDimension,
          requested_chart_frequency_supported: true,
          requested_attribution_dimension_supported: true,
          benchmark_code: benchmark ?? null,
          rows: [],
          warnings: [],
          partial_failures: [],
        });
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
  const rows = trend?.rows ?? null;

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
        itemWidth: 18,
        itemHeight: 8,
        itemGap: 16,
        textStyle: {
          color: "#485668",
          fontSize: ATTRIBUTION_CHART_TEXT.legendSize,
          fontWeight: ATTRIBUTION_CHART_TEXT.legendWeight,
        },
      },
      tooltip: {
        trigger: "axis",
        axisPointer: { type: "cross" },
        borderColor: "rgba(36, 50, 70, 0.14)",
        backgroundColor: "rgba(255, 255, 255, 0.98)",
        padding: ATTRIBUTION_CHART_TEXT.tooltipPadding,
        textStyle: {
          color: "#172033",
          fontSize: ATTRIBUTION_CHART_TEXT.legendSize,
          fontWeight: ATTRIBUTION_CHART_TEXT.legendWeight,
        },
        valueFormatter: (value: unknown) =>
          typeof value === "number" ? `${value.toFixed(2)}%` : "",
      },
      xAxis: {
        type: "category",
        data: rows.map((row) => row.period_label),
        axisLine: { lineStyle: { color: "rgba(52, 70, 95, 0.18)" } },
        axisTick: { show: false },
        axisLabel: {
          color: "#5f6c7f",
          fontSize: ATTRIBUTION_CHART_TEXT.axisSize,
          fontWeight: ATTRIBUTION_CHART_TEXT.axisWeight,
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
              color: "rgba(126, 140, 158, 0.16)",
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
          barWidth: 14,
          itemStyle: {
            borderColor: "rgba(54, 95, 139, 0.5)",
            borderWidth: 1,
          },
        },
        {
          name: "Selection",
          type: "bar",
          stack: "effects",
          data: rows.map((row) => row.selection_pct),
          barWidth: 14,
          itemStyle: {
            borderColor: "rgba(37, 110, 70, 0.5)",
            borderWidth: 1,
          },
        },
        {
          name: "Interaction",
          type: "bar",
          stack: "effects",
          data: rows.map((row) => row.interaction_pct),
          barWidth: 14,
          itemStyle: {
            borderColor: "rgba(169, 26, 41, 0.48)",
            borderWidth: 1,
          },
        },
        {
          name: "Cumulative Total",
          type: "line",
          data: rows.map((row) => row.cumulative_total_effect_pct),
          smooth: false,
          symbol: "circle",
          symbolSize: 6,
          lineStyle: {
            width: 3,
            color: ATTRIBUTION_TREND_COLORS.total,
            cap: "round",
            join: "round",
          },
        },
      ],
    };
  }, [rows]);

  const tableModel = useMemo(
    () => buildPerformanceAttributionTrendTableModel({ rows: rows ?? [] }),
    [rows]
  );
  const metricItems = useMemo(
    () => getAttributionTrendSummaryItems(trend),
    [trend]
  );
  const normalizationMessages: string[] = [];
  if (trend?.requested_chart_frequency_supported === false) {
    normalizationMessages.push(
      `frequency reset to ${formatLabel(trend.chart_frequency)}`
    );
  }
  if (trend?.requested_attribution_dimension_supported === false) {
    normalizationMessages.push(
      `segment reset to ${formatLabel(trend.attribution_dimension)}`
    );
  }

  useEffect(() => {
    if (!trend || !onRequestChange) {
      return;
    }

    const patch: PerformanceWorkspaceRequestPatch = {};
    if (
      trend.requested_chart_frequency_supported === false &&
      trend.chart_frequency !== chartFrequency
    ) {
      patch.chartFrequency = trend.chart_frequency;
    }
    if (
      trend.requested_attribution_dimension_supported === false &&
      trend.attribution_dimension !== attributionDimension
    ) {
      patch.attributionDimension = trend.attribution_dimension;
    }

    if (Object.keys(patch).length > 0) {
      onRequestChange(patch);
    }
  }, [attributionDimension, chartFrequency, onRequestChange, trend]);

  return (
    <WorkbenchChartShell
      title="Attribution Over Time"
      className="performance-analysis-module performance-analysis-trend-shell performance-workspace-panel"
      actions={
        <span className="performance-analysis-shell-action">
          {trend?.chart_frequency ?? chartFrequency}
        </span>
      }
      metricStrip={
        metricItems.length ? (
          <WorkbenchSummaryMetricStrip
            className="performance-analysis-metric-strip"
            ariaLabel="Attribution trend summary strip"
            items={metricItems}
          />
        ) : undefined
      }
    >
      {normalizationMessages.length > 0 ? (
        <div
          className="performance-control-normalization-note"
          role="status"
          aria-label="Attribution trend normalization"
        >
          <p className="performance-control-normalization-note-title">Selection adjusted</p>
          <p className="performance-control-normalization-note-message">
            Unsupported controls were replaced with supported defaults: {normalizationMessages.join(" • ")}.
          </p>
        </div>
      ) : null}
      {isLoading ? (
        <ScreenStatePanel
          kind="loading"
          title="Loading attribution trend"
          body="Loading attribution effect trend."
          surface="analysis"
        />
      ) : chartOption ? (
        <>
          <div
            className="performance-chart-library-frame"
            role="img"
            aria-label="Attribution over time chart"
          >
            <ReactECharts
              option={chartOption}
              style={{ width: "100%", height: "344px" }}
              opts={{ renderer: "svg" }}
              notMerge
              lazyUpdate
            />
          </div>
          <AnalyticsTable
            ariaLabel="Attribution trend table"
            columns={tableModel.columns}
            rows={tableModel.rows}
            density="compact"
            variant="analysis"
            className="performance-analysis-table performance-attribution-trend-table"
          />
        </>
      ) : (
        <ScreenStatePanel
          kind="unavailable"
          title="Attribution trend unavailable"
          body={getAttributionTrendUnavailableBody(trend)}
          surface="analysis"
        />
      )}
    </WorkbenchChartShell>
  );
}
