"use client";

import {
  outcomeReviewAvailabilityClass,
  outcomeReviewAvailabilityLabel,
} from "@/features/workbench/outcome-review-panel-helpers";
import { MANAGE_OUTCOME_REVIEW_LABELS } from "@/features/workbench/manage-terminology";

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
        {MANAGE_OUTCOME_REVIEW_LABELS.expectedOutcome}{" "}
        {outcomeReviewAvailabilityLabel(expectedSnapshotHash)}
      </span>
      <span className={outcomeReviewAvailabilityClass(realizedSnapshotHash)}>
        {MANAGE_OUTCOME_REVIEW_LABELS.realisedOutcome}{" "}
        {outcomeReviewAvailabilityLabel(realizedSnapshotHash)}
      </span>
      <span className={outcomeReviewAvailabilityClass(proofPackId)}>
        {MANAGE_OUTCOME_REVIEW_LABELS.evidencePack}{" "}
        {outcomeReviewAvailabilityLabel(proofPackId)}
      </span>
      <span className={readyEvidenceCount >= 3 ? "is-available" : "is-muted"}>
        {MANAGE_OUTCOME_REVIEW_LABELS.sourceEvidence}{" "}
        {readyEvidenceCount >= 3 ? "Available" : "Partial"}
      </span>
    </div>
  );
}
