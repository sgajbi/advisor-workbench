"use client";

import { FormEvent, useEffect, useMemo, useState } from "react";

import {
  WorkbenchChartShell,
  WorkbenchLoadingState,
} from "@/design-system";
import type { PerformanceWorkspaceCapabilities } from "../capabilities";
import type {
  PerformanceBenchmarkOptionView,
  MoneyWeightedReturnSummary,
  PerformanceChartPoint,
} from "@/features/workbench/types";

import { buildPerformanceReturnPathTableModel } from "./performance-analytics-table-models";
import PerformanceAnalysisControlBar from "./performance-analysis-control-bar";
import PerformanceAnalyticalUnavailableState from "./performance-analytical-unavailable-state";
import PerformanceObservationTrail from "./performance-observation-trail";
import PerformanceReturnPathChartStage from "./performance-return-path-chart-stage";
import PerformanceReturnPathNotices from "./performance-return-path-notices";
import PerformanceReturnPathSummary from "./performance-return-path-summary";
import {
  buildReturnPathChartOption,
  resolveReportDates,
} from "./performance-return-path-chart-model";
import { getPerformanceReturnPathPresentation } from "./performance-summary-context-helpers";
import PerformanceOutcomeStrip from "./performance-outcome-strip";
import {
  buildChartLegendItems,
  buildObservationCountLabel,
  buildResolvedBenchmarkOptions,
  buildReturnDecisionItems,
  buildSingleObservationPresentation,
  hasActiveReturnSeries,
  hasBenchmarkReturnSeries,
  resolveWindowAndBasisLabels,
  type ComparativeSummary,
  type PerformanceChartViewMode,
  type PerformanceControlPatch,
} from "./performance-chart-panel-helpers";

