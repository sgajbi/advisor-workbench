"use client";

import { ActionButton } from "@/design-system";
import { MANAGE_OUTCOME_REVIEW_LABELS } from "@/features/workbench/manage-terminology";
import styles from "./outcome-review.module.css";

type Props = {
  reviewLabel: string;
  reportJobAvailable: boolean;
  reportJobPending: boolean;
  onRequestReportJob: () => void;
};

export default function OutcomeReviewDetailHeader({
  reviewLabel,
  reportJobAvailable,
  reportJobPending,
  onRequestReportJob,
}: Props) {
  return (
    <div className={styles.detailHeader}>
      <div>
        <h3>{MANAGE_OUTCOME_REVIEW_LABELS.selectedReviewDetail}</h3>
        <span>{reviewLabel}</span>
      </div>
      <div className={styles.detailActions}>
        <ActionButton
          priority="secondary"
          onClick={onRequestReportJob}
          disabled={!reportJobAvailable || reportJobPending}
        >
          {reportJobPending ? "Requesting report" : "Request report"}
        </ActionButton>
      </div>
    </div>
  );
}
