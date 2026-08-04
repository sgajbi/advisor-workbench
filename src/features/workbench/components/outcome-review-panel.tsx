"use client";

import { SectionBlock } from "@/design-system";
import type { DpmOutcomeReviewGatewayResponse } from "@/features/workbench/types";
import { buildOutcomeReviewPanelModel } from "@/features/workbench/outcome-review-view-model";
import {
  countReadyOutcomeReviewEvidence,
  outcomeReviewSourceEvidenceStatus,
} from "@/features/workbench/outcome-review-panel-helpers";
import { useOutcomeReviewHandoffs } from "@/features/workbench/use-outcome-review-handoffs";
import DpmAiWorkflowResult from "./dpm-ai-workflow-result";
import OutcomeReviewHandoffMessages from "./outcome-review-handoff-messages";
import OutcomeReviewSummary from "./outcome-review-summary";
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
    aiNarrativeOutcome,
    requestOutcomeReportJob,
    requestOutcomeAiNarrative,
  } = useOutcomeReviewHandoffs({ primaryReview });
  const readyEvidenceCount = countReadyOutcomeReviewEvidence(primaryReview);
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
      <OutcomeReviewSummary
        portfolioId={portfolioId}
        model={model}
        primaryReview={primaryReview}
        errorMessage={errorMessage}
      />

      {primaryReview && hasItems ? (
        <OutcomeReviewWorkspace
          items={model.items}
          primaryReview={primaryReview}
          clientCommunicationBoundary={clientCommunicationBoundary}
          sourceBoundary={model.sourceBoundary}
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

      {aiNarrativeOutcome ? (
        <DpmAiWorkflowResult
          outcome={aiNarrativeOutcome}
          ariaLabel="Outcome-review decision-support result"
          eyebrow="Outcome review support"
          focusOnMount
        />
      ) : null}

      <OutcomeReviewHandoffMessages messages={handoffStatusMessages} />
    </SectionBlock>
  );
}
