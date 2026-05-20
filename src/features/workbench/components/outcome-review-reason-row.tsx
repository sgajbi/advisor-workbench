"use client";

import { SemanticBadge } from "@/design-system";
import { formatBusinessReason } from "@/features/workbench/manage-workspace-view-model";

type Props = {
  supportabilityReasons: string[];
  blockedActions: string[];
  remediationOwner: string;
};

export default function OutcomeReviewReasonRow({
  supportabilityReasons,
  blockedActions,
  remediationOwner,
}: Props) {
  const reasons = [
    ...supportabilityReasons,
    ...blockedActions,
    ...(remediationOwner !== "N/A" ? [`Owner: ${remediationOwner}`] : []),
  ];

  if (reasons.length === 0) {
    return null;
  }

  return (
    <div
      className="outcome-review-reason-row"
      aria-label="Outcome review supportability reasons"
    >
      {reasons.map((reason) => (
        <SemanticBadge
          key={reason}
          tone={reason.startsWith("CREATE") || reason.startsWith("REQUEST") ? "danger" : "warn"}
        >
          {reason.startsWith("Owner: ") ? reason : formatBusinessReason(reason)}
        </SemanticBadge>
      ))}
    </div>
  );
}
