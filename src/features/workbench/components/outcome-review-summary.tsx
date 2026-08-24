import type {
  OutcomeReviewListItem,
  OutcomeReviewPanelModel,
} from "@/features/workbench/outcome-review-view-model";
import { outcomeReviewAvailabilityLabel } from "@/features/workbench/outcome-review-panel-helpers";
import OutcomeReviewReasonRow from "./outcome-review-reason-row";
import OutcomeReviewStatePanel from "./outcome-review-state-panel";
import OutcomeReviewStatusStrip from "./outcome-review-status-strip";

type Props = {
  portfolioId: string;
  model: OutcomeReviewPanelModel;
  primaryReview: OutcomeReviewListItem | null;
  errorMessage?: string | null;
};

export default function OutcomeReviewSummary({
  portfolioId,
  model,
  primaryReview,
  errorMessage,
}: Props) {
  const evidencePackStatus = outcomeReviewAvailabilityLabel(
    primaryReview?.proofPackId ?? "N/A",
  );

  return (
    <>
      <OutcomeReviewStatePanel
        portfolioId={portfolioId}
        state={model.state}
        errorMessage={errorMessage}
      />

      <OutcomeReviewStatusStrip
        reviewPosture={primaryReview?.reviewPostureLabel}
        outcomeStatus={primaryReview?.outcomeStatusLabel}
        driftImprovement={primaryReview?.driftImprovementLabel}
        evidencePackStatus={evidencePackStatus}
      />

      <OutcomeReviewReasonRow
        supportabilityReasons={model.supportabilityReasons}
        blockedActions={model.blockedActions}
        remediationOwner={model.remediationOwner}
      />
    </>
  );
}
