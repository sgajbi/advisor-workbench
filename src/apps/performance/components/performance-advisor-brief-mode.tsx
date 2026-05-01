"use client";

import { useState } from "react";

import { ActionButton } from "@/design-system";
import { getPerformanceWorkspaceModeDefinition } from "../performance-workspace-modes";
import { buildPerformanceAdvisorBriefViewModel } from "../advisor-brief-view-model";
import { usePerformanceAdvisorBrief } from "../use-performance-advisor-brief";

import LotusAuditStrip from "./advisor-brief/lotus-audit-strip";
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
import type { WorkbenchAdvisorBriefWorkflowPackRunReviewActionType } from "@/features/workbench/types";

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
  const [reviewedBy, setReviewedBy] = useState("");
  const [reviewReason, setReviewReason] = useState("");
  const [replacementRunId, setReplacementRunId] = useState("");
  const {
    advisorBrief,
    advisorBriefUnavailable,
    advisorBriefPermissionBlocked,
    isLoading,
    isApplyingReviewAction,
    reviewActionError,
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
      ariaLabel: "Client Talking Points",
      className: "performance-advisor-brief-section performance-advisor-brief-section-narrative",
      title: "Client Talking Points",
      description: "Advisor-ready narrative for the selected period.",
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
          No client talking points are available for this selection.
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
  const reviewActionAllowed =
    workflowPackRun !== null && workflowPackRun.allowed_review_actions.length > 0;
  const supportsReplacementRunId =
    workflowPackRun !== null &&
    workflowPackRun.allowed_review_actions.some(requiresReplacementRunId);

  function canSubmitReviewAction(
    actionType: WorkbenchAdvisorBriefWorkflowPackRunReviewActionType
  ): boolean {
    if (
      !reviewActionAllowed ||
      reviewedBy.trim().length === 0 ||
      reviewReason.trim().length === 0 ||
      isApplyingReviewAction
    ) {
      return false;
    }
    if (requiresReplacementRunId(actionType) && replacementRunId.trim().length === 0) {
      return false;
    }
    return true;
  }

  async function handleReviewAction(
    actionType: WorkbenchAdvisorBriefWorkflowPackRunReviewActionType
  ) {
    if (!canSubmitReviewAction(actionType)) {
      return;
    }
    try {
      await applyReviewAction({
        action_type: actionType,
        reviewed_by: reviewedBy.trim(),
        reason: reviewReason.trim(),
        replacement_run_id: requiresReplacementRunId(actionType)
          ? replacementRunId.trim()
          : undefined,
      });
      setReviewReason("");
      setReplacementRunId("");
    } catch {
      // The hook already exposes a user-facing error note for the supportability rail.
    }
  }

  const reviewActionForm =
    reviewActionAllowed && workflowPackRun ? (
      <div
        className="performance-advisor-brief-review-actions"
        aria-label="Advisor brief review actions"
      >
        <p className="performance-advisor-brief-review-actions-copy">
          Record one bounded review transition through the gateway contract. Reviewer identity and
          rationale are required because the downstream lotus-ai ledger is actor-attributed.
        </p>
        <label className="performance-advisor-brief-review-field">
          <span className="performance-advisor-brief-supportability-label">Reviewed by</span>
          <input
            className="input"
            value={reviewedBy}
            onChange={(event) => setReviewedBy(event.target.value)}
            placeholder="advisor_1"
            autoComplete="off"
          />
        </label>
        <label className="performance-advisor-brief-review-field">
          <span className="performance-advisor-brief-supportability-label">Review reason</span>
          <textarea
            className="textarea"
            value={reviewReason}
            onChange={(event) => setReviewReason(event.target.value)}
            placeholder="Explain why this bounded review action is appropriate for downstream use."
            rows={3}
          />
        </label>
        {supportsReplacementRunId ? (
          <label className="performance-advisor-brief-review-field">
            <span className="performance-advisor-brief-supportability-label">
              Replacement run id
            </span>
            <input
              className="input"
              aria-label="Replacement run id"
              value={replacementRunId}
              onChange={(event) => setReplacementRunId(event.target.value)}
              placeholder="packrun_advisor_brief_req-2"
              autoComplete="off"
            />
            <span className="performance-advisor-brief-supportability-note">
              Required only for revision or supersede transitions so bounded lineage stays
              reconstructable.
            </span>
          </label>
        ) : null}
        <div className="performance-advisor-brief-review-action-row">
          {workflowPackRun.allowed_review_actions.map((actionType) => (
            <ActionButton
              key={actionType}
              priority={actionType === "ACCEPT" ? "primary" : "secondary"}
              disabled={!canSubmitReviewAction(actionType)}
              onClick={() => void handleReviewAction(actionType)}
            >
              {getReviewActionLabel(actionType, isApplyingReviewAction)}
            </ActionButton>
          ))}
        </div>
        {reviewActionError ? (
          <div className="performance-advisor-brief-supportability-note">{reviewActionError}</div>
        ) : null}
      </div>
    ) : reviewActionError ? (
      <div
        className="performance-advisor-brief-review-actions"
        aria-label="Advisor brief review actions"
      >
        <div className="performance-advisor-brief-supportability-note">{reviewActionError}</div>
      </div>
    ) : null;

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
        />
        <div className="performance-advisor-brief-body-grid">
          <section
            className="performance-advisor-brief-main-column"
            aria-label="Advisor brief narrative"
          >
            {narrativeSections.map((section) => (
              <PerformanceWorkspaceSection
                key={section.title}
                ariaLabel={section.ariaLabel}
                className={section.className}
                headingClassName="performance-advisor-brief-section-heading"
                title={section.title}
                description={section.description}
              >
                {section.content}
              </PerformanceWorkspaceSection>
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
              reviewActionForm={reviewActionForm}
            />
            <LotusAuditStrip audit={brief.audit} />
          </aside>
        </div>
    </PerformanceWorkspaceStageSurface>
  );
}

function getReviewActionLabel(
  actionType: WorkbenchAdvisorBriefWorkflowPackRunReviewActionType,
  isApplyingReviewAction: boolean
): string {
  if (isApplyingReviewAction) {
    return "Recording...";
  }
  switch (actionType) {
    case "ACCEPT":
      return "Accept Brief";
    case "REJECT":
      return "Reject Brief";
    case "REVISE":
      return "Request Revision";
    case "SUPERSEDE":
      return "Mark Superseded";
    case "ABANDON":
      return "Abandon Brief";
    default:
      return actionType;
  }
}

function requiresReplacementRunId(
  actionType: WorkbenchAdvisorBriefWorkflowPackRunReviewActionType
): boolean {
  return actionType === "REVISE" || actionType === "SUPERSEDE";
}
