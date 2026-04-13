"use client";

import { Panel } from "@/design-system";

import { getPerformanceWorkspaceModeDefinition } from "../performance-workspace-modes";
import { buildPerformanceAdvisorBriefViewModel } from "../advisor-brief-view-model";
import { formatDate } from "../formatters";
import { usePerformanceAdvisorBrief } from "../use-performance-advisor-brief";
import { getPerformanceBenchmarkLabel } from "./performance-summary-context-helpers";

import LotusAuditStrip from "./advisor-brief/lotus-audit-strip";
import LotusDrilldownList from "./advisor-brief/lotus-drilldown-list";
import LotusMetricPanel from "./advisor-brief/lotus-metric-panel";
import LotusPageHeader from "./advisor-brief/lotus-page-header";
import LotusSupportabilityPanel from "./advisor-brief/lotus-supportability-panel";
import LotusTalkingPointCard from "./advisor-brief/lotus-talking-point-card";
import PerformanceModeIntro from "./performance-mode-intro";
import PerformanceSectionHeading from "./performance-section-heading";
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
  const modeIntro = getPerformanceWorkspaceModeDefinition("advisor").intro!;
  const { advisorBrief, advisorBriefUnavailable, isLoading, refresh } = usePerformanceAdvisorBrief({
    request: {
      portfolioId: workspace.portfolio.portfolio_id,
      period,
      detailBasis,
      contributionDimension,
      attributionDimension,
      chartFrequency,
      benchmark: workspace.benchmark_code ?? benchmark ?? null,
      reportStartDate: workspace.report_start_date,
      reportEndDate: workspace.report_end_date,
    },
    isDetailsPending,
  });

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
    isDetailsPending: isDetailsPending || isLoading,
  });

  return (
    <section className="performance-advisor-brief-stage" aria-label="Advisor Brief">
      <PerformanceModeIntro
        ariaLabel={modeIntro.ariaLabel}
        kicker={modeIntro.kicker}
        title={modeIntro.title}
        description={modeIntro.description}
        compact
      />
      <Panel className="performance-advisor-brief-shell">
        <LotusPageHeader
          portfolioId={workspace.portfolio.portfolio_id}
          benchmarkLabel={getPerformanceBenchmarkLabel(
            workspace.benchmark_code ?? benchmark,
            workspace.benchmark_options ?? []
          )}
          asOfDate={formatDate(workspace.as_of_date)}
          period={period}
          summary={brief.summary}
          status={brief.status}
          noteText={toAdvisorNoteCopy(brief)}
          onRefresh={refresh}
        />
        <div className="performance-advisor-brief-body-grid">
          <section
            className="performance-advisor-brief-main-column"
            aria-label="Advisor brief narrative"
          >
            <section
              className="performance-advisor-brief-section performance-advisor-brief-section-narrative"
              aria-label="Client Talking Points"
            >
              <PerformanceSectionHeading
                className="performance-advisor-brief-section-heading"
                title="Client Talking Points"
                description="Advisor-ready narrative for the selected period."
              />
              <div className="performance-advisor-brief-item-list performance-advisor-brief-item-list-narrative">
                {brief.talkingPoints.length ? (
                  brief.talkingPoints.map((item) => (
                    <LotusTalkingPointCard
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
              className="performance-advisor-brief-section performance-advisor-brief-section-workflow"
              aria-label="Recommended Actions"
            >
              <PerformanceSectionHeading
                className="performance-advisor-brief-section-heading"
                title="Recommended Actions"
                description="Next advisor workflow steps from the current brief."
              />
              <LotusDrilldownList
                actions={dedupeAdvisorActions(brief.recommendedActions)}
                onSelectMode={onSelectMode}
                variant="workflow"
              />
            </section>

            <section
              className="performance-advisor-brief-section performance-advisor-brief-section-risk"
              aria-label="Risks and Exceptions"
            >
              <PerformanceSectionHeading
                className="performance-advisor-brief-section-heading"
                title="Risks / Exceptions"
                description="Exceptions, evidence gaps, and supportability limits."
              />
              {brief.risksAndExceptions.length ? (
                <div className="performance-advisor-brief-item-list performance-advisor-brief-item-list-risk">
                  {brief.risksAndExceptions.map((item) => (
                    <LotusTalkingPointCard
                      key={item.headline}
                      item={item}
                      onSelectMode={onSelectMode}
                      variant="risk"
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
            className="performance-advisor-brief-side-column performance-advisor-brief-sidecar"
            aria-label="Advisor brief source metrics"
          >
            <LotusMetricPanel metrics={brief.sourceMetrics} onSelectMode={onSelectMode} />
          </aside>
        </div>

        <LotusSupportabilityPanel items={brief.supportability} reviewNotes={brief.reviewNotes} />
        <LotusAuditStrip audit={brief.audit} />
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
