"use client";

import { useMemo, useState } from "react";

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
import PerformanceAnalysisControlBar from "./performance-analysis-control-bar";
import {
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

type PerformanceChartPanelProps = {
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
  onRequestChange: (patch: PerformanceControlPatch) => Promise<boolean>;
  isUpdating?: boolean;
  isDetailsPending?: boolean;
  returnView?: PerformanceChartViewMode;
  onReturnViewChange?: (value: PerformanceChartViewMode) => void;
  id?: string;
};

type ResolvedReportDates = ReturnType<typeof resolveReportDates>;

export default function PerformanceChartPanel(props: PerformanceChartPanelProps) {
  const resolvedReportDates = useMemo(
    () => resolveReportDates(props.points, props.reportStartDate, props.reportEndDate),
    [props.points, props.reportEndDate, props.reportStartDate]
  );

  return (
    <PerformanceChartPanelBody
      key={`${resolvedReportDates.startDate}|${resolvedReportDates.endDate}`}
      {...props}
      resolvedReportDates={resolvedReportDates}
    />
  );
}

function PerformanceChartPanelBody({
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
  capabilities,
  onRequestChange,
  isUpdating = false,
  isDetailsPending = false,
  returnView,
  onReturnViewChange,
  id,
  resolvedReportDates,
}: PerformanceChartPanelProps & { resolvedReportDates: ResolvedReportDates }) {
  const hasBenchmarkSeries = hasBenchmarkReturnSeries(points);
  const hasActiveSeries = hasActiveReturnSeries(points);
  const [localReturnView, setLocalReturnView] = useState<PerformanceChartViewMode>(
    resolveChartViewMode({
      hasBenchmarkSeries,
      hasActiveSeries,
    })
  );
  const preferredChartViewMode = returnView ?? localReturnView;
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
          controlBarAriaLabel="Performance return controls"
          portfolioId={portfolioId}
          period={period}
          detailBasis={detailBasis}
          contributionDimension={contributionDimension}
          attributionDimension={attributionDimension}
          chartFrequency={chartFrequency}
          benchmark={benchmark}
          benchmarkOptions={benchmarkOptions}
          reportStartDate={resolvedReportDates.startDate}
          reportEndDate={resolvedReportDates.endDate}
          capabilities={capabilities}
          isUpdating={isUpdating}
          ariaLabel="Performance source selection"
          onRequestChange={onRequestChange}
          returnView={{
            value: chartViewMode,
            hasBenchmarkSeries,
            hasActiveSeries,
            onChange: (value) => {
              if (onReturnViewChange) {
                onReturnViewChange(value);
                return;
              }
              setLocalReturnView(value);
            },
          }}
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
