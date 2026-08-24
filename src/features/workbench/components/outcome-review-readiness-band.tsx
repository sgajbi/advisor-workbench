"use client";

import { MANAGE_OUTCOME_REVIEW_LABELS } from "@/features/workbench/manage-terminology";

type Props = {
  reviewWindow: string;
  reportInputBlocked: boolean;
  aiEvidenceBlocked: boolean;
  sourceEvidenceStatus: string;
};

export default function OutcomeReviewReadinessBand({
  reviewWindow,
  reportInputBlocked,
  aiEvidenceBlocked,
  sourceEvidenceStatus,
}: Props) {
  return (
    <div className="outcome-review-readiness-band" aria-label="Selected outcome review readiness">
      <div>
        <span>{MANAGE_OUTCOME_REVIEW_LABELS.reviewWindow}</span>
        <strong>{reviewWindow}</strong>
      </div>
      <div>
        <span>{MANAGE_OUTCOME_REVIEW_LABELS.reportPreparation}</span>
        <strong>{reportInputBlocked ? "Blocked" : "Ready"}</strong>
      </div>
      <div>
        <span>{MANAGE_OUTCOME_REVIEW_LABELS.aiAssistedReviewSummary}</span>
        <strong>{aiEvidenceBlocked ? "Blocked" : "Ready"}</strong>
      </div>
      <div>
        <span>{MANAGE_OUTCOME_REVIEW_LABELS.sourceEvidence}</span>
        <strong>{sourceEvidenceStatus}</strong>
      </div>
    </div>
  );
}
