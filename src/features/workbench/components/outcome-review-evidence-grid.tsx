"use client";

import { outcomeReviewAvailabilityLabel } from "@/features/workbench/outcome-review-panel-helpers";
import { MANAGE_OUTCOME_REVIEW_LABELS } from "@/features/workbench/manage-terminology";
import styles from "./outcome-review.module.css";

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
    <div className={styles.evidenceGrid} aria-label="Outcome review evidence availability">
      <span className={evidenceClassName(expectedSnapshotHash !== "N/A")}>
        {MANAGE_OUTCOME_REVIEW_LABELS.expectedOutcome}{" "}
        {outcomeReviewAvailabilityLabel(expectedSnapshotHash)}
      </span>
      <span className={evidenceClassName(realizedSnapshotHash !== "N/A")}>
        {MANAGE_OUTCOME_REVIEW_LABELS.realisedOutcome}{" "}
        {outcomeReviewAvailabilityLabel(realizedSnapshotHash)}
      </span>
      <span className={evidenceClassName(proofPackId !== "N/A")}>
        {MANAGE_OUTCOME_REVIEW_LABELS.evidencePack}{" "}
        {outcomeReviewAvailabilityLabel(proofPackId)}
      </span>
      <span className={evidenceClassName(readyEvidenceCount >= 3)}>
        {MANAGE_OUTCOME_REVIEW_LABELS.sourceEvidence}{" "}
        {sourceEvidenceAvailabilityLabel(readyEvidenceCount)}
      </span>
    </div>
  );
}

function sourceEvidenceAvailabilityLabel(readyEvidenceCount: number): string {
  if (readyEvidenceCount === 0) {
    return "Not available";
  }
  if (readyEvidenceCount >= 3) {
    return "Available";
  }
  return "Partial";
}

function evidenceClassName(available: boolean): string {
  return `${styles.evidenceItem} ${
    available ? styles.evidenceAvailable : styles.evidenceUnavailable
  }`;
}
