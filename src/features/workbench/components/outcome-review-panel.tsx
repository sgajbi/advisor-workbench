"use client";

import { SectionBlock } from "@/design-system";
import type { DpmOutcomeReviewGatewayResponse } from "@/features/workbench/types";
import { buildOutcomeReviewPanelModel } from "@/features/workbench/outcome-review-view-model";
import {
  countReadyOutcomeReviewEvidence,
  outcomeReviewAvailabilityLabel,
  outcomeReviewSourceEvidenceStatus,
} from "@/features/workbench/outcome-review-panel-helpers";
import { useOutcomeReviewHandoffs } from "@/features/workbench/use-outcome-review-handoffs";
import OutcomeReviewHandoffMessages from "./outcome-review-handoff-messages";
import OutcomeReviewReasonRow from "./outcome-review-reason-row";
import OutcomeReviewStatePanel from "./outcome-review-state-panel";
import OutcomeReviewStatusStrip from "./outcome-review-status-strip";
import OutcomeReviewSupportBadges from "./outcome-review-support-badges";
import OutcomeReviewWorkspace from "./outcome-review-workspace";

type Props = {
  portfolioId: string;
  response: DpmOutcomeReviewGatewayResponse | null;
  errorMessage?: string | null;
};

export default function OutcomeReviewPanel({ portfolioId, response, errorMessage }: Props) {
  const model = buildOutcomeReviewPanelModel(response);
  const primaryReview = model.items[0] ?? null;
  const hasItems = model.items.length > 0;
  const {
    clientCommunicationBoundary,
    handoffStatusMessages,
    reportJobAvailable,
    reportJobPending,
    aiNarrativeAvailable,
    aiNarrativePending,
    requestOutcomeReportJob,
    requestOutcomeAiNarrative,
  } = useOutcomeReviewHandoffs({ primaryReview });
  const readyEvidenceCount = countReadyOutcomeReviewEvidence(primaryReview);
  const evidencePackStatus = outcomeReviewAvailabilityLabel(
    primaryReview?.proofPackId ?? "N/A",
  );
  const sourceEvidenceStatus =
    outcomeReviewSourceEvidenceStatus(readyEvidenceCount);
  const evidencePackHref = `/workbench/${encodeURIComponent(portfolioId)}?mode=proof`;

  return (
    <SectionBlock
      title="Outcome Reviews"
      subtitle="Review mandate outcomes, advisor observations, and evidence readiness."
      className="outcome-review-panel"
      actions={
        <OutcomeReviewSupportBadges supportabilityState={model.supportabilityState} />
      }
    >
      <OutcomeReviewStatePanel
        portfolioId={portfolioId}
        state={model.state}
        errorMessage={errorMessage}
      />

      <OutcomeReviewStatusStrip
        latestReview={primaryReview?.reviewPostureLabel}
        outcomeStatus={primaryReview?.outcomeStatusLabel}
        driftImprovement={primaryReview?.driftImprovementLabel}
        evidencePackStatus={evidencePackStatus}
      />

      <OutcomeReviewReasonRow
        supportabilityReasons={model.supportabilityReasons}
        blockedActions={model.blockedActions}
        remediationOwner={model.remediationOwner}
      />

      {primaryReview && hasItems ? (
        <OutcomeReviewWorkspace
          items={model.items}
          primaryReview={primaryReview}
          clientCommunicationBoundary={clientCommunicationBoundary}
          evidencePackHref={evidencePackHref}
          readyEvidenceCount={readyEvidenceCount}
          sourceEvidenceStatus={sourceEvidenceStatus}
          reportJobAvailable={reportJobAvailable}
          reportJobPending={reportJobPending}
          aiNarrativeAvailable={aiNarrativeAvailable}
          aiNarrativePending={aiNarrativePending}
          onRequestReportJob={requestOutcomeReportJob}
          onRequestAiNarrative={requestOutcomeAiNarrative}
        />
      ) : null}

      <OutcomeReviewHandoffMessages messages={handoffStatusMessages} />
    </SectionBlock>
  );
}
