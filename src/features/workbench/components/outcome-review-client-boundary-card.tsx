"use client";

import { businessStateLabel } from "@/copy/business-state-copy";
import { SemanticBadge } from "@/design-system";
import type { OutcomeReviewClientCommunicationBoundaryView } from "@/features/workbench/outcome-review-view-model";
import {
  outcomeReviewBadgeTone,
  outcomeReviewBlockedCapabilityLabel,
  outcomeReviewBoundaryReasonLabel,
  outcomeReviewRequiredRecordLabel,
} from "@/features/workbench/outcome-review-panel-helpers";

import { MANAGE_OUTCOME_REVIEW_LABELS } from "@/features/workbench/manage-terminology";
import styles from "./outcome-review.module.css";

type Props = {
  boundary: OutcomeReviewClientCommunicationBoundaryView;
};

export default function OutcomeReviewClientBoundaryCard({ boundary }: Props) {
  return (
    <div className={styles.clientBoundary} aria-label="Client communication boundary">
      <div className={styles.clientBoundaryHeader}>
        <h4>{MANAGE_OUTCOME_REVIEW_LABELS.clientCommunicationControls}</h4>
        <SemanticBadge tone={outcomeReviewBadgeTone(boundary.state)}>
          {businessStateLabel(boundary.state)}
        </SemanticBadge>
      </div>
      <p>{boundary.summary}</p>
      <div className={styles.clientBoundaryGrid}>
        <span className={styles.clientBoundaryFact}>
          <strong>Communication</strong>
          {boundary.clientCommunicationProjected ? "Projected" : "Not projected"}
        </span>
        <span className={styles.clientBoundaryFact}>
          <strong>Approval</strong>
          {boundary.clientApprovalProjected ? "Projected" : "Not projected"}
        </span>
        <span className={styles.clientBoundaryFact}>
          <strong>Required record</strong>
          {outcomeReviewRequiredRecordLabel(boundary.requiredSourceProduct)}
        </span>
        <span className={styles.clientBoundaryFact}>
          <strong>Reason</strong>
          {outcomeReviewBoundaryReasonLabel(boundary.reasonCode)}
        </span>
      </div>
      {boundary.blockedCapabilities.length > 0 ? (
        <details className={styles.clientBoundaryDetails}>
          <summary>View blocked client actions</summary>
          <div className={styles.clientBoundaryCapabilities}>
            {boundary.blockedCapabilities.map((capability) => (
              <SemanticBadge key={capability} tone="danger">
                {outcomeReviewBlockedCapabilityLabel(capability)}
              </SemanticBadge>
            ))}
          </div>
        </details>
      ) : null}
    </div>
  );
}
