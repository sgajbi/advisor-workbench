"use client";

import { useState } from "react";
import {
  ScreenStatePanel,
  SectionBlock,
} from "@/design-system";
import {
  requestDpmOutcomeReviewAiNarrative,
  getDpmOutcomeReviewReportInput,
  submitDpmOutcomeReviewReportJob,
} from "@/features/workbench/api";
import type { DpmOutcomeReviewGatewayResponse } from "@/features/workbench/types";
import {
  buildOutcomeClientCommunicationBoundaryView,
  buildOutcomeReviewPanelModel,
  type OutcomeReviewClientCommunicationBoundaryView,
} from "@/features/workbench/outcome-review-view-model";
import {
  buildOutcomeReviewHandoffMessages,
  buildOutcomeReviewStatePanelCopy,
  countReadyOutcomeReviewEvidence,
  describeOutcomeNarrativeRun,
  outcomeReviewAvailabilityLabel,
  outcomeReviewSourceEvidenceStatus,
  shouldShowOutcomeReviewStatePanel,
} from "@/features/workbench/outcome-review-panel-helpers";
import { businessStateLabel } from "@/features/workbench/manage-workspace-view-model";
import OutcomeReviewActionsCard from "./outcome-review-actions-card";
import OutcomeReviewDetailContext from "./outcome-review-detail-context";
import OutcomeReviewDetailHeader from "./outcome-review-detail-header";
import OutcomeReviewHandoffMessages from "./outcome-review-handoff-messages";
import OutcomeReviewMandateImpactSection from "./outcome-review-mandate-impact-section";
import OutcomeReviewRationaleEvidenceSection from "./outcome-review-rationale-evidence-section";
import OutcomeReviewReasonRow from "./outcome-review-reason-row";
import OutcomeReviewReadinessBand from "./outcome-review-readiness-band";
import OutcomeReviewStatusStrip from "./outcome-review-status-strip";
import OutcomeReviewSupportBadges from "./outcome-review-support-badges";
import OutcomeReviewTimelineCard from "./outcome-review-timeline-card";

type Props = {
  portfolioId: string;
  response: DpmOutcomeReviewGatewayResponse | null;
  errorMessage?: string | null;
};

