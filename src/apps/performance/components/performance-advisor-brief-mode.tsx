"use client";

import { Fragment } from "react";

import { AiAssistanceDisclosure } from "@/design-system";
import { cx } from "@/design-system/utils/cx";
import { getPerformanceWorkspaceModeDefinition } from "../performance-workspace-modes";
import { buildPerformanceAdvisorBriefViewModel } from "../advisor-brief-view-model";
import { usePerformanceAdvisorBrief } from "../use-performance-advisor-brief";

import AdvisorBriefReviewWorkflow from "./advisor-brief/advisor-brief-review-workflow";
import LotusDrilldownList from "./advisor-brief/lotus-drilldown-list";
import LotusMetricPanel from "./advisor-brief/lotus-metric-panel";
import styles from "./advisor-brief/performance-advisor-brief.module.css";
import {
  canCopyAdvisorBrief,
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

export default function PerformanceAdvisorBriefMode(props: PerformanceAdvisorBriefModeProps) {
  const {
    workspace,
    period,
    detailBasis,
    contributionDimension,
    attributionDimension,
    chartFrequency,
    benchmark,
  } = props;
  const sessionKey = JSON.stringify({
    portfolioId: workspace.portfolio.portfolio_id,
    period,
    detailBasis,
    contributionDimension,
    attributionDimension,
    chartFrequency,
    benchmark: workspace.benchmark_code ?? benchmark ?? null,
    reportStartDate: workspace.report_start_date,
    reportEndDate: workspace.report_end_date,
    asOfDate: workspace.requested_as_of_date,
    reportingCurrency: workspace.requested_reporting_currency,
  });

  return <PerformanceAdvisorBriefModeSession key={sessionKey} {...props} />;
}

function PerformanceAdvisorBriefModeSession({
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
    sourceContext: workspace,
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
      asOfDate: workspace.requested_as_of_date ?? undefined,
      reportingCurrency: workspace.requested_reporting_currency ?? undefined,
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
      ariaLabel: "Adviser talking points",
      className: cx(
        styles.section,
        styles.sectionNarrative
      ),
      title: "Adviser talking points",
      description: "Internal working narrative for the selected period; review before client use.",
      content: brief.talkingPoints.length ? (
        <div
          className={cx(
            styles.itemList,
            styles.itemListNarrative
          )}
        >
          {brief.talkingPoints.map((item) => (
            <LotusTalkingPointCard
              key={item.headline}
              item={item}
              onSelectMode={onSelectMode}
            />
          ))}
        </div>
      ) : (
        <div className={styles.emptyNote}>
          No advisor talking points are available for this selection.
        </div>
      ),
    },
    {
      ariaLabel: "Recommended actions",
      className: cx(
        styles.section,
        styles.sectionWorkflow
      ),
      title: "Recommended actions",
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
      ariaLabel: "Risks and exceptions",
      className: cx(
        styles.section,
        styles.sectionRisk
      ),
      title: "Risks and exceptions",
      description: "Exceptions, evidence gaps, and supportability limits.",
      content: brief.risksAndExceptions.length ? (
        <div
          className={cx(
            styles.itemList,
            styles.itemListRisk
          )}
        >
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
        <div className={styles.emptyNote}>
          No material supportability exceptions are flagged in the current source bundle.
        </div>
      ),
    },
  ] as const;
  const workflowPackRun = advisorBrief?.workflow_pack_run ?? null;

  return (
    <PerformanceWorkspaceStageSurface
      intro={modeIntro}
      contextAriaLabel="Adviser brief context"
      contextItems={contextItems}
      shellClassName={styles.shell}
      shellAriaLabel="Performance adviser brief workspace"
      shellRole="region"
    >
        <LotusPageHeader
          summary={brief.summary}
          status={brief.status}
          noteText={toAdvisorNoteCopy(brief)}
          onRefresh={refresh}
          canCopy={canCopyAdvisorBrief(brief)}
          refreshing={isLoading}
          interactionBusy={isLoading || isApplyingReviewAction}
        />
        <AiAssistanceDisclosure disclosure={brief.aiDisclosure} />
        <div className={styles.bodyGrid}>
          <section
            className={styles.mainColumn}
            aria-label="Adviser brief narrative"
          >
            {narrativeSections.map((section, index) => (
              <Fragment key={section.title}>
                <PerformanceWorkspaceSection
                  ariaLabel={section.ariaLabel}
                  className={section.className}
                  headingClassName={styles.sectionHeading}
                  title={section.title}
                  description={section.description}
                >
                  {section.content}
                </PerformanceWorkspaceSection>
                {index === 0 && workflowPackRun ? (
                  <AdvisorBriefReviewWorkflow
                    key={`${workflowPackRun.run_id}:${workflowPackRun.review_state}`}
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
            className={cx(
              styles.sideColumn,
              styles.sidecar
            )}
            aria-label="Adviser brief source metrics"
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
