"use client";

import { useEffect, useMemo, useRef, useState } from "react";

import { Panel } from "@/design-system";
import { getWorkbenchPerformanceAdvisorBriefClient } from "@/features/workbench/api";
import type { WorkbenchPerformanceAdvisorBrief } from "@/features/workbench/types";

import { buildPerformanceAdvisorBriefViewModel } from "../advisor-brief-view-model";
import { formatDate } from "../formatters";
import { getPerformanceBenchmarkLabel } from "./performance-summary-context-helpers";

import AdvisorBriefHeader from "./advisor-brief/advisor-brief-header";
import AdvisorBriefSynopsis from "./advisor-brief/advisor-brief-synopsis";
import AdvisorBriefToolbar from "./advisor-brief/advisor-brief-toolbar";
import BriefProvenanceStrip from "./advisor-brief/brief-provenance-strip";
import DrilldownActionList from "./advisor-brief/drilldown-action-list";
import SourceMetricPanel from "./advisor-brief/source-metric-panel";
import SupportabilityPanel from "./advisor-brief/supportability-panel";
import TalkingPointCard from "./advisor-brief/talking-point-card";
import type { PerformanceAdvisorBriefModeProps } from "./performance-workspace-types";

export default function PerformanceAdvisorBriefMode({
  workspace,
  capabilities,
  period,
  detailBasis,
  contributionDimension,
  attributionDimension,
  chartFrequency,
  benchmark,
  isDetailsPending,
  onSelectMode,
}: PerformanceAdvisorBriefModeProps) {
  const [advisorBrief, setAdvisorBrief] =
    useState<WorkbenchPerformanceAdvisorBrief | null>(null);
  const [advisorBriefUnavailable, setAdvisorBriefUnavailable] = useState(false);
  const requestSequenceRef = useRef(0);
  const advisorBriefRequestKey = useMemo(
    () =>
      JSON.stringify({
        portfolioId: workspace.portfolio.portfolio_id,
        period,
        detailBasis,
        contributionDimension,
        attributionDimension,
        chartFrequency,
        benchmark: workspace.benchmark_code ?? benchmark ?? null,
        reportStartDate: workspace.report_start_date,
        reportEndDate: workspace.report_end_date,
      }),
    [
      attributionDimension,
      benchmark,
      chartFrequency,
      contributionDimension,
      detailBasis,
      period,
      workspace.benchmark_code,
      workspace.portfolio.portfolio_id,
      workspace.report_end_date,
      workspace.report_start_date,
    ]
  );

  useEffect(() => {
    setAdvisorBrief(null);
    setAdvisorBriefUnavailable(false);

    if (isDetailsPending) {
      return;
    }

    const requestId = requestSequenceRef.current + 1;
    requestSequenceRef.current = requestId;

    void getWorkbenchPerformanceAdvisorBriefClient(
      workspace.portfolio.portfolio_id,
      {
        period,
        chartFrequency,
        contributionDimension,
        attributionDimension,
        detailBasis,
        benchmark: workspace.benchmark_code ?? benchmark,
        reportStartDate: workspace.report_start_date,
        reportEndDate: workspace.report_end_date,
      }
    )
      .then((response) => {
        if (requestSequenceRef.current !== requestId) {
          return;
        }
        setAdvisorBrief(response);
        setAdvisorBriefUnavailable(false);
      })
      .catch(() => {
        if (requestSequenceRef.current !== requestId) {
          return;
        }
        setAdvisorBrief(null);
        setAdvisorBriefUnavailable(true);
      });
  }, [
    advisorBriefRequestKey,
    isDetailsPending,
    attributionDimension,
    benchmark,
    chartFrequency,
    contributionDimension,
    detailBasis,
    period,
    workspace.benchmark_code,
    workspace.portfolio.portfolio_id,
    workspace.report_end_date,
    workspace.report_start_date,
  ]);

  const brief = buildPerformanceAdvisorBriefViewModel({
    workspace,
    advisorBrief,
    advisorBriefUnavailable,
    capabilities,
    period,
    detailBasis,
    contributionDimension,
    attributionDimension,
    chartFrequency,
    benchmark,
    isDetailsPending: isDetailsPending || (!advisorBrief && !advisorBriefUnavailable),
  });
  const drilldownActions = dedupeAdvisorActions(brief.recommendedActions);

  return (
    <section className="performance-advisor-brief-stage" aria-label="Advisor Brief">
      <Panel className="performance-advisor-brief-shell">
        <AdvisorBriefHeader
          portfolioId={workspace.portfolio.portfolio_id}
          benchmarkLabel={getPerformanceBenchmarkLabel(
            workspace.benchmark_code ?? benchmark,
            workspace.benchmark_options ?? []
          )}
          asOfDate={formatDate(workspace.as_of_date)}
          period={period}
        />
        <AdvisorBriefSynopsis summary={brief.summary} />

        <AdvisorBriefToolbar
          status={brief.status}
          noteText={toAdvisorNoteCopy(brief)}
          onRefresh={() => onSelectMode("advisor")}
        />

        <div className="performance-advisor-brief-body-grid">
          <section
            className="performance-advisor-brief-main-column"
            aria-label="Advisor brief narrative"
          >
            <section
              className="performance-advisor-brief-section"
              aria-label="Client Talking Points"
            >
              <div className="performance-advisor-brief-section-heading">
                <h3>Client Talking Points</h3>
                <p className="performance-advisor-brief-section-note">
                  Advisor-ready narrative for the selected period.
                </p>
              </div>
              <div className="performance-advisor-brief-item-list">
                {brief.talkingPoints.length ? (
                  brief.talkingPoints.map((item) => (
                    <TalkingPointCard
                      key={item.headline}
                      item={item}
                      onSelectMode={onSelectMode}
                    />
                  ))
                ) : (
                  <div className="performance-advisor-brief-empty-note">
                    No client talking points are available for this selection.
                  </div>
                )}
              </div>
            </section>

            <section
              className="performance-advisor-brief-section"
              aria-label="Recommended Actions"
            >
              <div className="performance-advisor-brief-section-heading">
                <h3>Recommended Actions</h3>
                <p className="performance-advisor-brief-section-note">
                  Next advisor workflow steps from the current brief.
                </p>
              </div>
              <DrilldownActionList
                actions={brief.recommendedActions}
                onSelectMode={onSelectMode}
                variant="workflow"
              />
            </section>

            <section
              className="performance-advisor-brief-section"
              aria-label="Risks and Exceptions"
            >
              <div className="performance-advisor-brief-section-heading">
                <h3>Risks / Exceptions</h3>
                <p className="performance-advisor-brief-section-note">
                  Exceptions, evidence gaps, and supportability limits.
                </p>
              </div>
              {brief.risksAndExceptions.length ? (
                <div className="performance-advisor-brief-item-list">
                  {brief.risksAndExceptions.map((item) => (
                    <TalkingPointCard
                      key={item.headline}
                      item={item}
                      onSelectMode={onSelectMode}
                    />
                  ))}
                </div>
              ) : (
                <div className="performance-advisor-brief-empty-note">
                  No material supportability exceptions are flagged in the current source bundle.
                </div>
              )}
            </section>
          </section>

          <aside
            className="performance-advisor-brief-side-column"
            aria-label="Advisor brief source evidence"
          >
            <section
              className="performance-advisor-brief-rail-panel"
              aria-label="Source metrics rail"
            >
              <SourceMetricPanel metrics={brief.sourceMetrics} onSelectMode={onSelectMode} />
            </section>

            <section
              className="performance-advisor-brief-section"
              aria-label="Drill-down Actions"
            >
              <div className="performance-advisor-brief-section-heading">
                <h3>Drill-down Actions</h3>
                <p className="performance-advisor-brief-section-note">
                  Open the supporting analysis surfaces directly.
                </p>
              </div>
              <DrilldownActionList actions={drilldownActions} onSelectMode={onSelectMode} />
            </section>

            <SupportabilityPanel items={brief.supportability} />
          </aside>
        </div>

        <BriefProvenanceStrip audit={brief.audit} />
      </Panel>
    </section>
  );
}

function dedupeAdvisorActions(
  actions: ReturnType<typeof buildPerformanceAdvisorBriefViewModel>["recommendedActions"]
) {
  const seen = new Set<string>();
  return actions.filter((action) => {
    const key = `${action.targetMode}:${action.label}`;
    if (seen.has(key)) {
      return false;
    }
    seen.add(key);
    return true;
  });
}

function toAdvisorNoteCopy(brief: ReturnType<typeof buildPerformanceAdvisorBriefViewModel>) {
  const sections = [
    brief.summary,
    "",
    "Client Talking Points",
    ...brief.talkingPoints.map((item) => `- ${item.headline} ${item.detail}`),
    "",
    "Recommended Actions",
    ...brief.recommendedActions.map((action) => `- ${action.label}`),
    "",
    "Risks / Exceptions",
    ...(brief.risksAndExceptions.length
      ? brief.risksAndExceptions.map((item) => `- ${item.headline} ${item.detail}`)
      : ["- No material supportability exceptions are flagged."]),
  ];

  return sections.join("\n");
}
