"use client";

import { ActionButton } from "@/design-system";

type Props = {
  reviewLabel: string;
  reportJobAvailable: boolean;
  reportJobPending: boolean;
  aiNarrativeAvailable: boolean;
  aiNarrativePending: boolean;
  onRequestReportJob: () => void;
  onRequestAiNarrative: () => void;
};

export default function OutcomeReviewDetailHeader({
  reviewLabel,
  reportJobAvailable,
  reportJobPending,
  aiNarrativeAvailable,
  aiNarrativePending,
  onRequestReportJob,
  onRequestAiNarrative,
}: Props) {
  return (
    <div className="outcome-review-detail-header">
      <div>
        <h3>Selected Review Detail</h3>
        <span>{reviewLabel}</span>
      </div>
      <div className="outcome-review-detail-actions">
        <ActionButton
          priority="secondary"
          onClick={onRequestReportJob}
          disabled={!reportJobAvailable || reportJobPending}
        >
          {reportJobPending ? "Requesting report" : "Request report"}
        </ActionButton>
        <ActionButton
          priority="secondary"
          onClick={onRequestAiNarrative}
          disabled={!aiNarrativeAvailable || aiNarrativePending}
        >
          {aiNarrativePending ? "Requesting memo" : "Request advisor memo"}
        </ActionButton>
      </div>
    </div>
  );
}
