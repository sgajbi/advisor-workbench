"use client";

import { SectionBlock } from "@/design-system";
import type { DpmOutcomeReviewGatewayResponse } from "@/features/workbench/types";
import { buildOutcomeReviewPanelModel } from "@/features/workbench/outcome-review-view-model";
import { countReadyOutcomeReviewEvidence } from "@/features/workbench/outcome-review-panel-helpers";
import { useOutcomeReviewHandoffs } from "@/features/workbench/use-outcome-review-handoffs";
import { MANAGE_OUTCOME_REVIEW_LABELS } from "@/features/workbench/manage-terminology";
import DpmAiWorkflowResult from "./dpm-ai-workflow-result";
import OutcomeReviewHandoffMessages from "./outcome-review-handoff-messages";
import OutcomeReviewSummary from "./outcome-review-summary";
import OutcomeReviewWorkspace from "./outcome-review-workspace";
import styles from "./outcome-review.module.css";

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
  const evidencePackHref = `/workbench/${encodeURIComponent(portfolioId)}?mode=proof`;

  return (
    <SectionBlock
      title={MANAGE_OUTCOME_REVIEW_LABELS.panelTitle}
      subtitle={MANAGE_OUTCOME_REVIEW_LABELS.screenDescription}
      id="outcome-review-panel"
      className={styles.panel}
      headerClassName={styles.panelHeader}
      bodyClassName={styles.panelBody}
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