export default function PerformanceChartPanel({
  title,
  points,
  summary,
  portfolioId,
  period,
  detailBasis,
  contributionDimension,
  attributionDimension,
  chartFrequency,
  benchmark,
  benchmarkOptions = [],
  moneyWeightedReturn,
  reportingCurrency,
  reportStartDate,
  reportEndDate,
  capabilities,
  onRequestChange,
  isUpdating = false,
  isDetailsPending = false,
  id,
}: {
  title: string;
  points: PerformanceChartPoint[];
  summary: ComparativeSummary;
  portfolioId: string;
  period: string;
  detailBasis: string;
  contributionDimension: string;
  attributionDimension: string;
  chartFrequency: string;
  benchmark?: string;
  benchmarkOptions?: PerformanceBenchmarkOptionView[];
  moneyWeightedReturn?: MoneyWeightedReturnSummary | null;
  reportingCurrency: string;
  reportStartDate: string;
  reportEndDate: string;
  capabilities: PerformanceWorkspaceCapabilities;
  onRequestChange: (patch: PerformanceControlPatch) => void;
  isUpdating?: boolean;
  isDetailsPending?: boolean;
  id?: string;
}) {
  const resolvedReportDates = useMemo(
    () => resolveReportDates(points, reportStartDate, reportEndDate),
    [points, reportEndDate, reportStartDate]
  );
  const [fromDate, setFromDate] = useState(resolvedReportDates.startDate);
  const [toDate, setToDate] = useState(resolvedReportDates.endDate);
  const hasBenchmarkSeries = hasBenchmarkReturnSeries(points);
  const hasActiveSeries = hasActiveReturnSeries(points);
  const [chartViewMode, setChartViewMode] = useState<PerformanceChartViewMode>(
    hasBenchmarkSeries && hasActiveSeries ? "combined" : "absolute"
  );

  useEffect(() => {
    setFromDate(resolvedReportDates.startDate);
    setToDate(resolvedReportDates.endDate);
  }, [resolvedReportDates.endDate, resolvedReportDates.startDate]);

  useEffect(() => {
    if (chartViewMode === "relative" && !hasActiveSeries) {
      setChartViewMode(hasBenchmarkSeries ? "combined" : "absolute");
      return;
    }
    if (chartViewMode === "combined" && !hasBenchmarkSeries) {
      setChartViewMode("absolute");
    }
  }, [chartViewMode, hasActiveSeries, hasBenchmarkSeries]);
  const resolvedBenchmarkOptions = useMemo(
    () => buildResolvedBenchmarkOptions({ benchmark, benchmarkOptions }),
    [benchmark, benchmarkOptions]
  );
  const returnPathPresentation = getPerformanceReturnPathPresentation({
    summary,
    moneyWeightedReturn,
    points,
    benchmark,
    benchmarkOptions: resolvedBenchmarkOptions,
    capabilities,
    reportingCurrency,
  });
  const chartTableModel = useMemo(
    () =>
      buildPerformanceReturnPathTableModel({
        points,
        viewMode: chartViewMode,
        includeBenchmarkSeries: hasBenchmarkSeries,
        includeActiveSeries: hasActiveSeries,
      }),
    [chartViewMode, hasActiveSeries, hasBenchmarkSeries, points]
  );
  const hasRenderableReturnPath =
    points.length > 0 && capabilities.returnPath.state !== "unavailable";
  const observationCountLabel = buildObservationCountLabel(chartTableModel.rows.length);

  const chartOption = useMemo(() => {
    return buildReturnPathChartOption({
      points,
      chartViewMode,
      hasBenchmarkSeries,
    });
  }, [chartViewMode, hasBenchmarkSeries, points]);
  const singleObservation = useMemo(
    () =>
      buildSingleObservationPresentation({
        points,
        chartViewMode,
        hasBenchmarkSeries,
      }),
    [chartViewMode, hasBenchmarkSeries, points]
  );

  function applyExplicitDates(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!fromDate || !toDate) {
      return;
    }
    onRequestChange({
      period: "EXPLICIT",
      reportStartDate: fromDate,
      reportEndDate: toDate,
    });
  }

  function updateSelection(patch: PerformanceControlPatch) {
    onRequestChange({
      portfolioId,
      period,
      detailBasis,
      contributionDimension,
      attributionDimension,
      chartFrequency,
      benchmark,
      reportStartDate,
      reportEndDate,
      ...patch,
    });
  }

  const { summaryItems, outcomeItems } = buildReturnDecisionItems(
    returnPathPresentation,
    hasRenderableReturnPath
  );
  const outcomeStrip =
    capabilities.summaryKpis.state !== "unavailable" ? (
      <PerformanceOutcomeStrip
        items={outcomeItems.map((metric) => ({
          key: metric.key,
          label: metric.label,
          value: metric.value,
          support: metric.support,
          definition: metric.definition,
          unavailable: metric.unavailable,
        }))}
      />
    ) : null;
  const topContext = hasRenderableReturnPath ? (
    <div className="performance-return-path-top-stack">
      <PerformanceReturnPathSummary items={summaryItems} />
    </div>
  ) : outcomeStrip ? (
    <div className="performance-return-path-top-stack">
      <div className="performance-return-path-supporting-strip">{outcomeStrip}</div>
    </div>
  ) : undefined;
  const { resolvedWindowLabel, resolvedBasisLabel } = resolveWindowAndBasisLabels({
    period,
    detailBasis,
    startDate: resolvedReportDates.startDate,
    endDate: resolvedReportDates.endDate,
  });
  const chartLegendItems = buildChartLegendItems({
    hasBenchmarkSeries,
    hasActiveSeries,
  });

  return (
    <WorkbenchChartShell
      id={id}
      title={title}
      className="performance-chart-stage workbench-summary-panel"
      bodyClassName="performance-return-path-body"
      contextRow={topContext}
      toolbar={
        <PerformanceAnalysisControlBar
          period={period}
          detailBasis={detailBasis}
          chartFrequency={chartFrequency}
          benchmark={benchmark}
          resolvedBenchmarkOptions={resolvedBenchmarkOptions}
          fromDate={fromDate}
          toDate={toDate}
          maxEndDate={resolvedReportDates.endDate}
          minEndDate={resolvedReportDates.startDate}
          chartViewMode={chartViewMode}
          hasBenchmarkSeries={hasBenchmarkSeries}
          hasActiveSeries={hasActiveSeries}
          capabilities={capabilities}
          isUpdating={isUpdating}
          onRequestChange={updateSelection}
          onApplyExplicitDates={applyExplicitDates}
          onFromDateChange={setFromDate}
          onToDateChange={setToDate}
          onChartViewModeChange={setChartViewMode}
        />
      }
      loadingState={
        isDetailsPending ? (
          <WorkbenchLoadingState
            className="performance-chart-loading-state"
            title="Resolving return path and benchmark comparison"
            message="Loading published observations, benchmark context, and active comparison for the selected reporting window."
            rows={2}
            chart
          />
        ) : undefined
      }
      fallbackState={
        !isDetailsPending ? (
          <PerformanceAnalyticalUnavailableState
            ariaLabel={`${title} unavailable`}
            status={capabilities.returnPath.state === "partial" ? "partial" : "unavailable"}
            title={
              capabilities.returnPath.state === "partial"
                ? "Return history is partially available"
                : "Return history is unavailable for the selected window"
            }
            body={
              capabilities.returnPath.reason ??
              "The resolved window does not currently expose published performance observations for this mandate."
            }
            hint="Published return observations and benchmark-relative series must be exposed by the underlying performance contract before the cumulative path can render."
            contextItems={[
              { label: "Window", value: resolvedWindowLabel },
              {
                label: "Benchmark",
                value: returnPathPresentation.benchmarkContextValue,
              },
              { label: "Basis", value: resolvedBasisLabel },
            ]}
            availableItems={[
              {
                label: "Summary metrics",
                value:
                  capabilities.summaryKpis.state === "unavailable"
                    ? "Unavailable"
                    : "Headline return and cash-flow metrics remain available.",
              },
              {
                label: "Evidence",
                value: observationCountLabel,
              },
            ]}
          />
        ) : undefined
      }
    >
      {hasRenderableReturnPath ? (
        <>
          <PerformanceReturnPathNotices
            partialReason={
              capabilities.returnPath.state === "partial"
                ? capabilities.returnPath.reason ??
                  "Return observations are partially published for the selected horizon."
                : null
            }
            benchmarkStateBody={returnPathPresentation.benchmarkStateBody}
          />
          <div className="performance-chart-analysis-grid">
            <PerformanceReturnPathChartStage
              title={title}
              option={chartOption}
              legendItems={chartLegendItems}
              isDetailsPending={isDetailsPending}
              singleObservation={singleObservation}
            />
          </div>
          {outcomeStrip ? (
            <div className="performance-return-path-secondary-strip">{outcomeStrip}</div>
          ) : null}
          <PerformanceObservationTrail tableModel={chartTableModel} />
        </>
      ) : null}
    </WorkbenchChartShell>
  );
}
