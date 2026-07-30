"use client";

import { FormEvent, useMemo, useState } from "react";

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
import PerformanceMwrDrilldown, {
  buildPerformanceMwrDrilldown,
} from "./performance-mwr-drilldown";
import {
  buildReturnPathChartOption,
  resolveReportDates,
} from "./performance-return-path-chart-model";
import { getPerformanceReturnPathPresentation } from "./performance-summary-context-helpers";
import PerformanceOutcomeStrip from "./performance-outcome-strip";
import {
  buildPerformanceControlSelectionPatch,
  buildChartLegendItems,
  buildResolvedBenchmarkOptions,
  buildReturnDecisionItems,
  buildSingleObservationPresentation,
  hasActiveReturnSeries,
  hasBenchmarkReturnSeries,
  resolveChartViewMode,
  type ComparativeSummary,
  type PerformanceChartViewMode,
  type PerformanceControlPatch,
} from "./performance-chart-panel-helpers";

type ExplicitDateDraft = {
  sourceStartDate: string;
  sourceEndDate: string;
  fromDate: string;
  toDate: string;
};

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
  const [dateDraft, setDateDraft] = useState<ExplicitDateDraft>({
    sourceStartDate: resolvedReportDates.startDate,
    sourceEndDate: resolvedReportDates.endDate,
    fromDate: resolvedReportDates.startDate,
    toDate: resolvedReportDates.endDate,
  });
  const activeDateDraft =
    dateDraft.sourceStartDate === resolvedReportDates.startDate &&
    dateDraft.sourceEndDate === resolvedReportDates.endDate
      ? dateDraft
      : {
          sourceStartDate: resolvedReportDates.startDate,
          sourceEndDate: resolvedReportDates.endDate,
          fromDate: resolvedReportDates.startDate,
          toDate: resolvedReportDates.endDate,
        };
  const fromDate = activeDateDraft.fromDate;
  const toDate = activeDateDraft.toDate;
  const hasBenchmarkSeries = hasBenchmarkReturnSeries(points);
  const hasActiveSeries = hasActiveReturnSeries(points);
  const [preferredChartViewMode, setPreferredChartViewMode] = useState<PerformanceChartViewMode>(
    resolveChartViewMode({
      hasBenchmarkSeries,
      hasActiveSeries,
    })
  );
  const chartViewMode = resolveChartViewMode({
    preferredMode: preferredChartViewMode,
    hasBenchmarkSeries,
    hasActiveSeries,
  });
  const resolvedBenchmarkOptions = useMemo(
    () => buildResolvedBenchmarkOptions({ benchmark, benchmarkOptions }),
    [benchmark, benchmarkOptions]
  );
  const returnPathPresentation = getPerformanceReturnPathPresentation({
    summary,
    moneyWeightedReturn,
    benchmark,
    benchmarkOptions: resolvedBenchmarkOptions,
    capabilities,
    reportingCurrency,
  });
  const mwrDrilldown = useMemo(
    () => buildPerformanceMwrDrilldown(moneyWeightedReturn),
    [moneyWeightedReturn]
  );
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

  function updateFromDate(value: string) {
    setDateDraft({
      ...activeDateDraft,
      fromDate: value,
    });
  }

  function updateToDate(value: string) {
    setDateDraft({
      ...activeDateDraft,
      toDate: value,
    });
  }

  function updateSelection(patch: PerformanceControlPatch) {
    onRequestChange(
      buildPerformanceControlSelectionPatch({
        patch,
      portfolioId,
      period,
      detailBasis,
      contributionDimension,
      attributionDimension,
      chartFrequency,
      benchmark,
      reportStartDate,
      reportEndDate,
      })
    );
  }

  const { summaryItems, outcomeItems } = buildReturnDecisionItems(
    returnPathPresentation,
    hasRenderableReturnPath
  );
  const outcomeStripItems = outcomeItems.map((metric) => ({
    key: metric.key,
    label: metric.label,
    value: metric.value,
    support: metric.support,
    definition: metric.definition,
    unavailable: metric.unavailable,
  }));
  const outcomeStrip =
    capabilities.summaryKpis.state !== "unavailable" ? (
      <PerformanceOutcomeStrip
        className="performance-return-path-outcome-strip"
        items={outcomeStripItems}
      />
    ) : null;
  const topContext = hasRenderableReturnPath
    ? <PerformanceReturnPathSummary items={summaryItems} />
    : outcomeStrip;
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
          onFromDateChange={updateFromDate}
          onToDateChange={updateToDate}
          onChartViewModeChange={setPreferredChartViewMode}
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
            compact
            title={
              capabilities.returnPath.state === "partial"
                ? "Return history is partially available"
                : "Return history is unavailable for the selected window"
            }
            body={
              capabilities.returnPath.reason ??
              "The resolved window does not currently expose published performance observations for this mandate."
            }
            contextItems={[]}
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
            <PerformanceOutcomeStrip
              className="performance-return-path-outcome-strip performance-return-path-outcome-strip-secondary"
              items={outcomeStripItems}
            />
          ) : null}
          {mwrDrilldown ? <PerformanceMwrDrilldown model={mwrDrilldown} /> : null}
          <PerformanceObservationTrail tableModel={chartTableModel} />
        </>
      ) : null}
    </WorkbenchChartShell>
  );
}
