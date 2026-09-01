import type {
  OutcomeReviewListItem,
  OutcomeReviewPanelModel,
} from "@/features/workbench/outcome-review-view-model";
import OutcomeReviewDecisionSummary from "./outcome-review-decision-summary";
import OutcomeReviewReasonRow from "./outcome-review-reason-row";
import OutcomeReviewStatePanel from "./outcome-review-state-panel";

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
  return (
    <>
      <OutcomeReviewStatePanel
        portfolioId={portfolioId}
        state={model.state}
        errorMessage={errorMessage}
      />

      <OutcomeReviewDecisionSummary
        reviewPosture={primaryReview?.reviewPostureLabel}
        outcomeStatus={primaryReview?.outcomeStatusLabel}
        driftImprovement={primaryReview?.driftImprovementLabel}
      />

      <OutcomeReviewReasonRow
        supportabilityReasons={model.supportabilityReasons}
        blockedActions={model.blockedActions}
        remediationOwner={model.remediationOwner}
      />
    </>
  );
}
