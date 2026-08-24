"use client";

import { ActionButton } from "@/design-system";
import { MANAGE_OUTCOME_REVIEW_LABELS } from "@/features/workbench/manage-terminology";

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
        <h3>{MANAGE_OUTCOME_REVIEW_LABELS.selectedReviewDetail}</h3>
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
          {aiNarrativePending
            ? MANAGE_OUTCOME_REVIEW_LABELS.preparingAiAssistedReviewSummary
            : MANAGE_OUTCOME_REVIEW_LABELS.prepareAiAssistedReviewSummary}
        </ActionButton>
      </div>
    </div>
  );
}
