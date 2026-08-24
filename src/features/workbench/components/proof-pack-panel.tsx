"use client";

import { SectionBlock } from "@/design-system";
import {
  ProofPackAvailabilityBadge,
  ProofPackStateBadge,
} from "@/features/workbench/components/proof-pack-badges";
import DpmAiWorkflowResult from "@/features/workbench/components/dpm-ai-workflow-result";
import ProofPackSummary from "@/features/workbench/components/proof-pack-summary";
import ProofPackWorkspace from "@/features/workbench/components/proof-pack-workspace";
import type {
  DpmOutcomeReviewGatewayResponse,
  DpmProofPackGatewayResponse,
  WorkbenchOverview,
} from "@/features/workbench/types";
import { deriveProofPackContext } from "@/features/workbench/proof-pack-view-model";
import { useProofPackActions } from "@/features/workbench/use-proof-pack-actions";
import { useManageProofPackState } from "@/features/workbench/manage-proof-pack-state";

type Props = {
  portfolioId: string;
  mandateId?: string | null;
  outcomeReviews: DpmOutcomeReviewGatewayResponse | null;
  rebalanceSnapshot?: WorkbenchOverview["rebalance_snapshot"] | null;
  initialProofPack: DpmProofPackGatewayResponse | null;
  errorMessage?: string | null;
};

export default function ProofPackPanel({
  portfolioId,
  mandateId,
  outcomeReviews,
  rebalanceSnapshot,
  initialProofPack,
  errorMessage,
}: Props) {
  const sharedProofPack = useManageProofPackState();
  const context = deriveProofPackContext(outcomeReviews, rebalanceSnapshot ?? null);
  const {
    model,
    proofPackId,
    rebalanceRunId,
    pendingAction,
    actionError,
    handoffStatus,
    aiMemoOutcome,
    markdown,
    generateProofPack,
    loadProofPack,
    loadMarkdown,
    loadReportInput,
    requestAiPmMemo,
  } = useProofPackActions({
    initialProofPack: sharedProofPack?.proofPack ?? initialProofPack,
    contextProofPackId: context.proofPackId,
    contextRebalanceRunId: context.rebalanceRunId,
    contextMandateId: context.mandateId,
    mandateId,
    onProofPackChange: sharedProofPack?.publishProofPack,
  });

  return (
    <SectionBlock
      title="Evidence Pack"
      subtitle="Mandate evidence, approval readiness, and client handoff support."
      className="proof-pack-panel"
      actions={
        <div className="proof-pack-badge-row">
          <ProofPackStateBadge state={model.supportabilityState} />
          <ProofPackAvailabilityBadge label="Evidence" statusLabel={model.evidenceStatusLabel} />
        </div>
      }
    >
      <ProofPackSummary
        model={model}
        portfolioId={portfolioId}
        proofPackId={proofPackId}
        rebalanceRunId={rebalanceRunId}
        pendingAction={pendingAction}
        actionError={actionError}
        handoffStatus={handoffStatus}
        errorMessage={errorMessage}
        onGenerateProofPack={generateProofPack}
        onLoadProofPack={loadProofPack}
        onLoadMarkdown={loadMarkdown}
        onLoadReportInput={loadReportInput}
        onRequestAiPmMemo={requestAiPmMemo}
      />

      {aiMemoOutcome ? (
        <DpmAiWorkflowResult
          outcome={aiMemoOutcome}
          ariaLabel="Evidence-pack decision memo result"
          eyebrow="Portfolio decision support"
          focusOnMount
        />
      ) : null}

      <ProofPackWorkspace
        model={model}
        portfolioId={portfolioId}
        proofPackId={proofPackId}
        pendingAction={pendingAction}
        onRequestAiPmMemo={requestAiPmMemo}
        onLoadReportInput={loadReportInput}
        onLoadMarkdown={loadMarkdown}
      />

      {markdown ? (
        <pre className="proof-pack-markdown-preview" aria-label="Evidence pack summary preview">
          {markdown}
        </pre>
      ) : null}
    </SectionBlock>
  );
}
