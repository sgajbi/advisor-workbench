"use client";

import { SemanticBadge } from "@/design-system";
import type { OutcomeReviewClientCommunicationBoundaryView } from "@/features/workbench/outcome-review-view-model";
import { outcomeReviewBadgeTone } from "@/features/workbench/outcome-review-panel-helpers";
import {
  businessStateLabel,
  formatBusinessReason,
} from "@/features/workbench/manage-workspace-view-model";

type Props = {
  boundary: OutcomeReviewClientCommunicationBoundaryView;
};

export default function OutcomeReviewClientBoundaryCard({ boundary }: Props) {
  return (
    <div className="outcome-review-client-boundary" aria-label="Client communication boundary">
      <div className="outcome-review-client-boundary-header">
        <h4>Client Communication Boundary</h4>
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
          <strong>Required source</strong>
          {boundary.requiredSourceProduct}
        </span>
        <span>
          <strong>Reason</strong>
          {formatBusinessReason(boundary.reasonCode)}
        </span>
      </div>
      {boundary.blockedCapabilities.length > 0 ? (
        <div className="outcome-review-client-boundary-capabilities">
          {boundary.blockedCapabilities.map((capability) => (
            <SemanticBadge key={capability} tone="danger">
              {formatBusinessReason(capability)}
            </SemanticBadge>
          ))}
        </div>
      ) : null}
    </div>
  );
}
