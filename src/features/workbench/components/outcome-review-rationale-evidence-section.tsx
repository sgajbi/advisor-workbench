"use client";

import type { OutcomeReviewClientCommunicationBoundaryView } from "@/features/workbench/outcome-review-view-model";
import { MANAGE_OUTCOME_REVIEW_LABELS } from "@/features/workbench/manage-terminology";
import OutcomeReviewClientBoundaryCard from "./outcome-review-client-boundary-card";
import OutcomeReviewEvidenceGrid from "./outcome-review-evidence-grid";
import styles from "./outcome-review.module.css";

type Props = {
  clientRationale: string;
  clientCommunicationBoundary: OutcomeReviewClientCommunicationBoundaryView | null;
  expectedSnapshotHash: string;
  realizedSnapshotHash: string;
  proofPackId: string;
  readyEvidenceCount: number;
};

export default function OutcomeReviewRationaleEvidenceSection({
  clientRationale,
  clientCommunicationBoundary,
  expectedSnapshotHash,
  realizedSnapshotHash,
  proofPackId,
  readyEvidenceCount,
}: Props) {
  return (
    <section className={styles.detailSection} aria-label="Outcome review rationale and evidence">
      <h4>{MANAGE_OUTCOME_REVIEW_LABELS.internalOutcomeRationale}</h4>
      <div className={styles.rationale}>
        <p>{clientRationale}</p>
      </div>
      {clientCommunicationBoundary ? (
        <OutcomeReviewClientBoundaryCard boundary={clientCommunicationBoundary} />
      ) : null}
      <h4>{MANAGE_OUTCOME_REVIEW_LABELS.evidenceAvailability}</h4>
      <OutcomeReviewEvidenceGrid
        expectedSnapshotHash={expectedSnapshotHash}
        realizedSnapshotHash={realizedSnapshotHash}
        proofPackId={proofPackId}
        readyEvidenceCount={readyEvidenceCount}
      />
    </section>
  );
}
