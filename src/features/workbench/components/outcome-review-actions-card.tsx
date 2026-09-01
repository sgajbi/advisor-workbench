"use client";

import type { OutcomeReviewListItem } from "@/features/workbench/outcome-review-view-model";
import { MANAGE_OUTCOME_REVIEW_LABELS } from "@/features/workbench/manage-terminology";
import styles from "./outcome-review.module.css";

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
    <div className={styles.card}>
      <div className={styles.cardHeader}>
        <h3>{MANAGE_OUTCOME_REVIEW_LABELS.recommendedActions}</h3>
      </div>
      <div className={styles.actionStack}>
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
            <span>Evidence pack is not available from the source.</span>
          </button>
        )}
        <button
          type="button"
          onClick={onRequestAiNarrative}
          disabled={!aiNarrativeAvailable || aiNarrativePending}
        >
          <strong>
            {aiNarrativePending
              ? MANAGE_OUTCOME_REVIEW_LABELS.preparingAiAssistedReviewSummary
              : MANAGE_OUTCOME_REVIEW_LABELS.prepareAiAssistedReviewSummary}
          </strong>
          <span>Prepare internal PM, CIO, and control commentary; human review remains required.</span>
        </button>
      </div>
    </div>
  );
}
