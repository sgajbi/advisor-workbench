"use client";

import type {
  OutcomeReviewClientCommunicationBoundaryView,
  OutcomeReviewListItem,
} from "@/features/workbench/outcome-review-view-model";
import OutcomeReviewDetailContext from "./outcome-review-detail-context";
import OutcomeReviewDetailHeader from "./outcome-review-detail-header";
import OutcomeReviewMandateImpactSection from "./outcome-review-mandate-impact-section";
import OutcomeReviewRationaleEvidenceSection from "./outcome-review-rationale-evidence-section";

type Props = {
  primaryReview: OutcomeReviewListItem;
  clientCommunicationBoundary: OutcomeReviewClientCommunicationBoundaryView | null;
  readyEvidenceCount: number;
  reportJobAvailable: boolean;
  reportJobPending: boolean;
  aiNarrativeAvailable: boolean;
  aiNarrativePending: boolean;
  onRequestReportJob: () => void;
  onRequestAiNarrative: () => void;
};

export default function OutcomeReviewDetailPanel({
  primaryReview,
  clientCommunicationBoundary,
  readyEvidenceCount,
  reportJobAvailable,
  reportJobPending,
  aiNarrativeAvailable,
  aiNarrativePending,
  onRequestReportJob,
  onRequestAiNarrative,
}: Props) {
  return (
    <div className="outcome-review-detail-panel" id="outcome-review-detail">
      <OutcomeReviewDetailHeader
        reviewLabel={primaryReview.reviewLabel}
        reportJobAvailable={reportJobAvailable}
        reportJobPending={reportJobPending}
        aiNarrativeAvailable={aiNarrativeAvailable}
        aiNarrativePending={aiNarrativePending}
        onRequestReportJob={onRequestReportJob}
        onRequestAiNarrative={onRequestAiNarrative}
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
  );
}