export default function OutcomeReviewPanel({ portfolioId, response, errorMessage }: Props) {
  const [reportJobStatus, setReportJobStatus] = useState<string | null>(null);
  const [reportJobError, setReportJobError] = useState<string | null>(null);
  const [reportJobPending, setReportJobPending] = useState(false);
  const [aiNarrativeStatus, setAiNarrativeStatus] = useState<string | null>(null);
  const [aiNarrativeError, setAiNarrativeError] = useState<string | null>(null);
  const [aiNarrativePending, setAiNarrativePending] = useState(false);
  const [handoffBoundary, setHandoffBoundary] =
    useState<OutcomeReviewClientCommunicationBoundaryView | null>(null);
  const model = buildOutcomeReviewPanelModel(response);
  const primaryReview = model.items[0] ?? null;
  const clientCommunicationBoundary =
    handoffBoundary ?? primaryReview?.clientCommunicationBoundary ?? null;
  const hasItems = model.items.length > 0;
  const shouldShowStatePanel = shouldShowOutcomeReviewStatePanel(
    model.state,
    errorMessage ?? null,
  );
  const stateCopy = buildOutcomeReviewStatePanelCopy(model.state, portfolioId);
  const reportJobAvailable = Boolean(primaryReview && !primaryReview.reportInputBlocked);
  const aiNarrativeAvailable = Boolean(primaryReview && !primaryReview.aiEvidenceBlocked);
  const handoffStatusMessages = buildOutcomeReviewHandoffMessages(
    reportJobError ?? reportJobStatus,
    aiNarrativeError ?? aiNarrativeStatus,
  );
  const readyEvidenceCount = countReadyOutcomeReviewEvidence(primaryReview);
  const evidencePackStatus = outcomeReviewAvailabilityLabel(
    primaryReview?.proofPackId ?? "N/A",
  );
  const sourceEvidenceStatus =
    outcomeReviewSourceEvidenceStatus(readyEvidenceCount);
  const evidencePackHref = `/workbench/${encodeURIComponent(portfolioId)}?mode=proof`;

  async function requestOutcomeReportJob() {
    if (!primaryReview || primaryReview.reportInputBlocked || reportJobPending) {
      return;
    }
    setReportJobPending(true);
    setReportJobError(null);
    try {
      const reportInput = await getDpmOutcomeReviewReportInput(primaryReview.outcomeReviewId);
      setHandoffBoundary(buildOutcomeClientCommunicationBoundaryView(reportInput.data));
      const handle = await submitDpmOutcomeReviewReportJob({
        outcomeReviewId: primaryReview.outcomeReviewId,
        outcomeReportInput: reportInput.data,
      });
      setReportJobStatus(`Report request ${businessStateLabel(handle.status)}.`);
    } catch (error) {
      setReportJobError(error instanceof Error ? error.message : "Outcome report job failed");
    } finally {
      setReportJobPending(false);
    }
  }

  async function requestOutcomeAiNarrative() {
    if (!primaryReview || primaryReview.aiEvidenceBlocked || aiNarrativePending) {
      return;
    }
    setAiNarrativePending(true);
    setAiNarrativeError(null);
    try {
      const narrative = await requestDpmOutcomeReviewAiNarrative({
        outcomeReviewId: primaryReview.outcomeReviewId,
      });
      setHandoffBoundary(
        buildOutcomeClientCommunicationBoundaryView(narrative.ai_evidence_input)
      );
      setAiNarrativeStatus(describeOutcomeNarrativeRun(narrative.data));
    } catch (error) {
      setAiNarrativeError(
        error instanceof Error ? error.message : "Outcome review request failed"
      );
    } finally {
      setAiNarrativePending(false);
    }
  }

  return (
    <SectionBlock
      title="Outcome Reviews"
      subtitle="Review mandate outcomes, advisor observations, and evidence readiness."
      className="outcome-review-panel"
      actions={
        <OutcomeReviewSupportBadges supportabilityState={model.supportabilityState} />
      }
    >
      {shouldShowStatePanel ? (
        <ScreenStatePanel
          kind={errorMessage ? "partial" : stateCopy.kind}
          surface="portfolio"
          title={errorMessage ? "Outcome review is unavailable" : stateCopy.title}
          body={errorMessage ?? stateCopy.body}
        />
      ) : null}

      <OutcomeReviewStatusStrip
        latestReview={primaryReview?.reviewPostureLabel}
        outcomeStatus={primaryReview?.outcomeStatusLabel}
        driftImprovement={primaryReview?.driftImprovementLabel}
        evidencePackStatus={evidencePackStatus}
      />

      <OutcomeReviewReasonRow
        supportabilityReasons={model.supportabilityReasons}
        blockedActions={model.blockedActions}
        remediationOwner={model.remediationOwner}
      />

      {primaryReview && hasItems ? (
        <>
          <OutcomeReviewReadinessBand
            reviewWindow={primaryReview.reviewWindow}
            reportInputBlocked={primaryReview.reportInputBlocked}
            aiEvidenceBlocked={primaryReview.aiEvidenceBlocked}
            sourceEvidenceStatus={sourceEvidenceStatus}
          />

          <div className="outcome-review-workspace-grid">
            <OutcomeReviewTimelineCard items={model.items} />

            <OutcomeReviewActionsCard
              primaryReview={primaryReview}
              evidencePackHref={evidencePackHref}
              aiNarrativeAvailable={aiNarrativeAvailable}
              aiNarrativePending={aiNarrativePending}
              onRequestAiNarrative={requestOutcomeAiNarrative}
            />
          </div>

          <div className="outcome-review-detail-panel" id="outcome-review-detail">
            <OutcomeReviewDetailHeader
              reviewLabel={primaryReview.reviewLabel}
              reportJobAvailable={reportJobAvailable}
              reportJobPending={reportJobPending}
              aiNarrativeAvailable={aiNarrativeAvailable}
              aiNarrativePending={aiNarrativePending}
              onRequestReportJob={requestOutcomeReportJob}
              onRequestAiNarrative={requestOutcomeAiNarrative}
            />
            <OutcomeReviewDetailContext
              updatedAt={primaryReview.updatedAt}
              retentionUntil={primaryReview.retentionUntil}
              sourceReferenceCount={primaryReview.lineage.length}
            />

            <div className="outcome-review-detail-grid">
              <OutcomeReviewMandateImpactSection
                mandateImpact={primaryReview.mandateImpact}
                dimensions={primaryReview.dimensions}
              />

              <OutcomeReviewRationaleEvidenceSection
                clientRationale={primaryReview.clientRationale}
                clientCommunicationBoundary={clientCommunicationBoundary}
                expectedSnapshotHash={primaryReview.expectedSnapshotHash}
                realizedSnapshotHash={primaryReview.realizedSnapshotHash}
                proofPackId={primaryReview.proofPackId}
                readyEvidenceCount={readyEvidenceCount}
              />
            </div>
          </div>
        </>
      ) : null}

      <OutcomeReviewHandoffMessages messages={handoffStatusMessages} />
    </SectionBlock>
  );
}
