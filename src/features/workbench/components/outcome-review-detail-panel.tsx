"use client";

import type {
  OutcomeReviewClientCommunicationBoundaryView,
  OutcomeReviewListItem,
} from "@/features/workbench/outcome-review-view-model";
import OutcomeReviewDetailContext from "./outcome-review-detail-context";
import OutcomeReviewDetailHeader from "./outcome-review-detail-header";
import OutcomeReviewMandateImpactSection from "./outcome-review-mandate-impact-section";
import OutcomeReviewRationaleEvidenceSection from "./outcome-review-rationale-evidence-section";
import styles from "./outcome-review.module.css";

type Props = {
  primaryReview: OutcomeReviewListItem;
  clientCommunicationBoundary: OutcomeReviewClientCommunicationBoundaryView | null;
  readyEvidenceCount: number;
  reportJobAvailable: boolean;
  reportJobPending: boolean;
  onRequestReportJob: () => void;
};

export default function OutcomeReviewDetailPanel({
  primaryReview,
  clientCommunicationBoundary,
  readyEvidenceCount,
  reportJobAvailable,
  reportJobPending,
  onRequestReportJob,
}: Props) {
  return (
    <div
      className={styles.detailPanel}
      id="outcome-review-detail"
      data-testid="selected-outcome-review-detail"
      data-outcome-review-id={primaryReview.outcomeReviewId}
      data-expected-snapshot-hash={primaryReview.expectedSnapshotHash}
      data-realized-snapshot-hash={primaryReview.realizedSnapshotHash}
    >
      <OutcomeReviewDetailHeader
        reviewLabel={primaryReview.reviewLabel}
        reportJobAvailable={reportJobAvailable}
        reportJobPending={reportJobPending}
        onRequestReportJob={onRequestReportJob}
      />
      <OutcomeReviewDetailContext
        updatedAt={primaryReview.updatedAt}
        retentionUntil={primaryReview.retentionUntil}
        sourceReferenceCount={primaryReview.lineage.length}
      />

      <div className={styles.detailGrid}>
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
