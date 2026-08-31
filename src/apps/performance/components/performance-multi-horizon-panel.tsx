"use client";

import { useEffect, useMemo, useRef, useState } from "react";

import { ActionButton, ScreenStatePanel } from "@/design-system";
import type {
  PerformanceBenchmarkOptionView,
  WorkbenchPerformanceHorizonComparison,
} from "@/features/workbench/types";

import { formatLabel } from "../formatters";
import {
  buildPerformanceHorizonVisualModel,
  buildPerformanceHorizonTableModel,
  type PerformanceHorizonTableView,
  type PerformanceHorizonBasisView,
  type PerformanceHorizonVisualMode,
} from "./performance-analytics-table-models";
import type { PerformanceChartViewMode } from "./performance-chart-panel-helpers";
import type { PerformanceWorkspaceRequestPatch } from "./performance-workspace-types";
import PerformanceHorizonComparisonDisclosure from "./performance-horizon-comparison-disclosure";
import { usePerformanceHorizonComparison } from "./performance-horizon-comparison-state";
import PerformanceHorizonComparisonMatrix from "./performance-horizon-comparison-matrix";
import PerformanceHorizonComparisonToolbar, {
  type PerformanceHorizonBasisSelection,
  type PerformanceHorizonVisualSelection,
} from "./performance-horizon-comparison-toolbar";
import styles from "./performance-multi-horizon-panel.module.css";
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
  asOfDate,
  reportingCurrency: requestedReportingCurrency,
  benchmarkOptions = [],
  returnView = "absolute",
  onRequestChange,
}: {
  portfolioId: string;
  period: string;
  detailBasis: string;
  benchmark?: string;
  chartFrequency: string;
  reportStartDate?: string;
  reportEndDate?: string;
  asOfDate?: string;
  reportingCurrency?: string;
  benchmarkOptions?: PerformanceBenchmarkOptionView[];
  returnView?: PerformanceChartViewMode;
  onRequestChange?: (patch: PerformanceWorkspaceRequestPatch) => void;
}) {
  const inheritedBasis = detailBasis === "GROSS" ? "gross" : "net";
  const request = useMemo(
    () => ({
      portfolioId,
      period,
      detailBasis,
      benchmark,
      chartFrequency,
      reportStartDate,
      reportEndDate,
      asOfDate,
      reportingCurrency: requestedReportingCurrency,
    }),
    [asOfDate, benchmark, chartFrequency, detailBasis, period, portfolioId, reportEndDate, reportStartDate, requestedReportingCurrency],
  );
  const { state, refresh, requestKey } = usePerformanceHorizonComparison(request);
  const refreshButtonRef = useRef<HTMLButtonElement>(null);
  const restoreRefreshFocusRequestKeyRef = useRef<string | null>(null);
  const comparison = state.status === "ready" ? state.comparison : null;
  const rows = comparison?.rows ?? null;
  const observationCount = rows?.length ?? 0;
  const isSingleObservation = observationCount === 1;
  const isMultiObservation = observationCount > 1;
  const evidenceState =
    state.status === "ready"
      ? isMultiObservation
        ? "multi-observation"
        : isSingleObservation
          ? "single-observation"
          : "empty"
      : state.status;
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

  useEffect(() => {
    if (
      restoreRefreshFocusRequestKeyRef.current &&
      restoreRefreshFocusRequestKeyRef.current !== requestKey
    ) {
      restoreRefreshFocusRequestKeyRef.current = null;
    }
    if (state.status === "loading" || !restoreRefreshFocusRequestKeyRef.current) {
      return;
    }

    const activeElement = document.activeElement;
    const shouldRestore =
      restoreRefreshFocusRequestKeyRef.current === requestKey &&
      (activeElement === document.body || activeElement === refreshButtonRef.current);
    restoreRefreshFocusRequestKeyRef.current = null;
    if (shouldRestore) {
      refreshButtonRef.current?.focus();
    }
  }, [requestKey, state.status]);

  const selectedPeriodRow =
    rows?.find((row) => row.period === period) ??
    rows?.find((row) => row.period === "YTD") ??
    rows?.[0];
  const presentation = getPerformanceHorizonPresentation({
    benchmark,
    benchmarkOptions: resolvedBenchmarkOptions,
    detailBasis,
    period,
    selectedPeriodRow,
  });
  const hasRelativeVisual = (rows ?? []).some(
    (row) => row.active_return_pct != null || row.cumulative_active_return_pct != null
  );

  return (
    <PerformanceSummaryDriverModule
      title={presentation.frame.title}
      subtitle={presentation.frame.subtitle}
      actions={
        <div className={styles.actions}>
          <span className={styles.frequency}>{comparison?.chart_frequency ?? chartFrequency}</span>
          <ActionButton
            ref={refreshButtonRef}
            priority="quiet"
            className={styles.refresh}
            disabled={state.status === "loading" || state.status === "permission_blocked"}
            onClick={() => {
              restoreRefreshFocusRequestKeyRef.current =
                document.activeElement === refreshButtonRef.current ? requestKey : null;
              refresh();
            }}
          >
            {state.status === "loading"
              ? "Refreshing…"
              : state.status === "permission_blocked"
                ? "Comparison restricted"
                : "Refresh comparison"}
          </ActionButton>
        </div>
      }
    >
      <div
        className={styles.evidence}
        data-testid="horizon-comparison-evidence"
        data-state={evidenceState}
        data-observation-count={observationCount}
      >
        {state.status === "loading" ? (
          <ScreenStatePanel
            kind="loading"
            title="Loading horizon comparison"
            body={presentation.loadingBody}
            surface="analysis"
            rows={4}
          />
        ) : state.status === "permission_blocked" ? (
          <div role="alert" aria-live="assertive" aria-atomic="true">
            <ScreenStatePanel
              kind="permission_blocked"
              title="Horizon comparison restricted"
              body="Your current access does not permit this horizon request. Other source-confirmed performance evidence remains available."
              hint={state.httpStatus ? `Source response ${state.httpStatus}.` : undefined}
              surface="analysis"
            />
          </div>
        ) : state.status === "context_mismatch" ? (
          <ScreenStatePanel
            kind="unavailable"
            title="Horizon comparison not available for this review"
            body="The source did not confirm the selected review date and reporting currency for this comparison. No base-currency figures have been mixed into the review."
            surface="analysis"
          />
        ) : state.status === "error" ? (
          <div role="alert" aria-live="assertive" aria-atomic="true">
            <ScreenStatePanel
              kind="error"
              title="Horizon comparison could not be refreshed"
              body="The source request did not complete. No comparison has been inferred from unavailable evidence."
              hint={
                state.httpStatus
                  ? `Source response ${state.httpStatus}. Use Refresh comparison to retry this exact selection.`
                  : "Use Refresh comparison to retry this exact selection."
              }
              surface="analysis"
            />
          </div>
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
            {isSingleObservation ? (
              <div className={styles.singleObservationNotice} role="status">
                <strong>One published horizon</strong>
                <span>
                  {rows[0].period} is available as exact return evidence. A comparison requires at least two published horizons.
                </span>
              </div>
            ) : null}
            <PerformanceHorizonComparisonContent
              key={`${requestKey}:${returnView}`}
              rows={rows}
              reportingCurrency={reportingCurrency}
              inheritedBasis={inheritedBasis}
              inheritedReturnView={returnView}
              selectedPeriodLabel={presentation.selectedPeriodLabel}
              hasRelativeVisual={hasRelativeVisual}
              isMultiObservation={isMultiObservation}
            />
          </>
        ) : (
          <ScreenStatePanel
            kind="unavailable"
            title="No published horizon comparison"
            body="The source returned no horizon observations for this selection. No portfolio or benchmark result has been inferred."
            surface="analysis"
          />
        )}
      </div>
    </PerformanceSummaryDriverModule>
  );
}

