"use client";

import { MetricRow } from "@/design-system";
import { MANAGE_OUTCOME_REVIEW_LABELS } from "@/features/workbench/manage-terminology";

type Props = {
  reviewPosture: string | null | undefined;
  outcomeStatus: string | null | undefined;
  driftImprovement: string | null | undefined;
  evidencePackStatus: string;
};

export default function OutcomeReviewStatusStrip({
  reviewPosture,
  outcomeStatus,
  driftImprovement,
  evidencePackStatus,
}: Props) {
  return (
    <div className="outcome-review-status-strip" aria-label="Outcome review status summary">
      <MetricRow
        label={MANAGE_OUTCOME_REVIEW_LABELS.reviewPosture}
        value={reviewPosture ?? "N/A"}
      />
      <MetricRow
        label={MANAGE_OUTCOME_REVIEW_LABELS.comparisonOutcome}
        value={outcomeStatus ?? "N/A"}
      />
      <MetricRow
        label={MANAGE_OUTCOME_REVIEW_LABELS.driftImprovement}
        value={driftImprovement ?? "N/A"}
      />
      <MetricRow
        label={MANAGE_OUTCOME_REVIEW_LABELS.evidencePack}
        value={evidencePackStatus}
      />
    </div>
  );
}
