"use client";

import { WorkbenchSummaryMetricStrip } from "@/design-system";
import { MANAGE_OUTCOME_REVIEW_LABELS } from "@/features/workbench/manage-terminology";
import styles from "./outcome-review.module.css";

type Props = {
  reviewPosture: string | null | undefined;
  outcomeStatus: string | null | undefined;
  driftImprovement: string | null | undefined;
};

export default function OutcomeReviewDecisionSummary({
  reviewPosture,
  outcomeStatus,
  driftImprovement,
}: Props) {
  return (
    <WorkbenchSummaryMetricStrip
      ariaLabel="Outcome review decision summary"
      className={styles.decisionSummary}
      itemClassName={styles.decisionItem}
      layout="custom"
      items={[
        {
          key: "review-posture",
          label: MANAGE_OUTCOME_REVIEW_LABELS.reviewPosture,
          value: reviewPosture ?? "N/A",
          unavailable: !reviewPosture,
          valueClassName: styles.decisionValue,
        },
        {
          key: "comparison-outcome",
          label: MANAGE_OUTCOME_REVIEW_LABELS.comparisonOutcome,
          value: outcomeStatus ?? "N/A",
          unavailable: !outcomeStatus,
          valueClassName: styles.decisionValue,
        },
        {
          key: "drift-improvement",
          label: MANAGE_OUTCOME_REVIEW_LABELS.driftImprovement,
          value: driftImprovement ?? "N/A",
          unavailable: !driftImprovement,
          valueClassName: styles.decisionValue,
        },
      ]}
    />
  );
}
