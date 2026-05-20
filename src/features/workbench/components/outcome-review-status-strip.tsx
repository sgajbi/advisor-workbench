"use client";

import { MetricRow } from "@/design-system";

type Props = {
  latestReview: string | null | undefined;
  outcomeStatus: string | null | undefined;
  driftImprovement: string | null | undefined;
  evidencePackStatus: string;
};

export default function OutcomeReviewStatusStrip({
  latestReview,
  outcomeStatus,
  driftImprovement,
  evidencePackStatus,
}: Props) {
  return (
    <div className="outcome-review-status-strip" aria-label="Outcome review status summary">
      <MetricRow label="Latest Review" value={latestReview ?? "N/A"} />
      <MetricRow label="Outcome Status" value={outcomeStatus ?? "N/A"} />
      <MetricRow label="Drift Improvement" value={driftImprovement ?? "N/A"} />
      <MetricRow label="Evidence Pack" value={evidencePackStatus} />
    </div>
  );
}
