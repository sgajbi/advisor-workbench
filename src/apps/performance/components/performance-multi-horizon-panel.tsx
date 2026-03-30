"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { Typography } from "@mui/material";

import {
  AnalyticsTable,
  WorkbenchChartContextRow,
  WorkbenchSegmentedControl,
  WorkbenchSummaryToolbar,
  WorkbenchSummaryVisualCard,
  WorkbenchSummaryVisualMeta,
  WorkbenchSummaryVisualValue,
} from "@/design-system";
import { getWorkbenchPerformanceHorizonComparisonClient } from "@/features/workbench/api";
import type {
  PerformanceBenchmarkOptionView,
  WorkbenchPerformanceHorizonComparison,
} from "@/features/workbench/types";

import { formatLabel } from "../formatters";
import {
  buildPerformanceHorizonVisualModel,
  buildPerformanceHorizonTableModel,
  type PerformanceHorizonBasisView,
  type PerformanceHorizonTableView,
  type PerformanceHorizonVisualMode,
} from "./performance-analytics-table-models";
import type { PerformanceWorkspaceRequestPatch } from "./performance-workspace-types";
import PerformanceSummaryDriverModule from "./performance-summary-driver-module";
import { getPerformanceHorizonPresentation } from "./performance-summary-driver-helpers";

