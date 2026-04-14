"use client";

import { useEffect, useMemo, useState } from "react";

import {
  WorkbenchLoadingState,
} from "@/design-system";
import type {
  PerformanceBenchmarkOptionView,
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
import { usePerformanceHorizonComparison } from "./performance-horizon-comparison-state";
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
  const [tableView, setTableView] = useState<PerformanceHorizonTableView>("combined");
  const [basisView, setBasisView] = useState<PerformanceHorizonBasisView>("both");
  const [visualMode, setVisualMode] = useState<PerformanceHorizonVisualMode>("absolute");
  const { comparison, isLoading } = usePerformanceHorizonComparison({
    portfolioId,
    period,
    detailBasis,
    benchmark,
    chartFrequency,
    reportStartDate,
    reportEndDate,
    benchmarkOptions,
  });
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
          <div className="performance-horizon-review-bar">
            <PerformanceHorizonComparisonToolbar
              tableView={tableView}
              basisView={basisView}
              visualMode={visualMode}
              hasRelativeVisual={hasRelativeVisual}
              onTableViewChange={setTableView}
              onBasisViewChange={setBasisView}
              onVisualModeChange={setVisualMode}
            />
          </div>
          <div className="performance-horizon-panel-body">
            <PerformanceHorizonComparisonMatrix cards={visualCards} visualMode={visualMode} />
            <PerformanceHorizonComparisonDisclosure tableModel={tableModel} />
          </div>
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
            {
              label: "Window",
              value:
                comparison?.report_start_date && comparison?.report_end_date
                  ? `${formatDate(comparison.report_start_date)} - ${formatDate(comparison.report_end_date)}`
                  : presentation.selectedPeriodLabel,
            },
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