function PerformanceHorizonComparisonContent({
  rows,
  reportingCurrency,
  inheritedBasis,
  inheritedReturnView,
  selectedPeriodLabel,
  hasRelativeVisual,
  isMultiObservation,
}: {
  rows: NonNullable<WorkbenchPerformanceHorizonComparison["rows"]>;
  reportingCurrency: string;
  inheritedBasis: PerformanceHorizonBasisView;
  inheritedReturnView: PerformanceChartViewMode;
  selectedPeriodLabel: string;
  hasRelativeVisual: boolean;
  isMultiObservation: boolean;
}) {
  const [tableView, setTableView] = useState<PerformanceHorizonTableView>("combined");
  const [basisSelection, setBasisSelection] =
    useState<PerformanceHorizonBasisSelection>("inherit");
  const [visualSelection, setVisualSelection] =
    useState<PerformanceHorizonVisualSelection>("inherit");
  const basisView = basisSelection === "inherit" ? inheritedBasis : basisSelection;
  const inheritedVisualMode: PerformanceHorizonVisualMode =
    inheritedReturnView === "relative" ? "relative" : "absolute";
  const visualMode = visualSelection === "inherit" ? inheritedVisualMode : visualSelection;
  const resolvedVisualMode =
    visualMode === "relative" && !hasRelativeVisual ? "absolute" : visualMode;
  const tableModel = useMemo(
    () => buildPerformanceHorizonTableModel({
      rows,
      reportingCurrency,
      tableView,
      basisView,
      selectedPeriodLabel,
    }),
    [basisView, reportingCurrency, rows, selectedPeriodLabel, tableView],
  );
  const visualCards = useMemo(
    () => buildPerformanceHorizonVisualModel({
      rows,
      basisView,
      visualMode: resolvedVisualMode,
    }),
    [basisView, resolvedVisualMode, rows],
  );

  return (
    <>
      <div className={styles.reviewBar} data-performance-horizon-review-bar="true">
        <PerformanceHorizonComparisonToolbar
          tableView={tableView}
          basisSelection={basisSelection}
          visualSelection={visualSelection}
          inheritedBasis={inheritedBasis}
          inheritedReturnView={inheritedReturnView}
          resolvedVisualMode={resolvedVisualMode}
          hasRelativeVisual={hasRelativeVisual}
          showVisualMode={isMultiObservation}
          onTableViewChange={setTableView}
          onBasisSelectionChange={setBasisSelection}
          onVisualSelectionChange={setVisualSelection}
        />
      </div>
      <div className={styles.panelBody} data-performance-horizon-panel-body="true">
        {isMultiObservation ? (
          <PerformanceHorizonComparisonMatrix
            cards={visualCards}
            visualMode={resolvedVisualMode}
          />
        ) : null}
        <PerformanceHorizonComparisonDisclosure
          tableModel={tableModel}
          observationCount={rows.length}
        />
      </div>
    </>
  );
}
