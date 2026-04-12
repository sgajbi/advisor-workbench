"use client";

import { useEffect, useMemo, useRef, useState } from "react";

import {
  AnalyticsTable,
  WorkbenchChartContextRow,
  WorkbenchSegmentedControl,
  WorkbenchSummaryToolbar,
} from "@/design-system";
import { getWorkbenchPerformanceHorizonComparisonClient } from "@/features/workbench/api";
import type {
  PerformanceBenchmarkOptionView,
  WorkbenchPerformanceHorizonComparison,
} from "@/features/workbench/types";

import { formatDate, formatLabel } from "../formatters";
import {
  buildPerformanceHorizonVisualModel,
  buildPerformanceHorizonTableModel,
  type PerformanceHorizonBasisView,
  type PerformanceHorizonTableView,
  type PerformanceHorizonVisualMode,
} from "./performance-analytics-table-models";
import type { PerformanceWorkspaceRequestPatch } from "./performance-workspace-types";
import PerformanceAnalyticalUnavailableState from "./performance-analytical-unavailable-state";
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
  const resolvedWindowLabel =
    comparison?.report_start_date && comparison?.report_end_date
      ? `${formatDate(comparison.report_start_date)} - ${formatDate(comparison.report_end_date)}`
      : presentation.selectedPeriodLabel;
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
  const showSupportColumn = visualMode !== "relative";
  const supportHeaderLabel = visualMode === "basis" ? "Fee drag / cumulative" : "Active / cumulative";
  const supportPrimaryLabel = visualMode === "basis" ? "Fee drag" : "Active";
  const supportSecondaryLabel = "Cumulative";

  useEffect(() => {
    if (visualMode === "relative" && !hasRelativeVisual) {
      setVisualMode("absolute");
    }
  }, [hasRelativeVisual, visualMode]);

  return (
    <PerformanceSummaryDriverModule
      title={presentation.frame.title}
      subtitle={presentation.frame.subtitle}
      actions={null}
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
                key: "benchmark",
                label: "Benchmark",
                value: presentation.benchmarkLabel,
              },
              {
                key: "resolved-window",
                label: "Period Range",
                value: resolvedWindowLabel,
              },
            ]}
          />
          <WorkbenchSummaryToolbar className="performance-horizon-toolbar">
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
            className={
              showSupportColumn
                ? "performance-horizon-matrix"
                : "performance-horizon-matrix performance-horizon-matrix-no-support"
            }
            aria-label="Multi-horizon returns"
          >
            <div className="performance-horizon-matrix-header" aria-hidden="true">
              <span>Period</span>
              <span>{visualCards[0]?.leftBarLabel ?? "Portfolio Return"}</span>
              <span>{visualCards[0]?.rightBarLabel ?? "Benchmark Return"}</span>
              {showSupportColumn ? (
                <div className="performance-horizon-matrix-support-header">
                  <span>{supportHeaderLabel}</span>
                  <div className="performance-horizon-matrix-support-subheader">
                    <span>{supportPrimaryLabel}</span>
                    <span>{supportSecondaryLabel}</span>
                  </div>
                </div>
              ) : null}
            </div>
            {visualCards.map((card) => (
              <div key={card.key} className="performance-horizon-matrix-row">
                <div className="performance-horizon-matrix-period">
                  <strong>{card.label}</strong>
                </div>
                <div className="performance-horizon-matrix-comparison">
                  <div className="performance-horizon-matrix-metric">
                    <div className="performance-horizon-matrix-metric-header">
                      <strong>{card.primaryValue}</strong>
                    </div>
                    <div className="performance-horizon-bar-track">
                      <div
                        className={card.leftBarClassName}
                        style={{
                          width: `${Math.max(card.leftBarHeightPct, 2)}%`,
                        }}
                        aria-label={`${card.label} ${card.leftBarLabel}`}
                      />
                    </div>
                  </div>
                </div>
                <div className="performance-horizon-matrix-comparison">
                  <div className="performance-horizon-matrix-metric">
                    <div className="performance-horizon-matrix-metric-header">
                      <strong>{card.secondaryValue}</strong>
                    </div>
                    <div className="performance-horizon-bar-track">
                      <div
                        className={card.rightBarClassName}
                        style={{
                          width: `${Math.max(card.rightBarHeightPct, 2)}%`,
                        }}
                        aria-label={`${card.label} ${card.rightBarLabel}`}
                      />
                    </div>
                  </div>
                </div>
                {showSupportColumn ? (
                  <div className="performance-horizon-matrix-support">
                    {card.tertiaryValue != null ? (
                      <strong aria-label={`${card.label} ${supportPrimaryLabel}`}>
                        {card.tertiaryValue}
                      </strong>
                    ) : (
                      <span aria-hidden="true"> </span>
                    )}
                    <strong>{card.footerValue}</strong>
                  </div>
                ) : null}
              </div>
            ))}
          </div>
          <details className="performance-horizon-table-disclosure">
            <summary className="performance-horizon-table-disclosure-summary">
              <div className="performance-horizon-table-disclosure-copy">
                <strong>Detailed table</strong>
                <span>Open the full economics and return breakdown across all reporting windows.</span>
              </div>
            </summary>
            <div
              className="performance-horizon-table-scroll"
              role="region"
              aria-label="Scrollable horizon comparison table"
              tabIndex={0}
            >
              <AnalyticsTable
                ariaLabel="Multi-horizon return table"
                columns={tableModel.columns}
                rows={tableModel.rows}
                density="compact"
                variant="observation"
                className="performance-horizon-table performance-chart-observation-table"
              />
            </div>
          </details>
        </>
      ) : (
        <PerformanceAnalyticalUnavailableState
          ariaLabel="Horizon comparison unavailable state"
          status="unavailable"
          kicker={null}
          title="Horizon comparison is unavailable for this mandate"
          body={presentation.emptyBody}
          hint="Source-backed multi-horizon observations must be exposed before cross-window comparison can render."
          contextItems={[
            { label: "Window", value: resolvedWindowLabel },
            { label: "Benchmark", value: presentation.benchmarkLabel },
            { label: "Basis", value: formatLabel(detailBasis) },
          ]}
          availableItems={[
            {
              label: "Controls",
              value: normalizationNotice
                ? normalizationNotice.message
                : "Benchmark and comparison controls remain available.",
            },
          ]}
        />
      )}
    </PerformanceSummaryDriverModule>
  );
}