export default function PerformanceMultiHorizonPanel({
  portfolioId,
  period,
  detailBasis,
  benchmark,
  chartFrequency,
  reportStartDate,
  reportEndDate,
  benchmarkOptions = [],
  onRequestChange,
}: {
  portfolioId: string;
  period: string;
  detailBasis: string;
  benchmark?: string;
  chartFrequency: string;
  reportStartDate?: string;
  reportEndDate?: string;
  benchmarkOptions?: PerformanceBenchmarkOptionView[];
  onRequestChange?: (patch: PerformanceWorkspaceRequestPatch) => void;
}) {
  const [comparison, setComparison] = useState<WorkbenchPerformanceHorizonComparison | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [tableView, setTableView] = useState<PerformanceHorizonTableView>("combined");
  const [basisView, setBasisView] = useState<PerformanceHorizonBasisView>("both");
  const [visualMode, setVisualMode] = useState<PerformanceHorizonVisualMode>("absolute");
  const requestIdRef = useRef(0);
  const cacheRef = useRef<Map<string, WorkbenchPerformanceHorizonComparison>>(new Map());

  useEffect(() => {
    const cacheKey = JSON.stringify({
      portfolioId,
      period,
      detailBasis,
      benchmark: benchmark ?? null,
      chartFrequency,
      reportStartDate: reportStartDate ?? null,
      reportEndDate: reportEndDate ?? null,
    });
    const cached = cacheRef.current.get(cacheKey);
    if (cached) {
      setComparison(cached);
      setIsLoading(false);
      return;
    }

    const requestId = requestIdRef.current + 1;
    requestIdRef.current = requestId;
    setIsLoading(true);

    void getWorkbenchPerformanceHorizonComparisonClient(portfolioId, {
      period,
      detailBasis,
      benchmark,
      chartFrequency,
      reportStartDate,
      reportEndDate,
    })
      .then((result) => {
        if (requestIdRef.current !== requestId) {
          return;
        }
        cacheRef.current.set(cacheKey, result);
        setComparison(result);
      })
      .catch(() => {
        if (requestIdRef.current !== requestId) {
          return;
        }
        setComparison({
          correlation_id: "",
          contract_version: "v1",
          portfolio_id: portfolioId,
          as_of_date: "",
          period,
          report_start_date: reportStartDate ?? "",
          report_end_date: reportEndDate ?? "",
          reporting_currency: null,
          detail_basis: detailBasis,
          chart_frequency: chartFrequency,
          requested_chart_frequency_supported: true,
          benchmark_code: benchmark ?? null,
          benchmark_options: benchmarkOptions,
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
    benchmark,
    benchmarkOptions,
    chartFrequency,
    detailBasis,
    portfolioId,
    period,
    reportEndDate,
    reportStartDate,
  ]);
  const rows = comparison?.rows ?? null;
  const reportingCurrency = comparison?.reporting_currency ?? "USD";
  const normalizationNotice =
    comparison?.requested_chart_frequency_supported === false
      ? {
          title: "Selection adjusted",
          message: `Unsupported frequency was replaced with ${formatLabel(
            comparison.chart_frequency
          )}.`,
        }
      : null;
  const resolvedBenchmarkOptions = comparison?.benchmark_options?.length
    ? comparison.benchmark_options
    : benchmarkOptions;

  useEffect(() => {
    if (
      !comparison ||
      comparison.requested_chart_frequency_supported !== false ||
      comparison.chart_frequency === chartFrequency
    ) {
      return;
    }
    onRequestChange?.({ chartFrequency: comparison.chart_frequency });
  }, [chartFrequency, comparison, onRequestChange]);

  const selectedPeriodRow =
    rows?.find((row) => row.period === period) ?? rows?.find((row) => row.period === "YTD") ?? rows?.[0];
  const presentation = getPerformanceHorizonPresentation({
    benchmark,
    benchmarkOptions: resolvedBenchmarkOptions,
    detailBasis,
    period,
    selectedPeriodRow,
  });
  const tableModel = useMemo(() => {
    return buildPerformanceHorizonTableModel({
      rows: rows ?? [],
      reportingCurrency,
      tableView,
      basisView,
      selectedPeriodLabel: presentation.selectedPeriodLabel,
    });
  }, [basisView, presentation.selectedPeriodLabel, reportingCurrency, rows, tableView]);
  const visualCards = useMemo(
    () =>
      buildPerformanceHorizonVisualModel({
        rows: rows ?? [],
        basisView,
        visualMode,
      }),
    [basisView, rows, visualMode]
  );
  const hasRelativeVisual = (rows ?? []).some(
    (row) => row.active_return_pct != null || row.cumulative_active_return_pct != null
  );

  useEffect(() => {
    if (visualMode === "relative" && !hasRelativeVisual) {
      setVisualMode("absolute");
    }
  }, [hasRelativeVisual, visualMode]);

  return (
    <PerformanceSummaryDriverModule
      title={presentation.frame.title}
      subtitle={presentation.frame.subtitle}
      actions={
        presentation.frame.actionLabel ? (
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
            {presentation.frame.actionLabel}
          </Typography>
        ) : null
      }
    >
      {isLoading ? (
        <p className="muted">{presentation.loadingBody}</p>
      ) : rows && rows.length > 0 ? (
        <>
          {normalizationNotice ? (
            <div
              className="performance-control-normalization-note"
              role="status"
              aria-label="Horizon comparison normalization"
            >
              <p className="performance-control-normalization-note-title">
                {normalizationNotice.title}
              </p>
              <p className="performance-control-normalization-note-message">
                {normalizationNotice.message}
              </p>
            </div>
          ) : null}
          <WorkbenchChartContextRow
            className="performance-horizon-context-row"
            itemClassName="performance-mini-legend-item"
            label="Horizon comparison context"
            items={[
              {
                key: "selected-period",
                label: "Selected period",
                value: presentation.selectedPeriodLabel,
              },
              {
                key: "active-return",
                label: "Active return",
                value: presentation.activeReturnLabel,
              },
              {
                key: "benchmark",
                label: "Compared against",
                value: presentation.benchmarkLabel,
              },
            ]}
          />
          <WorkbenchSummaryToolbar className="performance-mini-legend">
            <span className="performance-mini-legend-item performance-mini-legend-portfolio">
              Portfolio
            </span>
            <span className="performance-mini-legend-item performance-mini-legend-benchmark">
              {presentation.benchmarkLegendLabel}
            </span>
            <WorkbenchSegmentedControl
              ariaLabel="Horizon table view"
              className="performance-horizon-table-view"
              value={tableView}
              onChange={setTableView}
              options={[
                { key: "combined", label: "Combined" },
                { key: "returns", label: "Returns" },
                { key: "economics", label: "Economics" },
              ]}
            />
            <WorkbenchSegmentedControl
              ariaLabel="Horizon basis view"
              className="performance-horizon-basis-view"
              value={basisView}
              onChange={setBasisView}
              options={[
                { key: "both", label: "Both" },
                { key: "net", label: "Net" },
                { key: "gross", label: "Gross" },
              ]}
            />
            <WorkbenchSegmentedControl
              ariaLabel="Horizon visual mode"
              className="performance-horizon-visual-mode"
              value={visualMode}
              onChange={setVisualMode}
              options={[
                { key: "absolute", label: "Absolute" },
                {
                  key: "relative",
                  label: "Relative",
                  disabled: !hasRelativeVisual,
                  title: hasRelativeVisual
                    ? undefined
                    : "Relative view requires active return observations.",
                },
                { key: "basis", label: "Basis" },
              ]}
            />
          </WorkbenchSummaryToolbar>
          <div
            className="performance-horizon-bars workbench-summary-visual-grid"
            aria-label="Multi-horizon returns"
          >
            {visualCards.map((card) => (
              <WorkbenchSummaryVisualCard
                key={card.key}
                className="performance-horizon-bar-group workbench-summary-visual-card"
              >
                <div className="performance-horizon-bar-values">
                  <WorkbenchSummaryVisualMeta>{card.primaryValue}</WorkbenchSummaryVisualMeta>
                  <WorkbenchSummaryVisualMeta>{card.secondaryValue}</WorkbenchSummaryVisualMeta>
                  {card.tertiaryValue ? (
                    <WorkbenchSummaryVisualMeta>{card.tertiaryValue}</WorkbenchSummaryVisualMeta>
                  ) : null}
                </div>
                <div className="performance-horizon-bar-track">
                  <div
                    className={card.leftBarClassName}
                    style={{
                      height: `${Math.max(card.leftBarHeightPct * 1.2, 2)}px`,
                    }}
                    aria-label={`${card.label} ${card.leftBarLabel}`}
                  />
                  <div
                    className={card.rightBarClassName}
                    style={{
                      height: `${Math.max(card.rightBarHeightPct * 1.2, 2)}px`,
                    }}
                    aria-label={`${card.label} ${card.rightBarLabel}`}
                  />
                </div>
                <div className="performance-horizon-bar-footer">
                  <WorkbenchSummaryVisualValue>{card.label}</WorkbenchSummaryVisualValue>
                  <WorkbenchSummaryVisualMeta>
                    {card.spreadLabel} {card.spreadValue}
                  </WorkbenchSummaryVisualMeta>
                </div>
              </WorkbenchSummaryVisualCard>
            ))}
          </div>
          <AnalyticsTable
            ariaLabel="Multi-horizon return table"
            columns={tableModel.columns}
            rows={tableModel.rows}
            dense
            className="performance-horizon-table"
          />
        </>
      ) : (
        <p className="muted">{presentation.emptyBody}</p>
      )}
    </PerformanceSummaryDriverModule>
  );
}
