"use client";

import { Fragment } from "react";

import { AiAssistanceDisclosure } from "@/design-system";
import { getPerformanceWorkspaceModeDefinition } from "../performance-workspace-modes";
import { buildPerformanceAdvisorBriefViewModel } from "../advisor-brief-view-model";
import { usePerformanceAdvisorBrief } from "../use-performance-advisor-brief";

import AdvisorBriefReviewWorkflow from "./advisor-brief/advisor-brief-review-workflow";
import LotusDrilldownList from "./advisor-brief/lotus-drilldown-list";
import LotusMetricPanel from "./advisor-brief/lotus-metric-panel";
import {
  dedupeAdvisorActions,
  toAdvisorNoteCopy,
} from "./advisor-brief/performance-advisor-brief-helpers";
import LotusPageHeader from "./advisor-brief/lotus-page-header";
import LotusSupportabilityPanel from "./advisor-brief/lotus-supportability-panel";
import LotusTalkingPointCard from "./advisor-brief/lotus-talking-point-card";
import PerformanceWorkspaceStageSurface, {
  buildPerformanceWorkspaceContextItems,
} from "./performance-workspace-stage-surface";
import PerformanceWorkspaceSection from "./performance-workspace-section";
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
  const contextItems = buildPerformanceWorkspaceContextItems({
    workspace,
    period,
    detailBasis,
    benchmark,
  });
  const {
    advisorBrief,
    advisorBriefUnavailable,
    advisorBriefPermissionBlocked,
    isLoading,
    isApplyingReviewAction,
    reviewActionFeedback,
    applyReviewAction,
    refresh,
  } = usePerformanceAdvisorBrief({
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
    advisorBriefPermissionBlocked,
    capabilities,
    period,
    detailBasis,
    contributionDimension,
    attributionDimension,
    chartFrequency,
    benchmark,
    isDetailsPending:
      isDetailsPending ||
      isLoading ||
      (!advisorBrief && !advisorBriefUnavailable && !advisorBriefPermissionBlocked),
  });
  const narrativeSections = [
    {
      ariaLabel: "Advisor Talking Points",
      className: "performance-advisor-brief-section performance-advisor-brief-section-narrative",
      title: "Advisor Talking Points",
      description: "Internal working narrative for the selected period; review before client use.",
      content: brief.talkingPoints.length ? (
        <div className="performance-advisor-brief-item-list performance-advisor-brief-item-list-narrative">
          {brief.talkingPoints.map((item) => (
            <LotusTalkingPointCard
              key={item.headline}
              item={item}
              onSelectMode={onSelectMode}
            />
          ))}
        </div>
      ) : (
        <div className="performance-advisor-brief-empty-note">
          No advisor talking points are available for this selection.
        </div>
      ),
    },
    {
      ariaLabel: "Recommended Actions",
      className: "performance-advisor-brief-section performance-advisor-brief-section-workflow",
      title: "Recommended Actions",
      description: "Next advisor workflow steps from the current brief.",
      content: (
        <LotusDrilldownList
          actions={dedupeAdvisorActions(brief.recommendedActions)}
          onSelectMode={onSelectMode}
          variant="workflow"
        />
      ),
    },
    {
      ariaLabel: "Risks and Exceptions",
      className: "performance-advisor-brief-section performance-advisor-brief-section-risk",
      title: "Risks / Exceptions",
      description: "Exceptions, evidence gaps, and supportability limits.",
      content: brief.risksAndExceptions.length ? (
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
      ),
    },
  ] as const;
  const workflowPackRun = advisorBrief?.workflow_pack_run ?? null;

  return (
    <PerformanceWorkspaceStageSurface
      intro={modeIntro}
      contextAriaLabel="Advisor brief context"
      contextItems={contextItems}
      shellClassName="performance-advisor-brief-shell"
    >
        <LotusPageHeader
          summary={brief.summary}
          status={brief.status}
          noteText={toAdvisorNoteCopy(brief)}
          onRefresh={refresh}
          canCopy={
            brief.talkingPoints.length > 0 && brief.aiDisclosure.evidence.state !== "missing"
          }
          refreshing={isLoading}
          interactionBusy={isLoading || isApplyingReviewAction}
        />
        <AiAssistanceDisclosure disclosure={brief.aiDisclosure} />
        <div className="performance-advisor-brief-body-grid">
          <section
            className="performance-advisor-brief-main-column"
            aria-label="Advisor brief narrative"
          >
            {narrativeSections.map((section, index) => (
              <Fragment key={section.title}>
                <PerformanceWorkspaceSection
                  ariaLabel={section.ariaLabel}
                  className={section.className}
                  headingClassName="performance-advisor-brief-section-heading"
                  title={section.title}
                  description={section.description}
                >
                  {section.content}
                </PerformanceWorkspaceSection>
                {index === 0 && workflowPackRun ? (
                  <AdvisorBriefReviewWorkflow
                    workflowPackRun={workflowPackRun}
                    feedback={reviewActionFeedback}
                    isApplying={isApplyingReviewAction}
                    onApply={applyReviewAction}
                  />
                ) : null}
              </Fragment>
            ))}
          </section>

          <aside
            className="performance-advisor-brief-side-column performance-advisor-brief-sidecar"
            aria-label="Advisor brief source metrics"
          >
            <LotusMetricPanel metrics={brief.sourceMetrics} onSelectMode={onSelectMode} />
            <LotusSupportabilityPanel
              items={brief.supportability}
              reviewNotes={brief.reviewNotes}
              supportDetails={brief.supportDetails}
            />
          </aside>
        </div>
    </PerformanceWorkspaceStageSurface>
  );
}
