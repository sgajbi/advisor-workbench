"use client";

import type { OutcomeReviewListItem } from "@/features/workbench/outcome-review-view-model";

type Props = {
  primaryReview: OutcomeReviewListItem;
  evidencePackHref: string;
  aiNarrativeAvailable: boolean;
  aiNarrativePending: boolean;
  onRequestAiNarrative: () => void;
};

export default function OutcomeReviewActionsCard({
  primaryReview,
  evidencePackHref,
  aiNarrativeAvailable,
  aiNarrativePending,
  onRequestAiNarrative,
}: Props) {
  return (
    <div className="outcome-review-card outcome-review-actions-card">
      <div className="outcome-review-card-header">
        <h3>Recommended Actions</h3>
      </div>
      <div className="outcome-review-action-stack">
        <a href="#outcome-review-detail">
          <strong>Review mandate impact</strong>
          <span>Assess outcome dimensions against the mandate objective.</span>
        </a>
        {primaryReview.proofPackId !== "N/A" ? (
          <a href={evidencePackHref}>
            <strong>Open evidence pack</strong>
            <span>Review the mandate evidence linked to this outcome.</span>
          </a>
        ) : (
          <button type="button" disabled>
            <strong>Open evidence pack</strong>
            <span>Evidence pack has not been returned by Gateway.</span>
          </button>
        )}
        <button
          type="button"
          onClick={onRequestAiNarrative}
          disabled={!aiNarrativeAvailable || aiNarrativePending}
        >
          <strong>{aiNarrativePending ? "Requesting advisor memo" : "Request advisor memo"}</strong>
          <span>Ask the governed AI workflow for PM handoff commentary.</span>
        </button>
      </div>
    </div>
  );
}
