"use client";

import { SemanticBadge } from "@/design-system";
import type { OutcomeReviewClientCommunicationBoundaryView } from "@/features/workbench/outcome-review-view-model";
import {
  outcomeReviewBadgeTone,
  outcomeReviewBlockedCapabilityLabel,
  outcomeReviewBoundaryReasonLabel,
  outcomeReviewRequiredRecordLabel,
} from "@/features/workbench/outcome-review-panel-helpers";
import { businessStateLabel } from "@/features/workbench/manage-workspace-view-model";
import { MANAGE_OUTCOME_REVIEW_LABELS } from "@/features/workbench/manage-terminology";

type Props = {
  boundary: OutcomeReviewClientCommunicationBoundaryView;
};

export default function OutcomeReviewClientBoundaryCard({ boundary }: Props) {
  return (
    <div className="outcome-review-client-boundary" aria-label="Client communication boundary">
      <div className="outcome-review-client-boundary-header">
        <h4>{MANAGE_OUTCOME_REVIEW_LABELS.clientCommunicationControls}</h4>
        <SemanticBadge tone={outcomeReviewBadgeTone(boundary.state)}>
          {businessStateLabel(boundary.state)}
        </SemanticBadge>
      </div>
      <p>{boundary.summary}</p>
      <div className="outcome-review-client-boundary-grid">
        <span>
          <strong>Communication</strong>
          {boundary.clientCommunicationProjected ? "Projected" : "Not projected"}
        </span>
        <span>
          <strong>Approval</strong>
          {boundary.clientApprovalProjected ? "Projected" : "Not projected"}
        </span>
        <span>
          <strong>Required record</strong>
          {outcomeReviewRequiredRecordLabel(boundary.requiredSourceProduct)}
        </span>
        <span>
          <strong>Reason</strong>
          {outcomeReviewBoundaryReasonLabel(boundary.reasonCode)}
        </span>
      </div>
      {boundary.blockedCapabilities.length > 0 ? (
        <details className="outcome-review-client-boundary-details">
          <summary>View blocked client actions</summary>
          <div className="outcome-review-client-boundary-capabilities">
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
