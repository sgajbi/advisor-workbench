"use client";

import { SemanticBadge } from "@/design-system";
import { businessStateLabel } from "@/features/workbench/manage-workspace-view-model";
import { outcomeReviewBadgeTone } from "@/features/workbench/outcome-review-panel-helpers";

type Props = {
  supportabilityState: string;
};

export default function OutcomeReviewSupportBadges({
  supportabilityState,
}: Props) {
  return (
    <div className="outcome-review-badge-row" aria-label="Outcome review support posture">
      <SemanticBadge tone={outcomeReviewBadgeTone(supportabilityState)}>
        {businessStateLabel(supportabilityState)}
      </SemanticBadge>
      <SemanticBadge>Evidence available</SemanticBadge>
    </div>
  );
}
