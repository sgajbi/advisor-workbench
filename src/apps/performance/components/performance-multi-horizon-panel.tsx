"use client";

import { useEffect, useMemo, useRef, useState } from "react";

import {
  WorkbenchChartContextRow,
  WorkbenchLoadingState,
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
import PerformanceHorizonComparisonDisclosure from "./performance-horizon-comparison-disclosure";
import PerformanceHorizonComparisonMatrix from "./performance-horizon-comparison-matrix";
import PerformanceHorizonComparisonToolbar from "./performance-horizon-comparison-toolbar";
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
        <WorkbenchLoadingState
          className="performance-horizon-loading-state"
          title="Loading horizon comparison"
          message={presentation.loadingBody}
          rows={4}
        />
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
                key: "resolved-window",
                label: "Period Range",
                value: resolvedWindowLabel,
              },
              {
                key: "benchmark",
                label: "Benchmark",
                value: presentation.benchmarkLabel,
              },
            ]}
          />
          <PerformanceHorizonComparisonToolbar
            tableView={tableView}
            basisView={basisView}
            visualMode={visualMode}
            hasRelativeVisual={hasRelativeVisual}
            onTableViewChange={setTableView}
            onBasisViewChange={setBasisView}
            onVisualModeChange={setVisualMode}
          />
          <PerformanceHorizonComparisonMatrix cards={visualCards} visualMode={visualMode} />
          <PerformanceHorizonComparisonDisclosure tableModel={tableModel} />
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
