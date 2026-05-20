"use client";

import {
  outcomeReviewAvailabilityClass,
  outcomeReviewAvailabilityLabel,
} from "@/features/workbench/outcome-review-panel-helpers";

type Props = {
  expectedSnapshotHash: string;
  realizedSnapshotHash: string;
  proofPackId: string;
  readyEvidenceCount: number;
};

export default function OutcomeReviewEvidenceGrid({
  expectedSnapshotHash,
  realizedSnapshotHash,
  proofPackId,
  readyEvidenceCount,
}: Props) {
  return (
    <div className="outcome-review-evidence-grid" aria-label="Outcome review evidence availability">
      <span className={outcomeReviewAvailabilityClass(expectedSnapshotHash)}>
        Expected outcome {outcomeReviewAvailabilityLabel(expectedSnapshotHash)}
      </span>
      <span className={outcomeReviewAvailabilityClass(realizedSnapshotHash)}>
        Realized outcome {outcomeReviewAvailabilityLabel(realizedSnapshotHash)}
      </span>
      <span className={outcomeReviewAvailabilityClass(proofPackId)}>
        Evidence pack {outcomeReviewAvailabilityLabel(proofPackId)}
      </span>
      <span className={readyEvidenceCount >= 3 ? "is-available" : "is-muted"}>
        Source evidence {readyEvidenceCount >= 3 ? "Available" : "Partial"}
      </span>
    </div>
  );
}
